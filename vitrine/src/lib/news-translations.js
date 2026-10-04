/**
 * Notícia em um idioma: o original em `news` somado à linha de
 * `news_translations`, quando existe.
 *
 * O modelo (migration 0014) guarda na tradução só o que é TEXTO — título,
 * chapéu, resumo, corpo e as descrições das imagens. Capa, galeria, datas,
 * autoria e status continuam sendo da notícia: uma foto não muda de idioma, e
 * duplicar isso por tradução abriria espaço para as versões divergirem.
 *
 * Módulo puro, como `seo.js`: o cliente e a API (`server/src/seo/`) montam a
 * notícia pela mesma função, e as duas pontas descrevem a página igual.
 */
import { DEFAULT_LOCALE, LOCALE_CODES, TRANSLATION_LOCALES } from '../i18n/config.js'
import { normalizeGallery } from './news-content.js'

function latest(...values) {
  let best = null
  for (const value of values) {
    if (!value) continue
    const time = new Date(value).getTime()
    if (Number.isNaN(time)) continue
    if (best === null || time > new Date(best).getTime()) best = value
  }
  return best
}

/**
 * Versões existentes de uma notícia, na ordem dos idiomas: o original sempre
 * primeiro. Só entram idiomas conhecidos com slug — uma linha que o banco
 * aceitasse com locale estranho não vira `hreflang`.
 */
export function newsVersions(news) {
  if (!news?.slug) return []

  const found = new Map([[DEFAULT_LOCALE, { locale: DEFAULT_LOCALE, slug: news.slug }]])
  for (const translation of news.translations ?? []) {
    if (TRANSLATION_LOCALES.includes(translation?.locale) && translation.slug) {
      found.set(translation.locale, { locale: translation.locale, slug: translation.slug })
    }
  }

  return LOCALE_CODES.filter((code) => found.has(code)).map((code) => found.get(code))
}

/**
 * Textos das fotos da galeria no idioma da tradução, casados pela URL.
 *
 * Legenda e texto alternativo de uma foto vêm JUNTOS de um idioma só: se a
 * tradução não descreveu a foto, valem os dois do original, e a foto é marcada
 * com `textLocale` para a página declarar o `lang` certo. Misturar legenda
 * traduzida com alt em português faria o leitor de tela trocar de voz no meio
 * da mesma imagem.
 */
function localizeGallery(gallery, translated, locale) {
  const texts = new Map(
    (Array.isArray(translated) ? translated : [])
      .filter((item) => typeof item?.url === 'string')
      .map((item) => [item.url.trim(), item]),
  )

  return normalizeGallery(gallery).map((photo) => {
    const text = texts.get(photo.url)
    const caption = text?.caption?.trim() ?? ''
    const alt = text?.alt?.trim() ?? ''
    if (!caption && !alt) return { ...photo, textLocale: DEFAULT_LOCALE }
    return { ...photo, caption, alt, textLocale: locale }
  })
}

/**
 * A notícia pronta para exibir em um idioma.
 *
 * Sem tradução, é o original com `locale: 'pt-BR'`. Com tradução, os campos de
 * texto vêm dela, e três regras valem:
 *
 * • chapéu vazio na tradução fica vazio — um rótulo em português acima de um
 *   título em inglês seria pior que nenhum;
 * • descrições da capa seguem a regra da galeria: as duas de um idioma só;
 * • `published_at` é o da notícia, porque a data é do FATO, e uma tradução
 *   feita dois dias depois não torna a notícia mais nova. Já a data de
 *   modificação é a da tradução: foi esse texto que mudou.
 */
export function localizeArticle(news, translation) {
  if (!news) return null
  const versions = newsVersions(news)

  if (!translation) {
    return { ...news, gallery: normalizeGallery(news.gallery), locale: DEFAULT_LOCALE, versions }
  }

  const coverTranslated = Boolean(translation.cover_alt?.trim() || translation.cover_caption?.trim())

  return {
    ...news,
    locale: translation.locale,
    slug: translation.slug,
    name: translation.name,
    kicker: translation.kicker || null,
    excerpt: translation.excerpt || null,
    content: translation.content,
    cover_alt: coverTranslated ? translation.cover_alt || null : news.cover_alt,
    cover_caption: coverTranslated ? translation.cover_caption || null : news.cover_caption,
    coverTextLocale: coverTranslated ? translation.locale : DEFAULT_LOCALE,
    gallery: localizeGallery(news.gallery, translation.gallery, translation.locale),
    updated_at: latest(translation.updated_at, translation.created_at),
    content_updated_at: translation.content_updated_at ?? null,
    original: { locale: DEFAULT_LOCALE, slug: news.slug, name: news.name },
    versions,
  }
}

/**
 * Cartão de listagem a partir de uma linha de `news_translations` com a
 * notícia embutida (`news!inner(...)`).
 */
export function cardFromTranslation(row) {
  const news = row?.news ?? {}
  return {
    id: news.id ?? row.news_id,
    locale: row.locale,
    slug: row.slug,
    name: row.name,
    kicker: row.kicker ?? null,
    excerpt: row.excerpt ?? null,
    cover_image: news.cover_image ?? null,
    published_at: news.published_at ?? null,
    created_at: news.created_at ?? null,
    updated_at: row.updated_at ?? news.updated_at ?? null,
  }
}

/**
 * Cartão de listagem em um idioma, com recuo para o original.
 *
 * É o comportamento das páginas SEM endereço por idioma (home, autor): elas
 * mostram a notícia na língua do leitor quando existe tradução e, quando não
 * existe, o original em português — marcado com `locale` para a página
 * declarar o `lang` e avisar o leitor. As listas com endereço próprio
 * (`/en/news`) não usam recuo: lá só entra o que existe em inglês.
 */
export function localizeCard(news, locale) {
  const translation = (news?.translations ?? []).find((item) => item?.locale === locale)
  if (!translation) {
    const original = { ...news, locale: DEFAULT_LOCALE }
    delete original.translations
    return original
  }
  return cardFromTranslation({ ...translation, news })
}
