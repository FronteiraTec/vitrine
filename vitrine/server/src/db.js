/**
 * Acesso ao Postgres.
 *
 * TODA consulta passa por `withRole`: abre uma transação, assume o papel de
 * quem pediu e grava o usuário em `request.jwt.claims` — o mesmo contrato que o
 * PostgREST seguia no Supabase. É isso que mantém as policies de RLS, os
 * gatilhos do workflow e o `auth.uid()` das migrations funcionando sem
 * alteração: para o banco, nada mudou.
 *
 * A conexão é do papel `authenticator` (NOINHERIT), que sozinho não lê tabela
 * nenhuma. Um caminho de código que esquecesse de assumir um papel recebe
 * "permission denied" — nunca acesso irrestrito.
 */
import pg from 'pg'
import { config } from './config.js'

// bigint (count, sum) chega como texto por padrão. As contagens daqui cabem
// com folga num Number, e o frontend sempre as tratou como número.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10))
// `date` virava um Date à meia-noite LOCAL do servidor, e o JSON o deslocaria
// para o dia anterior em UTC. Sai como o texto 'AAAA-MM-DD' que o banco tem.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value)

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
})

pool.on('error', (error) => {
  // Conexão ociosa derrubada pelo banco (reinício, failover). O pool descarta e
  // abre outra; só vale registrar.
  console.error('[db] conexão ociosa encerrada:', error.message)
})

/** Papéis que a API pode assumir. Qualquer outro valor é erro de programação. */
const ROLES = new Set(['anon', 'authenticated', 'service_role'])

/**
 * Executa `fn(client)` dentro de uma transação com o papel indicado.
 *
 * `actor` é `{ role, userId }`. Sem `userId`, `auth.uid()` é null — o que as
 * migrations tratam como "sessão privilegiada" nos gatilhos do workflow. Por
 * isso `service_role` NUNCA recebe grant de escrita em tabela de conteúdo.
 */
export async function withRole(actor, fn) {
  const role = actor?.role ?? 'anon'
  if (!ROLES.has(role)) throw new Error(`Papel desconhecido: ${role}`)

  const claims = JSON.stringify(actor?.userId ? { sub: actor.userId, role } : { role })
  const client = await pool.connect()

  try {
    await client.query('begin')
    await client.query(
      `select set_config('role', $1, true),
              set_config('request.jwt.claims', $2, true),
              set_config('statement_timeout', '15000', true)`,
      [role, claims],
    )
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

/**
 * Troca o papel no MEIO de uma transação já aberta por `withRole`. Serve às
 * operações que juntam passos de donos diferentes e precisam ser atômicas —
 * criar uma conta (serviço) e definir o papel dela (o administrador que pediu).
 */
export async function switchRole(client, actor) {
  const role = actor?.role ?? 'anon'
  if (!ROLES.has(role)) throw new Error(`Papel desconhecido: ${role}`)
  const claims = JSON.stringify(actor?.userId ? { sub: actor.userId, role } : { role })
  await client.query(
    `select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)`,
    [role, claims],
  )
}

/** Uma consulta isolada, já com o papel. Devolve as linhas. */
export async function queryAs(actor, text, params = []) {
  return withRole(actor, async (client) => (await client.query(text, params)).rows)
}

/** Os três atores possíveis. */
export const ANON = Object.freeze({ role: 'anon' })
export const SERVICE = Object.freeze({ role: 'service_role' })
export function userActor(userId) {
  return { role: 'authenticated', userId }
}

/** Ator da requisição: o usuário da sessão, ou anônimo. */
export function actorOf(request) {
  return request.auth?.userId ? userActor(request.auth.userId) : ANON
}

/**
 * Atalhos presos à requisição — `req.db.query(...)` e `req.db.tx(...)` —, para
 * as rotas não terem como consultar sem papel.
 */
export function attachDb(request, _response, next) {
  const actor = () => actorOf(request)
  request.db = {
    query: (text, params) => queryAs(actor(), text, params),
    one: async (text, params) => (await queryAs(actor(), text, params))[0] ?? null,
    tx: (fn) => withRole(actor(), fn),
  }
  next()
}
