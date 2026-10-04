/**
 * Sitemaps, gerados a cada requisição a partir do que está publicado.
 *
 * Antes o `sitemap.xml` era escrito no `build`. Para um catálogo isso bastava;
 * para notícia, não: uma matéria publicada às 9h só entraria no arquivo no
 * próximo deploy. Como quem publica não faz deploy, o sitemap estaria sempre
 * atrasado justamente no conteúdo em que a descoberta rápida é tudo.
 *
 * São quatro documentos servidos por esta função, distinguidos pelo parâmetro
 * `kind` que as rotas de `server/src/app.js` injetam:
 *
 *   /sitemap.xml               índice, aponta para os três abaixo
 *   /sitemap-paginas.xml       páginas fixas, categorias e iniciativas
 *   /sitemap-noticias.xml      todo o acervo de notícias
 *   /sitemap-google-news.xml   só as últimas 48 horas, no formato do Google News
 *
 * Uma função só, e não quatro: os quatro compartilham consulta, escape e
 * cabeçalhos.
 *
 * IDIOMAS: cada versão traduzida de uma notícia tem URL própria e entra como
 * `<url>` própria, com `xhtml:link rel="alternate" hreflang` apontando para
 * todas as versões — o mesmo conjunto que a página declara no `<head>`. O
 * sitemap é o canal de `hreflang` que o Google lê sem renderizar nada.
 */
import { seoData } from './data.js'
import { absoluteUrl, hreflangLinks, newsVersionPaths } from '../../../src/lib/seo.js'
import { newsVersions } from '../../../src/lib/news-translations.js'
import { DEFAULT_LOCALE, LOCALE_CODES, LOCALES, newsListPath } from '../../../src/i18n/config.js'

/** O Google News aceita no máximo mil `<url>` por arquivo. */
const GOOGLE_NEWS_LIMIT = 1000

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function isoDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function urlNode({ loc, lastmod, changefreq, priority, alternates = [], extra = '' }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    ...alternates.map(
      (link) =>
        `    <xhtml:link rel="alternate" hreflang="${xmlEscape(link.hreflang)}" href="${xmlEscape(link.href)}" />`,
    ),
    extra,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n')
}

const XHTML_NAMESPACE = '\n        xmlns:xhtml="http://www.w3.org/1999/xhtml"'

/**
 * As versões de uma notícia com URL, data e título — uma por idioma. A data de
 * modificação de cada uma é a DELA: corrigir a tradução em inglês não mexe no
 * `lastmod` do original.
 */
function newsEntries(site, item) {
  const translations = new Map((item.translations ?? []).map((row) => [row.locale, row]))
  const versions = newsVersions(item)
  const alternates = hreflangLinks(site, newsVersionPaths(versions))

  return newsVersionPaths(versions).map(({ locale, path }) => {
    const translation = translations.get(locale)
    return {
      locale,
      loc: absoluteUrl(site, path),
      title: translation?.name ?? item.name,
      lastmod: isoDate(
        translation ? (translation.updated_at ?? translation.created_at) : (item.updated_at ?? item.published_at),
      ),
      alternates,
    }
  })
}

function document(body, { namespaces = '' } = {}) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${namespaces}>`,
    body,
    '</urlset>',
    '',
  ].join('\n')
}

/* -------------------------------------------------------------------------- */
/* Documentos                                                                  */
/* -------------------------------------------------------------------------- */

function buildIndex(site) {
  const now = new Date().toISOString()
  const children = ['/sitemap-paginas.xml', '/sitemap-noticias.xml', '/sitemap-google-news.xml']

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...children.map((path) =>
      [
        '  <sitemap>',
        `    <loc>${xmlEscape(absoluteUrl(site, path))}</loc>`,
        `    <lastmod>${now}</lastmod>`,
        '  </sitemap>',
      ].join('\n'),
    ),
    '</sitemapindex>',
    '',
  ].join('\n')
}

async function buildPages(site) {
  const entries = [
    { loc: absoluteUrl(site, '/'), changefreq: 'hourly', priority: '1.0' },
    { loc: absoluteUrl(site, '/noticias'), changefreq: 'hourly', priority: '0.9' },
    { loc: absoluteUrl(site, '/buscar'), changefreq: 'daily', priority: '0.6' },
    { loc: absoluteUrl(site, '/categorias'), changefreq: 'weekly', priority: '0.6' },
    { loc: absoluteUrl(site, '/sobre'), changefreq: 'monthly', priority: '0.4' },
    // Páginas de transparência editorial. Prioridade baixa em volume de acesso,
    // mas o rastreador precisa alcançá-las: é por elas que ele verifica quem
    // responde pelo veículo.
    { loc: absoluteUrl(site, '/expediente'), changefreq: 'monthly', priority: '0.4' },
    { loc: absoluteUrl(site, '/politica-editorial'), changefreq: 'yearly', priority: '0.4' },
    { loc: absoluteUrl(site, '/contato'), changefreq: 'yearly', priority: '0.4' },
    { loc: absoluteUrl(site, '/acessibilidade'), changefreq: 'yearly', priority: '0.4' },
  ]

  const [categories, initiatives, authors, newsLocales] = await Promise.all([
    seoData.fetchCategories(),
    seoData.fetchInitiatives(),
    seoData.fetchAuthors(),
    seoData.fetchNewsLocales(),
  ])

  /*
   * As listas de notícias por idioma. Só entra a de um idioma que tem notícia
   * publicada: a lista em espanhol vazia responde `noindex`, e um sitemap que
   * a anunciasse mandaria o buscador a uma página que pede para não ser
   * indexada. `/noticias` já está acima; aqui ela ganha as alternativas.
   */
  const listVersions = LOCALE_CODES.filter(
    (code) => code === DEFAULT_LOCALE || newsLocales.includes(code),
  ).map((code) => ({ locale: code, path: newsListPath(code) }))
  const listAlternates = hreflangLinks(site, listVersions)

  for (const version of listVersions) {
    if (version.locale === DEFAULT_LOCALE) {
      const main = entries.find((entry) => entry.loc === absoluteUrl(site, version.path))
      if (main) main.alternates = listAlternates
      continue
    }
    entries.push({
      loc: absoluteUrl(site, version.path),
      changefreq: 'hourly',
      priority: '0.8',
      alternates: listAlternates,
    })
  }

  for (const category of categories) {
    entries.push({
      loc: absoluteUrl(site, `/categoria/${category.slug}`),
      lastmod: isoDate(category.updated_at),
      changefreq: 'weekly',
      priority: '0.6',
    })
  }

  for (const initiative of initiatives) {
    entries.push({
      loc: absoluteUrl(site, `/iniciativa/${initiative.slug}`),
      lastmod: isoDate(initiative.updated_at),
      changefreq: 'monthly',
      priority: '0.5',
    })
  }

  for (const author of authors) {
    entries.push({
      loc: absoluteUrl(site, `/autor/${author.slug}`),
      lastmod: isoDate(author.profile_updated_at),
      changefreq: 'weekly',
      priority: '0.5',
    })
  }

  return document(entries.map(urlNode).join('\n'), { namespaces: XHTML_NAMESPACE })
}

async function buildNews(site) {
  const news = await seoData.fetchPublishedNews({ limit: 5000, withTranslations: true })

  const entries = news.flatMap((item) =>
    newsEntries(site, item).map((entry) =>
      urlNode({
        loc: entry.loc,
        lastmod: entry.lastmod,
        // Notícia publicada raramente muda. O que interessa ao buscador é
        // descobri-la cedo, não voltar nela.
        changefreq: 'monthly',
        priority: '0.7',
        alternates: entry.alternates,
      }),
    ),
  )

  return document(entries.join('\n'), { namespaces: XHTML_NAMESPACE })
}

/**
 * Sitemap no formato do Google News.
 *
 * Regras da especificação que não são opcionais:
 *
 * • Só entram matérias das ÚLTIMAS 48 HORAS. Itens mais antigos fazem o Google
 *   ignorar o arquivo — o acervo completo vai no `/sitemap-noticias.xml`.
 * • O idioma usa código ISO 639-1 de duas letras (`pt`, `en`, `es`), não a
 *   etiqueta regional `pt-BR`.
 * • No máximo mil `<url>` por arquivo — contando cada versão de idioma.
 *
 * Cada versão traduzida entra como matéria própria, com título e idioma dela.
 * A data de publicação é a da notícia, a mesma que a página e o dado
 * estruturado declaram: a tradução relata o mesmo fato, e ele não fica mais
 * novo porque foi traduzido depois. Consequência prática: uma tradução feita
 * mais de 48 horas depois da publicação já não entra aqui, só no acervo.
 *
 * Este arquivo facilita o rastreamento. Ele NÃO garante inclusão no Google
 * News: elegibilidade e distribuição são decididas pelos sistemas do Google, e
 * dependem do veículo, não de marcação.
 */
async function buildGoogleNews(site) {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const news = await seoData.fetchPublishedNews({ limit: GOOGLE_NEWS_LIMIT, since, withTranslations: true })

  const entries = news
    .flatMap((item) => {
      const published = isoDate(item.published_at ?? item.created_at)

      return newsEntries(site, item).map((entry) =>
        urlNode({
          loc: entry.loc,
          extra: [
            '    <news:news>',
            '      <news:publication>',
            `        <news:name>${xmlEscape(site.name)}</news:name>`,
            `        <news:language>${LOCALES[entry.locale].newsLanguage}</news:language>`,
            '      </news:publication>',
            published ? `      <news:publication_date>${published}</news:publication_date>` : null,
            `      <news:title>${xmlEscape(entry.title)}</news:title>`,
            '    </news:news>',
          ]
            .filter(Boolean)
            .join('\n'),
        }),
      )
    })
    .slice(0, GOOGLE_NEWS_LIMIT)

  return document(entries.join('\n'), {
    namespaces: '\n        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"',
  })
}

/* -------------------------------------------------------------------------- */

const BUILDERS = {
  index: buildIndex,
  pages: buildPages,
  news: buildNews,
  'google-news': buildGoogleNews,
}

export default async function handler(request, response) {
  const kind = String(request.query?.kind ?? 'index')
  const build = BUILDERS[kind] ?? BUILDERS.index

  response.setHeader('Content-Type', 'application/xml; charset=utf-8')

  try {
    const site = await seoData.loadSite(request)
    const xml = await build(site)

    /* O do Google News tem cache bem mais curto: seu conteúdo é, por
       definição, o que acabou de ser publicado. Cinco minutos ali seria tempo
       demais para uma matéria de última hora esperar. */
    response.setHeader(
      'Cache-Control',
      kind === 'google-news'
        ? 'public, s-maxage=60, stale-while-revalidate=300'
        : 'public, s-maxage=600, stale-while-revalidate=3600',
    )
    response.status(200).send(xml)
  } catch (error) {
    // 500 explícito, e não um XML vazio: sitemap vazio faz o Search Console
    // registrar "0 URLs descobertas" e o problema passa despercebido.
    response.setHeader('Cache-Control', 'no-store')
    response.status(500).send(`<!-- falha ao gerar o sitemap: ${xmlEscape(error.message)} -->`)
  }
}
