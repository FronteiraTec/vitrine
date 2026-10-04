/**
 * /api/auth — entrar, sair, primeira conta e senha.
 *
 * Nada aqui decide o que a pessoa pode fazer no painel: isso continua sendo o
 * papel e a ativação em `public.profiles`, aplicados pelo RLS. Uma conta
 * desativada consegue entrar e vê "Conta sem acesso ao painel" — mesma
 * resposta que o Supabase dava.
 */
import { Router } from 'express'
import { config } from '../config.js'
import { SERVICE, switchRole, userActor, withRole } from '../db.js'
import { badRequest, forbidden, HttpError } from '../http.js'
import { createLimiter } from '../rate-limit.js'
import { loadSiteName } from '../site.js'
import { isMailConfigured, sendPasswordReset } from './mail.js'
import {
  hashPassword,
  isEmail,
  normalizeEmail,
  validatePassword,
  verifyPassword,
} from './passwords.js'
import {
  clearSessionCookie,
  createSession,
  hashToken,
  newToken,
  requireSession,
  sessionTokenOf,
} from './sessions.js'

export const PROFILE_COLUMNS = 'id, name, email, role, avatar_url, is_active, created_at'

const FIFTEEN_MINUTES = 15 * 60 * 1000
const tooMany = () =>
  new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.', 'rate_limit')

// Por IP, contra varredura; por e-mail, contra adivinhação dirigida a uma conta.
const loginByIp = createLimiter({ windowMs: FIFTEEN_MINUTES, max: 30 })
const loginByEmail = createLimiter({ windowMs: FIFTEEN_MINUTES, max: 8 })
const resetByIp = createLimiter({ windowMs: FIFTEEN_MINUTES, max: 5 })
const resetByEmail = createLimiter({ windowMs: 60 * 60 * 1000, max: 3 })

/** O perfil da pessoa, lido COMO ela — o RLS de `profiles` deixa ver o próprio. */
async function loadProfile(userId) {
  return withRole(userActor(userId), async (client) => {
    const { rows } = await client.query(
      `select ${PROFILE_COLUMNS} from public.profiles where id = $1`,
      [userId],
    )
    return rows[0] ?? null
  })
}

async function sessionPayload(userId, email) {
  return { user: { id: userId, email }, profile: await loadProfile(userId) }
}

/** Mensagem do e-mail duplicado, de onde quer que venha a violação. */
function duplicateEmail(error) {
  if (error?.code === '23505' && /users_email_key/.test(error.constraint ?? error.message)) {
    return badRequest('Já existe uma conta com este e-mail.')
  }
  return error
}

export const authRouter = Router()

authRouter.get('/session', async (request, response) => {
  // A sessão muda a cada login e logout: nenhum cache pode guardá-la.
  response.set('Cache-Control', 'no-store')
  if (!request.auth) {
    response.json({ user: null, profile: null })
    return
  }
  response.json(await sessionPayload(request.auth.userId, request.auth.email))
})

authRouter.post('/login', async (request, response) => {
  const email = normalizeEmail(request.body?.email)
  const password = String(request.body?.password ?? '')

  if (!loginByIp.hit(request.ip) || loginByEmail.blocked(email)) throw tooMany()
  if (!email || !password) throw badRequest('Informe e-mail e senha.')

  const user = await withRole(SERVICE, async (client) => {
    const { rows } = await client.query(
      'select id, email, encrypted_password from auth.users where email = $1',
      [email],
    )
    const row = rows[0]
    // Compara mesmo sem conta: o tempo de resposta não pode dizer quem existe.
    const ok = await verifyPassword(password, row?.encrypted_password)
    if (!ok) return null
    await createSession(client, response, { userId: row.id, userAgent: request.get('user-agent') })
    return row
  })

  if (!user) {
    loginByEmail.hit(email)
    throw new HttpError(400, 'E-mail ou senha incorretos.', 'invalid_credentials')
  }

  loginByEmail.reset(email)
  response.json(await sessionPayload(user.id, user.email))
})

authRouter.post('/logout', async (request, response) => {
  const token = sessionTokenOf(request)
  if (token) {
    await withRole(SERVICE, (client) =>
      client.query('delete from auth.sessions where token_hash = $1', [hashToken(token)]),
    )
  }
  clearSessionCookie(response)
  response.status(204).end()
})

/**
 * A instalação já tem administrador? Decide se a tela de primeiro acesso se
 * mostra. Também diz se o envio de e-mail está configurado, para a tela de
 * "esqueci minha senha" avisar antes de a pessoa preencher.
 */
authRouter.get('/setup', async (_request, response) => {
  const [row] = await withRole(SERVICE, async (client) => {
    const { rows } = await client.query('select public.installation_has_admin() as has_admin')
    return rows
  })
  response.set('Cache-Control', 'no-store')
  response.json({ hasAdmin: Boolean(row?.has_admin), passwordResetByEmail: canSendResetMail() })
})

/**
 * Cadastro da PRIMEIRA conta, que nasce administradora (gatilho
 * `handle_new_user`, migration 0007). Fecha sozinho assim que existe um
 * administrador ativo — aqui, no servidor, e não só na tela.
 */
authRouter.post('/signup', async (request, response) => {
  const name = String(request.body?.name ?? '').trim().slice(0, 120)
  const email = normalizeEmail(request.body?.email)
  const password = validatePassword(request.body?.password)

  if (!name) throw badRequest('Informe o nome.')
  if (!isEmail(email)) throw badRequest('E-mail inválido.')
  if (!loginByIp.hit(request.ip)) throw tooMany()

  const userId = await withRole(SERVICE, async (client) => {
    // Dois cadastros simultâneos numa instalação vazia: só um passa por aqui
    // de cada vez, e o segundo já encontra o administrador criado.
    await client.query(`select pg_advisory_xact_lock(hashtext('vitrine:first-admin'))`)
    const { rows } = await client.query('select public.installation_has_admin() as has_admin')
    if (rows[0]?.has_admin) {
      throw forbidden('Esta instalação já tem administrador. As contas são criadas por ele, no painel.')
    }

    const created = await client
      .query(
        `insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
         values ($1, $2, jsonb_build_object('name', $3::text), now())
         returning id`,
        [email, await hashPassword(password), name],
      )
      .catch((error) => {
        throw duplicateEmail(error)
      })

    const id = created.rows[0].id
    await createSession(client, response, { userId: id, userAgent: request.get('user-agent') })
    return id
  })

  response.status(201).json(await sessionPayload(userId, email))
})

/* -------------------------------------------------------------------------- */
/* Senha                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * O link do e-mail precisa de um domínio FIXO. Montado a partir do `Host` da
 * requisição, bastaria alguém pedir a redefinição da conta de outra pessoa com
 * `Host: site-falso.com` para o link — com um token válido — apontar para lá.
 */
function canSendResetMail() {
  return isMailConfigured && Boolean(config.siteUrl)
}

authRouter.post('/password/forgot', async (request, response) => {
  const email = normalizeEmail(request.body?.email)
  if (!isEmail(email)) throw badRequest('Informe um e-mail válido.')

  if (!canSendResetMail()) {
    throw new HttpError(
      503,
      'O envio de e-mail não está configurado nesta instalação. Peça a um administrador que defina uma senha nova para você.',
      'mail_unavailable',
    )
  }

  if (!resetByIp.hit(request.ip) || !resetByEmail.hit(email)) throw tooMany()

  const token = newToken()
  const user = await withRole(SERVICE, async (client) => {
    const { rows } = await client.query(
      `select u.id, u.raw_user_meta_data ->> 'name' as name from auth.users u where u.email = $1`,
      [email],
    )
    const row = rows[0]
    if (!row) return null
    // Um link novo invalida os anteriores: só o último e-mail vale.
    await client.query(
      'update auth.password_resets set used_at = now() where user_id = $1 and used_at is null',
      [row.id],
    )
    await client.query(
      `insert into auth.password_resets (user_id, token_hash, expires_at)
       values ($1, $2, now() + interval '1 hour')`,
      [row.id, hashToken(token)],
    )
    return row
  })

  if (user) {
    const link = `${config.siteUrl}/redefinir-senha?token=${encodeURIComponent(token)}`
    try {
      await sendPasswordReset({ to: email, name: user.name, link, siteName: await loadSiteName() })
    } catch (error) {
      // A resposta é a mesma de um e-mail sem conta: falhar aqui diria que a
      // conta existe. O erro fica no log para quem opera o servidor.
      console.error('[mail] falha ao enviar a redefinição de senha:', error.message)
    }
  }

  response.json({ ok: true })
})

/** Destino do link do e-mail: troca a senha e já entra. */
authRouter.post('/password/reset', async (request, response) => {
  const token = String(request.body?.token ?? '')
  const password = validatePassword(request.body?.password)
  if (!resetByIp.hit(request.ip)) throw tooMany()
  if (!token) throw badRequest('Link de redefinição inválido.')

  const user = await withRole(SERVICE, async (client) => {
    const { rows } = await client.query(
      `update auth.password_resets r
          set used_at = now()
         from auth.users u
        where r.token_hash = $1
          and r.used_at is null
          and r.expires_at > now()
          and u.id = r.user_id
       returning u.id, u.email`,
      [hashToken(token)],
    )
    const row = rows[0]
    if (!row) return null

    await client.query(
      'update auth.users set encrypted_password = $2, updated_at = now() where id = $1',
      [row.id, await hashPassword(password)],
    )
    // Quem tinha a senha antiga — inclusive quem a roubou — sai de todas as sessões.
    await client.query('delete from auth.sessions where user_id = $1', [row.id])
    await createSession(client, response, { userId: row.id, userAgent: request.get('user-agent') })
    return row
  })

  if (!user) {
    throw new HttpError(400, 'Este link de redefinição é inválido ou já expirou. Solicite um novo.', 'invalid_token')
  }

  response.json(await sessionPayload(user.id, user.email))
})

/** Troca de senha de quem está logado. Exige a senha atual. */
authRouter.post('/password', requireSession, async (request, response) => {
  const current = String(request.body?.currentPassword ?? '')
  const password = validatePassword(request.body?.password)
  const { userId, sessionId } = request.auth

  if (!loginByEmail.hit(`password:${userId}`)) throw tooMany()

  await withRole(SERVICE, async (client) => {
    const { rows } = await client.query('select encrypted_password from auth.users where id = $1', [userId])
    if (!(await verifyPassword(current, rows[0]?.encrypted_password))) {
      throw new HttpError(400, 'A senha atual não confere.', 'invalid_credentials')
    }
    await client.query(
      'update auth.users set encrypted_password = $2, updated_at = now() where id = $1',
      [userId, await hashPassword(password)],
    )
    // As outras sessões caem; a atual continua, para a pessoa não ser
    // jogada para fora no momento em que trocou a senha.
    await client.query('delete from auth.sessions where user_id = $1 and id <> $2', [userId, sessionId])
  })

  loginByEmail.reset(`password:${userId}`)
  response.status(204).end()
})

/* -------------------------------------------------------------------------- */
/* Contas criadas pelo administrador                                           */
/* -------------------------------------------------------------------------- */

const ROLES = ['admin', 'editor', 'reviewer']

/** Confirma, no banco e como a própria pessoa, que ela é administradora ativa. */
async function assertAdmin(client, userId) {
  await switchRole(client, userActor(userId))
  const { rows } = await client.query('select public.is_admin() as ok')
  if (!rows[0]?.ok) throw forbidden('Apenas administradores gerenciam contas.')
}

/**
 * Cria uma conta já ativa, com o papel escolhido.
 *
 * Substitui a Edge Function `criar-usuario`, agora numa transação só: a conta
 * (gravada pelo serviço) e o papel (gravado como o administrador que pediu,
 * passando pelo RLS e pelo gatilho `guard_profile_changes`) entram juntos ou
 * não entram. Antes, uma falha no segundo passo exigia apagar a conta à mão.
 */
export async function createUserByAdmin(request, response) {
  const name = String(request.body?.name ?? '').trim().slice(0, 120)
  const email = normalizeEmail(request.body?.email)
  const password = validatePassword(request.body?.password)
  const role = String(request.body?.role ?? 'editor')

  if (!name) throw badRequest('Informe o nome.')
  if (!isEmail(email)) throw badRequest('E-mail inválido.')
  if (!ROLES.includes(role)) throw badRequest('Papel inválido.')

  const created = await withRole(userActor(request.auth.userId), async (client) => {
    await assertAdmin(client, request.auth.userId)

    await switchRole(client, SERVICE)
    const user = await client
      .query(
        `insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
         values ($1, $2, jsonb_build_object('name', $3::text), now())
         returning id`,
        [email, await hashPassword(password), name],
      )
      .catch((error) => {
        throw duplicateEmail(error)
      })
    const id = user.rows[0].id

    // O gatilho criou o perfil como editor INATIVO (migration 0007). O
    // administrador aplica o papel e ativa — com as permissões dele.
    await switchRole(client, userActor(request.auth.userId))
    const { rows } = await client.query(
      `update public.profiles set name = $2, role = $3::public.user_role, is_active = true
        where id = $1
       returning ${PROFILE_COLUMNS}`,
      [id, name, role],
    )
    if (!rows[0]) throw forbidden('Não foi possível definir o papel. Nenhuma conta foi criada.')
    return rows[0]
  })

  response.status(201).json(created)
}

/**
 * Define uma senha nova para outra conta. É o caminho quando a instalação não
 * tem e-mail configurado — antes, isso era feito no painel do Supabase.
 */
export async function setPasswordByAdmin(request, response) {
  const password = validatePassword(request.body?.password)
  const targetId = request.params.id

  await withRole(userActor(request.auth.userId), async (client) => {
    await assertAdmin(client, request.auth.userId)
    await switchRole(client, SERVICE)
    const { rowCount } = await client.query(
      'update auth.users set encrypted_password = $2, updated_at = now() where id = $1',
      [targetId, await hashPassword(password)],
    )
    if (!rowCount) throw new HttpError(404, 'Conta não encontrada.', 'not_found')
    // A pessoa entra de novo com a senha nova, em todos os dispositivos.
    await client.query('delete from auth.sessions where user_id = $1', [targetId])
  })

  response.status(204).end()
}
