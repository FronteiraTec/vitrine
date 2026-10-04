/**
 * Verificação de SEO técnico.
 *
 * Roda as funções de `src/lib/seo.js` e as páginas que a API renderiza no
 * servidor (`server/src/seo/`) contra dados simulados e confere o resultado. Existe pela mesma razão do `npm run smoke`:
 * nem `build` nem `lint` olham para o CONTEÚDO do que é gerado, e os erros que
 * importam aqui são todos de conteúdo — uma aspas não escapada que quebra o
 * XML, um `og:title` duplicado, uma data fora do formato que o RSS exige, um
 * `</script>` no corpo do texto fechando o bloco JSON-LD antes da hora.
 *
 * Nenhuma dessas falhas derruba o site. Elas aparecem semanas depois, como
 * "0 URLs descobertas" no Search Console ou um link sem prévia no WhatsApp.
 *
 * Uso: npm run seo
 */
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/* A API lê a configuração de `process.env` no momento em que o módulo
   carrega, então os valores precisam estar de pé antes do primeiro import. O
   banco nunca é consultado: as consultas são trocadas por dados simulados. */
process.env.SITE_URL = 'https://portal.exemplo.com.br'
process.env.VITE_SITE_URL = 'https://portal.exemplo.com.br'

const raiz = process.cwd()
const importar = (caminho) => import(pathToFileURL(join(raiz, caminho)).href)

const falhas = []
let total = 0

function exige(nome, condicao) {
  total += 1
  if (condicao) {
    console.log(`  ✓ ${nome}`)
  } else {
    falhas.push(nome)
    console.error(`  ✗ ${nome}`)
  }
}

function secao(titulo) {
  console.log(`\n${titulo}`)
}

/* -------------------------------------------------------------------------- */
/* Dados de teste                                                              */
/* -------------------------------------------------------------------------- */

const agora = Date.now()

/* O texto carrega de propósito tudo o que costuma quebrar geração de markup:
   `&`, aspas, sinal de menor e uma tag de fechamento de script. */
const NOTICIA = {
  id: 'n1',
  slug: 'prefeitura-anuncia-projeto',
  name: 'Prefeitura anuncia projeto & "obras" no centro',
  kicker: 'Cidade',
  excerpt: 'Resumo com <tag>, & comercial e "aspas".',
  content: '## Intertítulo\n\nCorpo com </script> embutido.\n\n- item um\n- item dois',
  cover_image: 'https://cdn.exemplo/capa.jpg',
  cover_alt: 'Prefeito ao microfone durante o anúncio',
  cover_caption: 'O anúncio no Paço Municipal',
  cover_credit: 'Foto: Divulgação',
  gallery: [{ url: 'https://cdn.exemplo/foto2.jpg', alt: 'Fachada do prédio' }],
  published_at: new Date(agora - 3 * 3600 * 1000).toISOString(),
  created_at: new Date(agora - 3 * 3600 * 1000).toISOString(),
  updated_at: new Date(agora - 2 * 3600 * 1000).toISOString(),
  content_updated_at: new Date(agora - 2 * 3600 * 1000).toISOString(),
  author: { id: 'u1', name: 'Gustavo Botezini', slug: 'gustavo-botezini' },
}

/* A tradução em inglês da mesma notícia — com os mesmos caracteres perigosos,
   porque ela passa pelo mesmo escape. Espanhol não existe: é o caso do recuo. */
const TRADUCAO_EN = {
  id: 't1',
  news_id: 'n1',
  locale: 'en',
  slug: 'city-announces-downtown-project',
  name: 'City announces project & "works" downtown',
  kicker: 'City',
  excerpt: 'Summary with <tag>, & ampersand and "quotes".',
  content: '## Subheading\n\nBody with </script> inside.\n\n- item one\n- item two',
  cover_alt: '',
  cover_caption: '',
  gallery: [],
  created_at: new Date(agora - 1 * 3600 * 1000).toISOString(),
  updated_at: new Date(agora - 1 * 3600 * 1000).toISOString(),
  content_updated_at: null,
}

/** A notícia como o PostgREST a devolve com as versões embutidas. */
const NOTICIA_COM_VERSOES = {
  ...NOTICIA,
  translations: [{ locale: 'en', slug: TRADUCAO_EN.slug }],
}

const LISTAGEM = [
  {
    name: NOTICIA.name,
    slug: NOTICIA.slug,
    kicker: NOTICIA.kicker,
    excerpt: NOTICIA.excerpt,
    cover_image: NOTICIA.cover_image,
    published_at: NOTICIA.published_at,
    created_at: NOTICIA.created_at,
    updated_at: NOTICIA.updated_at,
    author: { name: 'Gustavo Botezini', slug: 'gustavo-botezini' },
    translations: [
      {
        locale: 'en',
        slug: TRADUCAO_EN.slug,
        name: TRADUCAO_EN.name,
        created_at: TRADUCAO_EN.created_at,
        updated_at: TRADUCAO_EN.updated_at,
      },
    ],
  },
  {
    name: 'Segunda notícia',
    slug: 'segunda-noticia',
    kicker: null,
    excerpt: 'Outro resumo.',
    cover_image: null,
    published_at: new Date(agora - 20 * 3600 * 1000).toISOString(),
    created_at: new Date(agora - 20 * 3600 * 1000).toISOString(),
    updated_at: new Date(agora - 20 * 3600 * 1000).toISOString(),
    author: null,
  },
]

/**
 * Substitui o banco.
 *
 * As páginas do servidor leem tudo por `seoData` (`server/src/seo/data.js`);
 * aqui cada consulta devolve os dados de teste acima, respeitando o slug e o
 * idioma pedidos — sem isso QUALQUER endereço acharia uma notícia, e o caminho
 * de 404 nunca seria exercitado. A casca vem do build de verdade (`dist/`),
 * para o teste medir a página e não um simulador.
 */
async function instalarDadosSimulados(cascaHtml) {
  const { seoData } = await importar('server/src/seo/data.js')
  const { setShellForTests } = await importar('server/src/seo/shell.js')
  const { localizeArticle: montar } = await importar('src/lib/news-translations.js')
  const { normalizeLocale, DEFAULT_LOCALE } = await importar('src/i18n/config.js')
  const { resolveSite } = await importar('src/lib/seo.js')

  setShellForTests(cascaHtml ?? null)

  Object.assign(seoData, {
    loadSite: async () =>
      resolveSite({
        url: 'https://portal.exemplo.com.br',
        name: 'Portal Oeste',
        logo: 'https://cdn.exemplo/logo.png',
        description: 'Notícias do Oeste catarinense.',
      }),
    fetchArticle: async (slug, locale) => {
      const code = normalizeLocale(locale)
      if (code === DEFAULT_LOCALE) return slug === NOTICIA.slug ? montar(NOTICIA_COM_VERSOES, null) : null
      // A notícia pelo slug DO IDIOMA: o slug português em /en/news não acha nada.
      if (code === 'en' && slug === TRADUCAO_EN.slug) {
        return montar({ ...NOTICIA_COM_VERSOES, status: 'published' }, TRADUCAO_EN)
      }
      return null
    },
    fetchPublishedNews: async () => LISTAGEM,
    // Há notícia em inglês, não em espanhol.
    fetchNewsLocales: async () => ['pt-BR', 'en'],
    fetchAuthors: async () => [],
    fetchCategories: async () => [],
    fetchInitiatives: async () => [],
  })
}

function criarResposta() {
  const estado = { headers: {}, code: 0, body: '' }
  estado.res = {
    setHeader: (chave, valor) => {
      estado.headers[chave] = valor
    },
    status: (codigo) => {
      estado.code = codigo
      return estado.res
    },
    send: (corpo) => {
      estado.body = corpo
    },
    end: () => {},
  }
  return estado
}

/* -------------------------------------------------------------------------- */

const seo = await importar('src/lib/seo.js')

const site = seo.resolveSite({
  // Com barra no fim de propósito: é o erro mais comum ao preencher
  // VITE_SITE_URL, e ele geraria `//noticia/...` em toda canônica.
  url: 'https://portal.exemplo.com.br/',
  name: 'Portal Oeste',
  logo: 'https://cdn.exemplo/logo.png',
})

secao('Metadados e canônica')

const meta = seo.buildNewsMeta({ article: NOTICIA, site })
exige(
  'canônica sem barra dupla',
  meta.canonical === 'https://portal.exemplo.com.br/noticia/prefeitura-anuncia-projeto',
)
exige('robots habilita imagem grande (pré-requisito do Discover)', meta.robots.includes('max-image-preview:large'))
exige('og:type é article', meta.type === 'article')
exige('texto alternativo da capa vira og:image:alt', meta.imageAlt === NOTICIA.cover_alt)
exige('data de modificação usa a correção de conteúdo', meta.modifiedTime === NOTICIA.content_updated_at)

const semCapa = seo.buildNewsMeta({ article: { ...NOTICIA, cover_image: null }, site })
exige(
  'notícia sem capa não declara og:image',
  !seo.metaTagList(semCapa).some(([, chave]) => chave === 'og:image'),
)
exige(
  'notícia sem capa cai para twitter:card summary',
  seo.metaTagList(semCapa).some(([, chave, valor]) => chave === 'twitter:card' && valor === 'summary'),
)

secao('Dados estruturados')

const jsonLd = seo.newsArticleJsonLd({
  article: NOTICIA,
  site,
  images: [NOTICIA.cover_image, 'https://cdn.exemplo/foto2.jpg'],
})

exige('tipo NewsArticle', jsonLd['@type'] === 'NewsArticle')
exige('publisher é NewsMediaOrganization', jsonLd.publisher['@type'] === 'NewsMediaOrganization')
exige('publisher declara logotipo', Boolean(jsonLd.publisher.logo?.url))
exige(
  'publishingPrinciples aponta para a política editorial',
  jsonLd.publisher.publishingPrinciples.endsWith('/politica-editorial'),
)
exige('masthead aponta para o expediente', jsonLd.publisher.masthead.endsWith('/expediente'))
exige(
  'autor tem URL própria',
  jsonLd.author[0].url === 'https://portal.exemplo.com.br/autor/gustavo-botezini',
)
exige('mainEntityOfPage bate com a canônica', jsonLd.mainEntityOfPage['@id'] === meta.canonical)
exige('datas em ISO 8601', jsonLd.datePublished === new Date(NOTICIA.published_at).toISOString())
exige('dateModified difere de datePublished', jsonLd.dateModified !== jsonLd.datePublished)
exige('headline dentro do limite de 110 do Google', jsonLd.headline.length <= 110)
exige('imagens em URL absoluta', jsonLd.image.every((url) => url.startsWith('https://')))
exige('articleBody sem marcação de intertítulo', !jsonLd.articleBody.includes('##'))

const semAutor = seo.newsArticleJsonLd({ article: { ...NOTICIA, author: { name: 'Sem Página' } }, site })
exige('autor sem slug não recebe URL inventada', semAutor.author[0].url === undefined)

const bloco = seo.escapeJsonLd(jsonLd)
exige('sinal de menor escapado no JSON-LD', !bloco.includes(String.fromCharCode(60)))
exige('JSON-LD continua desserializável', JSON.parse(bloco)['@type'] === 'NewsArticle')

secao('Injeção no HTML do build')

let shell
try {
  shell = await readFile(join(raiz, 'dist', 'index.html'), 'utf8')
} catch {
  console.log('  — dist/index.html ausente; rode `npm run build` para incluir esta seção.')
}

if (shell) {
  const head = seo.renderHead({
    meta,
    jsonLd: [jsonLd, seo.webSiteJsonLd(site)],
  })
  const html = seo.injectHead(shell, head)

  const conta = (padrao) => (html.match(padrao) || []).length

  exige('um único <title>', conta(/<title>/g) === 1)
  exige('um único og:title', conta(/property="og:title"/g) === 1)
  exige('um único og:description', conta(/property="og:description"/g) === 1)
  exige('um único og:type', conta(/property="og:type"/g) === 1)
  exige('uma única canônica', conta(/rel="canonical"/g) === 1)
  exige('aspas do resumo escapadas no HTML', html.includes('&quot;aspas&quot;'))
  exige('article:published_time presente', html.includes('property="article:published_time"'))
  exige('article:section presente', html.includes('property="article:section"'))
  exige('nenhum bloco JSON-LD fecha a tag antes da hora', !html.includes('</script>\n    <script'.replace('\n    ', '')))
}

secao('Sitemaps')

await instalarDadosSimulados(shell)

const sitemap = await importar('server/src/seo/sitemap.js')

const indice = criarResposta()
await sitemap.default({ query: { kind: 'index' }, headers: { host: 'portal.exemplo.com.br' } }, indice.res)
exige('índice responde 200', indice.code === 200)
exige('índice usa sitemapindex', indice.body.includes('<sitemapindex'))
exige('índice aponta para os três arquivos', indice.body.match(/<loc>/g).length === 3)

const googleNews = criarResposta()
await sitemap.default(
  { query: { kind: 'google-news' }, headers: { host: 'portal.exemplo.com.br' } },
  googleNews.res,
)
exige(
  'namespace do Google News declarado',
  googleNews.body.includes('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"'),
)
exige('idioma em ISO 639-1 de duas letras', googleNews.body.includes('<news:language>pt</news:language>'))
exige('nome do veículo vem do banco', googleNews.body.includes('<news:name>Portal Oeste</news:name>'))
exige('título escapado no XML', googleNews.body.includes('projeto &amp; &quot;obras&quot;'))
exige('cache curto, para matéria de última hora', googleNews.headers['Cache-Control'].includes('s-maxage=60'))

secao('Feed RSS')

const feed = await importar('server/src/seo/feed.js')
const rss = criarResposta()
await feed.default({ headers: { host: 'portal.exemplo.com.br' } }, rss.res)

exige('tipo de conteúdo application/rss+xml', rss.headers['Content-Type'].startsWith('application/rss+xml'))
exige('atom:link rel="self" presente', rss.body.includes('rel="self"'))
exige(
  'pubDate no formato RFC 822',
  /<pubDate>\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT<\/pubDate>/.test(rss.body),
)
exige('autoria em dc:creator', rss.body.includes('<dc:creator>Gustavo Botezini</dc:creator>'))
exige('guid é permalink', rss.body.includes('<guid isPermaLink="true">'))
exige('enclosure só na notícia com capa', (rss.body.match(/<enclosure/g) || []).length === 1)
exige('descrição escapada', rss.body.includes('&lt;tag&gt;'))

secao('Página de notícia servida pela API')

const artigo = await importar('server/src/seo/article.js')

const encontrada = criarResposta()
await artigo.default(
  { query: { slug: NOTICIA.slug }, headers: { host: 'portal.exemplo.com.br' } },
  encontrada.res,
)
// Sem `dist/`, a casca não carrega e a página responde 503 — o que também é o
// comportamento correto, então os dois códigos são aceitos aqui.
exige('notícia existente responde 200 (ou 503 sem build)', [200, 503].includes(encontrada.code))

if (encontrada.code === 200) {
  exige('HTML traz o título da notícia', encontrada.body.includes('Prefeitura anuncia projeto'))
  exige('HTML traz o JSON-LD', encontrada.body.includes('application/ld+json'))
  exige('cache de CDN configurado', encontrada.headers['Cache-Control'].includes('s-maxage'))
}

const ausente = criarResposta()
await artigo.default(
  { query: { slug: 'nao-existe' }, headers: { host: 'portal.exemplo.com.br' } },
  ausente.res,
)
if (shell) {
  exige('slug inexistente responde 404 de verdade', ausente.code === 404)
  exige('página de 404 marcada como noindex', ausente.body.includes('noindex'))
}

/* -------------------------------------------------------------------------- */
/* Idiomas                                                                     */
/* -------------------------------------------------------------------------- */

const i18n = await importar('src/i18n/config.js')
const { localizeArticle } = await importar('src/lib/news-translations.js')

secao('Idiomas: vocabulário e rotas')

exige('"EN" e "en-GB" viram en', i18n.normalizeLocale('EN') === 'en' && i18n.normalizeLocale('en-GB') === 'en')
exige('"es-419" vira es', i18n.normalizeLocale('es-419') === 'es')
exige('"pt" e "pt-PT" viram pt-BR', i18n.normalizeLocale('pt') === 'pt-BR' && i18n.normalizeLocale('pt-PT') === 'pt-BR')
exige(
  'valor estranho cai no padrão, nunca é repassado',
  i18n.normalizeLocale('<script>') === 'pt-BR' && i18n.normalizeLocale('fr') === 'pt-BR',
)
exige(
  'URLs das notícias por idioma',
  i18n.newsArticlePath('pt-BR', 'x') === '/noticia/x' &&
    i18n.newsArticlePath('en', 'x') === '/en/news/x' &&
    i18n.newsArticlePath('es', 'x') === '/es/noticia/x',
)
exige(
  'URLs das listas por idioma',
  i18n.newsListPath('pt-BR') === '/noticias' &&
    i18n.newsListPath('en') === '/en/news' &&
    i18n.newsListPath('es') === '/es/noticias',
)
exige(
  'idioma do conteúdo lido da URL',
  i18n.localeFromPath('/en/news/x') === 'en' &&
    i18n.localeFromPath('/es/noticias') === 'es' &&
    i18n.localeFromPath('/noticia/x') === 'pt-BR' &&
    i18n.localeFromPath('/sobre') === null &&
    i18n.localeFromPath('/english') === null,
)
exige(
  'escolha do leitor vale na vitrine',
  i18n.resolveUiLocale({ pathname: '/', preference: 'es', session: null }) === 'es',
)
exige(
  'sem escolha, a URL da notícia define o idioma',
  i18n.resolveUiLocale({ pathname: '/en/news/x', preference: null, session: null }) === 'en',
)
exige(
  'sem escolha, a home segue o idioma lido na sessão',
  i18n.resolveUiLocale({ pathname: '/', preference: null, session: 'en' }) === 'en',
)
exige(
  'painel e login são sempre português, mesmo com escolha gravada',
  i18n.resolveUiLocale({ pathname: '/admin/noticias', preference: 'en', session: 'es' }) === 'pt-BR' &&
    i18n.resolveUiLocale({ pathname: '/entrar', preference: 'es', session: null }) === 'pt-BR',
)
exige(
  'preferência adulterada no storage é ignorada',
  i18n.resolveUiLocale({ pathname: '/', preference: 'xx', session: null }) === 'pt-BR',
)

secao('Idiomas: metadados por versão')

const original = localizeArticle(NOTICIA_COM_VERSOES, null)
const ingles = localizeArticle(NOTICIA_COM_VERSOES, TRADUCAO_EN)
const metaPt = seo.buildNewsMeta({ article: original, site })
const metaEn = seo.buildNewsMeta({ article: ingles, site })
const URL_PT = 'https://portal.exemplo.com.br/noticia/prefeitura-anuncia-projeto'
const URL_EN = 'https://portal.exemplo.com.br/en/news/city-announces-downtown-project'

exige('canônica da versão inglesa é a URL inglesa', metaEn.canonical === URL_EN)
exige('título da versão inglesa em inglês', metaEn.fullTitle === `${TRADUCAO_EN.name} · Portal Oeste`)
exige('descrição da versão inglesa vem do resumo em inglês', metaEn.description === TRADUCAO_EN.excerpt)
exige('og:locale en_US na versão inglesa', metaEn.locale === 'en_US')
exige('og:locale:alternate aponta o original', metaEn.localeAlternates.join() === 'pt_BR')

const hreflang = (meta) => Object.fromEntries(meta.alternates.map((link) => [link.hreflang, link.href]))
exige(
  'hreflang da versão inglesa: ela mesma, o original e x-default',
  hreflang(metaEn).en === URL_EN && hreflang(metaEn)['pt-BR'] === URL_PT && hreflang(metaEn)['x-default'] === URL_PT,
)
exige(
  'hreflang recíproco: o original declara o mesmo conjunto',
  JSON.stringify(hreflang(metaPt)) === JSON.stringify(hreflang(metaEn)),
)
exige('hreflang sem espanhol, que não existe', !('es' in hreflang(metaEn)))
exige('todo hreflang em URL absoluta', metaEn.alternates.every((link) => link.href.startsWith('https://')))

const semTraducao = seo.buildNewsMeta({ article: localizeArticle(NOTICIA, null), site })
exige('notícia só em português não declara hreflang', semTraducao.alternates.length === 0)

const jsonLdEn = seo.newsArticleJsonLd({ article: ingles, site })
const jsonLdPt = seo.newsArticleJsonLd({ article: original, site })
exige('JSON-LD da versão inglesa declara inLanguage en', jsonLdEn.inLanguage === 'en')
exige('JSON-LD da versão inglesa: headline em inglês', jsonLdEn.headline === TRADUCAO_EN.name)
exige('JSON-LD da versão inglesa: mainEntityOfPage é a URL inglesa', jsonLdEn.mainEntityOfPage['@id'] === URL_EN)
exige('JSON-LD da versão inglesa: articleBody em inglês', jsonLdEn.articleBody.startsWith('Subheading'))
exige('tradução aponta o original (translationOfWork)', jsonLdEn.translationOfWork['@id'] === `${URL_PT}#article`)
exige('original lista a tradução (workTranslation)', jsonLdPt.workTranslation[0]['@id'] === `${URL_EN}#article`)
exige('data de publicação é a do fato, igual nas duas versões', jsonLdEn.datePublished === jsonLdPt.datePublished)
exige('data de modificação é a da tradução', jsonLdEn.dateModified === new Date(TRADUCAO_EN.updated_at).toISOString())

const trilhaEn = seo.newsBreadcrumbJsonLd({ site, article: ingles })
exige(
  'trilha da versão inglesa em inglês, apontando a lista inglesa',
  trilhaEn.itemListElement[0].name === 'Home' &&
    trilhaEn.itemListElement[1].name === 'News' &&
    trilhaEn.itemListElement[1].item === 'https://portal.exemplo.com.br/en/news',
)

const listaEn = seo.buildNewsListMeta({ site, locale: 'en', available: ['pt-BR', 'en'] })
const listaEs = seo.buildNewsListMeta({ site, locale: 'es', available: ['pt-BR', 'en'] })
exige('lista inglesa com conteúdo: indexável', listaEn.robots === seo.DEFAULT_ROBOTS)
exige(
  'lista inglesa: hreflang para a portuguesa e x-default',
  hreflang(listaEn)['pt-BR'] === 'https://portal.exemplo.com.br/noticias' && Boolean(hreflang(listaEn)['x-default']),
)
exige('lista espanhola vazia: noindex, follow', listaEs.robots === 'noindex, follow')
exige('lista espanhola vazia: sem hreflang', listaEs.alternates.length === 0)

if (shell) {
  const html = seo.injectHead(shell, seo.renderHead({ meta: metaEn, jsonLd: [jsonLdEn] }), { lang: 'en' })
  exige('HTML da versão inglesa com <html lang="en">', /<html lang="en"/.test(html))
  exige('uma única descrição (a do index.html foi trocada)', (html.match(/name="description"/g) ?? []).length === 1)
  exige('link rel="alternate" hreflang no HTML', html.includes(`<link rel="alternate" hreflang="pt-BR" href="${URL_PT}" data-seo />`))
  exige('tags do servidor marcadas com data-seo', html.includes('rel="canonical"') && /rel="canonical"[^>]*data-seo/.test(html))
  exige('marca data-seo também nas tags do index.html', /<meta\s+property="og:type"[^>]*data-seo/.test(shell))
}

secao('Idiomas: páginas servidas pela API')

async function servir(query) {
  const resposta = criarResposta()
  await artigo.default({ query, headers: { host: 'portal.exemplo.com.br' } }, resposta.res)
  return resposta
}

if (shell) {
  const en = await servir({ locale: 'en', slug: TRADUCAO_EN.slug })
  exige('/en/news/:slug responde 200', en.code === 200)
  exige('/en/news/:slug com <html lang="en">', /<html lang="en"/.test(en.body))
  exige('/en/news/:slug com título em inglês', en.body.includes('<title>City announces project &amp; &quot;works&quot; downtown · Portal Oeste</title>'))
  exige('/en/news/:slug com canônica inglesa', en.body.includes(`<link rel="canonical" href="${URL_EN}"`))
  exige('/en/news/:slug com hreflang para o original', en.body.includes(`hreflang="pt-BR" href="${URL_PT}"`))
  exige('/en/news/:slug com x-default', en.body.includes('hreflang="x-default"'))
  exige('/en/news/:slug com NewsArticle em inglês', en.body.includes('"inLanguage":"en"'))
  exige('/en/news/:slug escapa </script> do corpo traduzido', !en.body.includes('Body with </script>'))

  const slugPortugues = await servir({ locale: 'en', slug: NOTICIA.slug })
  exige('slug português sob /en/news responde 404, e não o texto em português', slugPortugues.code === 404)
  exige('404 inglês marcado como noindex', slugPortugues.body.includes('noindex'))
  exige('404 inglês com título em inglês', slugPortugues.body.includes('News article not found'))

  const espanhol = await servir({ locale: 'es', slug: 'no-existe' })
  exige('/es/noticia sem tradução responde 404 com <html lang="es">', espanhol.code === 404 && /<html lang="es"/.test(espanhol.body))

  const pt = await servir({ locale: 'pt-BR', slug: NOTICIA.slug })
  exige('original com <html lang="pt-BR"> e hreflang para o inglês', /<html lang="pt-BR"/.test(pt.body) && pt.body.includes(`hreflang="en" href="${URL_EN}"`))

  const semLocale = await servir({ slug: NOTICIA.slug })
  exige('rota antiga, sem locale, continua servindo o original', semLocale.code === 200 && semLocale.body.includes(URL_PT))

  const invasor = await servir({ locale: '"><script>alert(1)</script>', slug: NOTICIA.slug })
  exige('locale adulterado é normalizado, nunca ecoado', invasor.code === 200 && !invasor.body.includes('alert(1)'))

  const slugInvasor = await servir({ locale: 'en', slug: '"><img src=x onerror=alert(1)>' })
  exige('slug adulterado no 404 sai escapado', slugInvasor.code === 404 && !slugInvasor.body.includes('<img src=x'))

  const listaIngles = await servir({ view: 'list', locale: 'en' })
  exige('/en/news (lista) responde 200 com <html lang="en">', listaIngles.code === 200 && /<html lang="en"/.test(listaIngles.body))
  exige('/en/news com título e canônica em inglês', listaIngles.body.includes('<title>News · Portal Oeste</title>') && listaIngles.body.includes('href="https://portal.exemplo.com.br/en/news"'))
  exige('/en/news com hreflang para /noticias', listaIngles.body.includes('hreflang="pt-BR" href="https://portal.exemplo.com.br/noticias"'))

  const listaEspanhol = await servir({ view: 'list', locale: 'es' })
  exige('/es/noticias sem notícia em espanhol: noindex, follow', listaEspanhol.body.includes('content="noindex, follow"'))

  const listaPt = await servir({ view: 'list', locale: 'pt-BR' })
  exige('/noticias anuncia a lista inglesa e não a espanhola', listaPt.body.includes('hreflang="en"') && !listaPt.body.includes('hreflang="es"'))
}

secao('Idiomas: sitemaps')

const acervo = criarResposta()
await sitemap.default({ query: { kind: 'news' }, headers: { host: 'portal.exemplo.com.br' } }, acervo.res)
exige('acervo declara o namespace xhtml', acervo.body.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'))
exige('acervo lista a URL inglesa como <loc> própria', acervo.body.includes(`<loc>${URL_EN}</loc>`))
exige('acervo liga as versões por hreflang', acervo.body.includes(`<xhtml:link rel="alternate" hreflang="en" href="${URL_EN}" />`))
exige('acervo declara x-default', acervo.body.includes('hreflang="x-default"'))
exige('acervo sem URL em espanhol, que não existe', !acervo.body.includes('/es/noticia/'))
exige('toda <url> fechada', (acervo.body.match(/<url>/g) ?? []).length === (acervo.body.match(/<\/url>/g) ?? []).length)

const noticiasGoogle = criarResposta()
await sitemap.default({ query: { kind: 'google-news' }, headers: { host: 'portal.exemplo.com.br' } }, noticiasGoogle.res)
exige('Google News: versão inglesa com <news:language>en</news:language>', noticiasGoogle.body.includes('<news:language>en</news:language>'))
exige('Google News: original continua com <news:language>pt</news:language>', noticiasGoogle.body.includes('<news:language>pt</news:language>'))
exige('Google News: título em inglês escapado', noticiasGoogle.body.includes('<news:title>City announces project &amp; &quot;works&quot; downtown</news:title>'))
exige('Google News: nenhum pt-BR onde a especificação pede duas letras', !noticiasGoogle.body.includes('<news:language>pt-BR'))

const paginas = criarResposta()
await sitemap.default({ query: { kind: 'pages' }, headers: { host: 'portal.exemplo.com.br' } }, paginas.res)
exige('páginas: lista inglesa entra no sitemap', paginas.body.includes('<loc>https://portal.exemplo.com.br/en/news</loc>'))
exige('páginas: lista espanhola vazia fica de fora', !paginas.body.includes('/es/noticias'))
exige('páginas: /noticias liga a lista inglesa por hreflang', paginas.body.includes('hreflang="en" href="https://portal.exemplo.com.br/en/news"'))

secao('robots.txt')

/* O script roda de verdade, num diretório temporário, com o domínio definido —
   é a mesma chamada que o `npm run build` faz. */
const pastaRobots = await mkdtemp(join(tmpdir(), 'vitrine-robots-'))
try {
  await mkdir(join(pastaRobots, 'dist'))
  execFileSync(process.execPath, [join(raiz, 'scripts', 'generate-robots.mjs')], {
    cwd: pastaRobots,
    env: { ...process.env, VITE_SITE_URL: 'https://portal.exemplo.com.br/' },
    stdio: 'ignore',
  })
  const robots = await readFile(join(pastaRobots, 'dist', 'robots.txt'), 'utf8')
  exige('um único grupo, para todos os robôs', (robots.match(/^User-agent:/gm) ?? []).length === 1 && robots.includes('User-agent: *'))
  exige('rastreamento público liberado', robots.includes('Allow: /'))
  exige('painel e login fora do rastreamento', robots.includes('Disallow: /admin') && robots.includes('Disallow: /entrar'))
  exige('nenhuma rota de idioma bloqueada', !/Disallow: \/(en|es)\b/.test(robots))
  exige('CSS e JS não bloqueados', !/Disallow: \/assets/.test(robots))
  exige('aponta o índice de sitemaps', robots.includes('Sitemap: https://portal.exemplo.com.br/sitemap.xml'))
  exige('aponta o sitemap do Google News', robots.includes('Sitemap: https://portal.exemplo.com.br/sitemap-google-news.xml'))
} finally {
  await rm(pastaRobots, { recursive: true, force: true })
}

/* -------------------------------------------------------------------------- */

console.log('')
if (falhas.length) {
  console.error(`${falhas.length} de ${total} verificações falharam:`)
  for (const falha of falhas) console.error(`  ✗ ${falha}`)
  process.exit(1)
}
console.log(`${total} verificações de SEO passaram.`)
