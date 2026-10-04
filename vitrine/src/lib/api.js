/**
 * Cliente da API da Vitrine (`/api`, mesma origem do site).
 *
 * A sessão é um cookie `httpOnly` que o navegador manda sozinho: nenhum token
 * passa pelo JavaScript da página. Quem decide o que cada requisição enxerga
 * é o servidor — e, atrás dele, o RLS do Postgres.
 */

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** Disparado quando a API responde 401: a sessão expirou ou foi encerrada. */
export const UNAUTHORIZED_EVENT = 'vitrine:unauthorized'

/** Converte erros da API e do Postgres em mensagens legíveis em português. */
export function friendlyError(error) {
  if (!error) return 'Ocorreu um erro inesperado.'
  const message = String(error.message ?? error)

  const map = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/duplicate key value.*slug/i, 'Já existe um registro com este slug. Escolha outro nome.'],
    [/duplicate key value/i, 'Este registro já existe.'],
    [/violates foreign key/i, 'Existe um vínculo impedindo esta operação.'],
    [/violates row-level security|permission denied/i, 'Você não tem permissão para esta ação.'],
    [/transição de status/i, message],
    [/failed to fetch|networkerror|network request failed|load failed/i, 'Falha de conexão. Verifique sua internet e tente novamente.'],
    [/rate limit/i, 'Muitas tentativas. Aguarde alguns instantes.'],
  ]

  for (const [pattern, friendly] of map) {
    if (pattern.test(message)) return friendly
  }
  return message
}

/** Monta a query string. Lista vira chave repetida; vazio é omitido. */
function queryString(params) {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) if (item !== undefined && item !== null && item !== '') search.append(key, item)
    } else {
      search.append(key, String(value))
    }
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

async function request(method, path, { query, body, form, keepalive } = {}) {
  const headers = { Accept: 'application/json' }
  let payload
  if (form) {
    payload = form
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`/api${path}${queryString(query)}`, {
      method,
      headers,
      body: payload,
      credentials: 'same-origin',
      keepalive,
    })
  } catch (error) {
    throw new ApiError(friendlyError(error), { status: 0, code: 'network' })
  }

  if (response.status === 204) return null

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    const message =
      data?.error ??
      (response.status >= 500
        ? 'O servidor não respondeu como esperado. Tente de novo em instantes.'
        : `Falha na requisição (HTTP ${response.status}).`)
    throw new ApiError(friendlyError({ message }), { status: response.status, code: data?.code })
  }

  return data
}

export const api = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body, options) => request('POST', path, { body, ...options }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path, body) => request('DELETE', path, { body }),
  upload: (path, form) => request('POST', path, { form }),
}
