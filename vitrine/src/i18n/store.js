/**
 * Estado de idioma do navegador — escolha do leitor e dicionários carregados.
 *
 * Store externo, lido por `useSyncExternalStore`, pelo mesmo motivo de
 * `src/lib/a11y.js`: a escolha vive no `localStorage`, fora do React, e o
 * `ErrorBoundary` — que existe justamente para quando a árvore do React
 * quebrou — também precisa dela.
 *
 * Nada aqui toca `window` no topo do módulo: o `npm run smoke` renderiza as
 * páginas fora do navegador.
 */
import ptBR from './messages/pt-BR.js'
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  localeFromPath,
  normalizeLocale,
  resolveUiLocale,
  translate,
} from './config.js'

/** Chave no `localStorage`. Guarda só o código do idioma: "pt-BR", "en", "es". */
export const STORAGE_KEY = 'locale'

/**
 * O português vai no bundle: é o idioma de quem chega sem escolha, o recuo de
 * toda chave que faltar e o que o rastreador lê. Os outros viram arquivos
 * separados que o Vite só entrega a quem escolher o idioma.
 */
const LOADERS = {
  en: () => import('./messages/en.js'),
  es: () => import('./messages/es.js'),
}

const dictionaries = new Map([[DEFAULT_LOCALE, ptBR]])
const pending = new Map()
const listeners = new Set()

let preference // `undefined` = ainda não lida do storage
let session = null
let snapshot = null
let serverSnapshot = null
let activeLocale = DEFAULT_LOCALE

function isBrowser() {
  return typeof window !== 'undefined'
}

/**
 * A escolha gravada, validada. O storage é editável por qualquer extensão ou
 * pelo próprio leitor no DevTools: um valor fora do vocabulário é descartado,
 * nunca repassado adiante.
 */
export function readPreference() {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeLocale(raw, null) : null
  } catch {
    // Modo privativo ou storage bloqueado: sem escolha gravada.
    return null
  }
}

function currentPreference() {
  if (preference === undefined) preference = readPreference()
  return preference
}

function notify() {
  snapshot = null
  serverSnapshot = null
  for (const listener of listeners) listener()
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Snapshot memorizado: `useSyncExternalStore` compara por identidade, e um
 * objeto novo a cada leitura causaria laço de renderização.
 */
export function getSnapshot() {
  if (!snapshot) {
    snapshot = { preference: currentPreference(), session, loaded: [...dictionaries.keys()] }
  }
  return snapshot
}

/** Fora do navegador não há escolha nem sessão — só os dicionários já carregados. */
export function getServerSnapshot() {
  if (!serverSnapshot) {
    serverSnapshot = { preference: null, session: null, loaded: [...dictionaries.keys()] }
  }
  return serverSnapshot
}

export function getMessages(locale) {
  return dictionaries.get(locale) ?? null
}

/** Baixa o dicionário do idioma uma vez só; pedidos simultâneos dividem a promessa. */
export function loadMessages(locale) {
  const code = normalizeLocale(locale)
  if (dictionaries.has(code)) return Promise.resolve(dictionaries.get(code))
  if (pending.has(code)) return pending.get(code)

  const request = LOADERS[code]()
    .then((module) => {
      dictionaries.set(code, module.default)
      pending.delete(code)
      notify()
      return module.default
    })
    .catch((error) => {
      // Sem rede, o idioma continua o anterior; a próxima tentativa refaz o pedido.
      pending.delete(code)
      throw error
    })

  pending.set(code, request)
  return request
}

/** A escolha explícita do leitor, pelo seletor. É a única coisa gravada. */
export function setPreference(locale) {
  if (!isSupportedLocale(locale)) return
  preference = locale

  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Sem storage a escolha vale até fechar a aba — melhor do que recusá-la.
    }
  }

  notify()
  loadMessages(locale).catch(() => {})
}

/** Idioma de conteúdo lido por último nesta aba, para quem não escolheu nenhum. */
export function setSessionLocale(locale) {
  if (!isSupportedLocale(locale) || locale === session) return
  session = locale
  notify()
}

/**
 * Idioma em que a interface está pintada agora. Existe para o `ErrorBoundary`,
 * que roda quando a árvore do React já quebrou e não alcança o contexto.
 */
export function setActiveLocale(locale) {
  if (isSupportedLocale(locale)) activeLocale = locale
}

export function translateNow(key, vars) {
  const messages = getMessages(activeLocale) ?? ptBR
  return translate(messages, ptBR, activeLocale, key, vars)
}

/**
 * Carrega, antes da primeira pintura, o dicionário que a página vai usar.
 *
 * Sem isto, quem escolheu inglês veria a página inteira em português por um
 * instante, a cada visita. São dois idiomas no máximo: o da interface e o do
 * conteúdo, quando uma notícia em inglês é aberta por quem prefere espanhol.
 * O prazo evita que uma rede ruim segure a página em branco: passado ele, a
 * vitrine pinta em português e troca quando o arquivo chegar.
 */
export function preloadLocale(pathname, { timeout = 2500 } = {}) {
  const ui = resolveUiLocale({ pathname, preference: currentPreference(), session: null })
  const content = localeFromPath(pathname)
  const wanted = [...new Set([ui, content].filter((code) => code && !dictionaries.has(code)))]
  if (!wanted.length) return Promise.resolve()

  const loads = Promise.all(wanted.map((code) => loadMessages(code))).catch(() => {})
  const deadline = new Promise((resolve) => setTimeout(resolve, timeout))
  return Promise.race([loads, deadline])
}

/* -------------------------------------------------------------------------- */
/* Versões da página atual, para o seletor                                     */
/* -------------------------------------------------------------------------- */

/**
 * A página declara em que idiomas ela existe (`{ 'pt-BR': '/noticia/x', en:
 * '/en/news/y' }`), e o seletor do cabeçalho usa isso para levar o leitor à
 * mesma notícia no idioma escolhido. Store separado do contexto de idioma de
 * propósito: trocar de página não deveria re-renderizar tudo que traduz texto.
 */
let pageLanguages = null
const pageListeners = new Set()

export function setPageLanguages(value) {
  pageLanguages = value
  for (const listener of pageListeners) listener()
}

export function getPageLanguages() {
  return pageLanguages
}

export function subscribePageLanguages(listener) {
  pageListeners.add(listener)
  return () => pageListeners.delete(listener)
}
