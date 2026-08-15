/**
 * Teste de segurança: o que um visitante NÃO autenticado consegue fazer.
 *
 * Ataca o projeto real com a chave anônima — a mesma que qualquer pessoa extrai
 * do bundle em dez segundos — e falha se alguma porta estiver aberta.
 *
 * Existe porque `lint`, `build` e `smoke` não olham para o banco: uma policy
 * frouxa ou um `grant execute` esquecido passa por todos eles e só aparece
 * quando alguém explora. Rode depois de mexer em migrations.
 *
 * Uso: npm run security
 */
import { readFileSync } from 'node:fs'

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const entries = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line.includes('=') && !line.trimStart().startsWith('#'))
        .map((line) => {
          const at = line.indexOf('=')
          return [line.slice(0, at).trim(), line.slice(at + 1).trim()]
        })
      const env = Object.fromEntries(entries)
      if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) return env
    } catch {
      // Arquivo ausente: tenta o próximo.
    }
  }
  return {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  }
}

const env = loadEnv()
const URL_BASE = env.VITE_SUPABASE_URL
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY

if (!URL_BASE || !ANON_KEY) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (.env.local) antes de rodar.')
  process.exit(1)
}

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
}

let failures = 0
let passes = 0

function report(ok, description, detail) {
  if (ok) {
    passes += 1
    console.log(`  ✓ ${description}`)
  } else {
    failures += 1
    console.error(`  ✗ ${description}`)
    if (detail) console.error(`    ${detail}`)
  }
}

async function get(path) {
  const response = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { ...headers, Prefer: 'count=exact' },
  })
  return { status: response.status, range: response.headers.get('content-range') }
}

async function rpc(name, body = {}) {
  const response = await fetch(`${URL_BASE}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let code = ''
  try {
    code = JSON.parse(text)?.code ?? ''
  } catch {
    // Resposta sem corpo JSON: fica sem código e o chamador decide.
  }
  return { status: response.status, code, text: text.slice(0, 120) }
}

/**
 * A chamada foi de fato recusada?
 *
 * O status sozinho não serve como prova. Chave errada, projeto pausado ou rede
 * fora também respondem 401 — e aí a suíte inteira passaria exatamente quando
 * não conseguiu testar nada. Por isso exigimos a evidência específica do
 * motivo, e nunca aceitamos 200/204:
 *
 *   42501    o Postgres recusou por permissão — foi o `revoke` agindo
 *   PGRST202 a função não existe ou não está exposta pelo PostgREST
 *
 * Qualquer outro erro (rede, JWT inválido, indisponibilidade) NÃO conta como
 * bloqueio: é um teste que não chegou a acontecer, e vai reprovar.
 */
function isBlockedFunction({ status, code }) {
  if (status === 200 || status === 204) return false
  return code === '42501' || code === 'PGRST202'
}

async function insert(table, payload) {
  const response = await fetch(`${URL_BASE}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  let code = ''
  try {
    code = JSON.parse(text)?.code ?? ''
  } catch {
    // Sem corpo JSON: o chamador trata pelo status.
  }
  return { status: response.status, code, text: text.slice(0, 120) }
}

/**
 * A escrita foi barrada por AUTORIZAÇÃO, e não por acaso.
 *
 * `status >= 400` seria enganoso: um payload incompleto falha por `not null`
 * (23502) mesmo com o RLS escancarado, e o teste passaria pelo motivo errado.
 * Exigir 42501 — violação de row-level security ou permissão negada — prova que
 * quem recusou foi a policy.
 */
function isDeniedWrite({ status, code }) {
  if (status < 400) return false
  return code === '42501'
}

/** Uma linha só é "vazia" quando o total do content-range é 0. */
function isEmpty(range) {
  return range === '*/0' || /\/0$/.test(range ?? '')
}

console.log('\nTeste de segurança — tudo abaixo é feito SEM AUTENTICAÇÃO\n')

/*
 * Canário, antes de qualquer asserção.
 *
 * Toda verificação abaixo tem a forma "isto deve ser recusado". Se a chave
 * estiver errada, o projeto pausado ou a rede fora, TUDO é recusado e a suíte
 * declararia segurança sem ter testado uma linha sequer. Uma leitura pública
 * que precisa funcionar separa "está trancado" de "não consegui bater na
 * porta".
 */
{
  const canary = await get('categories?select=id&limit=1')
  if (canary.status >= 400) {
    console.error(
      `Não foi possível ler a vitrine pública (HTTP ${canary.status}).\n` +
        'Chave inválida, projeto indisponível ou rede fora — os testes de bloqueio\n' +
        'seriam todos falsos positivos. Corrija o acesso e rode de novo.\n',
    )
    process.exit(1)
  }
}

console.log('Isolamento de leitura')
for (const [description, path] of [
  ['conteúdo não publicado permanece invisível', 'initiatives?select=id&status=neq.published'],
  ['notícias não publicadas permanecem invisíveis', 'news?select=id&status=neq.published'],
  ['perfis e e-mails da equipe não vazam', 'profiles?select=id'],
  ['observações do revisor não vazam', 'initiative_reviews?select=id'],
  ['observações do revisor (notícias) não vazam', 'news_reviews?select=id'],
  ['log de atividade não vaza', 'activity_log?select=id'],
]) {
  const { status, range } = await get(`${path}&limit=1`)
  report(status < 400 && isEmpty(range), description, `HTTP ${status}, range ${range}`)
}

console.log('\nEscrita bloqueada')
for (const [description, table, payload] of [
  ['não cria iniciativa', 'initiatives', { name: 'security-check' }],
  ['não cria categoria', 'categories', { name: 'security-check' }],
  ['não cria notícia', 'news', { name: 'security-check' }],
  ['não se autopromove criando um perfil admin', 'profiles', {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'security-check',
    email: 'security@check.invalid',
    role: 'admin',
  }],
  ['não altera a identidade do site', 'site_settings', { brand_name: 'security-check' }],
]) {
  const result = await insert(table, payload)
  report(
    isDeniedWrite(result),
    description,
    `HTTP ${result.status} ${result.code || ''} ${result.text}`,
  )
}

console.log('\nFunções internas fora do alcance do cliente')
for (const [description, name, body] of [
  ['não lê o índice de busca de registros ocultos', 'build_initiative_search', {
    p_initiative: '00000000-0000-0000-0000-000000000000',
  }],
  ['não força reindexação (escrita via SECURITY DEFINER)', 'refresh_initiative_search', { p_ids: [] }],
  ['não lê o índice de busca de notícias', 'build_news_search', {
    p_news: '00000000-0000-0000-0000-000000000000',
  }],
  ['não força reindexação de notícias', 'refresh_news_search', { p_ids: [] }],
  ['não consulta os helpers de autorização', 'is_staff', {}],
  ['não consulta o papel do usuário', 'auth_role', {}],
  ['não consulta a flag de sessão privilegiada', 'is_privileged_session', {}],
  ['não lê métricas administrativas', 'dashboard_stats', {}],
]) {
  const result = await rpc(name, body)
  report(
    isBlockedFunction(result),
    description,
    `HTTP ${result.status} ${result.code || ''} ${result.text}`,
  )
}

console.log('\nWorkflow editorial protegido')
for (const [description, name] of [
  ['não publica iniciativa', 'set_initiative_status'],
  ['não publica notícia', 'set_news_status'],
]) {
  const result = await rpc(name, {
    p_id: '00000000-0000-0000-0000-000000000000',
    p_status: 'published',
  })
  /*
   * Aqui os dois caminhos de recusa produzem 42501: a função revogada para
   * `anon` e a própria exceção do workflow ("não encontrada ou sem permissão").
   * Exigir o código, em vez de só `status >= 400`, impede que uma indisponi-
   * bilidade passe por autorização negada.
   */
  report(
    isBlockedFunction(result),
    description,
    `HTTP ${result.status} ${result.code || ''} ${result.text}`,
  )
}

/*
 * O contrapeso das seções acima.
 *
 * Fechar acesso é fácil demais: bastaria revogar tudo para os bloqueios todos
 * passarem e a vitrine ficar em branco. Estas verificações reprovam a correção
 * que fecha de mais.
 *
 * As tabelas filhas estão aqui por um motivo específico: suas policies chamam
 * `initiative_is_visible()`, e expressões de policy são avaliadas com as
 * permissões de quem consulta. Revogar essa função de `anon` junto com as
 * internas silenciaria equipe, tags e links de toda a vitrine — o tipo de
 * regressão que só aparece quando alguém abre uma página de iniciativa.
 */
console.log('\nSuperfície pública esperada (a correção não pode ter fechado de mais)')
for (const [description, path] of [
  ['a vitrine pública segue legível', 'initiatives?select=id&status=eq.published'],
  ['tags das iniciativas publicadas seguem visíveis', 'initiative_tags?select=tag_id'],
  ['equipe das iniciativas publicadas segue visível', 'initiative_people?select=person_id'],
  ['links das iniciativas publicadas seguem visíveis', 'initiative_links?select=id'],
  ['categorias seguem visíveis', 'categories?select=id'],
  ['identidade do site segue legível', 'site_settings?select=id'],
]) {
  const { status } = await get(`${path}&limit=1`)
  report(status < 400, description, `HTTP ${status}`)
}
{
  const setup = await rpc('installation_has_admin')
  report(
    setup.status === 200,
    'a tela de primeiro acesso ainda consegue se decidir',
    `HTTP ${setup.status} ${setup.code || ''}`,
  )
}

console.log(`\n${passes} verificações passaram, ${failures} falharam.`)

if (failures > 0) {
  console.error(
    '\nAlguma porta está aberta para visitantes não autenticados.' +
      '\nSe as falhas forem de "funções internas", aplique a migration' +
      ' 20250101000008_harden_function_grants.sql.\n',
  )
  process.exit(1)
}

console.log('Nenhuma exposição encontrada para acesso anônimo.\n')
