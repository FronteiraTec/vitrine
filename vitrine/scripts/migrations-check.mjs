/**
 * Confere as migrations ANTES de irem para o servidor — a mesma regra que o
 * executor aplica no deploy, só que na CI, onde o erro é barato.
 *
 *   node scripts/migrations-check.mjs [--base <ref do git>]
 *
 * Sempre:
 *   • nome no padrão AAAAMMDDhhmmss_descricao.sql, sem versão repetida;
 *   • operação destrutiva (drop table/column/schema/type/view, troca de tipo,
 *     rename, truncate, delete from) só com o comentário `-- destrutiva:` e o
 *     motivo — um drop nunca entra por acidente.
 *
 * Com --base (a CI passa a main, ou o commit anterior do push):
 *   • nenhuma migration que já existia no base pode ter mudado ou sumido;
 *   • toda migration nova tem data POSTERIOR à última do base.
 *
 * Uso: npm run db:check   (compara com origin/main)
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'db/migrations'
const NOME = /^\d{14}_[a-z0-9_]+\.sql$/

/**
 * As migrations até aqui vieram antes desta regra e já foram revisadas uma a
 * uma; a marcação de destrutiva vale a partir das próximas.
 */
const ULTIMA_ANTES_DA_REGRA = '20251003000015'

const DESTRUTIVA = new RegExp(
  [
    String.raw`\bdrop\s+(table|column|schema|type|view|materialized\s+view|sequence|domain)\b`,
    String.raw`\balter\s+column\s+\S+\s+(set\s+data\s+)?type\b`,
    String.raw`\brename\s+(column\s+\S+\s+)?to\b`,
    String.raw`\btruncate\b`,
    String.raw`\bdelete\s+from\b`,
  ].join('|'),
  'i',
)

const normalizar = (texto) => texto.replace(/\r\n/g, '\n')
/** O SQL sem comentários: um `drop` citado num comentário não é um `drop`. */
const semComentarios = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

const args = process.argv.slice(2)
const posicaoBase = args.indexOf('--base')
const base = posicaoBase >= 0 ? (args[posicaoBase + 1] ?? '') : ''

const erros = []
const arquivos = readdirSync(DIR).filter((nome) => nome.endsWith('.sql')).sort()

// --- regras de cada arquivo --------------------------------------------------
const versoes = new Set()
for (const nome of arquivos) {
  if (!NOME.test(nome)) {
    erros.push(`${nome}: nome fora do padrão AAAAMMDDhhmmss_descricao.sql (use npm run db:new)`)
    continue
  }
  const versao = nome.slice(0, 14)
  if (versoes.has(versao)) erros.push(`${nome}: versão ${versao} repetida`)
  versoes.add(versao)

  if (versao > ULTIMA_ANTES_DA_REGRA) {
    const sql = readFileSync(join(DIR, nome), 'utf8')
    const achado = semComentarios(sql).match(DESTRUTIVA)
    if (achado && !/^--\s*destrutiva:\s*\S/im.test(sql)) {
      erros.push(
        `${nome}: contém "${achado[0].trim()}" — operação destrutiva exige o comentário "-- destrutiva: <motivo>"`,
      )
    }
  }
}

// --- linearidade em relação ao base -------------------------------------------
function git(...parametros) {
  return execFileSync('git', parametros, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
}

if (base && !/^0+$/.test(base)) {
  let doBase = null
  try {
    git('rev-parse', '--verify', `${base}^{commit}`)
    doBase = git('ls-tree', '--name-only', base, '--', `${DIR}/`)
      .split('\n')
      .map((caminho) => caminho.split('/').pop())
      .filter((nome) => nome?.endsWith('.sql'))
  } catch {
    console.log(`  — base "${base}" não encontrado; só as regras de cada arquivo foram conferidas.`)
  }

  if (doBase) {
    const atuais = new Set(arquivos)
    for (const nome of doBase) {
      if (!atuais.has(nome)) {
        erros.push(`${nome}: existia em ${base} e foi removida — migration publicada não sai do histórico`)
        continue
      }
      const antes = normalizar(git('show', `${base}:./${DIR}/${nome}`))
      const agora = normalizar(readFileSync(join(DIR, nome), 'utf8'))
      if (antes !== agora) {
        erros.push(`${nome}: foi alterada em relação a ${base} — crie uma migration nova em vez de editar esta`)
      }
    }

    const ultimaDoBase = doBase.sort().at(-1) ?? ''
    for (const nome of arquivos.filter((item) => !doBase.includes(item))) {
      if (nome <= ultimaDoBase) {
        erros.push(`${nome}: é nova, mas tem data anterior à última de ${base} (${ultimaDoBase}) — recrie com npm run db:new`)
      }
    }
    console.log(`  comparado com ${base}: ${doBase.length} migration(s) no base, ${arquivos.length - doBase.length} nova(s)`)
  }
}

if (erros.length) {
  console.error('\nMigrations com problema:')
  for (const erro of erros) console.error(`  ✗ ${erro}`)
  process.exit(1)
}
console.log(`  ✓ ${arquivos.length} migrations conferidas: nomes, ordem e operações destrutivas.`)
