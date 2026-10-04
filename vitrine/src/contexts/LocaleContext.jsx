import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  DEFAULT_LOCALE,
  interpolate,
  localeFromPath,
  normalizeLocale,
  resolveMessage,
  resolveUiLocale,
  translate,
} from '@/i18n/config'
import {
  getMessages,
  getPageLanguages,
  getServerSnapshot,
  getSnapshot,
  loadMessages,
  setActiveLocale,
  setPageLanguages,
  setPreference,
  setSessionLocale,
  subscribe,
  subscribePageLanguages,
} from '@/i18n/store'
import { formatDate, formatTime } from '@/lib/utils'

/**
 * Idioma da vitrine pública.
 *
 * Duas camadas, com papéis diferentes:
 *
 *   `LocaleProvider`  idioma da INTERFACE — cabeçalho, rodapé, páginas sem
 *                     idioma próprio. Segue a escolha do leitor (ver
 *                     `resolveUiLocale`) e manda no `<html lang>`.
 *
 *   `LocaleScope`     idioma do CONTEÚDO de uma página que tem endereço por
 *                     idioma. Em `/en/news/...` o corpo da página é inglês
 *                     para todo mundo, inclusive para quem escolheu português:
 *                     a URL é a versão inglesa, e metade dela em outro idioma
 *                     não seria versão de nada. O cabeçalho continua na língua
 *                     do leitor, e o escopo marca o trecho com `lang`.
 *
 * Para o rastreador, que nunca tem escolha gravada, as duas camadas coincidem
 * com o idioma do endereço.
 */

const LocaleContext = createContext(null)

/**
 * Trechos marcados na tradução viram componentes: `<link>canal</link>` com
 * `{ link: (texto) => <Link>{texto}</Link> }`.
 *
 * As variáveis são preenchidas DEPOIS de separar as marcas. Um nome vindo do
 * banco com `<strong>` no meio aparece como texto, e não vira marcação — e o
 * React escapa tudo de qualquer forma.
 */
function renderRich(template, components, vars, locale) {
  const nodes = []
  const pattern = /<(\w+)>([\s\S]*?)<\/\1>/g
  let cursor = 0
  let match

  while ((match = pattern.exec(template))) {
    if (match.index > cursor) nodes.push(interpolate(template.slice(cursor, match.index), vars, locale))
    const inner = interpolate(match[2], vars, locale)
    const render = components?.[match[1]]
    nodes.push(<Fragment key={nodes.length}>{render ? render(inner) : inner}</Fragment>)
    cursor = pattern.lastIndex
  }

  if (cursor < template.length) nodes.push(interpolate(template.slice(cursor), vars, locale))
  return nodes
}

function createLocaleValue(locale, setLocale) {
  const messages = getMessages(locale) ?? getMessages(DEFAULT_LOCALE)
  const fallback = getMessages(DEFAULT_LOCALE)

  const t = (key, vars) => translate(messages, fallback, locale, key, vars)

  return {
    locale,
    t,
    rich: (key, components, vars) =>
      renderRich(resolveMessage(messages, fallback, locale, key, vars?.count), components, vars, locale),
    setLocale,
    languageName: (code) => t(`languageNames.${code}`),
    formatDate: (value, options) => formatDate(value, options, locale),
    formatTime: (value) => formatTime(value, locale),
  }
}

let defaultValue = null

/** Quem está fora do provider — o teste de fumaça de um componente solto, por exemplo — recebe português. */
function getDefaultValue() {
  if (!defaultValue) defaultValue = createLocaleValue(DEFAULT_LOCALE, setPreference)
  return defaultValue
}

export function useLocale() {
  return useContext(LocaleContext) ?? getDefaultValue()
}

/**
 * Idioma da interface. Fica DENTRO do roteador: o endereço é parte da decisão.
 *
 * `locale` força um idioma — usado pelo teste de fumaça para renderizar a
 * vitrine em cada língua sem depender do `localStorage`.
 */
export function LocaleProvider({ children, locale: forced }) {
  const { pathname } = useLocation()
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const wanted = forced
    ? normalizeLocale(forced)
    : resolveUiLocale({ pathname, preference: state.preference, session: state.session })
  const ready = state.loaded.includes(wanted)

  // Enquanto o dicionário novo não chega, a interface continua no idioma em
  // que já está — trocar para o português no meio do caminho seria piscar
  // duas vezes.
  const [active, setActive] = useState(ready ? wanted : DEFAULT_LOCALE)
  if (ready && active !== wanted) setActive(wanted)

  useEffect(() => {
    if (!ready) loadMessages(wanted).catch(() => {})
  }, [wanted, ready])

  // Quem não escolheu idioma e abriu uma notícia em inglês segue em inglês ao
  // navegar para a home. A sessão não é gravada: só o seletor grava.
  useEffect(() => {
    const routeLocale = localeFromPath(pathname)
    if (!forced && !state.preference && routeLocale) setSessionLocale(routeLocale)
  }, [pathname, forced, state.preference])

  useEffect(() => {
    document.documentElement.lang = active
    setActiveLocale(active)
  }, [active])

  const value = useMemo(() => createLocaleValue(active, setPreference), [active])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/**
 * Idioma fixo para um trecho da página: o corpo de uma notícia em inglês, a
 * lista de notícias em espanhol. Não mexe no `<html lang>` — quem descreve o
 * trecho é o `lang` do elemento que o envolve.
 */
export function LocaleScope({ locale, children }) {
  const parent = useLocale()
  const code = normalizeLocale(locale)
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const ready = state.loaded.includes(code)

  useEffect(() => {
    if (!ready) loadMessages(code).catch(() => {})
  }, [code, ready])

  const value = useMemo(
    () => (ready ? createLocaleValue(code, parent.setLocale) : parent),
    [ready, code, parent],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/**
 * A página declara em que idiomas existe, para o seletor do cabeçalho levar o
 * leitor à versão certa. `null` = a página não tem versões (home, busca).
 *
 * A dependência é o mapa serializado: as páginas o montam em linha, e um
 * objeto novo a cada renderização faria o efeito rodar sem parar.
 */
export function usePageLanguages(languages) {
  const key = languages ? JSON.stringify(languages) : ''

  useEffect(() => {
    if (!key) return undefined
    setPageLanguages(JSON.parse(key))
    return () => setPageLanguages(null)
  }, [key])
}

export function useCurrentPageLanguages() {
  return useSyncExternalStore(subscribePageLanguages, getPageLanguages, () => null)
}
