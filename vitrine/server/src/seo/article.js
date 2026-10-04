/**
 * HTML das páginas de notícia com o `<head>` já escrito no servidor.
 *
 * ESTE É O ARQUIVO QUE RESOLVE O PROBLEMA DO COMPARTILHAMENTO.
 *
 * A vitrine é uma SPA: sem esta função, o HTML entregue em `/noticia/:slug` é
 * sempre o mesmo `index.html` genérico, e o título, a descrição e a imagem só
 * aparecem depois que o JavaScript roda. WhatsApp, Facebook e X **não executam
 * JavaScript** — na prática, todo link de notícia compartilhado saía sem
 * prévia. O Googlebot executa, mas com atraso, e atraso é exatamente o que não
 * se pode pagar em notícia.
 *
 * O que muda: o `<head>` (título, descrição, Open Graph, canônica, `hreflang`,
 * JSON-LD) e o `<html lang>`. O corpo do texto continua sendo montado no
 * cliente — o dado estruturado leva `articleBody`, então o texto chega ao
 * rastreador já na primeira leitura.
 *
 * Serve os três idiomas, pelo parâmetro `locale` que as rotas de
 * `server/src/app.js` injetam, e duas formas de página:
 *
 *   /noticia/:slug · /en/news/:slug · /es/noticia/:slug     a notícia
 *   /noticias      · /en/news       · /es/noticias          a lista (`view=list`)
 *
 * NÃO é cloaking: a resposta é idêntica para leitor e para robô, e o conteúdo
 * descrito no `<head>` é o mesmo que a página exibe. A diferença é só o momento
 * em que ele fica disponível.
 */
import { seoData } from './data.js'
import { loadShell } from './shell.js'
import {
  buildNewsListMeta,
  buildNewsMeta,
  injectHead,
  newsArticleJsonLd,
  newsBreadcrumbJsonLd,
  PRIVATE_ROBOTS,
  renderHead,
  webSiteJsonLd,
} from '../../../src/lib/seo.js'
import { articleImageUrls, parseArticleBody } from '../../../src/lib/news-content.js'
import { LOCALES, newsArticlePath, normalizeLocale } from '../../../src/i18n/config.js'

/**
 * Cache para um proxy ou CDN à frente do servidor, se a instituição tiver um.
 * O navegador ignora `s-maxage`, então o leitor sempre recebe a versão atual.
 */
const CACHE_HIT = 'public, s-maxage=300, stale-while-revalidate=86400'
const CACHE_MISS = 'public, s-maxage=60, stale-while-revalidate=600'

function sendHtml(response, { status, body, cache }) {
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.setHeader('Cache-Control', cache)
  // A casca varia com o deploy, não com o visitante; deixar explícito evita
  // que um proxy intermediário invente uma chave de cache por navegador.
  response.setHeader('Vary', 'Accept-Encoding')
  response.status(status).send(body)
}

/**
 * Lista de notícias de um idioma. Não carrega notícia nenhuma — só descobre em
 * que idiomas há conteúdo, para decidir `hreflang` e `noindex`. Se o banco não
 * responder, a lista sai sem `hreflang` e indexável: melhor do que marcar como
 * vazia, por um minuto de instabilidade, uma lista que tem conteúdo.
 */
async function sendList({ request, response, shell, locale }) {
  let available
  try {
    available = await seoData.fetchNewsLocales()
  } catch {
    available = null
  }

  const site = await seoData.loadSite(request)
  const head = renderHead({
    meta: buildNewsListMeta({ site, locale, available }),
    jsonLd: [webSiteJsonLd(site)],
  })

  sendHtml(response, {
    status: 200,
    body: injectHead(shell, head, { lang: locale }),
    cache: available ? CACHE_HIT : CACHE_MISS,
  })
}

export default async function handler(request, response) {
  // O idioma chega de um parâmetro da URL e NÃO é confiável: `normalizeLocale`
  // devolve sempre um dos três códigos conhecidos.
  const locale = normalizeLocale(request.query?.locale)
  const view = request.query?.view === 'list' ? 'list' : 'article'
  const slug = String(request.query?.slug ?? '').trim()
  const shell = await loadShell()

  /*
   * Sem a casca não dá para montar a página. Redirecionar para o próprio
   * endereço seria laço infinito — a reescrita traria a requisição de volta
   * para cá. Então devolve um documento mínimo, que ao menos leva o leitor à
   * listagem em vez de uma tela em branco. Na prática só acontece se o
   * `index.html` do deploy estiver inacessível.
   */
  if (!shell) {
    sendHtml(response, {
      status: 503,
      cache: 'no-store',
      body: [
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />',
        '<meta name="robots" content="noindex" />',
        '<title>Serviço indisponível</title></head><body>',
        '<p>Não foi possível carregar a página agora.</p>',
        '<p><a href="/noticias">Ver todas as notícias</a></p>',
        '</body></html>',
      ].join(''),
    })
    return
  }

  if (view === 'list') {
    await sendList({ request, response, shell, locale })
    return
  }

  if (!slug) {
    sendHtml(response, { status: 200, body: shell, cache: CACHE_MISS })
    return
  }

  let article
  try {
    article = await seoData.fetchArticle(slug, locale)
  } catch {
    // Banco fora do ar ou consulta recusada: a SPA ainda tenta buscar a
    // notícia no cliente e mostra o próprio estado de erro. Melhor do que
    // trocar a página inteira por um 500.
    sendHtml(response, { status: 200, body: shell, cache: CACHE_MISS })
    return
  }

  const site = await seoData.loadSite(request)

  /*
   * Slug inexistente, rascunho ou arquivado devolvem 404 DE VERDADE.
   *
   * A reescrita de SPA respondia 200 para qualquer endereço, inclusive os que
   * nunca existiram. Para o buscador isso é "soft 404": ele indexa a página de
   * "não encontrado" como se fosse conteúdo, e o mesmo texto passa a aparecer
   * sob dezenas de URLs. O corpo continua sendo a SPA, que pinta a tela de
   * notícia não encontrada — só o código de status e o `noindex` mudam.
   *
   * Vale igual para os idiomas: `/en/news/<slug>` sem tradução em inglês é 404,
   * e nunca a notícia em português servida sob uma URL inglesa.
   */
  if (!article) {
    const text = LOCALES[locale].seo
    const head = renderHead({
      meta: {
        title: text.notFoundTitle,
        fullTitle: `${text.notFoundTitle} · ${site.name}`,
        description: text.notFoundDescription,
        canonical: `${site.url}${newsArticlePath(locale, slug)}`,
        robots: PRIVATE_ROBOTS,
        type: 'website',
        siteName: site.name,
        locale: LOCALES[locale].og,
      },
    })

    sendHtml(response, {
      status: 404,
      body: injectHead(shell, head, { lang: locale }),
      cache: CACHE_MISS,
    })
    return
  }

  // Capa, fotos do corpo e galeria — a mesma lista que a página monta.
  const images = articleImageUrls({
    cover: article.cover_image,
    blocks: parseArticleBody(article.content),
    gallery: article.gallery,
  })

  const head = renderHead({
    meta: buildNewsMeta({ article, site }),
    jsonLd: [
      newsArticleJsonLd({ article, site, images }),
      newsBreadcrumbJsonLd({ site, article }),
      webSiteJsonLd(site),
    ],
  })

  sendHtml(response, {
    status: 200,
    body: injectHead(shell, head, { lang: article.locale }),
    cache: CACHE_HIT,
  })
}
