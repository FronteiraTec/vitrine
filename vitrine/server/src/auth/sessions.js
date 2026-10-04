/**
 * Sessões do painel.
 *
 * O navegador guarda um token aleatório de 256 bits num cookie `httpOnly` —
 * inacessível ao JavaScript da página, então um XSS não o lê. O banco guarda
 * só o SHA-256 dele: quem copiar a tabela não ganha sessão nenhuma.
 *
 * `SameSite=Lax` impede o cookie de acompanhar um POST vindo de outro site; a
 * checagem de origem em `app.js` é a segunda camada contra CSRF.
 */
import { createHash, randomBytes } from 'node:crypto'
import { config } from '../config.js'
import { SERVICE, withRole } from '../db.js'
import { unauthorized } from '../http.js'

const DAY_MS = 24 * 60 * 60 * 1000
/** `last_seen_at` é renovado no máximo uma vez por este intervalo. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function newToken() {
  return randomBytes(32).toString('base64url')
}

function parseCookies(header) {
  const cookies = {}
  for (const part of String(header ?? '').split(';')) {
    const at = part.indexOf('=')
    if (at === -1) continue
    const key = part.slice(0, at).trim()
    if (key) cookies[key] = decodeURIComponent(part.slice(at + 1).trim())
  }
  return cookies
}

function cookieAttributes(maxAgeSeconds) {
  return [
    'Path=/api',
    'HttpOnly',
    'SameSite=Lax',
    config.session.secureCookie ? 'Secure' : null,
    `Max-Age=${maxAgeSeconds}`,
  ]
    .filter(Boolean)
    .join('; ')
}

export function setSessionCookie(response, token) {
  const maxAge = Math.floor((config.session.maxDays * DAY_MS) / 1000)
  response.append('Set-Cookie', `${config.session.cookieName}=${token}; ${cookieAttributes(maxAge)}`)
}

export function clearSessionCookie(response) {
  response.append('Set-Cookie', `${config.session.cookieName}=; ${cookieAttributes(0)}`)
}

/** Abre uma sessão para o usuário e grava o cookie. Usa um client já em transação. */
export async function createSession(client, response, { userId, userAgent }) {
  const token = newToken()
  await client.query(
    `insert into auth.sessions (user_id, token_hash, user_agent, expires_at)
     values ($1, $2, left($3, 300), now() + make_interval(days => $4))`,
    [userId, hashToken(token), userAgent ?? null, config.session.maxDays],
  )
  await client.query('update auth.users set last_sign_in_at = now() where id = $1', [userId])
  setSessionCookie(response, token)
}

export function sessionTokenOf(request) {
  return parseCookies(request.headers.cookie)[config.session.cookieName] ?? null
}

/**
 * Middleware: identifica a sessão do cookie e preenche `request.auth`.
 *
 * Requisição sem cookie — a quase totalidade das visitas à vitrine — não toca
 * no banco aqui.
 */
export async function loadSession(request, response, next) {
  request.auth = null
  const token = sessionTokenOf(request)
  if (!token) return next()

  try {
    const session = await withRole(SERVICE, async (client) => {
      const { rows } = await client.query(
        `select s.id, s.user_id, s.last_seen_at, u.email
           from auth.sessions s
           join auth.users u on u.id = s.user_id
          where s.token_hash = $1
            and s.expires_at > now()
            and s.last_seen_at > now() - make_interval(days => $2)`,
        [hashToken(token), config.session.idleDays],
      )
      const row = rows[0]
      if (row && Date.now() - new Date(row.last_seen_at).getTime() > TOUCH_INTERVAL_MS) {
        await client.query('update auth.sessions set last_seen_at = now() where id = $1', [row.id])
      }
      return row ?? null
    })

    if (session) {
      request.auth = { userId: session.user_id, sessionId: session.id, email: session.email }
    } else {
      // Cookie de uma sessão expirada ou encerrada: apaga do navegador para
      // ele parar de mandar.
      clearSessionCookie(response)
    }
    next()
  } catch (error) {
    next(error)
  }
}

/** Exige sessão. Quem decide o que a pessoa pode fazer continua sendo o banco. */
export function requireSession(request, _response, next) {
  next(request.auth ? undefined : unauthorized())
}

/** Remove sessões vencidas. Chamado de tempos em tempos pelo `index.js`. */
export async function purgeExpiredSessions() {
  await withRole(SERVICE, async (client) => {
    await client.query(
      `delete from auth.sessions
        where expires_at <= now()
           or last_seen_at <= now() - make_interval(days => $1)`,
      [config.session.idleDays],
    )
    await client.query(
      `delete from auth.password_resets where expires_at <= now() - interval '1 day'`,
    )
  })
}
