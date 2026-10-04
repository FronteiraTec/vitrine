/**
 * Importa uma instalação do Supabase para o Postgres próprio.
 *
 * Copia, numa transação só:
 *   • as contas (auth.users) — com o hash bcrypt da senha, então todo mundo
 *     continua entrando com a senha que já tinha;
 *   • todo o conteúdo de `public` (perfis, catálogo, notícias, traduções,
 *     histórico de revisão, log de atividade, identidade do site);
 *   • o registro dos arquivos (storage.objects).
 *
 * Depois baixa os arquivos dos buckets públicos para a pasta de uploads e troca
 * as URLs do Supabase pelas do site novo em todas as colunas de texto, listas
 * e JSON — capas, galerias, fotos no corpo das notícias, logotipos, avatares.
 *
 * Os gatilhos ficam DESLIGADOS durante a cópia (`session_replication_role =
 * replica`): o dado entra exatamente como estava, sem o workflow recarimbar
 * datas, sem gerar slug novo e sem encher o log de atividade de "criou".
 *
 * O destino precisa estar migrado e VAZIO (sem perfis, iniciativas nem
 * notícias). Os dados de demonstração contam como conteúdo: importe num banco
 * novo, ou use --substituir para apagar o destino antes.
 *
 * Variáveis:
 *   SUPABASE_DB_URL     conexão com o banco do Supabase (Settings → Database →
 *                       "Session pooler"; a conexão direta é só IPv6)
 *   SUPABASE_URL        https://SEU-PROJETO.supabase.co
 *   SUPABASE_DB_CA      (opcional) certificado da CA do Supabase, para conferir o TLS
 *   ADMIN_DATABASE_URL  o banco novo, como dono
 *   SITE_URL            domínio do site novo, sem barra no fim
 *   UPLOADS_DIR         pasta dos arquivos (no container: /data/arquivos)
 *
 * Uso (dentro do docker-compose — veja o README, seção "Migrar do Supabase"):
 *   node server/src/tools/importar-supabase.js [--substituir] [--sem-arquivos]
 */
import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import pg from 'pg'
import { config } from '../config.js'

const args = new Set(process.argv.slice(2))
const REPLACE = args.has('--substituir')
const SKIP_FILES = args.has('--sem-arquivos')

const SOURCE_URL = process.env.SUPABASE_DB_URL ?? ''
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '')
const SITE_URL = config.siteUrl
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? config.uploads.dir

function fail(message) {
  console.error(`[importar] ${message}`)
  process.exit(1)
}

if (!SOURCE_URL) fail('defina SUPABASE_DB_URL.')
if (!SUPABASE_URL) fail('defina SUPABASE_URL (https://SEU-PROJETO.supabase.co).')
if (!config.adminDatabaseUrl) fail('defina ADMIN_DATABASE_URL (o banco novo, como dono).')
if (!SITE_URL) fail('defina SITE_URL: as URLs das imagens passam a apontar para ele.')

/**
 * TLS com o Supabase. Sem a CA, a conexão é cifrada mas o certificado não é
 * conferido — aceitável para uma cópia pontual, mas avisado.
 */
function sourceSsl() {
  if (/sslmode=disable/.test(SOURCE_URL)) return false
  if (process.env.SUPABASE_DB_CA) return { ca: readFileSync(process.env.SUPABASE_DB_CA, 'utf8') }
  console.warn('[importar] SUPABASE_DB_CA não definida: TLS sem conferir o certificado do Supabase.')
  return { rejectUnauthorized: false }
}

const source = new pg.Client({
  connectionString: SOURCE_URL.replace(/[?&]sslmode=[^&]*/, ''),
  ssl: sourceSsl(),
})
const target = new pg.Client({ connectionString: config.adminDatabaseUrl })

/** Tabelas de `public`, na ordem em que as chaves estrangeiras pedem. */
const PUBLIC_TABLES = [
  'profiles',
  'categories',
  'tags',
  'people',
  'initiatives',
  'initiative_tags',
  'initiative_people',
  'initiative_links',
  'initiative_reviews',
  'news',
  'news_reviews',
  'news_translations',
  'site_settings',
  'activity_log',
]

const AUTH_COLUMNS = [
  'id',
  'email',
  'encrypted_password',
  'raw_user_meta_data',
  'email_confirmed_at',
  'last_sign_in_at',
  'created_at',
  'updated_at',
]

const OBJECT_COLUMNS = ['bucket_id', 'name', 'owner', 'metadata', 'created_at', 'updated_at']

/** Colunas de uma tabela no DESTINO: nome, tipo e se é identidade. */
async function targetColumns(schema, table) {
  const { rows } = await target.query(
    `select a.attname as name,
            format_type(a.atttypid, a.atttypmod) as type,
            a.attidentity <> '' as identity
       from pg_attribute a
      where a.attrelid = $1::regclass and a.attnum > 0 and not a.attisdropped
      order by a.attnum`,
    [`${schema}.${table}`],
  )
  return rows
}

async function sourceColumnNames(schema, table) {
  const { rows } = await source.query(
    `select column_name from information_schema.columns where table_schema = $1 and table_name = $2`,
    [schema, table],
  )
  return new Set(rows.map((row) => row.column_name))
}

/**
 * Copia uma tabela: só as colunas que existem dos dois lados, cada valor
 * convertido para o tipo do destino. JSON vai serializado — o `pg`
 * transformaria um array JS num array do Postgres, e não num array JSON.
 */
async function copyTable(schema, table, { only, transform = (row) => row } = {}) {
  const available = await sourceColumnNames(schema, table)
  if (!available.size) {
    console.log(`  ${schema}.${table}: não existe na origem, pulada`)
    return 0
  }

  const columns = (await targetColumns(schema, table)).filter(
    (column) => available.has(column.name) && (!only || only.includes(column.name)),
  )
  const names = columns.map((column) => pg.escapeIdentifier(column.name))
  const identity = columns.some((column) => column.identity)

  const { rows } = await source.query(`select ${names.join(', ')} from ${schema}.${pg.escapeIdentifier(table)}`)

  for (const original of rows) {
    const row = transform(original)
    const values = columns.map((column) => {
      const value = row[column.name]
      if (value === null || value === undefined) return null
      return /^jsonb?$/.test(column.type) ? JSON.stringify(value) : value
    })
    const placeholders = columns.map((column, index) => `$${index + 1}::${column.type}`)
    await target.query(
      `insert into ${schema}.${pg.escapeIdentifier(table)} (${names.join(', ')})
       ${identity ? 'overriding system value' : ''}
       values (${placeholders.join(', ')})`,
      values,
    )
  }

  // Colunas de identidade continuam do maior id copiado.
  for (const column of columns.filter((item) => item.identity)) {
    await target.query(
      `select setval(pg_get_serial_sequence($1, $2), greatest((select max(${pg.escapeIdentifier(column.name)}) from ${schema}.${pg.escapeIdentifier(table)}), 1))`,
      [`${schema}.${table}`, column.name],
    )
  }

  console.log(`  ${schema}.${table}: ${rows.length}`)
  return rows.length
}

/** Troca a origem das URLs em toda coluna de texto, lista de texto e JSON. */
async function rewriteUrls(from, to) {
  const { rows } = await target.query(
    `select c.table_name, c.column_name, c.data_type, c.udt_name
       from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = any($1::text[])
        and (c.data_type in ('text', 'character varying', 'json', 'jsonb')
             or (c.data_type = 'ARRAY' and c.udt_name in ('_text', '_varchar')))`,
    [PUBLIC_TABLES],
  )

  let changed = 0
  for (const { table_name: table, column_name: name, data_type: type } of rows) {
    const column = pg.escapeIdentifier(name)
    const target_ = `public.${pg.escapeIdentifier(table)}`
    let sql
    if (type === 'ARRAY') {
      sql = `update ${target_}
                set ${column} = array(select replace(item, $1, $2)
                                        from unnest(${column}) with ordinality as u(item, position)
                                       order by position)
              where array_to_string(${column}, ' ') like '%' || $1 || '%'`
    } else if (type === 'json' || type === 'jsonb') {
      sql = `update ${target_} set ${column} = replace(${column}::text, $1, $2)::${type}
              where ${column}::text like '%' || $1 || '%'`
    } else {
      sql = `update ${target_} set ${column} = replace(${column}, $1, $2) where ${column} like '%' || $1 || '%'`
    }
    const result = await target.query(sql, [from, to])
    if (result.rowCount) console.log(`  ${table}.${name}: ${result.rowCount}`)
    changed += result.rowCount
  }
  return changed
}

async function downloadFiles(objects) {
  const root = resolve(UPLOADS_DIR)
  let ok = 0
  const failed = []
  const queue = [...objects]

  async function worker() {
    while (queue.length) {
      const { bucket_id: bucket, name } = queue.shift()
      const url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${name.split('/').map(encodeURIComponent).join('/')}`
      const path = resolve(root, bucket, name)
      if (!path.startsWith(root + sep)) {
        failed.push(`${bucket}/${name} (caminho inválido)`)
        continue
      }
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, Buffer.from(await response.arrayBuffer()))
        ok += 1
      } catch (error) {
        failed.push(`${bucket}/${name} (${error.message})`)
      }
    }
  }

  await Promise.all(Array.from({ length: 4 }, worker))
  return { ok, failed }
}

async function main() {
  await source.connect()
  await target.connect()

  const { rows: applied } = await target.query('select count(*)::int as n from app.schema_migrations').catch(() => ({
    rows: [{ n: 0 }],
  }))
  if (!applied[0].n) fail('o banco novo ainda não foi migrado. Rode o serviço `migrate` antes.')

  const { rows: content } = await target.query(
    `select (select count(*) from public.profiles) + (select count(*) from public.initiatives)
            + (select count(*) from public.news) as n`,
  )
  if (content[0].n > 0 && !REPLACE) {
    fail(
      'o banco novo já tem conteúdo (dados de demonstração contam). Importe num banco novo ou rode com --substituir para apagá-lo antes.',
    )
  }

  console.log(`[importar] origem: ${SUPABASE_URL}`)
  console.log(`[importar] destino: ${SITE_URL}`)

  await target.query('begin')
  try {
    // Gatilhos e checagem de chave estrangeira desligados: cópia fiel.
    await target.query('set local session_replication_role = replica')

    if (REPLACE) {
      console.log('[importar] apagando o conteúdo do destino…')
      await target.query(
        `truncate ${[...PUBLIC_TABLES].reverse().map((table) => `public.${table}`).join(', ')},
                  public.content_views, storage.objects, auth.password_resets, auth.sessions, auth.users`,
      )
    } else {
      // A linha única de `site_settings` nasce com a migration 0005.
      await target.query('delete from public.site_settings')
    }

    console.log('[importar] copiando…')
    await copyTable('auth', 'users', {
      only: AUTH_COLUMNS,
      transform: (row) => ({ ...row, email: String(row.email ?? '').trim().toLowerCase() }),
    })
    for (const table of PUBLIC_TABLES) await copyTable('public', table)
    await copyTable('storage', 'objects', { only: OBJECT_COLUMNS })

    const from = `${SUPABASE_URL}/storage/v1/object/public/`
    const to = `${SITE_URL}${config.uploads.publicPath}/`
    console.log(`[importar] trocando ${from} → ${to}`)
    const changed = await rewriteUrls(from, to)
    console.log(`[importar] ${changed} campo(s) com URL atualizada.`)

    await target.query('commit')
  } catch (error) {
    await target.query('rollback').catch(() => {})
    throw error
  }

  if (SKIP_FILES) {
    console.log('[importar] --sem-arquivos: os arquivos não foram baixados.')
  } else {
    const { rows: objects } = await target.query('select bucket_id, name from storage.objects order by bucket_id, name')
    console.log(`[importar] baixando ${objects.length} arquivo(s) para ${UPLOADS_DIR}…`)
    const { ok, failed } = await downloadFiles(objects)
    console.log(`[importar] ${ok} arquivo(s) baixado(s).`)
    if (failed.length) {
      console.warn(`[importar] ${failed.length} falharam — baixe à mão ou rode de novo com --substituir:`)
      for (const item of failed.slice(0, 50)) console.warn(`  - ${item}`)
    }
  }

  // Conferência: o que entrou de cada lado.
  console.log('\n[importar] conferência (origem → destino):')
  for (const [schema, table] of [['auth', 'users'], ...PUBLIC_TABLES.map((name) => ['public', name]), ['storage', 'objects']]) {
    const count = async (client) =>
      (await client.query(`select count(*)::int as n from ${schema}.${table}`).catch(() => ({ rows: [{ n: '—' }] }))).rows[0].n
    const [a, b] = [await count(source), await count(target)]
    console.log(`  ${`${schema}.${table}`.padEnd(28)} ${String(a).padStart(6)} → ${String(b).padStart(6)}${a === b ? '' : '   ⚠ diferente'}`)
  }

  console.log('\n[importar] pronto. As pessoas entram com a mesma senha de antes; as sessões antigas não valem.')
}

try {
  await main()
} catch (error) {
  console.error(`[importar] falhou, nada foi gravado no banco novo: ${error.message}`)
  process.exitCode = 1
} finally {
  await source.end().catch(() => {})
  await target.end().catch(() => {})
}
