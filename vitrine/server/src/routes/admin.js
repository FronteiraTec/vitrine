/**
 * Painel: equipe, contas, métricas e log de atividade.
 *
 * Todas as rotas exigem sessão, e o resto é do banco: `profiles` só aparece
 * para a equipe ativa (RLS), o gatilho `guard_profile_changes` impede alguém
 * de promover a si mesmo, e `activity_log` só é legível por quem é da equipe.
 */
import { Router } from 'express'
import { createUserByAdmin, PROFILE_COLUMNS, setPasswordByAdmin } from '../auth/routes.js'
import { requireSession } from '../auth/sessions.js'
import { forbidden, idParam, intParam, likePattern, pageResult, pagination, pick } from '../http.js'
import { updateSql } from '../sql.js'

export const adminRouter = Router()
adminRouter.use(requireSession)

/* --------------------------------- equipe --------------------------------- */

adminRouter.get('/profiles', async (request, response) => {
  response.json(await request.db.query(`select ${PROFILE_COLUMNS} from public.profiles order by name`))
})

/**
 * Atualiza um perfil. Serve aos dois casos — o administrador mudando papel e
 * ativação de alguém, e a pessoa editando o próprio nome e foto —, porque quem
 * decide o que cada um pode mudar é a policy e o gatilho, não a rota.
 */
adminRouter.patch('/profiles/:id', async (request, response) => {
  const row = pick(request.body ?? {}, ['name', 'avatar_url', 'role', 'is_active'])
  if (typeof row.name === 'string') row.name = row.name.trim().slice(0, 120)
  if ('avatar_url' in row) row.avatar_url = String(row.avatar_url ?? '').trim() || null
  if ('is_active' in row) row.is_active = Boolean(row.is_active)

  const statement = updateSql('public.profiles', row, {
    where: 'id = $1',
    whereValues: [idParam(request.params.id)],
    returning: PROFILE_COLUMNS,
  })
  const saved = await request.db.one(statement.text, statement.values)
  if (!saved) throw forbidden()
  response.json(saved)
})

adminRouter.post('/users', createUserByAdmin)
adminRouter.post('/users/:id/password', (request, response) => {
  idParam(request.params.id)
  return setPasswordByAdmin(request, response)
})

/* -------------------------------- dashboard ------------------------------- */

adminRouter.get('/dashboard/stats', async (request, response) => {
  const row = await request.db.one('select public.dashboard_stats() as data')
  const data = row?.data ?? {}
  response.json({
    total: data.total ?? 0,
    byStatus: data.by_status ?? {},
    categories: data.categories ?? 0,
    people: data.people ?? 0,
    byCategory: data.by_category ?? [],
  })
})

/* ---------------------------------- log ----------------------------------- */

const ACTIVITY_COLUMNS =
  'id, actor_id, actor_name, action, entity_type, entity_id, entity_name, metadata, created_at'

/** Filtros do log. `from` e `to` chegam como instantes ISO, já no fuso de quem pediu. */
function activityWhere(query) {
  const conditions = []
  const params = []
  const add = (value) => {
    params.push(value)
    return `$${params.length}`
  }

  const pattern = likePattern(query.q)
  if (pattern) {
    const placeholder = add(pattern)
    conditions.push(`(entity_name ilike ${placeholder} or actor_name ilike ${placeholder})`)
  }
  if (query.action) conditions.push(`action = ${add(String(query.action).slice(0, 40))}`)
  if (query.entityType) conditions.push(`entity_type = ${add(String(query.entityType).slice(0, 40))}`)
  if (query.actorId === 'system') conditions.push('actor_id is null')
  else if (/^[0-9a-f-]{36}$/i.test(query.actorId ?? '')) conditions.push(`actor_id = ${add(query.actorId)}`)

  for (const [key, operator] of [
    ['from', '>='],
    ['to', '<'],
  ]) {
    const value = query[key] ? new Date(query[key]) : null
    if (value && !Number.isNaN(value.getTime())) conditions.push(`created_at ${operator} ${add(value.toISOString())}`)
  }

  return { where: conditions.length ? `where ${conditions.join(' and ')}` : '', params }
}

adminRouter.get('/activity', async (request, response) => {
  const limit = intParam(request.query.limit, { fallback: 20, max: 100 })
  response.json(
    await request.db.query(
      `select ${ACTIVITY_COLUMNS} from public.activity_log order by created_at desc, id desc limit $1`,
      [limit],
    ),
  )
})

adminRouter.get('/activity/log', async (request, response) => {
  const page = pagination(request.query, { pageSize: 25, maxSize: 100 })
  const { where, params } = activityWhere(request.query)

  const result = await request.db.tx(async (client) => {
    const count = await client.query(`select count(*)::int as total from public.activity_log ${where}`, params)
    const rows = await client.query(
      `select ${ACTIVITY_COLUMNS} from public.activity_log ${where}
        order by created_at desc, id desc
        limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, page.pageSize, page.offset],
    )
    return pageResult(rows.rows, count.rows[0].total, page)
  })

  response.json(result)
})

export const ACTIVITY_EXPORT_LIMIT = 20000

/**
 * Tudo o que casa com os filtros, para a planilha, numa consulta só. Uma linha
 * a mais que o teto diz se a planilha saiu cortada.
 */
adminRouter.get('/activity/export', async (request, response) => {
  const { where, params } = activityWhere(request.query)
  const rows = await request.db.query(
    `select ${ACTIVITY_COLUMNS} from public.activity_log ${where}
      order by created_at desc, id desc
      limit $${params.length + 1}`,
    [...params, ACTIVITY_EXPORT_LIMIT + 1],
  )
  response.json({ items: rows.slice(0, ACTIVITY_EXPORT_LIMIT), truncated: rows.length > ACTIVITY_EXPORT_LIMIT })
})
