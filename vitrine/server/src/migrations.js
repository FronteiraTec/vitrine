/**
 * As regras da história das migrations, sem banco: lidas pelo executor
 * (`migrate.js`) e pelo health check da API (`/api/health/ready`).
 *
 * A história é LINEAR e IMUTÁVEL:
 *
 *   • migration já aplicada não pode mudar  → o checksum denuncia;
 *   • migration já aplicada não pode sumir  → idem;
 *   • migration nova entra sempre DEPOIS da última aplicada — uma com data
 *     anterior (de uma branch antiga, por exemplo) é recusada, em vez de rodar
 *     fora de ordem num banco que já seguiu adiante.
 *
 * Mudou de ideia sobre uma migration que já foi para o servidor? Escreva outra,
 * nova, que corrige. É o mesmo princípio do Liquibase e do Flyway.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations/', import.meta.url))

/** `AAAAMMDDhhmmss_descricao.sql` — a data no nome é a ordem. */
export const FILE_NAME = /^(\d{14})_[a-z0-9_]+\.sql$/
export const NO_TRANSACTION = /^--\s*migrate:no-transaction\b/m

/** Conteúdo com fim de linha normalizado: um clone no Windows não muda o checksum. */
export function checksum(sql) {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex')
}

export async function readMigrationFiles(dir = MIGRATIONS_DIR) {
  const names = (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort()
  const files = []
  for (const name of names) {
    if (!FILE_NAME.test(name)) {
      throw new Error(`nome fora do padrão AAAAMMDDhhmmss_descricao.sql: ${name}`)
    }
    const sql = await readFile(`${dir}${name}`, 'utf8')
    files.push({ name, sql, checksum: checksum(sql) })
  }
  return files
}

/**
 * Confronta os arquivos com o que o banco registrou (`version`, `checksum`).
 *
 *   pending   arquivos ainda não aplicados, na ordem
 *   ahead     aplicadas que este código não conhece, todas MAIS NOVAS que o
 *             último arquivo dele — é o banco depois de um rollback do app, e
 *             é esperado
 *   baseline  aplicadas sem checksum (instalação anterior ao checksum): o
 *             conteúdo atual passa a ser a referência
 *   problems  história quebrada — nada deve rodar
 */
export function compare(files, applied) {
  const byName = new Map(files.map((file) => [file.name, file]))
  const appliedNames = new Set(applied.map((row) => row.version))
  const newestFile = files.at(-1)?.name ?? ''
  const newestApplied = applied.reduce((max, row) => (row.version > max ? row.version : max), '')

  const problems = []
  const ahead = []
  const baseline = []

  for (const row of applied) {
    const file = byName.get(row.version)
    if (!file) {
      if (row.version > newestFile) ahead.push(row.version)
      else problems.push(`${row.version}: aplicada no banco, mas o arquivo não existe mais`)
      continue
    }
    if (!row.checksum) baseline.push(file)
    else if (row.checksum !== file.checksum) {
      problems.push(`${row.version}: o arquivo mudou depois de aplicado — crie uma migration nova em vez de editar esta`)
    }
  }

  const pending = files.filter((file) => !appliedNames.has(file.name))
  for (const file of pending) {
    if (file.name < newestApplied) {
      problems.push(
        `${file.name}: é anterior à última aplicada (${newestApplied}) — recrie com a data de hoje (npm run db:new)`,
      )
    }
  }

  return { pending, ahead, baseline, problems }
}
