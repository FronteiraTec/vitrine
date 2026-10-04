/**
 * O aplicativo HTTP.
 *
 * Dois grupos de rotas:
 *
 *   /api/...           a API do painel e da vitrine (JSON)
 *   /noticia/:slug…    páginas de notícia, listas, sitemaps e feed com o
 *                      `<head>` escrito no servidor — o que antes eram as
 *                      funções da Vercel
 *
 * O Nginx entrega o React e os arquivos enviados; só esses dois grupos chegam
 * até aqui (ver docker/web/nginx.conf).
 */
import express from 'express'
import { analyticsRouter } from './analytics/routes.js'
import { authRouter } from './auth/routes.js'
import { loadSession } from './auth/sessions.js'
import { config } from './config.js'
import { attachDb } from './db.js'
import { liveness, readiness } from './health.js'
import { errorHandler, forbidden, notFound } from './http.js'
import { adminRouter } from './routes/admin.js'
import { catalogRouter } from './routes/catalog.js'
import { initiativesRouter } from './routes/initiatives.js'
import { newsRouter } from './routes/news.js'
import { storageRouter } from './routes/storage.js'
import articleHandler from './seo/article.js'
import feedHandler from './seo/feed.js'
import sitemapHandler from './seo/sitemap.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

let siteOrigin = ''
try {
  siteOrigin = config.siteUrl ? new URL(config.siteUrl).origin : ''
} catch {
  siteOrigin = ''
}

function hostOf(url) {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

/**
 * Segunda camada contra CSRF (a primeira é o cookie `SameSite=Lax`): escrita
 * só vinda do próprio site. `Sec-Fetch-Site` é enviado por todo navegador
 * atual; `Origin`, por todos em POST/PUT/DELETE. Sem nenhum dos dois, a
 * requisição não veio de um navegador — e sem cookie de sessão ela não tem
 * acesso a nada além do que um visitante tem.
 */
function sameOrigin(request, _response, next) {
  if (SAFE_METHODS.has(request.method)) return next()

  const fetchSite = request.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return next(forbidden('Requisição de outra origem recusada.'))
  }

  const origin = request.get('origin')
  if (origin) {
    const host = request.get('x-forwarded-host') ?? request.get('host')
    if (hostOf(origin) !== host && origin !== siteOrigin) {
      return next(forbidden('Requisição de outra origem recusada.'))
    }
  }
  next()
}

/**
 * Chama um handler das páginas de SEO com o `query` que as reescritas da
 * Vercel injetavam. Em Express 5 `req.query` é só leitura; o objeto derivado
 * herda todo o resto da requisição.
 */
function seoRoute(handler, query) {
  return (request, response, next) => {
    const params = typeof query === 'function' ? query(request) : query
    const derived = Object.create(request, { query: { value: params, enumerable: true } })
    Promise.resolve(handler(derived, response)).catch(next)
  }
}

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)

  /* ------------------------------ SEO ----------------------------------- */

  const slug = (locale) => (request) => ({ locale, slug: request.params.slug })
  app.get('/noticia/:slug', seoRoute(articleHandler, slug('pt-BR')))
  app.get('/en/news/:slug', seoRoute(articleHandler, slug('en')))
  app.get('/es/noticia/:slug', seoRoute(articleHandler, slug('es')))
  app.get('/noticias', seoRoute(articleHandler, { view: 'list', locale: 'pt-BR' }))
  app.get('/en/news', seoRoute(articleHandler, { view: 'list', locale: 'en' }))
  app.get('/es/noticias', seoRoute(articleHandler, { view: 'list', locale: 'es' }))
  app.get('/sitemap.xml', seoRoute(sitemapHandler, { kind: 'index' }))
  app.get('/sitemap-paginas.xml', seoRoute(sitemapHandler, { kind: 'pages' }))
  app.get('/sitemap-noticias.xml', seoRoute(sitemapHandler, { kind: 'news' }))
  app.get('/sitemap-google-news.xml', seoRoute(sitemapHandler, { kind: 'google-news' }))
  app.get(['/rss.xml', '/feed.xml'], seoRoute(feedHandler, {}))

  // Em desenvolvimento não há Nginx: a própria API serve os arquivos enviados.
  if (!config.production) {
    app.use(
      config.uploads.publicPath,
      express.static(config.uploads.dir, { immutable: true, maxAge: '365d' }),
      (_request, response) => response.status(404).end(),
    )
  }

  /* ------------------------------ API ----------------------------------- */

  const api = express.Router()

  // Antes de tudo: o health check não lê sessão nem corpo de requisição.
  api.get('/health', liveness)
  api.get('/health/ready', readiness)

  api.use(express.json({ limit: '2mb' }))
  api.use(loadSession)
  api.use(sameOrigin)
  api.use(attachDb)
  api.use((request, response, next) => {
    // Resposta de quem está logado nunca vai para cache compartilhado.
    response.set('Cache-Control', request.auth ? 'private, no-store' : 'no-cache')
    response.set('X-Content-Type-Options', 'nosniff')
    next()
  })

  api.use('/auth', authRouter)
  api.use('/admin', adminRouter)
  api.use(initiativesRouter)
  api.use(newsRouter)
  api.use(catalogRouter)
  api.use(storageRouter)
  api.use(analyticsRouter)

  api.use((_request, _response, next) => next(notFound('Rota inexistente.')))
  api.use(errorHandler)

  app.use('/api', api)
  return app
}
