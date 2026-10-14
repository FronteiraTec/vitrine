/**
 * Tradução automática de uma notícia: o que é TEXTO e o que é marcação.
 *
 * O tradutor (LibreTranslate, via `/api/translate`) recebe só frases soltas.
 * Se recebesse o corpo inteiro, traduziria também a estrutura: `Legenda:`
 * viraria `Caption:` (e a legenda viraria parágrafo, porque o leitor do corpo
 * procura `Legenda:`), a URL de uma imagem podia ganhar espaço no meio, e um
 * `## ` podia sumir. Aqui o corpo passa por `parseArticleBody`, cada pedaço
 * de texto vira um item da lista, e o resultado volta por
 * `serializeArticleBody` — a mesma ida e volta do editor em blocos.
 *
 * Fica de fora, de propósito: crédito de foto (é atribuição de autoria) e
 * autor de citação (é nome de pessoa).
 *
 * Módulo puro, sem rede: quem chama a API é `services/translate.js`.
 */
import { normalizeGallery, parseArticleBody, serializeArticleBody } from './news-content.js'

/**
 * Planeja a tradução de uma notícia (o original, em português).
 *
 * Devolve `texts`, a lista de textos a traduzir — vazios incluídos, para as
 * posições não mudarem —, e `build(translated)`, que recebe a lista traduzida
 * na mesma ordem e devolve os valores do formulário de tradução.
 */
export function planArticleTranslation(news) {
  const texts = []
  const slot = (text) => texts.push(String(text ?? '').trim()) - 1
  // Parágrafo e citação podem ter quebra de linha: cada linha vai sozinha,
  // senão o tradutor junta tudo numa linha só.
  const lineSlots = (text) => String(text ?? '').split('\n').map(slot)

  const fields = {
    kicker: slot(news.kicker),
    name: slot(news.name),
    excerpt: slot(news.excerpt),
    cover_alt: slot(news.cover_alt),
    cover_caption: slot(news.cover_caption),
  }

  const gallery = normalizeGallery(news.gallery).map((photo) => ({
    url: photo.url,
    caption: slot(photo.caption),
    alt: slot(photo.alt),
  }))

  const blocks = parseArticleBody(news.content).map((block) => {
    switch (block.type) {
      case 'heading':
        return { ...block, text: slot(block.text) }
      case 'list':
        return { ...block, items: block.items.map(slot) }
      case 'quote':
      case 'paragraph':
        return { ...block, text: lineSlots(block.text) }
      case 'image':
        return { ...block, alt: slot(block.alt), caption: slot(block.caption) }
      case 'video':
        return { ...block, caption: slot(block.caption) }
      default:
        return block
    }
  })

  function build(translated) {
    const t = (index) => String(translated[index] ?? '').trim()
    const joinLines = (indexes) => indexes.map(t).filter(Boolean).join('\n')

    const content = serializeArticleBody(
      blocks.map((block) => {
        switch (block.type) {
          case 'heading':
            return { ...block, text: t(block.text) }
          case 'list':
            return { ...block, items: block.items.map(t) }
          case 'quote':
          case 'paragraph':
            return { ...block, text: joinLines(block.text) }
          case 'image':
            return { ...block, alt: t(block.alt), caption: t(block.caption) }
          case 'video':
            return { ...block, caption: t(block.caption) }
          default:
            return block
        }
      }),
    )

    return {
      kicker: t(fields.kicker),
      name: t(fields.name),
      excerpt: t(fields.excerpt),
      content,
      cover_alt: t(fields.cover_alt),
      cover_caption: t(fields.cover_caption),
      gallery: gallery.map((photo) => ({ url: photo.url, caption: t(photo.caption), alt: t(photo.alt) })),
    }
  }

  return { texts, build }
}

/**
 * Divide os textos NÃO vazios em lotes de índices. Lotes pequenos mantêm cada
 * requisição bem abaixo do tempo limite do proxy — o tradutor roda em CPU — e
 * deixam o painel mostrar o progresso.
 */
export function translationBatches(texts, { maxTexts = 25, maxChars = 3000 } = {}) {
  const batches = []
  let current = []
  let chars = 0

  texts.forEach((text, index) => {
    if (!text) return
    if (current.length && (current.length >= maxTexts || chars + text.length > maxChars)) {
      batches.push(current)
      current = []
      chars = 0
    }
    current.push(index)
    chars += text.length
  })

  if (current.length) batches.push(current)
  return batches
}
