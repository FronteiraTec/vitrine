/**
 * Teste de integração: os fluxos principais, de ponta a ponta, numa instalação
 * de verdade — banco, migrations, API e Nginx, como o servidor vai rodar.
 *
 * Roda na CI contra a stack recém-construída, ANTES de as imagens serem
 * publicadas: o que vai para o servidor é exatamente o que passou aqui.
 *
 * Cria a primeira conta da instalação e conteúdo de teste. Por isso só roda
 * numa instalação SEM administrador — numa instalação em uso, recusa.
 *
 * Uso: API_URL=http://localhost:8080 node scripts/api-check.mjs
 */

const API = (process.env.API_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
const ORIGIN = new URL(API).origin
const NAVEGADOR = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

let falhas = 0
let total = 0

function confere(descricao, ok, detalhe) {
  total += 1
  if (ok) {
    console.log(`  ✓ ${descricao}`)
  } else {
    falhas += 1
    console.error(`  ✗ ${descricao}${detalhe ? `\n    ${detalhe}` : ''}`)
  }
}

/** Um "navegador": guarda o cookie de sessão entre as chamadas. */
function sessao() {
  let cookie = ''
  return async function chamar(metodo, caminho, { json, form, cabecalhos = {} } = {}) {
    const headers = { Origin: ORIGIN, 'User-Agent': NAVEGADOR, ...cabecalhos }
    if (cookie) headers.Cookie = cookie
    let body
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(json)
    } else if (form) {
      body = form
    }
    const resposta = await fetch(`${API}${caminho}`, { method: metodo, headers, body, redirect: 'manual' })
    const definido = resposta.headers.get('set-cookie')
    if (definido) cookie = definido.split(';')[0]
    const texto = await resposta.text()
    let dados = null
    try {
      dados = JSON.parse(texto)
    } catch {
      dados = null
    }
    return { status: resposta.status, dados, texto, headers: resposta.headers }
  }
}

const admin = sessao()
const editora = sessao()
const visitante = sessao()
const sufixo = Date.now().toString(36)

console.log(`\nTeste de integração — ${API}\n`)

// --- saúde --------------------------------------------------------------------
console.log('Saúde')
{
  const pronta = await visitante('GET', '/api/health/ready')
  confere('API pronta: banco ok e nenhuma migration pendente', pronta.status === 200 && pronta.dados?.ok, pronta.texto)
  confere('a API informa a versão no ar', Boolean(pronta.dados?.version), pronta.texto)
  const versao = await visitante('GET', '/version.json')
  confere('o frontend informa a versão no ar', versao.status === 200 && Boolean(versao.dados?.version), versao.texto)
  confere(
    'frontend e API são do mesmo commit',
    versao.dados?.version && versao.dados.version === pronta.dados?.version,
    `${versao.dados?.version} × ${pronta.dados?.version}`,
  )
}

const setup = await visitante('GET', '/api/auth/setup')
if (setup.dados?.hasAdmin !== false) {
  console.error('\nEsta instalação já tem administrador: o teste cria contas e conteúdo, e só roda em instalação vazia.\n')
  process.exit(1)
}

// --- contas ---------------------------------------------------------------------
console.log('\nContas')
{
  const cadastro = await admin('POST', '/api/auth/signup', {
    json: { name: 'Administração', email: `admin-${sufixo}@teste.invalid`, password: 'senha-de-teste-1' },
  })
  confere('a primeira conta vira administradora', cadastro.status === 201 && cadastro.dados?.profile?.role === 'admin', cadastro.texto)

  const segunda = await visitante('POST', '/api/auth/signup', {
    json: { name: 'Intrusa', email: `intrusa-${sufixo}@teste.invalid`, password: 'senha-de-teste-2' },
  })
  confere('o cadastro se fecha depois do primeiro administrador', segunda.status === 403, segunda.texto)

  const conta = await admin('POST', '/api/admin/users', {
    json: { name: 'Editora', email: `editora-${sufixo}@teste.invalid`, password: 'senha-da-editora', role: 'editor' },
  })
  confere('o administrador cria uma conta de editora', conta.status === 201 && conta.dados?.is_active, conta.texto)

  const errada = await editora('POST', '/api/auth/login', {
    json: { email: `editora-${sufixo}@teste.invalid`, password: 'errada-123' },
  })
  confere('senha errada é recusada', errada.status === 400, errada.texto)

  const entrada = await editora('POST', '/api/auth/login', {
    json: { email: `EDITORA-${sufixo}@teste.invalid`, password: 'senha-da-editora' },
  })
  confere('a editora entra (e-mail sem diferenciar maiúsculas)', entrada.status === 200, entrada.texto)
}

// --- catálogo -------------------------------------------------------------------
console.log('\nIniciativas')
let iniciativa
{
  const categoria = await admin('POST', '/api/categories', { json: { name: `Categoria ${sufixo}`, icon: 'cpu' } })
  confere('cria categoria', categoria.status === 201, categoria.texto)

  const pessoa = await admin('POST', '/api/people', { json: { name: 'Pessoa de Teste', role: 'Coordenação' } })
  const tags = await admin('POST', '/api/tags/resolve', { json: { names: ['Robótica', 'Educação básica'] } })
  confere('resolve tags, criando as novas', tags.status === 200 && tags.dados?.length === 2, tags.texto)

  const criada = await admin('POST', '/api/initiatives', {
    json: {
      values: { name: `Núcleo de Robótica ${sufixo}`, category_id: categoria.dados?.id, short_description: 'Oficinas', areas: ['Tecnologia'] },
      tagIds: tags.dados,
      team: [{ person_id: pessoa.dados?.id, role: 'Coordenação' }],
      links: [{ label: 'Site', url: 'https://exemplo.org', type: 'website' }],
    },
  })
  iniciativa = criada.dados
  confere('cria iniciativa com tags, equipe e links numa transação', criada.status === 201 && Boolean(iniciativa?.slug), criada.texto)

  const rascunho = await visitante('GET', `/api/initiatives/slug/${iniciativa?.slug}`)
  confere('o visitante não vê o rascunho', rascunho.dados === null, rascunho.texto)

  const negada = await editora('POST', `/api/initiatives/${iniciativa?.id}/status`, { json: { status: 'published' } })
  confere('a editora não publica conteúdo de outra pessoa', negada.status === 403, negada.texto)

  const publicada = await admin('POST', `/api/initiatives/${iniciativa?.id}/status`, { json: { status: 'published', notes: 'ok' } })
  confere('o administrador publica', publicada.status === 204, publicada.texto)

  const publica = await visitante('GET', `/api/initiatives/slug/${iniciativa?.slug}`)
  confere(
    'o visitante vê a iniciativa com tags, equipe e links',
    publica.dados?.tags?.length === 2 && publica.dados?.team?.length === 1 && publica.dados?.links?.length === 1,
    publica.texto.slice(0, 200),
  )

  const busca = await visitante('GET', `/api/initiatives/search?q=${encodeURIComponent('robotica ' + sufixo)}`)
  confere('a busca textual sem acento encontra', busca.dados?.total >= 1, busca.texto.slice(0, 200))

  const exclusao = await editora('DELETE', `/api/initiatives/${iniciativa?.id}`)
  confere('a editora não exclui', exclusao.status === 403, exclusao.texto)
}

console.log('\nNotícias')
let noticia
{
  const criada = await admin('POST', '/api/news', {
    json: {
      values: {
        name: `Edital de inovação ${sufixo}`,
        kicker: 'Editais',
        excerpt: 'Resumo da notícia.',
        content: '## Intertítulo\n\nCorpo da notícia.',
        gallery: [{ url: 'https://exemplo.org/foto.jpg', caption: 'Legenda' }],
      },
    },
  })
  noticia = criada.dados
  confere('cria notícia', criada.status === 201, criada.texto)
  await admin('POST', `/api/news/${noticia?.id}/status`, { json: { status: 'published' } })

  const traducao = await admin('POST', `/api/news/${noticia?.id}/translations`, {
    json: { locale: 'en', values: { name: `Innovation call ${sufixo}`, content: 'English body.' } },
  })
  confere('cria a versão em inglês', traducao.status === 201 && Boolean(traducao.dados?.slug), traducao.texto)

  const pagina = await visitante('GET', `/noticia/${noticia?.slug}`)
  confere(
    'a página da notícia sai com o <head> escrito no servidor',
    pagina.status === 200 && pagina.texto.includes('og:title') && pagina.texto.includes('application/ld+json'),
    `HTTP ${pagina.status}`,
  )
  const ingles = await visitante('GET', `/en/news/${traducao.dados?.slug}`)
  confere('a versão em inglês tem página própria', ingles.status === 200 && ingles.texto.includes('lang="en"'), `HTTP ${ingles.status}`)

  const inexistente = await visitante('GET', '/noticia/nao-existe-mesmo')
  confere('notícia inexistente responde 404 de verdade', inexistente.status === 404, `HTTP ${inexistente.status}`)

  const sitemap = await visitante('GET', '/sitemap-noticias.xml')
  confere('o sitemap lista a notícia', sitemap.texto.includes(noticia?.slug ?? '¬'), `HTTP ${sitemap.status}`)

  const rss = await visitante('GET', '/rss.xml')
  confere('o RSS lista a notícia', rss.texto.includes(noticia?.slug ?? '¬'), `HTTP ${rss.status}`)
}

// --- arquivos ---------------------------------------------------------------------
console.log('\nArquivos')
{
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  )
  const form = new FormData()
  form.append('folder', 'galeria')
  form.append('file', new Blob([png], { type: 'image/png' }), 'foto.png')
  const envio = await admin('POST', '/api/arquivos/news-images', { form })
  confere('envia imagem', envio.status === 201 && Boolean(envio.dados?.path), envio.texto)

  const caminho = `/arquivos/news-images/${envio.dados?.path}`
  const servida = await visitante('GET', caminho)
  confere(
    'o Nginx serve a imagem com cache longo e isolamento',
    servida.status === 200 &&
      servida.headers.get('content-type') === 'image/png' &&
      /immutable/.test(servida.headers.get('cache-control') ?? '') &&
      /sandbox/.test(servida.headers.get('content-security-policy') ?? ''),
    `HTTP ${servida.status}`,
  )

  const falsa = new FormData()
  falsa.append('file', new Blob(['<html><script>alert(1)</script>'], { type: 'image/png' }), 'falsa.png')
  const recusada = await admin('POST', '/api/arquivos/news-images', { form: falsa })
  confere('HTML disfarçado de PNG é recusado', recusada.status === 400, recusada.texto)

  const remocao = await admin('DELETE', '/api/arquivos/news-images', { json: { path: envio.dados?.path } })
  confere('remove a imagem', remocao.status === 204, remocao.texto)
}

// --- audiência ----------------------------------------------------------------------
console.log('\nAudiência')
{
  const acesso = await visitante('POST', '/api/acessos', {
    json: { type: 'news', id: noticia?.id, locale: 'pt-BR', unique: true, utmSource: 'whatsapp' },
  })
  confere('registra o acesso do visitante', acesso.status === 204, acesso.texto)
  await admin('POST', '/api/acessos', { json: { type: 'news', id: noticia?.id, unique: true } })

  const relatorio = await admin('GET', `/api/analytics?type=news&id=${noticia?.id}`)
  confere(
    'o relatório conta o visitante, não a equipe, e reconhece o canal',
    relatorio.dados?.totals?.views === 1 && relatorio.dados?.sources?.[0]?.source === 'whatsapp',
    relatorio.texto.slice(0, 300),
  )

  const anonimo = await visitante('GET', '/api/analytics')
  confere('o relatório exige sessão', anonimo.status === 401, anonimo.texto)
}

// --- encerramento --------------------------------------------------------------------
console.log('\nSessão')
{
  const troca = await admin('POST', '/api/auth/password', { json: { currentPassword: 'errada', password: 'nova-senha-123' } })
  confere('troca de senha exige a senha atual', troca.status === 400, troca.texto)

  await admin('POST', '/api/auth/logout')
  const depois = await admin('GET', '/api/auth/session')
  confere('depois de sair, a sessão não vale mais', depois.dados?.user === null, depois.texto)
}

console.log(`\n${total - falhas} de ${total} verificações passaram.`)
if (falhas) process.exit(1)
