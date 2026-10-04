/**
 * Feed RSS 2.0 das notícias publicadas.
 *
 * Serve a três públicos diferentes, e é barato para todos: leitores de feed,
 * agregadores regionais que republicam chamadas, e sistemas de monitoramento
 * de imprensa — que ainda hoje consomem RSS antes de qualquer outra coisa.
 *
 * O `<atom:link rel="self">` não é decoração: é como o validador e boa parte
 * dos agregadores confirmam a URL canônica do feed.
 */
import { seoData } from './data.js'
import { absoluteUrl, truncateAt } from '../../../src/lib/seo.js'

const ITEMS = 40

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** RSS exige data no formato RFC 822. `toUTCString()` produz exatamente isso. */
function rfc822(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toUTCString()
}

function item(entry, site) {
  const url = absoluteUrl(site, `/noticia/${entry.slug}`)
  const published = rfc822(entry.published_at ?? entry.created_at)
  // A consulta da listagem não carrega `content` — e nem deveria, por 40
  // itens. O resumo é o campo escrito para este papel.
  const description = truncateAt(entry.excerpt, 400)

  return [
    '    <item>',
    `      <title>${xmlEscape(entry.name)}</title>`,
    `      <link>${xmlEscape(url)}</link>`,
    // `isPermaLink="true"` porque o guid É a URL da notícia, que nunca muda:
    // o slug é estável desde a publicação.
    `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
    published ? `      <pubDate>${published}</pubDate>` : null,
    description ? `      <description>${xmlEscape(description)}</description>` : null,
    // `dc:creator` em vez de `author`: o elemento `author` do RSS exige
    // endereço de e-mail, e publicar o e-mail de quem assina só rende spam.
    entry.author?.name ? `      <dc:creator>${xmlEscape(entry.author.name)}</dc:creator>` : null,
    entry.kicker ? `      <category>${xmlEscape(entry.kicker)}</category>` : null,
    entry.cover_image
      ? `      <enclosure url="${xmlEscape(entry.cover_image)}" type="image/jpeg" length="0" />`
      : null,
    '    </item>',
  ]
    .filter(Boolean)
    .join('\n')
}

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')

  const site = await seoData.loadSite(request)
  const self = absoluteUrl(site, '/rss.xml')

  let news = []
  try {
    news = await seoData.fetchPublishedNews({ limit: ITEMS, withAuthor: true })
  } catch {
    // Feed vazio é resposta válida e o agregador tenta de novo depois. Um
    // 500 faria alguns deles marcarem a fonte como quebrada.
  }

  const latest = news[0]?.published_at ?? news[0]?.created_at

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${xmlEscape(site.name)}</title>`,
    `    <link>${xmlEscape(site.url)}</link>`,
    `    <description>${xmlEscape(site.description)}</description>`,
    '    <language>pt-BR</language>',
    `    <atom:link href="${xmlEscape(self)}" rel="self" type="application/rss+xml" />`,
    rfc822(latest) ? `    <lastBuildDate>${rfc822(latest)}</lastBuildDate>` : null,
    ...news.map((entry) => item(entry, site)),
    '  </channel>',
    '</rss>',
    '',
  ]
    .filter(Boolean)
    .join('\n')

  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  response.status(200).send(xml)
}
