/**
 * Idiomas da vitrine — a definição que cliente e servidor compartilham.
 *
 * Mesma regra de `src/lib/seo.js`: nada de `import.meta.env`, alias `@/` ou
 * `window` aqui. Este módulo é importado pelo React, pela API (`server/`) e
 * pelos scripts de verificação, e precisa carregar nos três.
 *
 * Os DICIONÁRIOS da interface não moram aqui: ficam em `messages/`, e o cliente
 * baixa só o do idioma em uso. Aqui ficam apenas o vocabulário de idiomas, as
 * rotas por idioma e os poucos textos que o servidor precisa para escrever o
 * `<head>` — que são os mesmos que o cliente usa, para que leitor e rastreador
 * recebam a mesma descrição da página.
 */

export const DEFAULT_LOCALE = 'pt-BR'

/**
 * `hreflang` usa o idioma sem região para inglês e espanhol de propósito: a
 * versão em inglês serve a qualquer leitor de inglês, e não só aos Estados
 * Unidos; idem para o espanhol. Restringir a `en-US` ou `es-AR` tiraria a
 * página do alcance dos demais países sem ganho algum. O português fica com
 * `pt-BR` porque é o texto original, escrito no Brasil.
 *
 * `newsLanguage` é o código do `<news:language>` do Google News, que exige
 * ISO 639-1 de duas letras — `pt`, e não `pt-BR`.
 *
 * `textSearch` é a configuração do Postgres usada na busca textual de cada
 * idioma: radicais em inglês não são os do português.
 */
export const LOCALES = {
  'pt-BR': {
    code: 'pt-BR',
    label: 'Português',
    short: 'PT',
    flag: 'br',
    hreflang: 'pt-BR',
    og: 'pt_BR',
    newsLanguage: 'pt',
    textSearch: 'portuguese',
    seo: {
      home: 'Início',
      news: 'Notícias',
      newsListTitle: 'Notícias',
      newsListDescription: 'Comunicados e novidades das iniciativas da instituição.',
      notFoundTitle: 'Notícia não encontrada',
      notFoundDescription: 'O endereço não corresponde a nenhuma notícia publicada.',
    },
  },
  en: {
    code: 'en',
    label: 'English',
    short: 'EN',
    flag: 'us',
    hreflang: 'en',
    og: 'en_US',
    newsLanguage: 'en',
    textSearch: 'english',
    seo: {
      home: 'Home',
      news: 'News',
      newsListTitle: 'News',
      newsListDescription: 'Announcements and updates from the institution’s initiatives.',
      notFoundTitle: 'News article not found',
      notFoundDescription: 'This address does not match any published news article.',
    },
  },
  es: {
    code: 'es',
    label: 'Español',
    short: 'ES',
    flag: 'es',
    hreflang: 'es',
    og: 'es_ES',
    newsLanguage: 'es',
    textSearch: 'spanish',
    seo: {
      home: 'Inicio',
      news: 'Noticias',
      newsListTitle: 'Noticias',
      newsListDescription: 'Comunicados y novedades de las iniciativas de la institución.',
      notFoundTitle: 'Noticia no encontrada',
      notFoundDescription: 'La dirección no corresponde a ninguna noticia publicada.',
    },
  },
}

/** Ordem de exibição no seletor e nos `hreflang`. O original vem primeiro. */
export const LOCALE_CODES = Object.keys(LOCALES)

/** Idiomas que existem como TRADUÇÃO — espelha o `check` da migration 0014. */
export const TRANSLATION_LOCALES = LOCALE_CODES.filter((code) => code !== DEFAULT_LOCALE)

export function isSupportedLocale(value) {
  return typeof value === 'string' && Object.hasOwn(LOCALES, value)
}

/**
 * Converte qualquer coisa que se pareça com um idioma no código suportado.
 *
 * O valor pode vir do `localStorage`, de um parâmetro de URL ou do corpo de
 * uma requisição à API — nenhum deles é confiável. `EN`, `en-GB` e `es-419`
 * viram `en` e `es`; `pt`, `pt-PT` e qualquer outra coisa viram o padrão. O
 * resultado é sempre uma das chaves de `LOCALES`, nunca o texto recebido.
 */
export function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return fallback
  if (raw === 'pt-br') return 'pt-BR'
  const base = raw.split(/[-_]/)[0]
  if (base === 'en' || base === 'es') return base
  if (base === 'pt') return 'pt-BR'
  return fallback
}

/* -------------------------------------------------------------------------- */
/* Rotas por idioma                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Só as NOTÍCIAS têm endereço por idioma. É o único conteúdo do banco que
 * existe traduzido: iniciativas e categorias são cadastradas em português, e
 * um `/en/iniciativa/...` serviria texto em português sob uma URL declarada
 * como inglesa — exatamente o que o buscador trata como versão falsa.
 *
 * O português mantém os endereços que já estavam no ar (`/noticias` e
 * `/noticia/:slug`): mudá-los derrubaria todo link já indexado e compartilhado.
 * O espanhol espelha a mesma forma — lista no plural, notícia no singular —, e
 * o inglês usa `news` nos dois, porque a palavra não tem singular.
 */
const NEWS_PATHS = {
  'pt-BR': { list: '/noticias', article: '/noticia' },
  en: { list: '/en/news', article: '/en/news' },
  es: { list: '/es/noticias', article: '/es/noticia' },
}

export function newsListPath(locale) {
  return NEWS_PATHS[normalizeLocale(locale)].list
}

export function newsArticlePath(locale, slug) {
  return `${NEWS_PATHS[normalizeLocale(locale)].article}/${encodeURIComponent(String(slug ?? ''))}`
}

/**
 * Telas internas: painel, login e configuração. São ferramenta de trabalho da
 * equipe, escritas só em português, e não mudam com a escolha do visitante —
 * metade da tela em inglês e metade em português seria pior que nenhuma.
 */
const INTERNAL_PREFIXES = [
  '/admin',
  '/entrar',
  '/criar-conta',
  '/recuperar-senha',
  '/redefinir-senha',
  '/configuracao',
]

function startsWithSegment(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function isInternalPath(pathname) {
  const path = String(pathname ?? '/')
  return INTERNAL_PREFIXES.some((prefix) => startsWithSegment(path, prefix))
}

/**
 * Idioma do CONTEÚDO de um endereço, ou `null` quando a página não tem idioma
 * próprio (home, busca, iniciativas — o texto do banco está em português, e a
 * interface segue a escolha do leitor).
 */
export function localeFromPath(pathname) {
  const path = String(pathname ?? '/')
  if (startsWithSegment(path, '/en')) return 'en'
  if (startsWithSegment(path, '/es')) return 'es'
  if (startsWithSegment(path, '/noticias') || startsWithSegment(path, '/noticia')) return DEFAULT_LOCALE
  return null
}

/* -------------------------------------------------------------------------- */
/* Tradução                                                                    */
/* -------------------------------------------------------------------------- */

const pluralRules = new Map()

function pluralCategory(locale, count) {
  if (!pluralRules.has(locale)) pluralRules.set(locale, new Intl.PluralRules(locale))
  return pluralRules.get(locale).select(count)
}

function lookup(messages, key) {
  let node = messages
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined
    node = node[part]
  }
  return node
}

/**
 * O texto de uma chave, ainda com os marcadores `{nome}`.
 *
 * Busca no dicionário do idioma e, se faltar, no do padrão. Chave inexistente
 * devolve a própria chave: aparece na tela e no teste de fumaça, em vez de
 * sumir em silêncio.
 *
 * Plural: quando a entrada é um objeto `{ one, other }` e há `count`, a forma
 * é escolhida por `Intl.PluralRules`. As três línguas têm só as categorias
 * `one` e `other` para cardinais, mas a regra de qual número cai em qual NÃO é
 * a mesma — em francês, por exemplo, zero é `one`. Delegar ao `Intl` evita
 * reescrever essa tabela à mão quando entrar um quarto idioma.
 */
export function resolveMessage(messages, fallbackMessages, locale, key, count) {
  let value = lookup(messages, key)
  if (value === undefined && fallbackMessages) value = lookup(fallbackMessages, key)

  if (value && typeof value === 'object' && typeof count === 'number') {
    value = value[pluralCategory(locale, count)] ?? value.other
  }

  return typeof value === 'string' ? value : key
}

/** Troca `{nome}` pelo valor. Número sai no formato do idioma (1.000 × 1,000). */
export function interpolate(text, vars, locale) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => {
    if (!(name in vars)) return match
    const item = vars[name]
    return typeof item === 'number' ? item.toLocaleString(locale) : String(item ?? '')
  })
}

export function translate(messages, fallbackMessages, locale, key, vars) {
  return interpolate(resolveMessage(messages, fallbackMessages, locale, key, vars?.count), vars, locale)
}

/**
 * Idioma da INTERFACE para um endereço.
 *
 * 1. Telas internas são sempre em português.
 * 2. A escolha do leitor, quando existe, vale em toda a vitrine.
 * 3. Sem escolha, uma página com idioma próprio (notícia em /en/…) define o
 *    idioma — quem chegou por um resultado de busca em inglês lê em inglês.
 * 4. Sem nada disso, vale o último idioma de conteúdo lido nesta sessão: quem
 *    entrou por uma notícia em inglês e clicou em "Início" não deveria cair de
 *    repente numa home em português. A sessão NÃO é gravada: só a escolha
 *    explícita no seletor fica no navegador.
 *
 * O rastreador não tem escolha nem sessão — o `localStorage` é zerado a cada
 * página renderizada —, então para ele a interface é sempre a do endereço.
 */
export function resolveUiLocale({ pathname, preference, session }) {
  if (isInternalPath(pathname)) return DEFAULT_LOCALE
  if (isSupportedLocale(preference)) return preference
  return localeFromPath(pathname) ?? (isSupportedLocale(session) ? session : DEFAULT_LOCALE)
}
