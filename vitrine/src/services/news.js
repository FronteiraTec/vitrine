import { api } from '@/lib/api'
import { PAGE_SIZE } from '@/lib/constants'
import { cardFromTranslation, localizeArticle, localizeCard } from '@/lib/news-translations'
import { normalizeSearch } from '@/lib/utils'
import { DEFAULT_LOCALE, normalizeLocale } from '@/i18n/config'

/**
 * Notícias e traduções.
 *
 * A API devolve as linhas no formato que o PostgREST devolvia — a tradução
 * com a notícia embutida (`news`), a notícia com as versões
 * (`translations`) —, e as funções de `news-translations.js` montam a notícia
 * no idioma, as mesmas usadas pelas páginas renderizadas no servidor.
 */

/* -------------------------------------------------------------------------- */
/* Vitrine pública                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Listagem paginada de uma lista de notícias — `/noticias`, `/en/news` ou
 * `/es/noticias`, conforme `locale`. Em outro idioma, só entra o que existe
 * nele: a lista em inglês é uma página em inglês.
 */
export async function searchNews({
  q = '',
  sort = 'recent',
  page = 1,
  pageSize = PAGE_SIZE,
  locale = DEFAULT_LOCALE,
} = {}) {
  const code = normalizeLocale(locale)
  const result = await api.get('/news/search', {
    q: normalizeSearch(q),
    sort,
    page,
    pageSize,
    locale: code,
  })

  return {
    ...result,
    items:
      code === DEFAULT_LOCALE
        ? result.items.map((item) => ({ ...item, locale: DEFAULT_LOCALE }))
        : result.items.map(cardFromTranslation),
  }
}

/**
 * Últimas notícias — a seção da home. Em outro idioma, cada notícia vem
 * traduzida quando há tradução, e no original quando não há (`localizeCard`).
 */
export async function listLatestNews(limit = 3, locale = DEFAULT_LOCALE) {
  const code = normalizeLocale(locale)
  const items = await api.get('/news/latest', { limit, locale: code })
  return items.map((item) => localizeCard(item, code))
}

/**
 * Uma notícia publicada, pelo slug DO IDIOMA — `/en/news/campus-startup-wins`
 * procura o slug inglês, nunca o português.
 */
export async function getPublishedNewsBySlug(slug, locale = DEFAULT_LOCALE) {
  const code = normalizeLocale(locale)
  const data = await api.get(`/news/slug/${encodeURIComponent(slug)}`, { locale: code })

  if (code === DEFAULT_LOCALE) return localizeArticle(data, null)
  return data?.news ? localizeArticle(data.news, data) : null
}

/** Outras notícias do mesmo idioma, para o rodapé da página de detalhes. */
export async function listRelatedNews(excludeId, limit = 3, locale = DEFAULT_LOCALE) {
  const code = normalizeLocale(locale)
  const items = await api.get('/news/related', { excludeId, limit, locale: code })
  return code === DEFAULT_LOCALE
    ? items.map((item) => ({ ...item, locale: DEFAULT_LOCALE }))
    : items.map(cardFromTranslation)
}

/** Idiomas com ao menos uma notícia publicada. O português entra sempre. */
export async function listAvailableNewsLocales() {
  return api.get('/news/locales')
}

/* -------------------------------------------------------------------------- */
/* Área administrativa                                                         */
/* -------------------------------------------------------------------------- */

export async function listNewsAdmin({
  q = '',
  status = null,
  createdBy = null,
  sort = 'recent',
  page = 1,
  pageSize = 20,
} = {}) {
  return api.get('/admin/news', { q: normalizeSearch(q), status, createdBy, sort, page, pageSize })
}

export async function getNewsById(id) {
  return api.get(`/news/${id}`)
}

/** Fila de revisão. */
export async function listPendingNews(limit = 20) {
  return api.get('/admin/news/pending', { limit })
}

export async function getNewsReviewHistory(newsId) {
  return api.get(`/news/${newsId}/reviews`)
}

/* -------------------------------------------------------------------------- */
/* Escrita                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Cria ou atualiza uma notícia. O servidor filtra as colunas, apara os textos
 * e normaliza a galeria; o banco valida o resto.
 */
export async function saveNews({ id, values }) {
  return id ? api.put(`/news/${id}`, { values }) : api.post('/news', { values })
}

/**
 * Muda o status pela função do banco, que valida a transição, checa o papel e
 * grava a observação no histórico — tudo em uma transação só.
 */
export async function changeNewsStatus(id, status, notes = null) {
  await api.post(`/news/${id}/status`, { status, notes })
}

export async function deleteNews(id) {
  await api.delete(`/news/${id}`)
}

/* -------------------------------------------------------------------------- */
/* Traduções — painel                                                          */
/* -------------------------------------------------------------------------- */

export async function listNewsTranslations(newsId) {
  return api.get(`/news/${newsId}/translations`)
}

/**
 * Cria ou atualiza a tradução de uma notícia em um idioma. O idioma é
 * conferido no servidor e de novo no banco; quem edita a notícia de quem é o
 * RLS que decide.
 */
export async function saveNewsTranslation({ id, newsId, locale, values }) {
  if (id) return api.put(`/news-translations/${id}`, { values })
  return api.post(`/news/${newsId}/translations`, { locale, values })
}

/**
 * Sem permissão — tirar do ar a tradução de uma notícia publicada é decisão
 * de revisor —, a API responde 403 com a explicação, em vez de um "excluída"
 * que não aconteceu.
 */
export async function deleteNewsTranslation(id) {
  await api.delete(`/news-translations/${id}`)
}
