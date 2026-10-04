/**
 * Categorias, tags, pessoas, áreas e identidade do site.
 *
 * Quem pode escrever o quê continua sendo do RLS (migrations 0003 e 0005):
 * categoria e identidade só administrador; tag e pessoa qualquer membro ativo.
 * Uma escrita barrada volta como 403, porque o `returning` vem vazio.
 */
import { Router } from 'express'
import { requireSession } from '../auth/sessions.js'
import {
  badRequest,
  forbidden,
  HttpError,
  idParam,
  likePattern,
  pick,
  uuidList,
} from '../http.js'
import { invalidateSite } from '../site.js'
import { insertSql, updateSql } from '../sql.js'

export const catalogRouter = Router()

/* -------------------------------- categorias ------------------------------ */

const CATEGORY_COLUMNS = 'id, name, slug, description, icon, image_url, position, created_at, updated_at'
const CATEGORY_FIELDS = ['name', 'slug', 'description', 'icon', 'image_url', 'position']

function categoryRow(values) {
  const row = pick(values, CATEGORY_FIELDS)
  for (const [field, value] of Object.entries(row)) {
    if (field === 'position') row.position = Number.isInteger(value) ? value : 0
    else row[field] = typeof value === 'string' ? value.trim() || null : (value ?? null)
  }
  return row
}

catalogRouter.get('/categories', async (request, response) => {
  response.json(await request.db.query(`select ${CATEGORY_COLUMNS} from public.categories order by position, name`))
})

/** Com a contagem de iniciativas publicadas — a home. Uma consulta, sem N+1. */
catalogRouter.get('/categories/with-counts', async (request, response) => {
  response.json(
    await request.db.query(
      `select ${CATEGORY_COLUMNS.split(', ').map((column) => `c.${column}`).join(', ')},
              (select count(*)::int from public.initiatives i
                where i.category_id = c.id and i.status = 'published') as published_count
         from public.categories c
        order by c.position, c.name`,
    ),
  )
})

catalogRouter.get('/categories/slug/:slug', async (request, response) => {
  response.json(
    await request.db.one(`select ${CATEGORY_COLUMNS} from public.categories where slug = $1`, [
      String(request.params.slug).slice(0, 200),
    ]),
  )
})

catalogRouter.post('/categories', requireSession, async (request, response) => {
  const statement = insertSql('public.categories', categoryRow(request.body ?? {}), {
    returning: CATEGORY_COLUMNS,
  })
  response.status(201).json(await request.db.one(statement.text, statement.values))
})

catalogRouter.put('/categories/:id', requireSession, async (request, response) => {
  const statement = updateSql('public.categories', categoryRow(request.body ?? {}), {
    where: 'id = $1',
    whereValues: [idParam(request.params.id)],
    returning: CATEGORY_COLUMNS,
  })
  const row = await request.db.one(statement.text, statement.values)
  if (!row) throw forbidden('Apenas administradores alteram categorias.')
  response.json(row)
})

catalogRouter.delete('/categories/:id', requireSession, async (request, response) => {
  try {
    const rows = await request.db.query('delete from public.categories where id = $1 returning id', [
      idParam(request.params.id),
    ])
    if (!rows.length) throw forbidden('Apenas administradores excluem categorias.')
  } catch (error) {
    // FK restritiva: a categoria ainda tem iniciativas.
    if (error?.code === '23503') {
      throw new HttpError(
        409,
        'Esta categoria possui iniciativas vinculadas. Mova-as para outra categoria antes de excluir.',
        '23503',
      )
    }
    throw error
  }
  response.status(204).end()
})

/** Nova ordem depois de arrastar — numa transação: ou a ordem toda, ou nada. */
catalogRouter.post('/categories/reorder', requireSession, async (request, response) => {
  const ids = uuidList(request.body?.ids)
  await request.db.tx(async (client) => {
    for (const [index, id] of ids.entries()) {
      const { rowCount } = await client.query('update public.categories set position = $2 where id = $1', [
        id,
        index + 1,
      ])
      if (!rowCount) throw forbidden('Apenas administradores reordenam categorias.')
    }
  })
  response.status(204).end()
})

/* ---------------------------------- tags ---------------------------------- */

catalogRouter.get('/tags', async (request, response) => {
  response.json(await request.db.query('select id, name, slug from public.tags order by name'))
})

/** Mesma regra do `slugify` do frontend, para os dois lados casarem. */
function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Nomes de tag → ids, criando as que não existem. O editor digita livremente,
 * sem cadastrar tag antes. Tudo numa transação.
 */
catalogRouter.post('/tags/resolve', requireSession, async (request, response) => {
  const names = [
    ...new Set(
      (Array.isArray(request.body?.names) ? request.body.names : [])
        .map((name) => String(name ?? '').trim().slice(0, 80))
        .filter(Boolean),
    ),
  ].slice(0, 50)

  const ids = await request.db.tx(async (client) => {
    const result = []
    for (const name of names) {
      const slug = slugify(name)
      const existing = await client.query(
        'select id from public.tags where slug = $1 or lower(btrim(name)) = lower($2) limit 1',
        [slug, name],
      )
      if (existing.rows[0]) {
        result.push(existing.rows[0].id)
        continue
      }
      // `on conflict do nothing`: outra pessoa pode ter criado a mesma tag
      // entre a consulta e a gravação. Aí basta ler a que ela criou.
      const created = await client.query(
        'insert into public.tags (name, slug) values ($1, $2) on conflict do nothing returning id',
        [name, slug],
      )
      const id =
        created.rows[0]?.id ??
        (await client.query('select id from public.tags where lower(btrim(name)) = lower($1)', [name])).rows[0]?.id
      if (id) result.push(id)
    }
    return [...new Set(result)]
  })

  response.json(ids)
})

catalogRouter.delete('/tags/:id', requireSession, async (request, response) => {
  const rows = await request.db.query('delete from public.tags where id = $1 returning id', [
    idParam(request.params.id),
  ])
  if (!rows.length) throw forbidden('Apenas administradores excluem tags.')
  response.status(204).end()
})

/* --------------------------------- pessoas -------------------------------- */

const PERSON_COLUMNS = 'id, name, email, role, photo_url, created_at'
const PERSON_FIELDS = ['name', 'email', 'role', 'photo_url']

function personRow(values) {
  const row = pick(values, PERSON_FIELDS)
  for (const [field, value] of Object.entries(row)) {
    row[field] = typeof value === 'string' ? value.trim() || null : (value ?? null)
  }
  return row
}

catalogRouter.get('/people', async (request, response) => {
  const pattern = likePattern(request.query.search)
  response.json(
    await request.db.query(
      `select ${PERSON_COLUMNS} from public.people
        ${pattern ? 'where name ilike $1' : ''}
        order by name limit 200`,
      pattern ? [pattern] : [],
    ),
  )
})

catalogRouter.post('/people', requireSession, async (request, response) => {
  const row = personRow(request.body ?? {})
  if (!row.name) throw badRequest('Informe o nome.')
  const statement = insertSql('public.people', row, { returning: PERSON_COLUMNS })
  response.status(201).json(await request.db.one(statement.text, statement.values))
})

catalogRouter.put('/people/:id', requireSession, async (request, response) => {
  const statement = updateSql('public.people', personRow(request.body ?? {}), {
    where: 'id = $1',
    whereValues: [idParam(request.params.id)],
    returning: PERSON_COLUMNS,
  })
  const row = await request.db.one(statement.text, statement.values)
  if (!row) throw forbidden()
  response.json(row)
})

catalogRouter.delete('/people/:id', requireSession, async (request, response) => {
  const rows = await request.db.query('delete from public.people where id = $1 returning id', [
    idParam(request.params.id),
  ])
  if (!rows.length) throw forbidden('Apenas administradores excluem pessoas.')
  response.status(204).end()
})

/* ---------------------------------- áreas --------------------------------- */

/** Áreas em uso no catálogo publicado, com a contagem. */
catalogRouter.get('/areas', async (request, response) => {
  response.json(
    await request.db.query(
      `select area as name, count(*)::int as count
         from public.initiatives i, unnest(i.areas) as area
        where i.status = 'published'
        group by area
        order by count(*) desc, area`,
    ),
  )
})

/* ------------------------------ identidade -------------------------------- */

const SETTINGS_COLUMNS = `
  id,
  brand_name, brand_tagline, logo_url,
  header_bg, header_fg, header_border, header_sticky, header_show_search, header_nav,
  footer_bg, footer_fg, footer_description, footer_partners_label, footer_partners,
  footer_social, footer_show_categories, footer_contact_email, footer_contact_phone,
  footer_address, footer_copyright, footer_note,
  primary_color, brand_color,
  updated_at, updated_by`

const SETTINGS_FIELDS = SETTINGS_COLUMNS.split(',')
  .map((column) => column.trim())
  .filter((column) => column && !['id', 'updated_at', 'updated_by'].includes(column))

const SETTINGS_JSON = ['header_nav', 'footer_partners', 'footer_social']

catalogRouter.get('/site-settings', async (request, response) => {
  response.json(await request.db.one(`select ${SETTINGS_COLUMNS} from public.site_settings limit 1`))
})

catalogRouter.put('/site-settings', requireSession, async (request, response) => {
  const row = pick(request.body ?? {}, SETTINGS_FIELDS)
  const statement = updateSql('public.site_settings', row, {
    where: 'id = true',
    json: SETTINGS_JSON,
    returning: SETTINGS_COLUMNS,
  })

  try {
    const saved = await request.db.one(statement.text, statement.values)
    if (!saved) throw forbidden('Apenas administradores alteram a identidade do site.')
    invalidateSite()
    response.json(saved)
  } catch (error) {
    if (error?.code === '23514' && /colors_are_hex/.test(error.constraint ?? error.message)) {
      throw badRequest('Alguma cor está em formato inválido. Use hexadecimal, como #145c33.')
    }
    throw error
  }
})
