/**
 * Cria uma migration nova, já com o nome e o lugar certos.
 *
 *   npm run db:new -- "adiciona idioma em noticias"
 *   → db/migrations/20261005143000_adiciona_idioma_em_noticias.sql
 *
 * O nome começa pela data e hora (UTC), e é essa data que define a ordem.
 * Ela sai sempre DEPOIS da última migration existente — mesmo que o relógio
 * desta máquina esteja atrasado —, porque o executor recusa migration nova
 * com data anterior à última aplicada no servidor.
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), 'db', 'migrations')
const descricao = process.argv.slice(2).join(' ').trim()

if (!descricao) {
  console.error('Uso: npm run db:new -- "o que esta migration faz"')
  process.exit(1)
}

const slug = descricao
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 60)

/** Data e hora UTC como AAAAMMDDhhmmss. */
function carimbo(date) {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 14)
}

const existentes = readdirSync(DIR).filter((nome) => /^\d{14}_/.test(nome)).sort()
const ultima = existentes.at(-1)?.slice(0, 14) ?? ''

let data = new Date()
let versao = carimbo(data)
while (versao <= ultima) {
  data = new Date(data.getTime() + 1000)
  versao = carimbo(data)
}

const arquivo = join(DIR, `${versao}_${slug}.sql`)
if (existsSync(arquivo)) {
  console.error(`Já existe: ${arquivo}`)
  process.exit(1)
}

writeFileSync(
  arquivo,
  `-- =============================================================================
-- Vitrine — ${descricao}
--
-- Regras (ver db/README.md, "Como escrever uma migration"):
--
--   • Depois que esta migration for para a main, ela não muda mais. Errou?
--     Crie outra migration que corrige.
--   • Precisa funcionar com a versão ANTERIOR do app no ar (rollback):
--     acrescente — coluna anulável ou com default, tabela, índice. Remover ou
--     renomear algo que o código usa é uma segunda etapa, numa versão
--     seguinte, quando o código já não depende mais daquilo.
--   • Operação que destrói dado (drop table/column, troca de tipo, truncate,
--     delete) exige a linha abaixo, explicando o porquê — a CI recusa sem ela:
--       -- destrutiva: <motivo>
--   • Tabela nova em public: RLS ligado e grants explícitos (nada é
--     concedido por padrão). Função nova: grant execute explícito.
--   • Roda numa transação junto com as outras pendentes. Para o raro comando
--     que não aceita transação (create index concurrently), acrescente:
--       -- migrate:no-transaction
-- =============================================================================

`,
)

console.log(`Criada: db/migrations/${versao}_${slug}.sql`)
