/**
 * Executor das migrations — o "changelog" da Vitrine.
 *
 * Cada arquivo de `db/migrations/` roda UMA vez, em ordem, e fica registrado em
 * `app.schema_migrations` com o checksum do conteúdo, a duração e a versão do
 * sistema que o aplicou. As regras da história (linear e imutável) estão em
 * `migrations.js`; havendo qualquer violação, NADA roda.
 *
 * Todas as pendentes rodam NUMA TRANSAÇÃO SÓ: ou entram todas, ou nenhuma. Um
 * deploy com três migrations que falha na terceira não deixa as duas primeiras
 * aplicadas — o banco fica exatamente como estava, e o app antigo segue no ar.
 * A exceção é o arquivo marcado com `-- migrate:no-transaction` (o
 * `create index concurrently`, por exemplo, não roda em transação): havendo um
 * desses entre as pendentes, cada arquivo vira a sua própria etapa.
 *
 * Uma trava (`pg_advisory_lock`) impede dois deploys de migrarem ao mesmo tempo.
 *
 * Roda como DONO do banco (`ADMIN_DATABASE_URL`), no container `migrate`.
 *
 *   node server/src/migrate.js            aplica o que falta
 *   node server/src/migrate.js --status   lista aplicadas, pendentes e problemas
 *   node server/src/migrate.js --check    não aplica nada; sai com 0 (em dia),
 *                                         10 (há pendentes) ou 1 (história quebrada)
 *   node server/src/migrate.js --seed     aplica e carrega os dados de demonstração
 *                                         (⚠ db/seed.sql APAGA o catálogo antes)
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { config } from './config.js'
import { compare, NO_TRANSACTION, readMigrationFiles } from './migrations.js'

const DB_DIR = fileURLToPath(new URL('../../db/', import.meta.url))
const SEEDS = ['seed.sql', 'seed-noticias.sql', 'seed-traducoes.sql']
const LOCK_KEY = 'vitrine:migrations'
const EXIT_PENDING = 10

const args = new Set(process.argv.slice(2))
const MODE = args.has('--status') ? 'status' : args.has('--check') ? 'check' : 'apply'
const APP_VERSION = process.env.APP_VERSION ?? 'local'

let client = null

/**
 * O Postgres pode levar alguns segundos para aceitar conexões no primeiro
 * boot. Cada tentativa usa um cliente NOVO: o `pg` não reconecta um cliente
 * cuja conexão falhou.
 */
async function connect(attempts = 30) {
  for (let attempt = 1; ; attempt += 1) {
    const candidate = new pg.Client({ connectionString: config.adminDatabaseUrl })
    try {
      await candidate.connect()
      client = candidate
      return
    } catch (error) {
      await candidate.end().catch(() => {})
      if (attempt >= attempts) throw error
      console.log(`[migrate] banco indisponível (${error.code ?? error.message}); nova tentativa em 2 s`)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }
}

/** A tabela de controle — e as colunas que versões anteriores dela não tinham. */
async function ensureControlTable() {
  await client.query(`
    create schema if not exists app;
    create table if not exists app.schema_migrations (
      version     text primary key,
      applied_at  timestamptz not null default now()
    );
    alter table app.schema_migrations
      add column if not exists checksum     text,
      add column if not exists execution_ms integer,
      add column if not exists app_version  text;
  `)
}

async function appliedRows() {
  const { rows } = await client.query(
    'select version, checksum, applied_at, app_version from app.schema_migrations order by version',
  )
  return rows
}

function printStatus(files, applied, result) {
  const appliedByName = new Map(applied.map((row) => [row.version, row]))
  const pendingNames = new Set(result.pending.map((file) => file.name))
  for (const file of files) {
    const row = appliedByName.get(file.name)
    let state = 'PENDENTE'
    if (!pendingNames.has(file.name)) {
      const when = new Date(row.applied_at).toISOString().slice(0, 16).replace('T', ' ')
      state = `aplicada ${when} UTC${row.app_version ? ` · ${row.app_version.slice(0, 7)}` : ''}`
    }
    console.log(`  ${file.name.padEnd(52)} ${state}`)
  }
  for (const version of result.ahead) {
    console.log(`  ${version.padEnd(52)} aplicada, de uma versão mais nova do sistema`)
  }
  console.log(
    `\n[migrate] ${applied.length} aplicada(s), ${result.pending.length} pendente(s)` +
      (result.ahead.length ? `, ${result.ahead.length} à frente deste código` : ''),
  )
}

async function applyPending(pending) {
  const steps = pending.some((file) => NO_TRANSACTION.test(file.sql))
    ? pending.map((file) => [file]) // cada arquivo é uma etapa
    : [pending] // tudo ou nada

  if (steps.length > 1) {
    console.log('[migrate] há migration sem transação entre as pendentes: cada arquivo será uma etapa.')
  }

  for (const step of steps) {
    const transactional = !(step.length === 1 && NO_TRANSACTION.test(step[0].sql))
    if (transactional) await client.query('begin')
    try {
      for (const file of step) {
        const started = Date.now()
        process.stdout.write(`[migrate] ${file.name} … `)
        await client.query(file.sql)
        await client.query(
          `insert into app.schema_migrations (version, checksum, execution_ms, app_version)
           values ($1, $2, $3, $4)`,
          [file.name, file.checksum, Date.now() - started, APP_VERSION],
        )
        console.log(`ok (${Date.now() - started} ms)`)
      }
      if (transactional) await client.query('commit')
    } catch (error) {
      console.log('FALHOU')
      if (transactional) {
        await client.query('rollback').catch(() => {})
        console.error(
          step.length > 1
            ? `[migrate] rollback: nenhuma das ${step.length} migrations pendentes foi aplicada.`
            : '[migrate] rollback: esta migration foi desfeita.',
        )
      }
      const where = error.position ? ` (posição ${error.position})` : ''
      throw new Error(`${error.message}${where}`, { cause: error })
    }
  }
}

async function main() {
  if (!config.adminDatabaseUrl) throw new Error('ADMIN_DATABASE_URL não definida.')
  await connect()
  await client.query('select pg_advisory_lock(hashtext($1))', [LOCK_KEY])

  await ensureControlTable()
  const files = await readMigrationFiles()
  const applied = await appliedRows()
  const result = compare(files, applied)

  if (MODE === 'status') printStatus(files, applied, result)

  if (result.problems.length) {
    console.error('\n[migrate] HISTÓRIA DAS MIGRATIONS QUEBRADA — nada foi aplicado:')
    for (const problem of result.problems) console.error(`  ✗ ${problem}`)
    process.exitCode = 1
    return
  }

  if (MODE === 'status') return

  if (MODE === 'check') {
    if (result.pending.length) {
      console.log(`[migrate] ${result.pending.length} migration(s) pendente(s):`)
      for (const file of result.pending) console.log(`  · ${file.name}`)
      process.exitCode = EXIT_PENDING
    } else {
      console.log('[migrate] banco em dia.')
    }
    return
  }

  // Instalação feita antes do checksum: o conteúdo atual vira a referência.
  for (const file of result.baseline) {
    await client.query('update app.schema_migrations set checksum = $2 where version = $1', [
      file.name,
      file.checksum,
    ])
  }
  if (result.baseline.length) {
    console.log(`[migrate] checksum registrado para ${result.baseline.length} migration(s) já aplicada(s).`)
  }

  if (result.pending.length) {
    await applyPending(result.pending)
    console.log(`[migrate] ${result.pending.length} migration(s) aplicada(s).`)
  } else {
    console.log('[migrate] banco em dia.')
  }
  if (result.ahead.length) {
    console.log(
      `[migrate] o banco tem ${result.ahead.length} migration(s) de uma versão mais nova do sistema — normal depois de um rollback.`,
    )
  }

  // A API lê a tabela de controle para o health check (/api/health/ready).
  await client.query(`
    do $$
    begin
      if exists (select 1 from pg_roles where rolname = 'service_role') then
        grant usage on schema app to service_role;
        grant select on app.schema_migrations to service_role;
      end if;
    end $$;
  `)

  if (config.appDbPassword) {
    await client.query(
      `alter role authenticator with login password ${client.escapeLiteral(config.appDbPassword)}`,
    )
  } else {
    console.warn('[migrate] APP_DB_PASSWORD não definida: o papel authenticator fica sem senha e a API não conecta.')
  }

  if (args.has('--seed')) {
    for (const file of SEEDS) {
      process.stdout.write(`[seed] ${file} … `)
      await client.query(await readFile(`${DB_DIR}${file}`, 'utf8'))
      console.log('ok')
    }
  }
}

try {
  await main()
} catch (error) {
  console.error(`[migrate] ${error.message}`)
  process.exitCode = 1
} finally {
  await client?.end().catch(() => {})
}
