/**
 * Teste de segurança: o que um visitante NÃO autenticado consegue fazer.
 *
 * Duas camadas, como a própria arquitetura:
 *
 *   1. A API, atacada de fora, sem sessão — tudo o que um visitante consegue
 *      tentar pela internet. Precisa de API_URL (padrão: http://localhost:8080).
 *
 *   2. O banco, por dentro — as mesmas regras que valiam no Supabase, agora
 *      conferidas assumindo os papéis que a API usa (`anon`, `authenticator`,
 *      `service_role`). É a defesa que sobra se um dia uma rota da API errar.
 *      Precisa de ADMIN_DATABASE_URL; sem ela, esta parte é pulada.
 *
 * Existe porque `lint`, `build` e `smoke` não olham para o servidor nem para o
 * banco: uma rota sem `requireSession`, uma policy frouxa ou um `grant`
 * esquecido passam por todos eles e só aparecem quando alguém explora. Rode
 * depois de mexer em rotas da API ou em migrations.
 *
 * Uso:
 *   npm run security                              (API em localhost:8080)
 *   API_URL=https://vitrine.uffs.edu.br npm run security
 *
 *   # As duas camadas, de dentro do docker-compose (o banco não tem porta exposta):
 *   docker compose run --rm -e API_URL=http://web \
 *     -v "$PWD/scripts:/app/scripts:ro" migrate node scripts/security-check.mjs
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

/** `.env` da pasta e do servidor, sem sobrescrever o ambiente. */
function loadEnv() {
  for (const file of ['.env', 'server/.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        if (!line.includes('=') || line.trimStart().startsWith('#')) continue
        const at = line.indexOf('=')
        const key = line.slice(0, at).trim()
        if (key && process.env[key] === undefined) process.env[key] = line.slice(at + 1).trim()
      }
    } catch {
      // Arquivo ausente: segue com o ambiente.
    }
  }
}

loadEnv()

const API = (process.env.API_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
const DATABASE_URL = process.env.ADMIN_DATABASE_URL ?? ''
const ZERO = '00000000-0000-0000-0000-000000000000'

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

async function call(method, path, { body, headers = {} } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Origin: new URL(API).origin,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  })
  const text = await response.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = null
  }
  return { status: response.status, data, text: text.slice(0, 160), headers: response.headers }
}

/* ========================================================================== */
/* 1. API                                                                      */
/* ========================================================================== */

console.log(`\nTeste de segurança — API em ${API}, SEM AUTENTICAÇÃO\n`)

/*
 * Canário, antes de qualquer asserção. Toda verificação abaixo tem a forma
 * "isto deve ser recusado"; com a API fora do ar, TUDO seria recusado e a
 * suíte declararia segurança sem ter testado nada.
 */
{
  let canary
  try {
    canary = await call('GET', '/api/categories')
  } catch (error) {
    canary = { status: 0, text: error.message }
  }
  if (canary.status !== 200) {
    console.error(
      `Não foi possível ler a vitrine pública (HTTP ${canary.status}).\n` +
        'API fora do ar ou endereço errado — os testes de bloqueio seriam todos\n' +
        'falsos positivos. Confira API_URL e rode de novo.\n',
    )
    process.exit(1)
  }
}

/** Recusa por falta de sessão: 401, e nunca 200 com dados vazios. */
const isUnauthorized = ({ status }) => status === 401

console.log('Área administrativa fechada para quem não entrou')
for (const [description, path] of [
  ['lista de usuários', '/api/admin/profiles'],
  ['métricas do dashboard', '/api/admin/dashboard/stats'],
  ['log de atividade', '/api/admin/activity'],
  ['exportação do log', '/api/admin/activity/export'],
  ['lista administrativa de iniciativas', '/api/admin/initiatives'],
  ['lista administrativa de notícias', '/api/admin/news'],
  ['fila de revisão', '/api/admin/news/pending'],
  ['relatório de audiência', '/api/analytics'],
  ['linhas brutas da audiência', '/api/analytics/rows'],
  ['iniciativa por id (inclui rascunhos)', `/api/initiatives/${ZERO}`],
  ['notícia por id (inclui rascunhos)', `/api/news/${ZERO}`],
  ['histórico de revisão', `/api/news/${ZERO}/reviews`],
  ['traduções pelo painel', `/api/news/${ZERO}/translations`],
]) {
  const result = await call('GET', path)
  report(isUnauthorized(result), description, `HTTP ${result.status} ${result.text}`)
}

console.log('\nEscrita bloqueada')
for (const [description, method, path, body] of [
  ['não cria iniciativa', 'POST', '/api/initiatives', { values: { name: 'security-check' } }],
  ['não publica iniciativa', 'POST', `/api/initiatives/${ZERO}/status`, { status: 'published' }],
  ['não exclui iniciativa', 'DELETE', `/api/initiatives/${ZERO}`],
  ['não cria notícia', 'POST', '/api/news', { values: { name: 'security-check' } }],
  ['não publica notícia', 'POST', `/api/news/${ZERO}/status`, { status: 'published' }],
  ['não cria tradução', 'POST', `/api/news/${ZERO}/translations`, { locale: 'en', values: {} }],
  ['não cria categoria', 'POST', '/api/categories', { name: 'security-check' }],
  ['não cria tag', 'POST', '/api/tags/resolve', { names: ['security-check'] }],
  ['não cria pessoa', 'POST', '/api/people', { name: 'security-check' }],
  ['não altera a identidade do site', 'PUT', '/api/site-settings', { brand_name: 'security-check' }],
  ['não cria conta', 'POST', '/api/admin/users', { name: 'x', email: 'x@x.invalid', password: 'x'.repeat(12) }],
  ['não troca senha de ninguém', 'POST', `/api/admin/users/${ZERO}/password`, { password: 'x'.repeat(12) }],
  ['não se promove a administrador', 'PATCH', `/api/admin/profiles/${ZERO}`, { role: 'admin' }],
  ['não troca a própria senha sem sessão', 'POST', '/api/auth/password', { password: 'x'.repeat(12) }],
  ['não remove arquivo', 'DELETE', '/api/arquivos/news-images', { path: 'x.png' }],
]) {
  const result = await call(method, path, { body })
  report(isUnauthorized(result), description, `HTTP ${result.status} ${result.text}`)
}

{
  // Upload sem sessão, em multipart como o painel envia.
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }), 'x.png')
  const response = await fetch(`${API}/api/arquivos/news-images`, {
    method: 'POST',
    body: form,
    headers: { Origin: new URL(API).origin },
  })
  report(response.status === 401, 'não envia arquivo', `HTTP ${response.status}`)
}

console.log('\nOutra origem não escreve, mesmo com sessão')
{
  // A sessão é cookie; um site malicioso poderia tentar usá-lo de carona. Sem
  // sessão aqui, mas a checagem de origem vem antes de tudo e precisa recusar.
  const result = await call('POST', '/api/auth/logout', { body: {}, headers: { Origin: 'https://site-malicioso.example' } })
  report(result.status === 403, 'POST de outra origem é recusado', `HTTP ${result.status} ${result.text}`)
  const fetchSite = await call('POST', '/api/auth/logout', {
    body: {},
    headers: { 'Sec-Fetch-Site': 'cross-site' },
  })
  report(fetchSite.status === 403, 'POST marcado como cross-site é recusado', `HTTP ${fetchSite.status}`)
}

console.log('\nCadastro fechado')
{
  const setup = await call('GET', '/api/auth/setup')
  if (!setup.data?.hasAdmin) {
    console.log('  — instalação ainda sem administrador: crie a primeira conta em /criar-conta e rode de novo.')
  } else {
    const signup = await call('POST', '/api/auth/signup', {
      body: { name: 'security-check', email: 'security@check.invalid', password: 'x'.repeat(12) },
    })
    report(signup.status === 403, 'o cadastro inicial se fecha depois do primeiro administrador', `HTTP ${signup.status} ${signup.text}`)
  }
  report(setup.status === 200, 'a tela de primeiro acesso ainda consegue se decidir', `HTTP ${setup.status}`)
}

console.log('\nO que é público não carrega o que não é')
{
  const list = await call('GET', '/api/news/search?pageSize=48')
  const statuses = new Set((list.data?.items ?? []).map((item) => item.status))
  report(
    list.status === 200 && [...statuses].every((status) => status === 'published'),
    'a lista pública de notícias só traz publicadas',
    `status vistos: ${[...statuses].join(', ') || 'nenhum'}`,
  )

  const initiatives = await call('GET', '/api/initiatives/search?pageSize=48')
  const initiativeStatuses = new Set((initiatives.data?.items ?? []).map((item) => item.status))
  report(
    initiatives.status === 200 && [...initiativeStatuses].every((status) => status === 'published'),
    'a busca pública de iniciativas só traz publicadas',
    `status vistos: ${[...initiativeStatuses].join(', ') || 'nenhum'}`,
  )

  const first = list.data?.items?.[0]
  if (first) {
    const article = await call('GET', `/api/news/slug/${encodeURIComponent(first.slug)}`)
    const author = article.data?.author ?? {}
    report(
      article.status === 200 && !('email' in author) && !('role' in author) && !('is_active' in author),
      'a assinatura pública não expõe e-mail, papel nem situação do autor',
      `campos do autor: ${Object.keys(author).join(', ')}`,
    )
  } else {
    console.log('  — nenhuma notícia publicada: a verificação da assinatura não tem o que olhar.')
  }

  const tracking = await call('POST', '/api/acessos', { body: { type: 'news', id: ZERO } })
  report(tracking.status === 204, 'o contador de acessos aceita visitante e não devolve nada', `HTTP ${tracking.status}`)
}

console.log('\nCabeçalhos')
{
  const response = await fetch(`${API}/`)
  const has = (name) => response.headers.get(name)
  report(has('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff', has('x-content-type-options'))
  report(Boolean(has('x-frame-options')), 'X-Frame-Options presente', has('x-frame-options'))
  report(!/express/i.test(has('x-powered-by') ?? ''), 'a API não se anuncia (X-Powered-By)', has('x-powered-by'))
}

/* ========================================================================== */
/* 2. Banco                                                                    */
/* ========================================================================== */

if (!DATABASE_URL) {
  console.log('\n— ADMIN_DATABASE_URL não definida: a parte do banco foi pulada.')
} else {
  // `pg` é dependência da API; resolvido a partir de `server/`, aqui e no container.
  const require = createRequire(new URL('../server/package.json', import.meta.url))
  const pg = require('pg')
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  /**
   * Roda `sql` como `role`, numa transação desfeita no fim. Devolve as linhas,
   * ou o código do erro — 42501 é permissão negada, a prova que interessa.
   */
  async function as(role, sql, params = []) {
    await client.query('begin')
    try {
      await client.query(`set local role ${role}`)
      await client.query(`select set_config('request.jwt.claims', '{}', true)`)
      const { rows } = await client.query(sql, params)
      return { rows }
    } catch (error) {
      return { code: error.code, message: error.message }
    } finally {
      await client.query('rollback')
    }
  }

  const denied = (result) => result.code === '42501'

  console.log('\nBanco: o papel do visitante (anon)')
  for (const [description, sql] of [
    ['conteúdo não publicado permanece invisível', `select count(*)::int as n from public.initiatives where status <> 'published'`],
    ['notícias não publicadas permanecem invisíveis', `select count(*)::int as n from public.news where status <> 'published'`],
  ]) {
    const result = await as('anon', sql)
    report(!result.code && result.rows[0].n === 0, description, result.message ?? `${result.rows?.[0]?.n} linha(s)`)
  }

  for (const [description, sql] of [
    ['observações do revisor não vazam', 'select id from public.initiative_reviews limit 1'],
    ['observações do revisor (notícias) não vazam', 'select id from public.news_reviews limit 1'],
    ['log de atividade não vaza', 'select id from public.activity_log limit 1'],
    ['audiência não vaza', 'select views from public.content_views limit 1'],
    ['e-mail da equipe continua inacessível', 'select email from public.profiles limit 1'],
    ['papel do usuário continua inacessível', 'select role from public.profiles limit 1'],
    ['autoria interna da tradução não é exposta', 'select created_by from public.news_translations limit 1'],
    ['contas de acesso fora de alcance', 'select email from auth.users limit 1'],
    ['sessões fora de alcance', 'select token_hash from auth.sessions limit 1'],
    ['não cria iniciativa', `insert into public.initiatives (name, category_id) values ('x', '${ZERO}')`],
    ['não cria notícia', `insert into public.news (name) values ('x')`],
    ['não altera a identidade do site', `update public.site_settings set brand_name = 'x'`],
    ['não registra acesso direto na tabela', `insert into public.content_views (day, content_type, content_id) values (now(), 'news', '${ZERO}')`],
  ]) {
    const result = await as('anon', sql)
    // UPDATE sem grant é recusado; com grant e sem policy, só filtraria — aqui
    // tem de ser recusa explícita.
    report(denied(result), description, result.message ?? `${result.rows?.length} linha(s)`)
  }

  console.log('\nBanco: funções internas fora do alcance do visitante')
  for (const [description, sql] of [
    ['não lê o índice de busca de registros ocultos', `select public.build_initiative_search('${ZERO}')`],
    ['não força reindexação', `select public.refresh_initiative_search('{}'::uuid[])`],
    ['não consulta os helpers de autorização', 'select public.is_staff()'],
    ['não consulta a flag de sessão privilegiada', 'select public.is_privileged_session()'],
    ['não lê métricas administrativas', 'select public.dashboard_stats()'],
    ['não publica iniciativa', `select public.set_initiative_status('${ZERO}', 'published')`],
    ['não publica notícia', `select public.set_news_status('${ZERO}', 'published')`],
    ['não consulta o helper de edição de notícias', `select public.can_edit_news('${ZERO}')`],
    ['não registra acesso pela função do serviço', `select public.record_content_view('news', '${ZERO}', '', '', '', '', '', true, 'UTC')`],
  ]) {
    const result = await as('anon', sql)
    report(denied(result), description, result.message ?? 'executou')
  }

  {
    const result = await as('anon', 'select public.installation_has_admin() as ok')
    report(!result.code, 'a tela de primeiro acesso ainda consulta se há administrador', result.message)
  }

  console.log('\nBanco: os papéis da API não vão além do que precisam')
  for (const [description, role, sql] of [
    ['authenticator, sem assumir papel, não lê conteúdo', 'authenticator', 'select id from public.news limit 1'],
    ['authenticator, sem assumir papel, não lê contas', 'authenticator', 'select id from auth.users limit 1'],
    ['service_role não lê notícias', 'service_role', 'select id from public.news limit 1'],
    ['service_role não lê perfis', 'service_role', 'select id from public.profiles limit 1'],
    ['service_role não lê a audiência', 'service_role', 'select views from public.content_views limit 1'],
  ]) {
    const result = await as(role, sql)
    report(denied(result), description, result.message ?? 'leu')
  }

  console.log('\nBanco: superfície pública esperada (a correção não pode ter fechado de mais)')
  for (const [description, sql] of [
    ['a vitrine pública segue legível', `select id from public.initiatives where status = 'published' limit 1`],
    ['tags das iniciativas publicadas seguem visíveis', 'select tag_id from public.initiative_tags limit 1'],
    ['equipe das iniciativas publicadas segue visível', 'select person_id from public.initiative_people limit 1'],
    ['links das iniciativas publicadas seguem visíveis', 'select id from public.initiative_links limit 1'],
    ['categorias seguem visíveis', 'select id from public.categories limit 1'],
    ['identidade do site segue legível', 'select id from public.site_settings limit 1'],
    ['assinatura pública segue legível', 'select name, slug from public.profiles limit 1'],
  ]) {
    const result = await as('anon', sql)
    report(!result.code, description, result.message)
  }

  {
    const { rows } = await client.query(
      `select c.relname
         from pg_class c
        where c.relnamespace in ('public'::regnamespace, 'storage'::regnamespace)
          and c.relkind = 'r'
          and not c.relrowsecurity`,
    )
    report(rows.length === 0, 'RLS ligado em todas as tabelas de public e storage', rows.map((row) => row.relname).join(', '))
  }

  await client.end()
}

console.log(`\n${passes} verificações passaram, ${failures} falharam.`)

if (failures > 0) {
  console.error('\nAlguma porta está aberta para visitantes não autenticados. Corrija antes de publicar.\n')
  process.exit(1)
}

console.log('Nenhuma exposição encontrada para acesso anônimo.\n')
