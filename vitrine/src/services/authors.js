import { api } from '@/lib/api'
import { localizeCard } from '@/lib/news-translations'
import { DEFAULT_LOCALE, normalizeLocale } from '@/i18n/config'

/**
 * Autores públicos. O servidor pede só as colunas que a migration 0013
 * liberou ao visitante, e a policy da 0012 só deixa ver quem tem notícia
 * publicada — o limite é do banco, não deste arquivo.
 */
export async function getAuthorBySlug(slug) {
  return api.get(`/authors/${encodeURIComponent(slug)}`)
}

/**
 * Notícias publicadas por um autor, da mais recente para a mais antiga. A
 * página do autor não tem endereço por idioma: cada notícia aparece traduzida
 * quando há tradução no idioma do leitor, e no original quando não há.
 */
export async function listNewsByAuthor(
  authorId,
  { page = 1, pageSize = 12, locale = DEFAULT_LOCALE } = {},
) {
  const code = normalizeLocale(locale)
  const result = await api.get(`/authors/${authorId}/news`, { page, pageSize, locale: code })
  return { ...result, items: result.items.map((item) => localizeCard(item, code)) }
}
