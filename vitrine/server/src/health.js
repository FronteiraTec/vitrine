/**
 * Saúde da API — o que o deploy, o Docker e quem estiver de plantão consultam.
 *
 *   GET /api/health         o processo está de pé (não toca no banco)
 *   GET /api/health/ready   pronto para atender: banco respondendo, nenhuma
 *                           migration pendente e a história íntegra. 503 se não.
 *
 * As duas respostas dizem qual versão está no ar (`version` = SHA do commit,
 * gravado na imagem pelo build). É assim que o deploy confirma que a versão
 * nova — e não a anterior — é a que está respondendo.
 *
 * A lista de migrations que esta versão espera vem dos arquivos dentro da
 * própria imagem; o que foi aplicado, do banco. Migration "à frente" (o banco
 * tem uma que este código não conhece) não impede: é o estado normal depois de
 * um rollback do app, e as migrations são escritas para isso (ver db/README.md).
 */
import { SERVICE, withRole } from './db.js'
import { compare, readMigrationFiles } from './migrations.js'

const INFO = Object.freeze({
  version: process.env.APP_VERSION || 'local',
  builtAt: process.env.APP_BUILT_AT || null,
  startedAt: new Date().toISOString(),
})

let expected = null

export function liveness(_request, response) {
  response.set('Cache-Control', 'no-store')
  response.json({ ok: true, ...INFO })
}

export async function readiness(_request, response) {
  response.set('Cache-Control', 'no-store')
  const report = { ok: false, ...INFO, db: 'indisponível', migrations: null }

  try {
    expected ??= await readMigrationFiles()
    const rows = await withRole(SERVICE, async (client) => {
      const result = await client.query('select version, checksum from app.schema_migrations')
      return result.rows
    })
    report.db = 'ok'

    const { pending, ahead, problems } = compare(expected, rows)
    report.migrations = {
      applied: rows.length,
      latest: rows.reduce((max, row) => (row.version > max ? row.version : max), '') || null,
      pending: pending.map((file) => file.name),
      ahead,
      problems,
    }
    report.ok = pending.length === 0 && problems.length === 0
  } catch (error) {
    // O motivo fica no log do servidor; a resposta pública diz só o estado.
    console.error('[health] não pronto:', error.message)
  }

  response.status(report.ok ? 200 : 503).json(report)
}
