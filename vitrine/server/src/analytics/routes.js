/**
 * Audiência: o registro de cada visualização e os relatórios do painel.
 */
import { Router } from 'express'
import { requireSession } from '../auth/sessions.js'
import { config } from '../config.js'
import { SERVICE, withRole } from '../db.js'
import { badRequest, HttpError, isUuid, optionalUuid } from '../http.js'
import { createLimiter } from '../rate-limit.js'
import { geoReady, lookup } from './geo.js'
import { classifySource } from './source.js'
import { normalizeLocale } from '../../../src/i18n/config.js'

export const analyticsRouter = Router()

const TYPES = ['news', 'initiative']

/* -------------------------------------------------------------------------- */
/* Registro                                                                    */
/* -------------------------------------------------------------------------- */

/*
 * Robôs que executam JavaScript (o renderizador do Google, ferramentas de
 * teste) chegariam a registrar acesso. A página já descarta navegador
 * automatizado; isto é a segunda camada, pelo User-Agent.
 */
const BOT = /bot|crawl|spider|slurp|archiver|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|pingdom|uptime|monitor|curl|wget|python|httpclient|axios|node-fetch|go-http|java\/|okhttp|scrapy|phantom|selenium|puppeteer|playwright/i

/** Um mesmo IP não registra mais que isto por minuto — o resto é descartado em silêncio. */
const viewsByIp = createLimiter({ windowMs: 60 * 1000, max: 60 })

let siteHost = ''
try {
  siteHost = config.siteUrl ? new URL(config.siteUrl).hostname.toLowerCase() : ''
} catch {
  siteHost = ''
}

/**
 * Registra uma visualização de notícia ou iniciativa.
 *
 * Sempre responde 204, conte ou não: a página não tem o que fazer com o
 * resultado, e uma resposta diferente para robô ensinaria o robô a se
 * disfarçar.
 */
analyticsRouter.post('/acessos', async (request, response) => {
  response.status(204)

  // A equipe navegando no próprio site — revisando, conferindo a publicação —
  // não é audiência.
  if (request.auth) return response.end()
  if (BOT.test(request.get('user-agent') ?? '')) return response.end()
  if (!viewsByIp.hit(request.ip)) return response.end()

  const body = request.body ?? {}
  const type = String(body.type ?? '')
  const id = String(body.id ?? '')
  if (!TYPES.includes(type) || !isUuid(id)) return response.end()

  const place = lookup(request.ip)
  const source = classifySource({
    internal: body.internal === true,
    utmSource: body.utmSource,
    referrer: body.referrer,
    siteHost: siteHost || String(request.get('host') ?? '').split(':')[0].toLowerCase(),
  })

  try {
    await withRole(SERVICE, (client) =>
      client.query('select public.record_content_view($1, $2, $3, $4, $5, $6, $7, $8, $9)', [
        type,
        id,
        normalizeLocale(body.locale),
        place.country,
        place.region,
        place.city,
        source,
        body.unique === true,
        config.analyticsTimezone,
      ]),
    )
  } catch (error) {
    // Contador fora do ar não pode derrubar a leitura da notícia.
    console.error('[audiencia] falha ao registrar acesso:', error.message)
  }

  response.end()
})

/* -------------------------------------------------------------------------- */
/* Relatórios                                                                  */
/* -------------------------------------------------------------------------- */

const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_DAYS = 3 * 366

/** Hoje no fuso da audiência, como 'AAAA-MM-DD'. */
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.analyticsTimezone }).format(new Date())
}

function shiftDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86_400_000) + 1
}

/** Período e filtros do relatório. Padrão: os últimos 30 dias. */
function reportFilters(query) {
  const to = DATE.test(query.to ?? '') ? query.to : today()
  const from = DATE.test(query.from ?? '') ? query.from : shiftDate(to, -29)
  if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) throw badRequest('Data inválida.')
  if (from > to) throw badRequest('O início do período precisa vir antes do fim.')
  if (daysBetween(from, to) > MAX_DAYS) throw badRequest('O período máximo é de três anos.')

  return {
    from,
    to,
    type: TYPES.includes(query.type) ? query.type : null,
    id: optionalUuid(query.id),
  }
}

/** Condições sobre `v` (content_views) e os parâmetros, a partir de `$1`. */
function where({ from, to, type, id }, alias = 'v') {
  const params = [from, to]
  const conditions = [`${alias}.day between $1::date and $2::date`]
  if (type) {
    params.push(type)
    conditions.push(`${alias}.content_type = $${params.length}`)
  }
  if (id) {
    params.push(id)
    conditions.push(`${alias}.content_id = $${params.length}`)
  }
  return { sql: conditions.join(' and '), params }
}

const SUMS = 'coalesce(sum(v.views), 0)::int as views, coalesce(sum(v.visitors), 0)::int as visitors'

/** Nome, endereço e situação do conteúdo — ou `null`, se foi excluído. */
const CONTENT_JOIN = `
  left join public.news n on v.content_type = 'news' and n.id = v.content_id
  left join public.initiatives i on v.content_type = 'initiative' and i.id = v.content_id`

analyticsRouter.get('/analytics', requireSession, async (request, response) => {
  const filters = reportFilters(request.query)
  const { sql, params } = where(filters)
  const span = daysBetween(filters.from, filters.to)
  const previous = where({
    ...filters,
    from: shiftDate(filters.from, -span),
    to: shiftDate(filters.from, -1),
  })

  const report = await request.db.tx(async (client) => {
    const run = async (text, values = params) => (await client.query(text, values)).rows

    // A equipe ativa lê a audiência; o RLS devolve zero linha para os demais,
    // mas uma tela inteira de zeros esconderia o motivo.
    const [{ ok }] = await run('select public.is_staff() as ok', [])
    if (!ok) throw new HttpError(403, 'Conta sem acesso ao painel.', '42501')

    const [totals] = await run(`select ${SUMS} from public.content_views v where ${sql}`)
    const [before] = await run(`select ${SUMS} from public.content_views v where ${previous.sql}`, previous.params)

    // Os dias sem acesso entram com zero: um gráfico que pula dias mente sobre o ritmo.
    const daily = await run(
      `select d::date as day, ${SUMS}
         from generate_series($1::date, $2::date, interval '1 day') as d
         left join public.content_views v on v.day = d::date
              ${filters.type ? `and v.content_type = $3` : ''}
              ${filters.id ? `and v.content_id = $${filters.type ? 4 : 3}` : ''}
        group by d
        order by d`,
    )

    const items = await run(
      `select v.content_type as type, v.content_id as id,
              coalesce(n.name, i.name) as name,
              coalesce(n.slug, i.slug) as slug,
              coalesce(n.status::text, i.status::text) as status,
              coalesce(n.published_at, i.published_at) as published_at,
              ${SUMS}
         from public.content_views v
         ${CONTENT_JOIN}
        where ${sql}
        group by v.content_type, v.content_id, n.name, i.name, n.slug, i.slug,
                 n.status, i.status, n.published_at, i.published_at
        order by views desc, visitors desc
        limit 500`,
    )

    const breakdown = (columns, limit) =>
      run(
        `select ${columns}, ${SUMS} from public.content_views v
          where ${sql}
          group by ${columns}
          order by views desc
          limit ${limit}`,
      )

    return {
      range: { from: filters.from, to: filters.to, days: span },
      geo: geoReady(),
      totals,
      previous: before,
      daily,
      items,
      countries: await breakdown('v.country', 250),
      regions: await breakdown('v.country, v.region', 200),
      cities: await breakdown('v.country, v.region, v.city', 200),
      sources: await breakdown('v.source', 100),
      locales: await breakdown('v.locale', 10),
    }
  })

  response.set('Cache-Control', 'no-store')
  response.json(report)
})

export const ANALYTICS_EXPORT_LIMIT = 50000

/**
 * Linhas brutas do período — dia × conteúdo × lugar × canal —, para a aba
 * "Dados completos" da planilha.
 */
analyticsRouter.get('/analytics/rows', requireSession, async (request, response) => {
  const filters = reportFilters(request.query)
  const { sql, params } = where(filters)

  const rows = await request.db.query(
    `select v.day, v.content_type as type, v.content_id as id,
            coalesce(n.name, i.name) as name,
            v.locale, v.country, v.region, v.city, v.source, v.views, v.visitors
       from public.content_views v
       ${CONTENT_JOIN}
      where ${sql}
      order by v.day, v.views desc
      limit ${ANALYTICS_EXPORT_LIMIT + 1}`,
    params,
  )

  response.set('Cache-Control', 'no-store')
  response.json({
    items: rows.slice(0, ANALYTICS_EXPORT_LIMIT),
    truncated: rows.length > ANALYTICS_EXPORT_LIMIT,
  })
})
