/**
 * Consultas das páginas renderizadas no servidor (notícia, listas, sitemaps,
 * feed).
 *
 * Rodam SEMPRE como `anon`, o papel do visitante: é o que garante que estas
 * páginas enxerguem exatamente o que um visitante enxerga. Uma notícia em
 * rascunho não vaza para o HTML nem para o sitemap porque o RLS continua
 * decidindo — o mesmo princípio de quando isto rodava na Vercel com a chave
 * anônima.
 *
 * `seoData` é um objeto, e não funções soltas, para o `npm run seo` poder
 * trocar as consultas por dados simulados sem banco.
 */
import { ANON, queryAs } from '../db.js'
import { config } from '../config.js'
import { loadSiteRow } from '../site.js'
import { resolveSite } from '../../../src/lib/seo.js'
import { localizeArticle } from '../../../src/lib/news-translations.js'
import { DEFAULT_LOCALE, normalizeLocale, TRANSLATION_LOCALES } from '../../../src/i18n/config.js'

const ARTICLE_COLUMNS = `
  n.id, n.name, n.kicker, n.slug, n.excerpt, n.content, n.cover_image, n.cover_alt,
  n.cover_caption, n.cover_credit, n.gallery, n.published_at, n.created_at, n.updated_at,
  n.content_updated_at,
  (select json_build_object('id', p.id, 'name', p.name, 'slug', p.slug, 'job_title', p.job_title)
     from public.profiles p where p.id = n.created_by) as author,
  coalesce((select json_agg(json_build_object('locale', v.locale, 'slug', v.slug) order by v.locale)
              from public.news_translations v where v.news_id = n.id), '[]'::json) as translations`

/** Colunas da tradução — uma a uma: o anônimo só tem grant nas públicas (0014). */
const TRANSLATION_COLUMNS = `
  t.id, t.news_id, t.locale, t.name, t.slug, t.kicker, t.excerpt, t.content, t.cover_alt,
  t.cover_caption, t.gallery, t.created_at, t.updated_at, t.content_updated_at`

/**
 * Origem da requisição, usada só quando `SITE_URL` não está definida. É
 * RECUO: o `Host` é escolhido por quem chama, e a canônica de produção
 * precisa ser fixa.
 */
function originFromRequest(request) {
  const host = request?.headers?.['x-forwarded-host'] ?? request?.headers?.host
  if (!host) return undefined
  const protocol = request?.headers?.['x-forwarded-proto'] ?? request?.protocol ?? 'https'
  return `${protocol}://${host}`
}

export const seoData = {
  async loadSite(request) {
    const row = await loadSiteRow()
    const overrides = {
      url: config.siteUrl || originFromRequest(request),
      name: row?.brand_name,
      logo: row?.logo_url,
      description: row?.footer_description,
    }
    // Só o que tem valor: uma chave com `undefined` apagaria o padrão no
    // espalhamento de `resolveSite`, e o feed saía com a descrição vazia.
    return resolveSite(Object.fromEntries(Object.entries(overrides).filter(([, value]) => value)))
  },

  /**
   * Uma notícia publicada pelo slug DO IDIOMA, já montada nele
   * (`localizeArticle`), com a lista das versões. Em outro idioma, parte da
   * tradução: `/en/news/<slug-português>` não acha nada e responde 404.
   */
  async fetchArticle(slug, locale = DEFAULT_LOCALE) {
    const code = normalizeLocale(locale)

    if (code !== DEFAULT_LOCALE) {
      const [row] = await queryAs(
        ANON,
        `select ${TRANSLATION_COLUMNS},
                (select row_to_json(x) from (select ${ARTICLE_COLUMNS}, n.status) x) as news
           from public.news_translations t
           join public.news n on n.id = t.news_id
          where t.locale = $1 and t.slug = $2 and n.status = 'published'`,
        [code, slug],
      )
      return row?.news ? localizeArticle(row.news, row) : null
    }

    const [row] = await queryAs(
      ANON,
      `select ${ARTICLE_COLUMNS} from public.news n where n.slug = $1 and n.status = 'published'`,
      [slug],
    )
    return localizeArticle(row ?? null, null)
  },

  /**
   * Notícias publicadas, da mais recente para a mais antiga. Com
   * `withTranslations`, cada uma traz as versões com título e datas — o que os
   * sitemaps precisam para listar cada URL de idioma.
   */
  async fetchPublishedNews({ limit = 1000, since = null, withAuthor = false, withTranslations = false } = {}) {
    const params = [Math.min(limit, 5000)]
    let filter = ''
    if (since) {
      params.push(since)
      filter = 'and n.published_at >= $2'
    }

    return queryAs(
      ANON,
      `select n.name, n.slug, n.kicker, n.excerpt, n.cover_image, n.published_at, n.created_at,
              n.updated_at
              ${
                withAuthor
                  ? `, (select json_build_object('name', p.name, 'slug', p.slug)
                        from public.profiles p where p.id = n.created_by) as author`
                  : ''
              }
              ${
                withTranslations
                  ? `, coalesce((select json_agg(json_build_object('locale', v.locale, 'slug', v.slug,
                                                                    'name', v.name, 'created_at', v.created_at,
                                                                    'updated_at', v.updated_at))
                                   from public.news_translations v where v.news_id = n.id), '[]'::json)
                        as translations`
                  : ''
              }
         from public.news n
        where n.status = 'published' ${filter}
        order by n.published_at desc nulls last
        limit $1`,
      params,
    )
  },

  /** Idiomas com ao menos uma notícia publicada. O português entra sempre. */
  async fetchNewsLocales() {
    const rows = await queryAs(
      ANON,
      `select distinct t.locale
         from public.news_translations t join public.news n on n.id = t.news_id
        where n.status = 'published'`,
    )
    const found = new Set(rows.map((row) => row.locale))
    return [DEFAULT_LOCALE, ...TRANSLATION_LOCALES.filter((code) => found.has(code))]
  },

  /** Autores com página pública. A policy da 0012 já restringe a quem publicou. */
  async fetchAuthors() {
    return queryAs(
      ANON,
      'select slug, profile_updated_at from public.profiles where slug is not null limit 500',
    ).catch(() => [])
  },

  async fetchCategories() {
    return queryAs(ANON, 'select slug, updated_at from public.categories limit 500').catch(() => [])
  },

  async fetchInitiatives() {
    return queryAs(
      ANON,
      `select slug, updated_at from public.initiatives
        where status = 'published' order by updated_at desc limit 5000`,
    ).catch(() => [])
  },
}
