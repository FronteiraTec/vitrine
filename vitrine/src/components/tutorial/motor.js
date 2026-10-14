/**
 * Motor dos tutoriais — o único arquivo que conhece o Shepherd.
 *
 * Chega por `import()` quando um tutorial começa (ver `TutorialContext`): o
 * Shepherd, o CSS dele e o tema da vitrine só são baixados por quem abre um
 * tour. O tour de boas-vindas da primeira visita espera a página terminar de
 * carregar antes de pedir este arquivo.
 *
 * Três decisões que valem explicar:
 *
 * 1. `next()` e `back()` são sobrescritos numa subclasse de `Tour`. Botões,
 *    setas do teclado e o `start()` passam todos por eles, e é ali que o tour
 *    muda de página quando o passo seguinte mora em outra rota, espera o alvo
 *    aparecer e decide o que fazer se ele não aparecer.
 *
 * 2. O conteúdo de cada passo é um `<div>` vazio entregue ao Shepherd como
 *    `text`; o React desenha nele por portal (`renderizar`). O Shepherd recria
 *    o elemento a cada exibição, e cada recriação chama `text()` de novo — o
 *    portal muda de casa e o React desmonta o conteúdo anterior.
 *
 * 3. O alvo é resolvido aqui, e não pelo seletor no Shepherd: o mesmo
 *    `data-tour` pode marcar a versão de desktop e a de celular de um
 *    controle, e só a que está visível serve de âncora.
 */
import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'
import './tema-tutorial.scss'
import { casaRota, prefereMenosMovimento, rotasDosPassos } from '@/lib/tutoriais'

/** Depois de mudar de página, ou na primeira exibição (dados ainda chegando). */
const ESPERA_LONGA_MS = 6000
/** Na mesma página, já carregada: o alvo existe ou não existe. */
const ESPERA_CURTA_MS = 1200
const INTERVALO_BUSCA_MS = 100
/** Distância mínima entre o balão e as bordas laterais da janela. */
const MARGEM_JANELA = 16

function visivel(elemento) {
  const caixa = elemento.getBoundingClientRect()
  return caixa.width > 0 && caixa.height > 0 && getComputedStyle(elemento).visibility !== 'hidden'
}

function encontrarAlvo(seletor) {
  for (const elemento of document.querySelectorAll(seletor)) {
    if (visivel(elemento)) return elemento
  }
  return null
}

/**
 * Espera `condicao()` devolver algo, até o tempo limite ou até o tour acabar.
 *
 * Consulta periódica, e não `MutationObserver`: o alvo também "aparece" quando
 * uma media query troca o `display` sem mexer no DOM, e o observador não veria.
 * Dez consultas por segundo durante alguns segundos não pesam.
 */
function esperar(condicao, tempo, sinal) {
  return new Promise((resolve) => {
    const imediato = condicao()
    if (imediato || sinal.aborted) {
      resolve(imediato || null)
      return
    }
    const inicio = Date.now()
    const timer = setInterval(() => {
      const valor = sinal.aborted ? null : condicao()
      if (valor || sinal.aborted || Date.now() - inicio >= tempo) {
        clearInterval(timer)
        resolve(valor || null)
      }
    }, INTERVALO_BUSCA_MS)
  })
}

function fixoNaTela(elemento) {
  for (let atual = elemento; atual && atual !== document.body; atual = atual.parentElement) {
    if (getComputedStyle(atual).position === 'fixed') return true
  }
  return false
}

/** Altura do cabeçalho que fica grudado no topo (o da vitrine é opcional; o do painel, sempre). */
function alturaDoCabecalho() {
  for (const cabecalho of document.querySelectorAll('header')) {
    const { position } = getComputedStyle(cabecalho)
    const caixa = cabecalho.getBoundingClientRect()
    if ((position === 'sticky' || position === 'fixed') && caixa.top <= 0 && caixa.bottom > 0) {
      return caixa.bottom
    }
  }
  return 0
}

/**
 * Rola até o alvo deixando lugar para o balão e fora do cabeçalho grudado.
 *
 * O `scrollIntoView` puro centraliza só o alvo: com uma seção alta, não sobra
 * espaço nem acima nem abaixo, e o balão acaba por cima do cabeçalho. Aqui o
 * par alvo + balão é que vai para o meio da área livre; se não couber, o
 * começo do alvo desce o bastante para o balão caber acima dele.
 */
function rolarAte(elemento, posicao) {
  // Passo no centro da tela: o Shepherd chama mesmo assim, sem elemento.
  if (!(elemento instanceof HTMLElement) || fixoNaTela(elemento)) return

  const caixa = elemento.getBoundingClientRect()
  const balao = document.querySelector('.shepherd-element.tour-vitrine:not([hidden])')
  const lado = posicao.split('-')[0]
  const vertical = lado === 'top' || lado === 'bottom'
  const alturaBalao = balao && vertical ? balao.getBoundingClientRect().height + 24 : 0
  const topoLivre = alturaDoCabecalho() + MARGEM_JANELA
  const livre = window.innerHeight - topoLivre - MARGEM_JANELA

  let topo
  if (caixa.height + alturaBalao <= livre) {
    const folga = (livre - caixa.height - alturaBalao) / 2
    topo = topoLivre + folga + (lado === 'top' ? alturaBalao : 0)
  } else {
    topo = topoLivre + alturaBalao
  }

  window.scrollTo({
    top: window.scrollY + caixa.top - topo,
    behavior: prefereMenosMovimento() ? 'auto' : 'smooth',
  })
}

/*
 * Middleware do Floating UI escrito à mão: mantém o balão a 16 px das bordas
 * laterais. O `shift()` do Shepherd encosta o balão na borda, e importar o
 * `@floating-ui/dom` direto amarraria o projeto a uma dependência que é do
 * Shepherd, não nossa.
 */
const margemLateral = {
  name: 'margemLateral',
  fn({ x, rects }) {
    const largura = document.documentElement.clientWidth
    const maximo = Math.max(MARGEM_JANELA, largura - rects.floating.width - MARGEM_JANELA)
    return { x: Math.min(Math.max(x, MARGEM_JANELA), maximo) }
  },
}

/**
 * No celular o balão ocupa a largura toda (ver o tema): não sobra lado livre
 * ao lado do alvo, e "à esquerda" vira "embaixo". O corte é o mesmo do CSS.
 */
function posicaoNaTela(posicao = 'bottom') {
  const lado = posicao.split('-')[0]
  return window.innerWidth < 480 && (lado === 'left' || lado === 'right') ? 'bottom' : posicao
}

/** O título vai para o Shepherd como HTML. */
function escapar(texto) {
  const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return texto.replace(/[&<>"']/g, (caractere) => entidades[caractere])
}

function botoes(indice, total) {
  const primeiro = indice === 0
  const ultimo = indice === total - 1

  // `action` roda com `this` = o tour (o Shepherd faz o bind).
  return [
    !ultimo && {
      text: 'Pular',
      classes: 'btn btn-sm btn-link tutorial-pular',
      action() {
        this.cancel()
      },
    },
    !primeiro && {
      text: 'Voltar',
      classes: 'btn btn-sm btn-outline-secondary',
      action() {
        this.back()
      },
    },
    {
      text: ultimo ? 'Concluir' : 'Próximo',
      classes: 'btn btn-sm btn-primary',
      action() {
        this.next()
      },
    },
  ].filter(Boolean)
}

class TourVitrine extends Shepherd.Tour {
  constructor(opcoes, { tutorial, navegar }) {
    super(opcoes)
    this.tutorial = tutorial
    this.rotas = rotasDosPassos(tutorial)
    this.navegar = navegar
    this.inicio = 0
    this.geracao = 0
    /** Uma troca de passo está esperando a página ou o alvo. */
    this.ocupado = false
    /** Caminho concreto já visitado de cada padrão de rota (`/iniciativa/:slug` → `/iniciativa/lab-ia`). */
    this.caminhos = new Map()
    /** O que o próximo `text()` deve desenhar além do passo em si. */
    this.situacao = { ausente: false, caminhando: false }
    this.controle = new AbortController()
    this.on('inactive', () => this.controle.abort())

    // O `autoBind` do Shepherd liga ao objeto só os métodos da classe final;
    // os da classe base ficariam soltos. Ligá-los mantém o comportamento de um
    // `Tour` comum para quem os passa adiante como callback.
    for (const nome of Object.getOwnPropertyNames(Shepherd.Tour.prototype)) {
      if (nome !== 'constructor' && typeof this[nome] === 'function' && !Object.hasOwn(this, nome)) {
        this[nome] = this[nome].bind(this)
      }
    }
  }

  /**
   * `inicio` é o passo em que começar (retomada depois de recarregar a
   * página). O Shepherd devolve o foco, no fim, ao que estava focado no
   * início; quem começou pelo menu de ajuda clicou num item que some com o
   * menu, então o foco volta para o botão de ajuda (`gatilho`).
   */
  start(inicio = 0, gatilho = null) {
    this.inicio = inicio
    const resultado = super.start()
    if (gatilho?.isConnected) this.focusedElBeforeOpen = gatilho
    return resultado
  }

  indiceAtual() {
    return this.currentStep ? this.steps.indexOf(this.currentStep) : -1
  }

  /*
   * Enquanto um passo espera a página ou o alvo, Próximo e Voltar são
   * ignorados: cada clique recomeçaria a espera, e quem clica de novo por
   * impaciência nunca sairia do lugar. Pular e ESC continuam valendo.
   */
  next() {
    if (this.ocupado) return undefined
    const atual = this.indiceAtual()
    if (atual < 0) return this.irPara(this.inicio, true)
    if (atual >= this.steps.length - 1) return this.complete()
    return this.irPara(atual + 1, true)
  }

  back() {
    if (this.ocupado) return undefined
    const atual = this.indiceAtual()
    return atual > 0 ? this.irPara(atual - 1, false) : undefined
  }

  async irPara(indice, frente) {
    const geracao = ++this.geracao
    this.ocupado = true
    try {
      return await this.prepararEMostrar(indice, frente, geracao)
    } finally {
      // Um passo opcional pulado chama `irPara` de novo; quem libera é a última chamada.
      if (geracao === this.geracao) this.ocupado = false
    }
  }

  async prepararEMostrar(indice, frente, geracao) {
    const passo = this.steps[indice]
    const definicao = this.tutorial.passos[indice]
    if (!passo) return frente ? this.complete() : undefined

    const rota = this.rotas[indice]
    const destino = this.destino(rota)
    const primeiraExibicao = this.indiceAtual() < 0

    if (destino) {
      this.mostrarCaminhando()
      this.navegar(destino)
    }

    const seletor = definicao.alvo
    const encontrado = await esperar(
      () => casaRota(rota, window.location.pathname) && (seletor ? encontrarAlvo(seletor) : true),
      destino || primeiraExibicao ? ESPERA_LONGA_MS : ESPERA_CURTA_MS,
      this.controle.signal,
    )

    // O tour acabou durante a espera (Pular, ESC, a pessoa saiu da página).
    if (geracao !== this.geracao || !this.isActive()) return undefined

    const alvo = seletor && encontrado instanceof HTMLElement ? encontrado : null

    if (seletor && !alvo) {
      if (definicao.opcional) {
        const vizinho = indice + (frente ? 1 : -1)
        if (vizinho >= this.steps.length) return this.complete()
        return vizinho >= 0 ? this.irPara(vizinho, frente) : undefined
      }
      if (import.meta.env.DEV) {
        console.warn(
          `[tutoriais] ${this.tutorial.id} › ${definicao.id}: alvo "${seletor}" não encontrado em ${window.location.pathname}. O passo será mostrado no centro da tela.`,
        )
      }
    }

    this.lembrar(rota)
    this.situacao = { ausente: Boolean(seletor && !alvo), caminhando: false }
    passo.options.attachTo = alvo ? { element: alvo, on: posicaoNaTela(definicao.posicao) } : undefined
    return super.show(indice, frente)
  }

  /**
   * Antes de mudar de página, o balão atual vai para o centro com o mascote
   * caminhando. Ancorado, ele sumiria junto com o alvo da página que está
   * saindo.
   */
  mostrarCaminhando() {
    const atual = this.indiceAtual()
    if (atual < 0) return
    this.situacao = { ausente: false, caminhando: true }
    this.steps[atual].options.attachTo = undefined
    super.show(atual, true)
  }

  /** Para onde navegar antes de mostrar um passo da `rota` dada (`null` = já estamos lá). */
  destino(rota) {
    const aqui = window.location.pathname
    if (!rota || casaRota(rota, aqui)) return null
    const padroes = [rota].flat()
    for (const padrao of padroes) {
      if (this.caminhos.has(padrao)) return this.caminhos.get(padrao)
    }
    // Rota com parâmetro (`/iniciativa/:slug`) nunca visitada neste tour: não
    // há endereço para onde ir, e o passo segue sem navegar.
    return padroes.find((padrao) => !/[:*]/.test(padrao)) ?? null
  }

  lembrar(rota) {
    const aqui = window.location.pathname
    for (const padrao of [rota].flat().filter(Boolean)) {
      if (casaRota(padrao, aqui)) this.caminhos.set(padrao, aqui)
    }
  }
}

/**
 * Monta o tour de um tutorial.
 *
 * - `navegar(caminho)`: troca de página pelo roteador do React.
 * - `renderizar(conteudo)`: entrega ao React o container e os dados do balão.
 * - `aoMostrar(indice)`: avisa que um passo apareceu (o progresso é gravado).
 */
export function criarTour({ tutorial, navegar, renderizar, aoMostrar }) {
  const total = tutorial.passos.length
  let chave = 0

  const tour = new TourVitrine(
    {
      tourName: `tutorial-${tutorial.id}`,
      useModalOverlay: true,
      exitOnEsc: true,
      keyboardNavigation: true,
    },
    { tutorial, navegar },
  )

  tutorial.passos.forEach((definicao, indice) => {
    tour.addStep({
      id: definicao.id ?? `passo-${indice + 1}`,
      title: escapar(tutorial.titulo),
      text() {
        const container = document.createElement('div')
        chave += 1
        renderizar({
          container,
          chave,
          indice,
          total,
          texto: definicao.texto,
          mascote: definicao.mascote,
          ...tour.situacao,
        })
        return container
      },
      buttons: botoes(indice, total),
      cancelIcon: { enabled: true, label: 'Fechar tutorial' },
      classes: 'tour-vitrine',
      arrow: true,
      canClickTarget: false,
      modalOverlayOpeningPadding: 8,
      modalOverlayOpeningRadius: 12,
      scrollTo: true,
      scrollToHandler: (elemento) => rolarAte(elemento, posicaoNaTela(definicao.posicao)),
      floatingUIOptions: { middleware: [margemLateral] },
      when: {
        show() {
          // Um tour encerrado no meio da exibição não grava progresso: a
          // retomada abriria um tour que já acabou.
          if (tour.isActive()) aoMostrar(indice)
        },
      },
    })
  })

  // O Shepherd trata o ESC só com o foco dentro do balão ou no alvo. Este
  // ouvinte cobre o resto da página — foco perdido depois de um clique no
  // fundo escuro, por exemplo — e sai junto com o tour.
  const aoTeclar = (evento) => {
    if (evento.key === 'Escape' && tour.isActive()) tour.cancel()
  }
  document.addEventListener('keydown', aoTeclar)
  tour.on('inactive', () => document.removeEventListener('keydown', aoTeclar))

  return tour
}
