/**
 * Carregamento do VLibras (suíte oficial do Governo Federal).
 *
 * Fica fora do React inteiro — nem componente, nem hook. Quatro decisões, todas
 * pelo mesmo motivo: é um script de terceiro que assume o controle do DOM.
 *
 * 1. **Sob demanda.** O plugin baixa avatar 3D e dicionário: centenas de KB e
 *    uma conexão a mais em toda visita. Como Core Web Vitals é prioridade
 *    declarada do projeto, ele só entra quando o leitor liga o recurso — e,
 *    ligado, a preferência fica gravada e ele volta sozinho na próxima visita.
 *
 * 2. **Fora da árvore do React.** O contêiner é criado com `createElement` e
 *    pendurado no `<body>`. O plugin reescreve esses nós por conta própria; se
 *    o React os reconciliasse, uma re-renderização qualquer apagaria o avatar
 *    no meio de uma tradução.
 *
 * 3. **Nunca destruído.** O VLibras não expõe teardown. Desligar esconde o
 *    contêiner: removê-lo deixaria ouvintes e um worker órfãos presos à página.
 *
 * 4. **Estado observável.** Script de terceiro falha — CDN fora do ar,
 *    bloqueador, rede ruim. O painel precisa poder dizer "não deu" em vez de
 *    deixar um botão ligado sem nada acontecer.
 */

const VLIBRAS_APP = 'https://vlibras.gov.br/app'
const VLIBRAS_SCRIPT = `${VLIBRAS_APP}/vlibras-plugin.js`

/* -------------------------------------------------------------------------- */
/* Estado — 'idle' | 'loading' | 'ready' | 'error'                             */
/* -------------------------------------------------------------------------- */

let status = 'idle'
const listeners = new Set()

function setStatus(next) {
  if (status === next) return
  status = next
  for (const listener of listeners) listener()
}

export function subscribeVLibras(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getVLibrasStatus() {
  return status
}

/** Snapshot do servidor: constante, como o `useSyncExternalStore` exige. */
export function getVLibrasServerStatus() {
  return 'idle'
}

/* -------------------------------------------------------------------------- */
/* Carregamento                                                                */
/* -------------------------------------------------------------------------- */

let container = null
let loading = null

/**
 * Monta a marcação que o plugin procura. A estrutura e os atributos são os da
 * documentação oficial — o construtor varre o documento atrás de `[vw]`, então
 * o contêiner precisa existir antes de ele rodar.
 */
function ensureContainer() {
  if (container) return container

  container = document.createElement('div')
  container.setAttribute('vw', '')
  container.className = 'enabled'

  const button = document.createElement('div')
  button.setAttribute('vw-access-button', '')
  button.className = 'active'

  const wrapper = document.createElement('div')
  wrapper.setAttribute('vw-plugin-wrapper', '')

  const top = document.createElement('div')
  top.className = 'vw-plugin-top-wrapper'

  wrapper.appendChild(top)
  container.appendChild(button)
  container.appendChild(wrapper)
  document.body.appendChild(container)

  return container
}

function loadScript() {
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    if (window.VLibras?.Widget) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = VLIBRAS_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar o plugin do VLibras.'))
    document.head.appendChild(script)
  })

  return loading
}

export async function activateVLibras() {
  if (status === 'ready' || status === 'loading') return

  setStatus('loading')

  try {
    ensureContainer()
    await loadScript()

    if (!window.VLibras?.Widget) {
      throw new Error('Plugin carregado, mas sem o construtor esperado.')
    }

    new window.VLibras.Widget(VLIBRAS_APP)
    setStatus('ready')
  } catch {
    // Libera nova tentativa: rede intermitente é o caso comum, e deixar a
    // promessa resolvida travaria o recurso até recarregar a página.
    loading = null
    setStatus('error')
  }
}

export function setVLibrasVisible(visible) {
  if (container) container.style.display = visible ? '' : 'none'
}

/**
 * Abre o tradutor a partir de um `<button>` nosso.
 *
 * O gatilho que o plugin desenha é uma `<div>`: não recebe foco por Tab nem
 * responde a Enter. Acioná-lo por código é o que permite oferecer um controle
 * de verdade, operável por teclado e anunciado por leitor de tela.
 */
export function openVLibras() {
  container?.querySelector('[vw-access-button]')?.click()
}
