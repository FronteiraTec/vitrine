/**
 * Verificação da camada de estilo.
 *
 * Existe por causa de uma diferença fundamental entre Tailwind e Bootstrap:
 * no Tailwind, uma classe inventada não compila e o erro aparece; no Bootstrap,
 * ela simplesmente não faz efeito. O site sobe, o build passa, o lint passa — e
 * a imagem fica sem proporção, o badge perde a cor, a aba ativa fica igual às
 * outras. Silêncio, não erro.
 *
 * Três checagens, todas contra o CSS REALMENTE compilado:
 *
 *   1. classes órfãs — o JSX pede, o CSS não define;
 *   2. resíduo de Tailwind — sintaxe que sobrou da migração;
 *   3. conflitos de `!important` — utilitário do Bootstrap que apaga uma
 *      classe do projeto aplicada no mesmo elemento.
 *
 * Uso: npm run css   (exige `npm run build:only` antes)
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const RAIZ = process.cwd()
const falhas = []
let verificacoes = 0

function exige(ok, titulo, detalhe) {
  verificacoes += 1
  if (ok) {
    console.log(`  ✓ ${titulo}`)
  } else {
    falhas.push(titulo)
    console.error(`  ✗ ${titulo}`)
    if (detalhe) console.error(`    ${detalhe}`)
  }
}

/* -------------------------------------------------------------------------- */
/* CSS compilado                                                               */
/* -------------------------------------------------------------------------- */

let css = ''
try {
  const dir = join(RAIZ, 'dist', 'assets')
  for (const arquivo of await readdir(dir)) {
    if (arquivo.endsWith('.css')) css += await readFile(join(dir, arquivo), 'utf8')
  }
} catch {
  /* tratado abaixo */
}

if (!css) {
  console.error('CSS compilado não encontrado. Rode `npm run build:only` antes.\n')
  process.exit(1)
}

const definidas = new Set([...css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]))

/* -------------------------------------------------------------------------- */
/* Classes citadas no JSX                                                      */
/* -------------------------------------------------------------------------- */

async function arquivosJsx(dir) {
  const saida = []
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) saida.push(...(await arquivosJsx(caminho)))
    else if (entrada.name.endsWith('.jsx')) saida.push(caminho)
  }
  return saida
}

const fontes = await arquivosJsx(join(RAIZ, 'src'))

/*
 * Só entram nomes com FORMA de utilitário: com hífen, ou de uma lista curta de
 * palavras que o CSS usa como classe de uma só palavra. Sem esse filtro, texto
 * em português dentro de literais (`'autor'`, `'iniciativa'`) e listas de
 * colunas SQL entrariam como falso positivo e afogariam o sinal.
 */
const FORMA = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$|:/
const PALAVRA_UNICA = new Set([
  'card', 'btn', 'badge', 'nav', 'row', 'col', 'container', 'active', 'show',
  'vr', 'small', 'lead', 'table', 'alert', 'skeleton', 'avatar', 'icon', 'switch',
])

const usadas = new Map()
const residuo = new Map()

/* Sintaxe que só o compilador do Tailwind entendia. */
const RESIDUO_TAILWIND = [
  [/\baspect-\[/, 'proporção arbitrária (`aspect-[16/9]`) — use `.ratio-*`'],
  [/\b(hover|focus|active|disabled|group-hover|focus-within):/, 'variante de estado do Tailwind'],
  [/\b(sm|md|lg|xl|2xl):/, 'prefixo responsivo do Tailwind (o Bootstrap infixa)'],
  [/\bdata-\[/, 'variante `data-[]` do Tailwind'],
  [/\[&/, 'seletor aninhado do Tailwind'],
  [/\b(text-muted-foreground|bg-card|border-border|text-foreground|shadow-subtle)\b/, 'token do tema antigo'],
  [/\bsize-\d/, '`size-*` do Tailwind — use `.icon*` ou `.h-fx-*`/`.w-fx-*`'],
  [/-\[[^\]]+\]/, 'valor arbitrário do Tailwind'],
]

for (const caminho of fontes) {
  const texto = await readFile(caminho, 'utf8')
  const nome = caminho.split(/[\\/]/).pop()

  // `wrapperClassName` e `contentClassName` também recebem classes, e foi
  // exatamente ali que um `absolute inset-0` do Tailwind passou batido.
  const blocos = [...texto.matchAll(/(?:className|wrapperClassName|contentClassName)="([^"{}]*)"/g)].map(
    (m) => m[1],
  )
  for (const m of texto.matchAll(/'([^'\n]*)'/g)) {
    const valor = m[1]
    // Descarta o que não é lista de classes: media query (`(prefers-…)`),
    // caminho e frase solta. Sem isto, `'(prefers-reduced-motion: reduce)'`
    // entraria como classe órfã.
    const listaDeClasses =
      valor &&
      valor.includes(' ') &&
      !valor.startsWith('(') &&
      !valor.includes('/') &&
      /^[a-z0-9 :_[\]().,%-]+$/.test(valor)
    if (listaDeClasses) blocos.push(valor)
  }

  for (const bloco of blocos) {
    for (const [padrao, motivo] of RESIDUO_TAILWIND) {
      if (padrao.test(bloco)) {
        const chave = `${motivo} — ${nome}`
        residuo.set(chave, (residuo.get(chave) ?? 0) + 1)
      }
    }

    for (const classe of bloco.split(/\s+/)) {
      if (!classe) continue
      if (FORMA.test(classe) || PALAVRA_UNICA.has(classe)) {
        if (!usadas.has(classe)) usadas.set(classe, new Set())
        usadas.get(classe).add(nome)
      }
    }
  }
}

console.log('Classes órfãs (o JSX pede, o CSS não define)')

const orfas = [...usadas].filter(([classe]) => !definidas.has(classe))
exige(
  orfas.length === 0,
  `nenhuma classe órfã (${usadas.size} classes distintas conferidas)`,
  orfas.length
    ? orfas.map(([c, a]) => `${c} (${[...a].slice(0, 3).join(', ')})`).join('; ')
    : undefined,
)

console.log('\nResíduo de sintaxe do Tailwind')
exige(
  residuo.size === 0,
  'nenhuma sintaxe do Tailwind remanescente',
  residuo.size ? [...residuo].map(([k, n]) => `${n}x ${k}`).join('; ') : undefined,
)

/* -------------------------------------------------------------------------- */
/* Conflito de !important                                                      */
/* -------------------------------------------------------------------------- */

console.log('\nConflitos de precedência')

/*
 * Utilitários do Bootstrap saem com `!important`. Quando um deles é aplicado no
 * MESMO elemento que uma classe do projeto que declara a mesma propriedade, o
 * utilitário vence e a classe do projeto morre em silêncio.
 *
 * Foi o que aconteceu com os badges de status: `badgeVariants` sem variante caía
 * no padrão `neutral` (`.text-bg-secondary`, com `!important` em cor e fundo), e
 * os cinco estados do workflow saíam todos cinza — perdendo a paleta verificada
 * para daltonismo.
 */
const PARES_PROIBIDOS = [
  ['text-bg-', 'badge-status-'],
  ['bg-primary', 'badge-status-'],
  ['bg-secondary', 'dot-status-'],
]

const conflitos = []
for (const caminho of fontes) {
  const texto = await readFile(caminho, 'utf8')
  const nome = caminho.split(/[\\/]/).pop()
  const blocos = [
    ...[...texto.matchAll(/(?:className|wrapperClassName)="([^"{}]*)"/g)].map((m) => m[1]),
    ...[...texto.matchAll(/'([^'\n]*)'/g)].map((m) => m[1]),
  ]
  for (const bloco of blocos) {
    for (const [utilitario, projeto] of PARES_PROIBIDOS) {
      if (bloco.includes(utilitario) && bloco.includes(projeto)) {
        conflitos.push(`${nome}: "${bloco.trim().slice(0, 60)}"`)
      }
    }
  }
}

exige(
  conflitos.length === 0,
  'nenhum utilitário com !important apagando classe do projeto',
  conflitos.join('; '),
)

/* -------------------------------------------------------------------------- */
/* Invariantes que o Bootstrap exige                                           */
/* -------------------------------------------------------------------------- */

console.log('\nInvariantes de marcação')

const semTable = []
const proporcaoInvalida = []

for (const caminho of fontes) {
  const texto = await readFile(caminho, 'utf8')
  const nome = caminho.split(/[\\/]/).pop()

  for (const m of texto.matchAll(/<table([^>]*)>/g)) {
    if (!/className="[^"]*\btable\b/.test(m[1])) semTable.push(`${nome}: <table${m[1]}>`)
  }

  // A prop `ratio` do componente Image tem de nomear uma classe `.ratio-*`,
  // senão a imagem fica sem espaço reservado e a grade salta no carregamento.
  for (const m of texto.matchAll(/ratio=["'{]([^"'}]*)["'}]/g)) {
    const valor = m[1]
    // `null` desliga a proporção de propósito — o pai já tem altura própria.
    if (
      valor.includes('ratio-') ||
      valor.startsWith('featured') ||
      valor === 'ratio' ||
      valor === 'null'
    ) {
      continue
    }
    proporcaoInvalida.push(`${nome}: ratio="${valor}"`)
  }
}

exige(semTable.length === 0, 'toda <table> declara a classe .table', semTable.join('; '))
exige(
  proporcaoInvalida.length === 0,
  'toda proporção de imagem usa uma classe .ratio-*',
  proporcaoInvalida.join('; '),
)

/* -------------------------------------------------------------------------- */
/* Resets: o Reboot do Bootstrap != o Preflight do Tailwind                     */
/* -------------------------------------------------------------------------- */

console.log('\nResets neutralizados')

/*
 * As duas bibliotecas partem de resets DIFERENTES, e foi daí que vieram os bugs
 * mais espalhados da migração. Estas checagens existem para que a neutralização
 * não seja removida por acidente — o efeito de removê-la é visual, difuso e não
 * quebra teste nenhum.
 */
const posReboot = css.indexOf('ol,ul{padding-left:2rem}')
const posListaReset = css.indexOf('list-style:none')

exige(
  posReboot === -1 || (posListaReset > -1 && posListaReset > posReboot),
  'o marcador de lista do Reboot está neutralizado depois dele',
  'sem isto, toda <ul> de estrutura ganha bolinha e recuo de 2rem',
)

exige(
  /:where\(button\)/.test(css),
  'botão sem `.btn` tem o reset de peso zero',
  'sem isto, ele volta à aparência nativa do sistema operacional',
)

/* -------------------------------------------------------------------------- */

console.log('')
if (falhas.length) {
  console.error(`${falhas.length} de ${verificacoes} verificações falharam.`)
  process.exit(1)
}
console.log(`${verificacoes} verificações de estilo passaram.`)
