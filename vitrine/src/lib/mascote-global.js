/**
 * O mascote do canto da tela reagindo ao que acontece na página.
 *
 * Qualquer parte do código pede uma reação (`avisarSucesso`, `avisarFaltando`,
 * `avisarErro` ou `reagir`); o botão de ajuda
 * (`components/tutorial/BotaoAjuda.jsx`) é quem mostra: o mascote muda de
 * estado e fala num balão por alguns segundos.
 *
 * Store externo, como o das preferências de acessibilidade (`lib/a11y.js`):
 * quem pede a reação não precisa estar na árvore do React nem saber se o
 * mascote existe naquela tela.
 *
 * Quando o mascote não pode aparecer, a reação é recusada e os `avisar*` caem
 * no toast de sempre. Isso acontece quando:
 *   - não há botão de ajuda na tela (páginas de login, por exemplo);
 *   - outro mascote está em cena (no balão de um tutorial, na tela de 404);
 *   - há um diálogo aberto — o mascote ficaria atrás do fundo escuro, e o
 *     Radix esconde o resto da página do leitor de tela, então o aviso não
 *     seria lido.
 *
 * Também mora aqui a roupa do mascote: a cada entrada (visita ou login) uma
 * roupa é sorteada, e ela vale para todos os mascotes até a aba fechar.
 */
import { toast } from '@/components/ui/toast'
import { estadoPorStatus, MENSAGENS, mensagemPorStatus, ROUPAS } from '@/components/mascote/Mascote'

const DURACAO_PADRAO_MS = 5000

let reacao = null
let sequencia = 0
let presentes = 0
let emCena = 0
const ouvintes = new Set()

function avisar() {
  for (const ouvinte of ouvintes) ouvinte()
}

export function assinarMascote(ouvinte) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

/** Para `useSyncExternalStore`: `{ id, estado, mensagem, duracao, lang, estadoFinal }` ou `null`. */
export function lerReacao() {
  return reacao
}

/** Quantos mascotes "grandes" estão na tela agora (tela de 404, por exemplo). */
export function lerEmCena() {
  return emCena
}

export function lerNoServidor() {
  return null
}

/**
 * O botão de ajuda se registra enquanto o mascote está visível e livre. A
 * função devolvida desfaz o registro — e, sem nenhum mascote na tela, uma fala
 * pendente é descartada para não reaparecer na próxima página.
 */
export function registrarMascote() {
  presentes += 1
  return () => {
    presentes -= 1
    if (presentes === 0 && reacao) {
      reacao = null
      avisar()
    }
  }
}

/** Uma tela com o próprio mascote (a de 404) tira o do canto de cena enquanto estiver montada. */
export function entrarEmCena() {
  emCena += 1
  avisar()
  return () => {
    emCena -= 1
    avisar()
  }
}

function dialogoAberto() {
  return Boolean(
    document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'),
  )
}

/**
 * Pede ao mascote que mostre `estado` e diga `mensagem`. Devolve `false`
 * quando ele não pode aparecer agora.
 *
 * - `duracao`: quanto tempo a fala fica na tela;
 * - `lang`: idioma da mensagem (as da vitrine seguem o idioma da interface);
 * - `estadoFinal`: para `falando`, o estado depois que o texto termina de aparecer.
 */
export function reagir(estado, mensagem, { duracao = DURACAO_PADRAO_MS, lang = 'pt-BR', estadoFinal } = {}) {
  if (typeof document === 'undefined' || presentes === 0 || dialogoAberto()) return false
  sequencia += 1
  reacao = { id: sequencia, estado, mensagem, duracao, lang, estadoFinal }
  avisar()
  return true
}

/** Encerra a fala `id` (ou qualquer uma, sem `id`). */
export function encerrarReacao(id) {
  if (!reacao || (id !== undefined && reacao.id !== id)) return
  reacao = null
  avisar()
}

/**
 * O mascote fala; se não puder, vai o toast. Com um diálogo aberto, espera um
 * instante antes de desistir: depois de criar algo num formulário em diálogo,
 * o aviso é dado logo antes de o diálogo fechar.
 */
function falarOuToast(estado, mensagem, mostrarToast, opcoes) {
  if (reagir(estado, mensagem, opcoes)) return
  if (typeof document === 'undefined' || presentes === 0 || !dialogoAberto()) {
    mostrarToast(mensagem)
    return
  }
  window.setTimeout(() => {
    if (!reagir(estado, mensagem, opcoes)) mostrarToast(mensagem)
  }, 80)
}

/** Algo foi criado: o mascote comemora (pulo e confete). */
export function avisarSucesso(mensagem) {
  falarOuToast('sucesso', mensagem, toast.success, { duracao: 4500 })
}

/** Formulário com informação faltando ou inválida: o mascote mostra que faltou algo. */
export function avisarFaltando(mensagem = MENSAGENS.faltando) {
  falarOuToast('faltando', mensagem, toast.error)
}

/**
 * Uma ação deu errado. Recebe o erro da API (`ApiError`, com `status`) ou uma
 * mensagem. O estado do mascote segue o status, pelo mapa do próprio
 * componente: dado recusado pelo servidor (4xx) é "faltou informação", página
 * que sumiu (404) é "não encontrei", o resto é erro.
 */
export function avisarErro(erro) {
  const status = typeof erro === 'object' ? erro?.status : undefined
  const mensagem =
    typeof erro === 'string' ? erro : erro?.message || mensagemPorStatus(status) || MENSAGENS.erro
  falarOuToast(status ? estadoPorStatus(status) : 'erro', mensagem, toast.error, { duracao: 6000 })
}

/* -------------------------------------------------------------------------- */
/* Cumprimento de chegada — uma vez por entrada                                 */
/* -------------------------------------------------------------------------- */

const cumprimentados = new Set()

export function jaCumprimentou(identidade) {
  if (cumprimentados.has(identidade)) return true
  try {
    return window.sessionStorage.getItem(`vitrine:mascote:cumprimento:${identidade}`) === '1'
  } catch {
    return false
  }
}

export function marcarCumprimento(identidade) {
  cumprimentados.add(identidade)
  try {
    window.sessionStorage.setItem(`vitrine:mascote:cumprimento:${identidade}`, '1')
  } catch {
    // Sem storage, vale a memória até a página recarregar.
  }
}

/* -------------------------------------------------------------------------- */
/* Roupa do mascote                                                             */
/* -------------------------------------------------------------------------- */

let roupaAtual = null

/**
 * A roupa desta entrada: sorteada uma vez por pessoa (ou visitante) e por aba,
 * e guardada no sessionStorage para não mudar a cada página. Quem entra com a
 * conta tem um sorteio novo — é outra entrada.
 *
 * Todas as roupas do componente (`ROUPAS`) têm a mesma chance, como no modo
 * `aleatoria` dele; uma roupa nova que vier numa versão futura entra no
 * sorteio sozinha.
 *
 * Sem `identidade`, devolve a última roupa sorteada (a tela de falha geral do
 * app fica fora do contexto de autenticação).
 */
export function roupaDaSessao(identidade) {
  if (typeof window === 'undefined') return 'normal'
  if (identidade === undefined) return roupaAtual?.roupa ?? 'normal'
  if (roupaAtual?.identidade === identidade) return roupaAtual.roupa

  const chave = `vitrine:mascote:roupa:${identidade}`
  let roupa
  try {
    roupa = window.sessionStorage.getItem(chave)
  } catch {
    roupa = null
  }
  if (!ROUPAS.includes(roupa)) {
    roupa = ROUPAS[Math.floor(Math.random() * ROUPAS.length)]
    try {
      window.sessionStorage.setItem(chave, roupa)
    } catch {
      // Sem storage, o sorteio vale até a página recarregar.
    }
  }
  roupaAtual = { identidade, roupa }
  return roupa
}
