/**
 * Notícias e traduções — vitrine pública e painel.
 *
 * Mesmo formato de resposta do PostgREST (`author`, `translations` e `news`
 * embutidos): `src/lib/news-translations.js` continua montando a notícia no
 * idioma, no cliente e nas páginas renderizadas pelo servidor.
 *
 * Colunas de `news_translations` sempre listadas uma a uma: o visitante
 * anônimo só tem grant nas públicas (migration 0014). Um `t.*` faria o banco
 * recusar a consulta inteira.
 */
import { Router } from 'express'
import { requireSession } from '../auth/sessions.js'
import {
  badRequest,
  forbidden,
  idParam,
  intParam,
  normalizeSearch,
  notFound,
  optionalUuid,
  pageResult,
  pagination,
  pick,
} from '../http.js'
import { insertSql, updateSql } from '../sql.js'
import { normalizeGallery } from '../../../src/lib/news-content.js'
import {
  DEFAULT_LOCALE,
  LOCALES,
  normalizeLocale,
  TRANSLATION_LOCALES,
} from '../../../src/i18n/config.js'

export const newsRouter = Router()

const STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'archived']

/* -------------------------------------------------------------------------- */
/* Projeções                                                                   */
/* -------------------------------------------------------------------------- */

const CARD_COLUMNS = `
  n.id, n.name, n.kicker, n.slug, n.excerpt, n.cover_image, n.status,
  n.published_at, n.created_at, n.updated_at`

/** Só colunas do grant público de `profiles` (0013): o anônimo também lê a assinatura. */
const AUTHOR = `(
  select json_build_object('id', p.id, 'name', p.name, 'slug', p.slug,
                           'avatar_url', p.avatar_url, 'job_title', p.job_title)
    from public.profiles p where p.id = n.created_by
) as author`

const DETAIL_COLUMNS = `
  n.id, n.name, n.kicker, n.slug, n.excerpt, n.content,
  n.cover_image, n.cover_alt, n.cover_caption, n.cover_credit, n.gallery, n.status,
  n.created_by, n.created_at, n.updated_at, n.published_at, n.content_updated_at,
  ${AUTHOR}`

/** As versões que existem — para o `hreflang` e o seletor de idioma. */
const VERSIONS = `coalesce((
  select json_agg(json_build_object('locale', v.locale, 'slug', v.slug) order by v.locale)
    from public.news_translations v where v.news_id = n.id
), '[]'::json) as translations`

const ADMIN_LIST_COLUMNS = `
  n.id, n.name, n.slug, n.status, n.cover_image, n.updated_at, n.created_at, n.published_at,
  n.created_by,
  (select json_build_object('id', p.id, 'name', p.name)
     from public.profiles p where p.id = n.created_by) as author`

/** Texto da tradução no idioma pedido, embutido no card (recuo ao original). */
function translationText(localeParam) {
  return `coalesce((
    select json_agg(json_build_object('locale', v.locale, 'slug', v.slug, 'name', v.name,
                                      'kicker', v.kicker, 'excerpt', v.excerpt,
                                      'updated_at', v.updated_at))
      from public.news_translations v
     where v.news_id = n.id and v.locale = ${localeParam}
  ), '[]'::json) as translations`
}

/** Card de uma lista por idioma: parte da tradução, com a notícia embutida. */
const TRANSLATION_CARD_COLUMNS = `
  t.id, t.news_id, t.locale, t.name, t.slug, t.kicker, t.excerpt, t.updated_at,
  json_build_object('id', n.id, 'cover_image', n.cover_image, 'status', n.status,
                    'published_at', n.published_at, 'created_at', n.created_at,
                    'updated_at', n.updated_at) as news`

const TRANSLATION_ADMIN_COLUMNS = `
  t.id, t.news_id, t.locale, t.name, t.slug, t.kicker, t.excerpt, t.content, t.cover_alt,
  t.cover_caption, t.gallery, t.created_at, t.updated_at, t.content_updated_at`

const SORTS = {
  recent: 'n.published_at desc nulls last, n.created_at desc, n.id',
  oldest: 'n.published_at asc nulls last, n.created_at asc, n.id',
  name_asc: 'n.name asc, n.id',
  name_desc: 'n.name desc, n.id',
}

function localeOf(value) {
  return normalizeLocale(value)
}

/* -------------------------------------------------------------------------- */
/* Vitrine pública                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Lista paginada de um idioma — `/noticias`, `/en/news` ou `/es/noticias`.
 * Em outro idioma, só entra o que EXISTE nele: notícia sem tradução não
 * aparece na lista em inglês com o texto em português.
 */
newsRouter.get('/news/search', async (request, response) => {
  const query = request.query
  const page = pagination(query, { pageSize: 12, maxSize: 48 })
  const term = normalizeSearch(query.q)
  const locale = localeOf(query.locale)

  const result = await request.db.tx(async (client) => {
    if (locale !== DEFAULT_LOCALE) {
      const params = [locale]
      let where = `t.locale = $1 and n.status = 'published'`
      if (term) {
        params.push(LOCALES[locale].textSearch, term)
        where += ` and t.search_vector @@ websearch_to_tsquery($2::regconfig, $3)`
      }
      const from = `from public.news_translations t join public.news n on n.id = t.news_id where ${where}`
      const count = await client.query(`select count(*)::int as total ${from}`, params)
      const rows = await client.query(
        `select ${TRANSLATION_CARD_COLUMNS} ${from}
          order by n.published_at desc nulls last, t.created_at desc, t.id
          limit $${params.length + 1} offset $${params.length + 2}`,
        [...params, page.pageSize, page.offset],
      )
      return pageResult(rows.rows, count.rows[0].total, page)
    }

    const params = []
    let where = `n.status = 'published'`
    if (term) {
      params.push(term)
      where += ` and n.search_vector @@ websearch_to_tsquery('portuguese', $1)`
    }
    const count = await client.query(`select count(*)::int as total from public.news n where ${where}`, params)
    const rows = await client.query(
      `select ${CARD_COLUMNS} from public.news n where ${where}
        order by ${SORTS[query.sort] ?? SORTS.recent}
        limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, page.pageSize, page.offset],
    )
    return pageResult(rows.rows, count.rows[0].total, page)
  })

  response.json(result)
})

/** Últimas notícias — com o texto da tradução embutido quando há. */
newsRouter.get('/news/latest', async (request, response) => {
  const limit = intParam(request.query.limit, { fallback: 3, max: 24 })
  const locale = localeOf(request.query.locale)
  const translated = locale !== DEFAULT_LOCALE

  response.json(
    await request.db.query(
      `select ${CARD_COLUMNS}${translated ? `, ${translationText('$2')}` : ''}
         from public.news n
        where n.status = 'published'
        order by ${SORTS.recent}
        limit $1`,
      translated ? [limit, locale] : [limit],
    ),
  )
})

/**
 * Uma notícia publicada pelo slug DO IDIOMA. Em português, devolve a notícia
 * com as versões; em outro idioma, a tradução com a notícia embutida (`news`),
 * no formato que `localizeArticle` espera.
 */
newsRouter.get('/news/slug/:slug', async (request, response) => {
  const slug = String(request.params.slug).slice(0, 200)
  const locale = localeOf(request.query.locale)

  if (locale === DEFAULT_LOCALE) {
    response.json(
      await request.db.one(
        `select ${DETAIL_COLUMNS}, ${VERSIONS}
           from public.news n where n.slug = $1 and n.status = 'published'`,
        [slug],
      ),
    )
    return
  }

  response.json(
    await request.db.one(
      `select t.id, t.news_id, t.locale, t.name, t.slug, t.kicker, t.excerpt, t.content,
              t.cover_alt, t.cover_caption, t.gallery, t.created_at, t.updated_at,
              t.content_updated_at,
              (select row_to_json(x) from (select ${DETAIL_COLUMNS}, ${VERSIONS}) x) as news
         from public.news_translations t
         join public.news n on n.id = t.news_id
        where t.locale = $1 and t.slug = $2 and n.status = 'published'`,
      [locale, slug],
    ),
  )
})

/** Outras notícias do MESMO idioma da que está aberta. */
newsRouter.get('/news/related', async (request, response) => {
  const limit = intParam(request.query.limit, { fallback: 3, max: 12 })
  const locale = localeOf(request.query.locale)
  const excludeId = optionalUuid(request.query.excludeId)

  if (locale !== DEFAULT_LOCALE) {
    response.json(
      await request.db.query(
        `select ${TRANSLATION_CARD_COLUMNS}
           from public.news_translations t join public.news n on n.id = t.news_id
          where t.locale = $1 and n.status = 'published' and t.news_id is distinct from $2
          order by n.published_at desc nulls last, t.id
          limit $3`,
        [locale, excludeId, limit],
      ),
    )
    return
  }

  response.json(
    await request.db.query(
      `select ${CARD_COLUMNS} from public.news n
        where n.status = 'published' and n.id is distinct from $1
        order by ${SORTS.recent} limit $2`,
      [excludeId, limit],
    ),
  )
})

/** Idiomas com ao menos uma notícia publicada. O português entra sempre. */
newsRouter.get('/news/locales', async (request, response) => {
  const rows = await request.db.query(
    `select distinct t.locale
       from public.news_translations t join public.news n on n.id = t.news_id
      where n.status = 'published'`,
  )
  const found = new Set(rows.map((row) => row.locale))
  response.json([DEFAULT_LOCALE, ...TRANSLATION_LOCALES.filter((code) => found.has(code))])
})

/* -------------------------------------------------------------------------- */
/* Autores                                                                     */
/* -------------------------------------------------------------------------- */

/** Perfil público. A policy da 0012 só deixa ver quem tem notícia publicada. */
newsRouter.get('/authors/:slug', async (request, response) => {
  response.json(
    await request.db.one(
      `select id, name, slug, bio, job_title, avatar_url, profile_updated_at
         from public.profiles where slug = $1`,
      [String(request.params.slug).slice(0, 200)],
    ),
  )
})

newsRouter.get('/authors/:id/news', async (request, response) => {
  const authorId = idParam(request.params.id)
  const page = pagination(request.query, { pageSize: 12, maxSize: 48 })
  const locale = localeOf(request.query.locale)
  const translated = locale !== DEFAULT_LOCALE

  const result = await request.db.tx(async (client) => {
    const count = await client.query(
      `select count(*)::int as total from public.news n where n.created_by = $1 and n.status = 'published'`,
      [authorId],
    )
    const rows = await client.query(
      `select ${CARD_COLUMNS}${translated ? `, ${translationText('$4')}` : ''}
         from public.news n
        where n.created_by = $1 and n.status = 'published'
        order by ${SORTS.recent}
        limit $2 offset $3`,
      translated ? [authorId, page.pageSize, page.offset, locale] : [authorId, page.pageSize, page.offset],
    )
    return pageResult(rows.rows, count.rows[0].total, page)
  })

  response.json(result)
})

/* -------------------------------------------------------------------------- */
/* Painel                                                                      */
/* -------------------------------------------------------------------------- */

newsRouter.get('/admin/news', requireSession, async (request, response) => {
  const query = request.query
  const page = pagination(query, { pageSize: 20, maxSize: 100 })
  const conditions = []
  const params = []
  const add = (value) => {
    params.push(value)
    return `$${params.length}`
  }

  const term = normalizeSearch(query.q)
  if (term) conditions.push(`n.search_vector @@ websearch_to_tsquery('portuguese', ${add(term)})`)
  if (STATUSES.includes(query.status)) conditions.push(`n.status = ${add(query.status)}::public.initiative_status`)
  const createdBy = optionalUuid(query.createdBy)
  if (createdBy) conditions.push(`n.created_by = ${add(createdBy)}`)

  const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
  const sort = query.sort ?? 'recent'
  const order = sort === 'recent' ? 'n.updated_at desc, n.id' : (SORTS[sort] ?? SORTS.recent)

  const result = await request.db.tx(async (client) => {
    const count = await client.query(`select count(*)::int as total from public.news n ${where}`, params)
    const rows = await client.query(
      `select ${ADMIN_LIST_COLUMNS} from public.news n ${where}
        order by ${order}
        limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, page.pageSize, page.offset],
    )
    return pageResult(rows.rows, count.rows[0].total, page)
  })

  response.json(result)
})

newsRouter.get('/admin/news/pending', requireSession, async (request, response) => {
  const limit = intParam(request.query.limit, { fallback: 20, max: 100 })
  response.json(
    await request.db.query(
      `select ${ADMIN_LIST_COLUMNS} from public.news n
        where n.status = 'pending_review'
        order by n.updated_at asc limit $1`,
      [limit],
    ),
  )
})

newsRouter.get('/news/:id', requireSession, async (request, response) => {
  response.json(
    await request.db.one(`select ${DETAIL_COLUMNS} from public.news n where n.id = $1`, [
      idParam(request.params.id),
    ]),
  )
})

newsRouter.get('/news/:id/reviews', requireSession, async (request, response) => {
  response.json(
    await request.db.query(
      `select r.id, r.from_status, r.to_status, r.notes, r.created_at,
              (select json_build_object('id', p.id, 'name', p.name)
                 from public.profiles p where p.id = r.reviewer_id) as reviewer
         from public.news_reviews r
        where r.news_id = $1
        order by r.created_at desc`,
      [idParam(request.params.id)],
    ),
  )
})

/* -------------------------------------------------------------------------- */
/* Escrita                                                                     */
/* -------------------------------------------------------------------------- */

const WRITABLE_FIELDS = [
  'name',
  'kicker',
  'slug',
  'excerpt',
  'content',
  'cover_image',
  'cover_alt',
  'cover_caption',
  'cover_credit',
  'gallery',
]

/**
 * Colunas reais, texto aparado, vazio vira null. `gallery` é `not null`: vai
 * como `[]`, e cada foto só leva os campos preenchidos.
 */
function toRow(values) {
  const row = pick(values, WRITABLE_FIELDS)
  for (const [field, value] of Object.entries(row)) {
    if (field === 'gallery') {
      row.gallery = normalizeGallery(value).map(({ url, caption, credit, alt }) => ({
        url,
        ...(caption ? { caption } : {}),
        ...(credit ? { credit } : {}),
        ...(alt ? { alt } : {}),
      }))
    } else {
      row[field] = typeof value === 'string' ? value.trim() || null : (value ?? null)
    }
  }
  return row
}

newsRouter.post('/news', requireSession, async (request, response) => {
  const statement = insertSql('public.news', toRow(request.body?.values ?? {}), {
    json: ['gallery'],
    returning: 'id, slug',
  })
  response.status(201).json(await request.db.one(statement.text, statement.values))
})

newsRouter.put('/news/:id', requireSession, async (request, response) => {
  const statement = updateSql('public.news', toRow(request.body?.values ?? {}), {
    where: 'id = $1',
    whereValues: [idParam(request.params.id)],
    json: ['gallery'],
    returning: 'id, slug',
  })
  const row = await request.db.one(statement.text, statement.values)
  if (!row) throw forbidden('Notícia não encontrada ou sem permissão de edição.')
  response.json(row)
})

newsRouter.post('/news/:id/status', requireSession, async (request, response) => {
  const status = String(request.body?.status ?? '')
  if (!STATUSES.includes(status)) throw notFound('Status desconhecido.')
  await request.db.query('select public.set_news_status($1, $2::public.initiative_status, $3)', [
    idParam(request.params.id),
    status,
    String(request.body?.notes ?? '').trim().slice(0, 2000) || null,
  ])
  response.status(204).end()
})

newsRouter.delete('/news/:id', requireSession, async (request, response) => {
  const rows = await request.db.query('delete from public.news where id = $1 returning id', [
    idParam(request.params.id),
  ])
  if (!rows.length) throw forbidden('Apenas administradores excluem notícias.')
  response.status(204).end()
})

/* -------------------------------------------------------------------------- */
/* Traduções                                                                   */
/* -------------------------------------------------------------------------- */

newsRouter.get('/news/:id/translations', requireSession, async (request, response) => {
  response.json(
    await request.db.query(
      `select ${TRANSLATION_ADMIN_COLUMNS} from public.news_translations t
        where t.news_id = $1 order by t.locale`,
      [idParam(request.params.id)],
    ),
  )
})

const TRANSLATION_FIELDS = ['name', 'kicker', 'excerpt', 'content', 'cover_alt', 'cover_caption', 'gallery']

/**
 * Colunas graváveis da tradução. Sem `slug`: nasce do título no primeiro
 * salvamento e não muda depois — é a URL da versão. A galeria guarda só o
 * texto de cada foto, casado pela URL.
 */
function toTranslationRow(values) {
  const row = pick(values, TRANSLATION_FIELDS)
  for (const [field, value] of Object.entries(row)) {
    if (field === 'gallery') {
      row.gallery = (Array.isArray(value) ? value : [])
        .map((item) => ({
          url: String(item?.url ?? '').trim(),
          caption: String(item?.caption ?? '').trim(),
          alt: String(item?.alt ?? '').trim(),
        }))
        .filter((item) => item.url && (item.caption || item.alt))
        .map(({ url, caption, alt }) => ({
          url,
          ...(caption ? { caption } : {}),
          ...(alt ? { alt } : {}),
        }))
    } else {
      row[field] = typeof value === 'string' ? value.trim() || null : (value ?? null)
    }
  }
  return row
}

newsRouter.post('/news/:id/translations', requireSession, async (request, response) => {
  const locale = String(request.body?.locale ?? '')
  if (!TRANSLATION_LOCALES.includes(locale)) throw badRequest('Idioma de tradução inválido.')

  const statement = insertSql(
    'public.news_translations as t',
    { ...toTranslationRow(request.body?.values ?? {}), news_id: idParam(request.params.id), locale },
    { json: ['gallery'], returning: TRANSLATION_ADMIN_COLUMNS },
  )
  response.status(201).json(await request.db.one(statement.text, statement.values))
})

newsRouter.put('/news-translations/:id', requireSession, async (request, response) => {
  const statement = updateSql('public.news_translations as t', toTranslationRow(request.body?.values ?? {}), {
    where: 't.id = $1',
    whereValues: [idParam(request.params.id)],
    json: ['gallery'],
    returning: TRANSLATION_ADMIN_COLUMNS,
  })
  const row = await request.db.one(statement.text, statement.values)
  if (!row) throw forbidden('Tradução não encontrada ou sem permissão de edição.')
  response.json(row)
})

/**
 * O RLS, em DELETE, não dá erro: só filtra. Sem o `returning`, um editor
 * tentando tirar do ar a tradução de uma notícia publicada — o que só revisor
 * faz — veria "excluída" sem nada ter acontecido.
 */
newsRouter.delete('/news-translations/:id', requireSession, async (request, response) => {
  const rows = await request.db.query('delete from public.news_translations where id = $1 returning id', [
    idParam(request.params.id),
  ])
  if (!rows.length) {
    throw forbidden(
      'Você não tem permissão para excluir esta tradução. Com a notícia publicada, só revisores e administradores retiram uma versão do ar.',
    )
  }
  response.status(204).end()
})
