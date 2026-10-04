import { config } from './config.js'

/**
 * Erros, validação de entrada e tradução dos erros do Postgres para HTTP.
 *
 * As mensagens do banco são repassadas como estão — as das migrations já são
 * escritas para quem usa o painel ("Esta notícia está em revisão e não pode
 * ser editada…"), e o `friendlyError` do frontend reconhece as do Postgres
 * pelo texto, como fazia com as do PostgREST.
 */

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const badRequest = (message) => new HttpError(400, message, 'bad_request')
export const unauthorized = (message = 'Entre para continuar.') =>
  new HttpError(401, message, 'unauthorized')
export const forbidden = (message = 'Você não tem permissão para esta ação.') =>
  new HttpError(403, message, '42501')
export const notFound = (message = 'Não encontrado.') => new HttpError(404, message, 'not_found')

/** Códigos SQLSTATE → status HTTP. */
const PG_STATUS = {
  42501: 403, // permissão negada / RLS / exceção do workflow
  23505: 409, // unique
  23503: 409, // foreign key
  23514: 400, // check
  23502: 400, // not null
  '22P02': 400, // texto inválido para o tipo (uuid malformado, enum desconhecido)
  22001: 400, // texto longo demais
  22007: 400, // data inválida
  22008: 400,
  22023: 400,
  P0001: 400, // raise exception sem código
}

export function errorHandler(error, request, response, next) {
  // Resposta já começou a sair: só o handler padrão do Express sabe encerrá-la.
  if (response.headersSent) return next(error)

  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message, code: error.code })
    return
  }

  // Corpo JSON malformado ou grande demais (express.json).
  if (error?.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'Corpo da requisição inválido.', code: 'bad_request' })
    return
  }
  if (error?.type === 'entity.too.large') {
    response.status(413).json({ error: 'Conteúdo grande demais.', code: 'too_large' })
    return
  }

  const status = PG_STATUS[error?.code]
  if (status) {
    response.status(status).json({ error: error.message, code: error.code })
    return
  }

  console.error(`[api] ${request.method} ${request.originalUrl}:`, error)
  response.status(500).json({ error: 'Erro interno. Tente de novo em instantes.', code: 'internal' })
}

/* -------------------------------------------------------------------------- */
/* Leitura de parâmetros                                                       */
/* -------------------------------------------------------------------------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value) {
  return typeof value === 'string' && UUID.test(value)
}

/** Um id de rota. Inválido vira 404, como um registro que não existe. */
export function idParam(value) {
  if (!isUuid(value)) throw notFound()
  return value
}

/** Uuid opcional de query string. Inválido é ignorado, como um filtro vazio. */
export function optionalUuid(value) {
  return isUuid(value) ? value : null
}

/** Lista de uuids: `?ids=a,b` ou `?ids=a&ids=b`. Descarta o que não for uuid. */
export function uuidList(value) {
  const items = Array.isArray(value) ? value : String(value ?? '').split(',')
  return [...new Set(items.map((item) => String(item).trim()).filter(isUuid))]
}

/** Lista de textos livres, com limite de itens e de tamanho. */
export function textList(value, { max = 50, length = 120 } = {}) {
  const items = Array.isArray(value) ? value : value ? String(value).split(',') : []
  return [...new Set(items.map((item) => String(item).trim().slice(0, length)).filter(Boolean))].slice(0, max)
}

export function intParam(value, { fallback, min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

/** Página e tamanho de página, com teto: nenhuma tela carrega o acervo inteiro. */
export function pagination(query, { pageSize: defaultSize = 12, maxSize = 100 } = {}) {
  const page = intParam(query.page, { fallback: 1, min: 1, max: 100_000 })
  const pageSize = intParam(query.pageSize, { fallback: defaultSize, min: 1, max: maxSize })
  return { page, pageSize, offset: (page - 1) * pageSize }
}

export function pageResult(items, total, { page, pageSize }) {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

/** Texto opcional: aparado, vazio vira null. */
export function optionalText(value, max = 10_000) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text ? text.slice(0, max) : null
}

/**
 * Busca textual como a vitrine sempre fez: sem acento e minúscula, do mesmo
 * jeito que o índice foi montado (`unaccent` nas migrations). O frontend já
 * manda assim, mas o servidor não depende disso.
 */
export function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .slice(0, 200)
}

/** Escapa `%`, `_` e `\` para um `ilike` que procura o texto, não um padrão. */
export function likePattern(value) {
  const escaped = String(value ?? '').trim().replace(/[\\%_]/g, (match) => `\\${match}`)
  return escaped ? `%${escaped}%` : null
}

/**
 * Origem pública do site. `SITE_URL` sempre que definida: o `Host` é escolhido
 * por quem faz a requisição, e uma URL montada a partir dele não pode ir para
 * o banco nem para um e-mail. Sem a variável (desenvolvimento), cai no Host.
 */
export function publicOrigin(request) {
  if (config.siteUrl) return config.siteUrl
  return `${request.protocol}://${request.get('host')}`
}

/** Mantém só as chaves permitidas de um objeto vindo do cliente. */
export function pick(source, fields) {
  const result = {}
  if (!source || typeof source !== 'object') return result
  for (const field of fields) {
    if (Object.hasOwn(source, field)) result[field] = source[field]
  }
  return result
}
