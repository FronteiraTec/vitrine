/**
 * Metadados e dados estruturados — uma definição só.
 *
 * Este arquivo é consumido por DOIS lados:
 *
 *   • o cliente, via `useDocumentMeta`/`useStructuredData`, que atualiza o
 *     `<head>` a cada rota;
 *   • a API, em `server/src/seo/article.js`, que devolve o mesmo `<head>` já
 *     escrito no HTML, antes de qualquer JavaScript rodar.
 *
 * Por isso não há `import.meta.env`, nem alias `@/`, nem nada do navegador
 * aqui: o Node da API não passa pelo Vite, e o módulo precisa carregar nos
 * dois ambientes. A configuração chega por parâmetro (`site`).
 *
 * Manter os dois lados na mesma função é o que garante que o leitor e o
 * rastreador recebam exatamente a mesma descrição da página. Duas
 * implementações divergiriam na primeira correção feita só de um lado — e
 * servir descrições diferentes para robô e para pessoa é justamente o que
 * caracteriza cloaking.
 */

import { articlePlainText } from './news-content.js'
import {
  DEFAULT_LOCALE,
  LOCALE_CODES,
  LOCALES,
  newsArticlePath,
  newsListPath,
  normalizeLocale,
} from '../i18n/config.js'

/* -------------------------------------------------------------------------- */
/* Utilitários                                                                 */
/* -------------------------------------------------------------------------- */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Escapa o que vai dentro de `<script type="application/ld+json">`.
 *
 * Só `</script` e os separadores de linha U+2028/U+2029 precisam de cuidado:
 * o primeiro fecharia a tag no meio do JSON, os outros quebram o parser em
 * alguns motores. O resto o `JSON.stringify` já resolve. */
export function escapeJsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** Junta base e caminho sem gerar barra dupla nem perder a barra do meio. */
export function absoluteUrl(site, path = '/') {
  const base = String(site?.url ?? '').replace(/\/+$/, '')
  const suffix = String(path ?? '/')
  if (/^https?:\/\//i.test(suffix)) return suffix
  return `${base}/${suffix.replace(/^\/+/, '')}`
}

/**
 * Texto corrido a partir do corpo da notícia, para descrição e `articleBody`.
 *
 * Lê pelo mesmo `parseArticleBody` da página: tirar marcadores com expressão
 * regular aqui deixaria link de vídeo, endereço de imagem e "Legenda:" na
 * descrição que o Google mostra.
 */
export function toPlainText(value) {
  return articlePlainText(value)
}

export function truncateAt(value, max) {
  const text = String(value ?? '').trim()
  if (text.length <= max) return text
  const cut = text.lastIndexOf(' ', max)
  return `${text.slice(0, cut > max * 0.6 ? cut : max).trimEnd()}…`
}

/* -------------------------------------------------------------------------- */
/* Configuração do veículo                                                     */
/* -------------------------------------------------------------------------- */

export const SITE_DEFAULTS = {
  url: 'https://exemplo.com',
  name: 'Vitrine',
  locale: 'pt_BR',
  language: 'pt-BR',
  logo: null,
  description: 'Catálogo público de iniciativas institucionais.',
}

export function resolveSite(overrides = {}) {
  const url = String(overrides.url ?? SITE_DEFAULTS.url).replace(/\/+$/, '')
  return { ...SITE_DEFAULTS, ...overrides, url }
}

/* -------------------------------------------------------------------------- */
/* Meta tags                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Diretiva de indexação padrão das páginas públicas.
 *
 * `max-image-preview:large` não é enfeite: sem ela o Google limita a
 * miniatura, e a elegibilidade ao Discover depende de imagem grande. Os dois
 * `-1` removem o limite de trecho e de prévia de vídeo, que por omissão são
 * curtos. Isto habilita — não garante — a aparição em Discover e Top Stories;
 * quem decide é o Google.
 */
export const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

/** Páginas que não devem ser indexadas (login, painel, configuração). */
export const PRIVATE_ROBOTS = 'noindex, nofollow'

/**
 * Página que existe, mas não deve entrar no índice — a lista de notícias em
 * espanhol enquanto nenhuma foi traduzida. Os links continuam sendo seguidos:
 * ela aponta para notícias que valem ser encontradas.
 */
export const NOINDEX_FOLLOW = 'noindex, follow'

/* -------------------------------------------------------------------------- */
/* Idiomas: hreflang                                                           */
/* -------------------------------------------------------------------------- */

/**
 * `hreflang` de um conteúdo que existe em mais de um idioma.
 *
 * Cada versão aponta para TODAS, inclusive ela mesma, com URL absoluta — o
 * Google descarta o conjunto quando a volta não confirma a ida. `x-default`
 * aponta para o original em português: é a versão completa e a de quem não se
 * encaixa em nenhum dos idiomas declarados.
 *
 * Com uma versão só não há o que declarar: um `hreflang` que só aponta para a
 * própria página não informa nada, e a lista fica vazia.
 *
 * `versions` é `[{ locale, path }]`, na ordem de `LOCALE_CODES`.
 */
export function hreflangLinks(site, versions) {
  const known = (versions ?? []).filter((version) => LOCALES[version?.locale] && version.path)
  if (known.length < 2) return []

  const links = known.map((version) => ({
    hreflang: LOCALES[version.locale].hreflang,
    href: absoluteUrl(site, version.path),
  }))

  const original = known.find((version) => version.locale === DEFAULT_LOCALE)
  if (original) links.push({ hreflang: 'x-default', href: absoluteUrl(site, original.path) })

  return links
}

/** `{ locale, slug }` de cada versão da notícia → `{ locale, path }`. */
export function newsVersionPaths(versions) {
  return (versions ?? []).map((version) => ({
    locale: version.locale,
    path: newsArticlePath(version.locale, version.slug),
  }))
}

/* -------------------------------------------------------------------------- */
/* Notícia                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Metadados de uma notícia, no idioma dela.
 *
 * `article.locale` vem de `localizeArticle` (`src/lib/news-translations.js`):
 * título, descrição, canônica, `og:locale` e `hreflang` saem todos da versão
 * que a URL representa. Sem `locale`, é o original em português.
 *
 * `headline` é cortado em 110 caracteres porque é o limite que o Google aplica
 * ao campo em Top Stories — acima disso o item é descartado do rich result. O
 * `<h1>` da página continua inteiro; só o dado estruturado é encurtado.
 */
export function buildNewsMeta({ article, site, path }) {
  const locale = normalizeLocale(article.locale)
  const url = absoluteUrl(site, path ?? newsArticlePath(locale, article.slug))
  const description = truncateAt(
    article.excerpt || toPlainText(article.content),
    200,
  )
  const versions = article.versions ?? []

  return {
    title: article.name,
    fullTitle: `${article.name} · ${site.name}`,
    description,
    canonical: url,
    robots: DEFAULT_ROBOTS,
    type: 'article',
    image: article.cover_image ?? null,
    imageAlt: article.cover_alt || article.cover_caption || null,
    siteName: site.name,
    locale: LOCALES[locale].og,
    localeAlternates: versions
      .filter((version) => version.locale !== locale && LOCALES[version.locale])
      .map((version) => LOCALES[version.locale].og),
    alternates: hreflangLinks(site, newsVersionPaths(versions)),
    publishedTime: article.published_at ?? article.created_at ?? null,
    modifiedTime: article.content_updated_at ?? article.updated_at ?? null,
    author: article.author?.name ?? null,
    section: article.kicker ?? null,
  }
}

/**
 * Metadados da lista de notícias de um idioma (`/noticias`, `/en/news`,
 * `/es/noticias`).
 *
 * `available` é a lista de idiomas que TÊM notícia publicada, ou `null` quando
 * não foi possível descobrir (banco fora do ar). Uma lista vazia existe como
 * página — ela explica ao leitor que ainda não há tradução —, mas não entra no
 * índice nem é anunciada por `hreflang`: apontar o buscador para uma página
 * sem conteúdo naquele idioma é justamente o que se quer evitar.
 */
export function buildNewsListMeta({ site, locale: requested, available = null }) {
  const locale = normalizeLocale(requested)
  const text = LOCALES[locale].seo
  const hasContent = !available || locale === DEFAULT_LOCALE || available.includes(locale)

  const versions = hasContent && available
    ? LOCALE_CODES.filter((code) => code === DEFAULT_LOCALE || available.includes(code)).map(
        (code) => ({ locale: code, path: newsListPath(code) }),
      )
    : []

  return {
    title: text.newsListTitle,
    fullTitle: `${text.newsListTitle} · ${site.name}`,
    description: text.newsListDescription,
    canonical: absoluteUrl(site, newsListPath(locale)),
    robots: hasContent ? DEFAULT_ROBOTS : NOINDEX_FOLLOW,
    type: 'website',
    siteName: site.name,
    locale: LOCALES[locale].og,
    localeAlternates: versions
      .filter((version) => version.locale !== locale)
      .map((version) => LOCALES[version.locale].og),
    alternates: hreflangLinks(site, versions),
  }
}

/**
 * Converte os metadados na lista de tags a escrever.
 *
 * Devolver a lista — em vez de HTML — permite que o cliente ATUALIZE tags
 * existentes e REMOVA as que não valem mais. A versão anterior deste código só
 * sabia criar e sobrescrever: navegar de uma notícia com capa para outra sem
 * capa deixava o `og:image` da anterior para trás, e o compartilhamento saía
 * com a foto errada.
 */
export function metaTagList(meta) {
  const tags = [
    ['name', 'description', meta.description],
    ['name', 'robots', meta.robots],
    ['property', 'og:type', meta.type],
    ['property', 'og:title', meta.fullTitle ?? meta.title],
    ['property', 'og:description', meta.description],
    ['property', 'og:url', meta.canonical],
    ['property', 'og:image', meta.image],
    ['property', 'og:image:alt', meta.imageAlt],
    ['property', 'og:site_name', meta.siteName],
    ['property', 'og:locale', meta.locale],
    // Uma tag por idioma em que a página também existe — é assim que o
    // Facebook escolhe a versão certa para quem compartilha.
    ...(meta.localeAlternates ?? []).map((code) => ['property', 'og:locale:alternate', code]),
    ['name', 'twitter:card', meta.image ? 'summary_large_image' : 'summary'],
    ['name', 'twitter:title', meta.fullTitle ?? meta.title],
    ['name', 'twitter:description', meta.description],
    ['name', 'twitter:image', meta.image],
  ]

  if (meta.type === 'article') {
    tags.push(
      ['property', 'article:published_time', meta.publishedTime],
      ['property', 'article:modified_time', meta.modifiedTime],
      ['property', 'article:author', meta.author],
      ['property', 'article:section', meta.section],
    )
  }

  return tags.filter(([, , value]) => Boolean(value))
}

/* -------------------------------------------------------------------------- */
/* Dados estruturados                                                          */
/* -------------------------------------------------------------------------- */

/**
 * O veículo. `NewsMediaOrganization` em vez de `Organization` genérica: é o
 * tipo que o schema.org reserva para quem publica jornalismo, e ele aceita as
 * propriedades de transparência editorial que o Google observa em veículos de
 * notícia.
 */
export function publisherJsonLd(site) {
  const publisher = {
    '@type': 'NewsMediaOrganization',
    '@id': `${site.url}/#publisher`,
    name: site.name,
    url: site.url,
  }

  if (site.logo) {
    publisher.logo = { '@type': 'ImageObject', url: absoluteUrl(site, site.logo) }
  }

  // Páginas que declaram quem responde pelo conteúdo e sob que critérios.
  publisher.publishingPrinciples = absoluteUrl(site, '/politica-editorial')
  publisher.masthead = absoluteUrl(site, '/expediente')

  return publisher
}

export function webSiteJsonLd(site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: site.url,
    name: site.name,
    inLanguage: site.language,
    publisher: { '@id': `${site.url}/#publisher` },
  }
}

/**
 * A notícia.
 *
 * `articleBody` entra de propósito. A página é montada no cliente, e o corpo
 * do texto só existe no DOM depois que o JavaScript roda. O Google renderiza
 * JavaScript, mas com atraso — e atraso é exatamente o que não se pode pagar
 * em notícia. Com o corpo no dado estruturado, o texto chega já na primeira
 * leitura do HTML. É o mesmo conteúdo que a pessoa lê, não uma versão para
 * robô.
 */
export function newsArticleJsonLd({ article, site, path, images = [] }) {
  const locale = normalizeLocale(article.locale)
  const url = absoluteUrl(site, path ?? newsArticlePath(locale, article.slug))
  const published = article.published_at ?? article.created_at ?? null
  const modified = article.content_updated_at ?? article.updated_at ?? published

  const data = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: truncateAt(article.name, 110),
    inLanguage: LOCALES[locale].hreflang,
    isAccessibleForFree: true,
    publisher: publisherJsonLd(site),
  }

  /*
   * O vínculo entre as versões, nos dois sentidos: a tradução declara de que
   * obra ela é tradução, e o original lista as suas traduções. São os
   * `translationOfWork`/`workTranslation` do schema.org, apontando pelo `@id`
   * de cada versão — o mesmo que cada página declara para si.
   */
  const versions = article.versions ?? []
  if (locale !== DEFAULT_LOCALE) {
    const original = versions.find((version) => version.locale === DEFAULT_LOCALE)
    if (original) {
      data.translationOfWork = {
        '@id': `${absoluteUrl(site, newsArticlePath(DEFAULT_LOCALE, original.slug))}#article`,
      }
    }
  } else {
    const translations = versions.filter((version) => version.locale !== DEFAULT_LOCALE)
    if (translations.length) {
      data.workTranslation = translations.map((version) => ({
        '@id': `${absoluteUrl(site, newsArticlePath(version.locale, version.slug))}#article`,
      }))
    }
  }

  const description = article.excerpt || truncateAt(toPlainText(article.content), 200)
  if (description) data.description = description
  if (article.kicker) data.articleSection = article.kicker
  if (published) data.datePublished = new Date(published).toISOString()
  if (modified) data.dateModified = new Date(modified).toISOString()

  const gallery = images.filter(Boolean).map((src) => absoluteUrl(site, src))
  if (gallery.length) data.image = gallery.slice(0, 10)

  if (article.author?.name) {
    const author = { '@type': 'Person', name: article.author.name }
    // A URL do autor só entra quando existe página para ela. Apontar para um
    // endereço que devolve 404 é pior do que omitir o campo.
    if (article.author.slug) author.url = absoluteUrl(site, `/autor/${article.author.slug}`)
    data.author = [author]
  }

  const body = toPlainText(article.content)
  if (body) data.articleBody = body

  return data
}

export function breadcrumbJsonLd({ site, trail }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(site, item.path),
    })),
  }
}

/**
 * Trilha da notícia, no idioma dela: "Home › News › título" aponta para a
 * lista em inglês. Antes cada lado montava a sua; agora cliente e servidor
 * chamam esta.
 */
export function newsBreadcrumbJsonLd({ site, article }) {
  const locale = normalizeLocale(article.locale)
  const text = LOCALES[locale].seo

  return breadcrumbJsonLd({
    site,
    trail: [
      { name: text.home, path: '/' },
      { name: text.news, path: newsListPath(locale) },
      { name: article.name, path: newsArticlePath(locale, article.slug) },
    ],
  })
}

export function authorJsonLd({ author, site }) {
  const url = absoluteUrl(site, `/autor/${author.slug}`)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${url}#profile`,
    url,
    mainEntity: {
      '@type': 'Person',
      '@id': `${url}#person`,
      name: author.name,
      url,
    },
  }

  if (author.job_title) data.mainEntity.jobTitle = author.job_title
  if (author.bio) data.mainEntity.description = author.bio
  if (author.avatar_url) data.mainEntity.image = absoluteUrl(site, author.avatar_url)
  if (author.profile_updated_at) {
    data.dateModified = new Date(author.profile_updated_at).toISOString()
  }
  data.mainEntity.worksFor = { '@id': `${site.url}/#publisher` }

  return data
}

/* -------------------------------------------------------------------------- */
/* Renderização para o servidor                                                */
/* -------------------------------------------------------------------------- */

/**
 * Monta o bloco de `<head>` que a API injeta no HTML das notícias.
 *
 * Toda tag sai com `data-seo`. É a marca que `useDocumentMeta` procura para
 * SUBSTITUIR o que o servidor escreveu quando a página monta no navegador — sem
 * ela o cliente acrescentava uma segunda canônica, uma segunda descrição e um
 * segundo bloco JSON-LD ao lado dos do servidor, e o Google ignora canônicas
 * duplicadas.
 */
export function renderHead({ meta, jsonLd = [] }) {
  const lines = [`<title>${escapeHtml(meta.fullTitle ?? meta.title)}</title>`]

  for (const [attribute, key, value] of metaTagList(meta)) {
    lines.push(`<meta ${attribute}="${key}" content="${escapeHtml(value)}" data-seo />`)
  }

  lines.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}" data-seo />`)

  for (const link of meta.alternates ?? []) {
    lines.push(
      `<link rel="alternate" hreflang="${escapeHtml(link.hreflang)}" href="${escapeHtml(link.href)}" data-seo />`,
    )
  }

  for (const block of jsonLd.filter(Boolean)) {
    lines.push(`<script type="application/ld+json" data-seo>${escapeJsonLd(block)}</script>`)
  }

  return lines.join('\n    ')
}

/**
 * Troca o `<head>` estático do `index.html` pelo da página.
 *
 * O shell traz título e Open Graph genéricos do site. Deixá-los no lugar
 * produziria duas tags `og:title` na mesma página, e o rastreador escolheria
 * uma delas sem aviso — na prática, a genérica. Por isso as tags que este
 * módulo gera são removidas antes de injetar as novas.
 *
 * `lang` reescreve o `<html lang>`: uma notícia em inglês servida com
 * `lang="pt-BR"` diria ao buscador, e ao leitor de tela, que o texto está em
 * português.
 */
export function injectHead(html, head, { lang } = {}) {
  let output = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"[^>]*>\s*/gi, '')
    .replace('</head>', `  ${head}\n  </head>`)

  if (lang && LOCALES[lang]) {
    // Troca só o atributo `lang`, preservando qualquer outro da tag.
    output = output.replace(/<html\b([^>]*)>/i, (_, attributes) => {
      const others = attributes.replace(/\s+lang="[^"]*"/i, '')
      return `<html lang="${LOCALES[lang].code}"${others}>`
    })
  }

  return output
}
