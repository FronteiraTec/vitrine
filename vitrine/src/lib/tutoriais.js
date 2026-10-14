/**
 * Tutoriais guiados — a parte que não depende do Shepherd nem do React.
 *
 * Aqui ficam o vocabulário das áreas, a leitura das rotas de cada tutorial e o
 * que é gravado no navegador. O motor do tour (`components/tutorial/motor.js`)
 * só é baixado quando um tutorial começa; tudo o que o botão de ajuda precisa
 * saber ANTES disso — que tutoriais existem nesta tela, quais já foram vistos —
 * mora neste módulo, que é leve.
 *
 * Nada aqui toca `window` no topo do arquivo: o `npm run smoke` renderiza os
 * layouts fora do navegador.
 */
import { matchPath } from 'react-router-dom'

export const AREA = {
  PUBLICO: 'publico',
  PAINEL: 'painel',
}

/** Estados que o mascote aceita num passo (os mesmos do componente Mascote). */
export const ESTADOS_MASCOTE = [
  'parado',
  'carregando',
  'sucesso',
  'faltando',
  'naoEncontrado',
  'erro',
  'ajuda',
  'falando',
  'dormindo',
  'caminhando',
]

/** O painel é tudo o que fica sob `/admin`; o resto é a vitrine pública. */
export function areaDoCaminho(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/') ? AREA.PAINEL : AREA.PUBLICO
}

/** `rota` pode ser um padrão do React Router (`/iniciativa/:slug`) ou uma lista deles. */
export function casaRota(rota, pathname) {
  const padroes = [rota].flat().filter(Boolean)
  return padroes.some((padrao) => matchPath({ path: padrao, end: true }, pathname))
}

/**
 * A rota em que cada passo acontece.
 *
 * Um passo sem `rota` continua na tela do passo anterior, e o primeiro herda a
 * do tutorial. Assim só o passo que MUDA de página precisa dizer para onde vai.
 */
export function rotasDosPassos(tutorial) {
  let atual = tutorial.rota
  return tutorial.passos.map((passo) => {
    atual = passo.rota ?? atual
    return atual
  })
}

/** Todas as telas em que o tutorial é oferecido no menu de ajuda. */
function rotasOferecidas(tutorial) {
  return [tutorial.rota, ...tutorial.passos.map((passo) => passo.rota), tutorial.oferecerEm]
    .flat()
    .filter(Boolean)
}

export function podeVer(tutorial, { isStaff, isAdmin, canReview } = {}) {
  if (tutorial.area === AREA.PAINEL && !isStaff) return false
  if (tutorial.permissao === 'admin') return Boolean(isAdmin)
  if (tutorial.permissao === 'review') return Boolean(canReview)
  return true
}

/** Tutoriais que fazem sentido na tela atual, para quem está olhando. */
export function tutoriaisDaTela(lista, pathname, permissoes) {
  const area = areaDoCaminho(pathname)
  return lista.filter(
    (tutorial) =>
      tutorial.area === area &&
      podeVer(tutorial, permissoes) &&
      casaRota(rotasOferecidas(tutorial), pathname),
  )
}

/** Movimento reduzido vale tanto pelo sistema quanto pelo painel de acessibilidade do site. */
export function prefereMenosMovimento() {
  if (typeof window === 'undefined') return false
  return (
    document.documentElement.getAttribute('data-motion') === 'reduced' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/* -------------------------------------------------------------------------- */
/* Registro de concluídos e pulados — localStorage                              */
/* -------------------------------------------------------------------------- */

const PREFIXO = 'vitrine:tutorial'

/**
 * `vitrine:tutorial:<id>:v<versao>`. Aumentar a `versao` no arquivo do
 * tutorial muda a chave, e ele volta a aparecer para todo mundo.
 *
 * No painel a chave leva também o id da pessoa: o primeiro acesso de CADA
 * integrante da equipe tem o tour de boas-vindas, mesmo num computador
 * compartilhado.
 */
export function chaveRegistro(tutorial, usuarioId) {
  const base = `${PREFIXO}:${tutorial.id}:v${tutorial.versao}`
  return tutorial.area === AREA.PAINEL && usuarioId ? `${base}:${usuarioId}` : base
}

/*
 * Com o storage bloqueado, a memória segura a resposta até a página
 * recarregar. Sem ela, quem pulou o tour de boas-vindas o veria abrir de novo a
 * cada visita à home na mesma sessão.
 */
const memoria = new Map()
const ouvintes = new Set()
let versao = 0

export function lerRegistro(chave) {
  if (memoria.has(chave)) return memoria.get(chave)
  if (typeof window === 'undefined') return null
  try {
    const valor = JSON.parse(window.localStorage.getItem(chave) ?? 'null')
    return valor?.situacao === 'concluido' || valor?.situacao === 'pulado' ? valor : null
  } catch {
    return null
  }
}

/** `situacao`: `'concluido'` ou `'pulado'`. */
export function gravarRegistro(chave, situacao) {
  const valor = { situacao, em: new Date().toISOString() }
  memoria.set(chave, valor)
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // Modo privativo ou storage cheio: vale a memória, só nesta visita.
  }
  versao += 1
  for (const ouvinte of ouvintes) ouvinte()
}

/** Para `useSyncExternalStore`: o botão de ajuda troca "Começar" por "Ver de novo" na hora. */
export function assinarRegistros(ouvinte) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export function versaoRegistros() {
  return versao
}

/* -------------------------------------------------------------------------- */
/* Tour em andamento — sessionStorage                                           */
/* -------------------------------------------------------------------------- */

/*
 * Guardado a cada passo e apagado quando o tour termina. Recarregar a página
 * no meio retoma do mesmo passo; fechar a aba esquece, porque o sessionStorage
 * é da aba.
 */
const ANDAMENTO = `${PREFIXO}:andamento`

export function lerAndamento() {
  if (typeof window === 'undefined') return null
  try {
    const valor = JSON.parse(window.sessionStorage.getItem(ANDAMENTO) ?? 'null')
    return valor && typeof valor.id === 'string' && Number.isInteger(valor.passo) ? valor : null
  } catch {
    return null
  }
}

export function gravarAndamento(andamento) {
  try {
    window.sessionStorage.setItem(ANDAMENTO, JSON.stringify(andamento))
  } catch {
    // Sem storage, recarregar a página simplesmente encerra o tour.
  }
}

export function limparAndamento() {
  try {
    window.sessionStorage.removeItem(ANDAMENTO)
  } catch {
    // Idem.
  }
}
