/**
 * Sobe a API.
 */
import { initGeo } from './analytics/geo.js'
import { purgeExpiredSessions } from './auth/sessions.js'
import { createApp } from './app.js'
import { config, isMailConfigured } from './config.js'
import { pool } from './db.js'

if (!config.databaseUrl) {
  console.error('DATABASE_URL não definida. Veja .env.example.')
  process.exit(1)
}

if (!config.siteUrl) {
  console.warn(
    '[api] SITE_URL não definida: canônica e URLs de arquivo seguem o Host da requisição, e o e-mail de senha fica desligado. Defina em produção.',
  )
}

await initGeo()

const server = createApp().listen(config.port, () => {
  console.log(`[api] ouvindo na porta ${config.port}`)
  console.log(`[api] e-mail de redefinição de senha: ${isMailConfigured && config.siteUrl ? 'ligado' : 'desligado'}`)
})

// Sessões vencidas e links de senha usados saem do banco uma vez por hora.
const purge = setInterval(() => {
  purgeExpiredSessions().catch((error) => console.error('[api] limpeza de sessões falhou:', error.message))
}, 60 * 60 * 1000)
purge.unref()

/** Encerramento limpo: o Docker manda SIGTERM antes de matar o container. */
function shutdown(signal) {
  console.log(`[api] ${signal} recebido, encerrando…`)
  server.close(() => {
    pool.end().finally(() => process.exit(0))
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
