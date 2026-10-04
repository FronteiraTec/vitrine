/**
 * Iniciativas — vitrine pública e painel.
 *
 * As respostas têm o MESMO formato que o PostgREST devolvia (`category`,
 * `tags`, `team`, `links` embutidos), para as telas não precisarem mudar.
 * Cada consulta roda com o papel de quem pediu: rascunho só aparece para a
 * equipe porque o RLS decide, não porque a rota filtrou.
 */
import { Router } from 'express'
import { requireSession } from '../auth/sessions.js'
import {
  forbidden,
  idParam,
  intParam,
  normalizeSearch,
  notFound,
  optionalUuid,
  pageResult,
  pagination,
  pick,
  textList,
  uuidList,
} from '../http.js'
import { insertSql, updateSql } from '../sql.js'

export const initiativesRouter = Router()

const STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'archived']

/* -------------------------------------------------------------------------- */
/* Projeções                                                                   */
/* -------------------------------------------------------------------------- */

const CATEGORY_CARD = `(
  select json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'icon', c.icon)
    from public.categories c where c.id = i.category_id
) as category`

const TAGS = `coalesce((
  select json_agg(json_build_object('id', t.id, 'name', t.name, 'slug', t.slug) order by t.name)
    from public.initiative_tags it
    join public.tags t on t.id = it.tag_id
   where it.initiative_id = i.id
), '[]'::json) as tags`

/** Colunas do card. Sem o texto longo: a listagem não precisa dele. */
const CARD_COLUMNS = `
  i.id, i.name, i.slug, i.short_description, i.cover_image, i.areas, i.location, i.city, i.state,
  i.status, i.published_at, i.created_at, i.updated_at,
  ${CATEGORY_CARD},
  ${TAGS}`

const DETAIL_COLUMNS = `
  i.id, i.name, i.slug, i.short_description, i.description, i.cover_image, i.gallery, i.areas,
  i.status, i.location, i.campus, i.city, i.state, i.email, i.phone, i.website,
  i.category_id, i.created_by, i.created_at, i.updated_at, i.published_at,
  (select json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'icon', c.icon,
                            'description', c.description)
     from public.categories c where c.id = i.category_id) as category,
  ${TAGS},
  coalesce((
    select json_agg(json_build_object(
             'role', ip.role,
             'position', ip.position,
             'person', json_build_object('id', p.id, 'name', p.name, 'email', p.email,
                                         'role', p.role, 'photo_url', p.photo_url)
           ) order by ip.position)
      from public.initiative_people ip
      join public.people p on p.id = ip.person_id
     where ip.initiative_id = i.id
  ), '[]'::json) as team,
  coalesce((
    select json_agg(json_build_object('id', l.id, 'label', l.label, 'url', l.url,
                                      'type', l.type, 'position', l.position)
                    order by l.position)
      from public.initiative_links l
     where l.initiative_id = i.id
  ), '[]'::json) as links`

const ADMIN_LIST_COLUMNS = `
  i.id, i.name, i.slug, i.status, i.cover_image, i.updated_at, i.created_at, i.published_at,
  i.created_by,
  (select json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
     from public.categories c where c.id = i.category_id) as category,
  (select json_build_object('id', p.id, 'name', p.name)
     from public.profiles p where p.id = i.created_by) as author`

/** Ordenações aceitas. `id` desempata, para a paginação não repetir linhas. */
const SORTS = {
  recent: 'i.published_at desc nulls last, i.created_at desc, i.id',
  oldest: 'i.published_at asc nulls last, i.created_at asc, i.id',
  name_asc: 'i.name asc, i.id',
  name_desc: 'i.name desc, i.id',
}

/** Monta `where` a partir dos filtros, acumulando os parâmetros. */
function filters(conditions, params, { term, categoryIds, areas, tagIds, status, categoryId, createdBy }) {
  const add = (value) => {
    params.push(value)
    return `$${params.length}`
  }
  if (term) conditions.push(`i.search_vector @@ websearch_to_tsquery('portuguese', ${add(term)})`)
  if (categoryIds?.length) conditions.push(`i.category_id = any(${add(categoryIds)}::uuid[])`)
  if (areas?.length) conditions.push(`i.areas && ${add(areas)}::text[]`)
  if (tagIds?.length) {
    conditions.push(
      `exists (select 1 from public.initiative_tags ft
                where ft.initiative_id = i.id and ft.tag_id = any(${add(tagIds)}::uuid[]))`,
    )
  }
  if (status) conditions.push(`i.status = ${add(status)}::public.initiative_status`)
  if (categoryId) conditions.push(`i.category_id = ${add(categoryId)}`)
  if (createdBy) conditions.push(`i.created_by = ${add(createdBy)}`)
}

async function paged(db, { columns, conditions, params, order, page }) {
  const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
  return db.tx(async (client) => {
    const count = await client.query(`select count(*)::int as total from public.initiatives i ${where}`, params)
    const rows = await client.query(
      `select ${columns} from public.initiatives i ${where}
        order by ${order}
        limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, page.pageSize, page.offset],
    )
    return pageResult(rows.rows, count.rows[0].total, page)
  })
}

/* -------------------------------------------------------------------------- */
/* Vitrine pública                                                             */
/* -------------------------------------------------------------------------- */

/** Busca paginada da vitrine — sempre só o que está publicado. */
initiativesRouter.get('/initiatives/search', async (request, response) => {
  const query = request.query
  const page = pagination(query, { pageSize: 12, maxSize: 48 })
  const conditions = [`i.status = 'published'`]
  const params = []

  filters(conditions, params, {
    term: normalizeSearch(query.q),
    categoryIds: uuidList(query.categoryIds),
    areas: textList(query.areas),
    tagIds: uuidList(query.tagIds),
  })

  response.json(
    await paged(request.db, {
      columns: CARD_COLUMNS,
      conditions,
      params,
      order: SORTS[query.sort] ?? SORTS.recent,
      page,
    }),
  )
})

initiativesRouter.get('/initiatives/featured', async (request, response) => {
  const limit = intParam(request.query.limit, { fallback: 6, max: 24 })
  response.json(
    await request.db.query(
      `select ${CARD_COLUMNS} from public.initiatives i
        where i.status = 'published'
        order by ${SORTS.recent} limit $1`,
      [limit],
    ),
  )
})

initiativesRouter.get('/initiatives/related', async (request, response) => {
  const categoryId = optionalUuid(request.query.categoryId)
  if (!categoryId) {
    response.json([])
    return
  }
  const limit = intParam(request.query.limit, { fallback: 3, max: 12 })
  response.json(
    await request.db.query(
      `select ${CARD_COLUMNS} from public.initiatives i
        where i.status = 'published' and i.category_id = $1 and i.id is distinct from $2
        order by ${SORTS.recent} limit $3`,
      [categoryId, optionalUuid(request.query.excludeId), limit],
    ),
  )
})

initiativesRouter.get('/initiatives/slug/:slug', async (request, response) => {
  const row = await request.db.one(
    `select ${DETAIL_COLUMNS} from public.initiatives i
      where i.slug = $1 and i.status = 'published'`,
    [String(request.params.slug).slice(0, 200)],
  )
  response.json(row)
})

/* -------------------------------------------------------------------------- */
/* Painel                                                                      */
/* -------------------------------------------------------------------------- */

initiativesRouter.get('/admin/initiatives', requireSession, async (request, response) => {
  const query = request.query
  const page = pagination(query, { pageSize: 20, maxSize: 100 })
  const conditions = []
  const params = []

  filters(conditions, params, {
    term: normalizeSearch(query.q),
    status: STATUSES.includes(query.status) ? query.status : null,
    categoryId: optionalUuid(query.categoryId),
    createdBy: optionalUuid(query.createdBy),
  })

  const sort = query.sort ?? 'recent'
  response.json(
    await paged(request.db, {
      columns: ADMIN_LIST_COLUMNS,
      conditions,
      params,
      order: sort === 'recent' ? 'i.updated_at desc, i.id' : (SORTS[sort] ?? SORTS.recent),
      page,
    }),
  )
})

initiativesRouter.get('/admin/initiatives/pending', requireSession, async (request, response) => {
  const limit = intParam(request.query.limit, { fallback: 20, max: 100 })
  response.json(
    await request.db.query(
      `select ${ADMIN_LIST_COLUMNS} from public.initiatives i
        where i.status = 'pending_review'
        order by i.updated_at asc limit $1`,
      [limit],
    ),
  )
})

initiativesRouter.get('/admin/initiatives/recent', requireSession, async (request, response) => {
  const limit = intParam(request.query.limit, { fallback: 5, max: 50 })
  response.json(
    await request.db.query(
      `select ${ADMIN_LIST_COLUMNS} from public.initiatives i
        order by i.created_at desc limit $1`,
      [limit],
    ),
  )
})

initiativesRouter.get('/initiatives/:id', requireSession, async (request, response) => {
  const row = await request.db.one(
    `select ${DETAIL_COLUMNS} from public.initiatives i where i.id = $1`,
    [idParam(request.params.id)],
  )
  response.json(row)
})

initiativesRouter.get('/initiatives/:id/reviews', requireSession, async (request, response) => {
  response.json(
    await request.db.query(
      `select r.id, r.from_status, r.to_status, r.notes, r.created_at,
              (select json_build_object('id', p.id, 'name', p.name)
                 from public.profiles p where p.id = r.reviewer_id) as reviewer
         from public.initiative_reviews r
        where r.initiative_id = $1
        order by r.created_at desc`,
      [idParam(request.params.id)],
    ),
  )
})

/* -------------------------------------------------------------------------- */
/* Escrita                                                                     */
/* -------------------------------------------------------------------------- */

const WRITABLE_FIELDS = [
  'category_id',
  'name',
  'slug',
  'short_description',
  'description',
  'cover_image',
  'gallery',
  'areas',
  'location',
  'campus',
  'city',
  'state',
  'email',
  'phone',
  'website',
]

/** Só colunas reais; texto aparado e vazio vira null; listas viram listas de texto. */
function toRow(values) {
  const row = pick(values, WRITABLE_FIELDS)
  for (const [field, value] of Object.entries(row)) {
    if (field === 'gallery' || field === 'areas') {
      row[field] = (Array.isArray(value) ? value : [])
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
    } else if (typeof value === 'string') {
      row[field] = value.trim() || null
    } else {
      row[field] = value ?? null
    }
  }
  return row
}

/**
 * Grava a iniciativa com tags, equipe e links NUMA TRANSAÇÃO SÓ.
 *
 * Com o PostgREST isso eram quatro requisições, e uma falha no meio deixava a
 * iniciativa salva com os vínculos pela metade (a limitação descrita no
 * README). Aqui, ou tudo entra, ou nada muda.
 */
async function saveInitiative(request, id) {
  const body = request.body ?? {}
  const row = toRow(body.values ?? {})
  const tagIds = uuidList(body.tagIds)
  const team = Array.isArray(body.team) ? body.team : []
  const links = Array.isArray(body.links) ? body.links : []

  return request.db.tx(async (client) => {
    const statement = id
      ? updateSql('public.initiatives', row, { where: 'id = $1', whereValues: [id], returning: 'id, slug' })
      : insertSql('public.initiatives', row, { returning: 'id, slug' })

    const { rows } = await client.query(statement.text, statement.values)
    const initiative = rows[0]
    if (!initiative) throw forbidden('Iniciativa não encontrada ou sem permissão de edição.')

    // Tags: remove o que saiu, insere o que entrou.
    await client.query(
      'delete from public.initiative_tags where initiative_id = $1 and not (tag_id = any($2::uuid[]))',
      [initiative.id, tagIds],
    )
    if (tagIds.length) {
      await client.query(
        `insert into public.initiative_tags (initiative_id, tag_id)
         select $1, unnest($2::uuid[])
         on conflict do nothing`,
        [initiative.id, tagIds],
      )
    }

    // Equipe e links: a ordem da tela é a ordem gravada.
    await client.query('delete from public.initiative_people where initiative_id = $1', [initiative.id])
    const members = team.filter((member) => optionalUuid(member?.person_id))
    const seen = new Set()
    for (const [position, member] of members.entries()) {
      if (seen.has(member.person_id)) continue
      seen.add(member.person_id)
      await client.query(
        `insert into public.initiative_people (initiative_id, person_id, role, position)
         values ($1, $2, $3, $4)`,
        [initiative.id, member.person_id, String(member.role ?? '').trim().slice(0, 200) || null, position],
      )
    }

    await client.query('delete from public.initiative_links where initiative_id = $1', [initiative.id])
    const validLinks = links.filter((link) => String(link?.url ?? '').trim() && String(link?.label ?? '').trim())
    for (const [position, link] of validLinks.entries()) {
      await client.query(
        `insert into public.initiative_links (initiative_id, label, url, type, position)
         values ($1, $2, $3, $4::public.link_type, $5)`,
        [
          initiative.id,
          String(link.label).trim().slice(0, 200),
          String(link.url).trim().slice(0, 2000),
          ['website', 'instagram', 'linkedin', 'youtube', 'github', 'facebook', 'other'].includes(link.type)
            ? link.type
            : 'other',
          position,
        ],
      )
    }

    return initiative
  })
}

initiativesRouter.post('/initiatives', requireSession, async (request, response) => {
  response.status(201).json(await saveInitiative(request, null))
})

initiativesRouter.put('/initiatives/:id', requireSession, async (request, response) => {
  response.json(await saveInitiative(request, idParam(request.params.id)))
})

/**
 * Mudança de status pela função do banco, que valida a transição, checa o
 * papel e grava a observação no histórico — tudo na mesma transação.
 */
initiativesRouter.post('/initiatives/:id/status', requireSession, async (request, response) => {
  const status = String(request.body?.status ?? '')
  if (!STATUSES.includes(status)) throw notFound('Status desconhecido.')
  await request.db.query('select public.set_initiative_status($1, $2::public.initiative_status, $3)', [
    idParam(request.params.id),
    status,
    String(request.body?.notes ?? '').trim().slice(0, 2000) || null,
  ])
  response.status(204).end()
})

initiativesRouter.delete('/initiatives/:id', requireSession, async (request, response) => {
  const rows = await request.db.query('delete from public.initiatives where id = $1 returning id', [
    idParam(request.params.id),
  ])
  // O RLS não dá erro em DELETE: só filtra. Nenhuma linha = sem permissão.
  if (!rows.length) throw forbidden('Apenas administradores excluem iniciativas.')
  response.status(204).end()
})
