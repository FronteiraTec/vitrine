/**
 * Regras de conteúdo da notícia — o que vale tanto na hora de gravar quanto na
 * hora de exibir. Fica fora de `services/news.js` porque a API (`server/`)
 * usa as mesmas regras ao gravar e ao montar as páginas no servidor.
 */

/**
 * Normaliza a galeria para `[{ url, caption, credit }]`.
 *
 * Aceita também o formato antigo (lista de URLs em texto, como a migration 0009
 * gravava): as duas formas convivem enquanto a 0010 não roda, e o painel não
 * deveria quebrar no meio dessa janela. Item sem URL é descartado — só existe
 * enquanto o upload não terminou.
 */
export function normalizeGallery(value) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => (typeof item === 'string' ? { url: item } : (item ?? {})))
    .filter((item) => typeof item.url === 'string' && item.url.trim() !== '')
    .map((item) => ({
      url: item.url.trim(),
      caption: item.caption?.trim() || '',
      credit: item.credit?.trim() || '',
      // Texto alternativo é campo próprio, não sinônimo de legenda: a legenda
      // contextualiza para quem vê a foto ("O prefeito durante o anúncio"), o
      // alt descreve a cena para quem não a vê. Opcional — a página recua para
      // a legenda quando está vazio.
      alt: item.alt?.trim() || '',
    }))
}

/* -------------------------------------------------------------------------- */
/* Corpo da notícia                                                            */
/* -------------------------------------------------------------------------- */

const HEADING = /^(#{2,3})\s+/
const BULLET = /^[-*]\s+/
// Até três dígitos: "2026. Foi um ano…" no começo de um parágrafo não pode
// virar lista numerada.
const NUMBERED = /^\d{1,3}[.)]\s+/
const QUOTE = /^>\s?/
const CITE = /^(?:—|–|--)\s*/
const DIVIDER = /^(?:-{3,}|\*{3,}|_{3,})$/
// Só http(s): o endereço vai para o `src` de uma <img>.
const IMAGE = /^!\[(.*)\]\((https?:\/\/[^\s)]+)\)$/
const CAPTION = /^legenda\s*:\s*/i
const CREDIT = /^cr[ée]dito\s*:\s*/i
const YOUTUBE =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})(?![\w-])\S*$/i

/**
 * Identificador de um vídeo do YouTube a partir do link, em qualquer das formas
 * que o YouTube oferece para copiar (página, "Compartilhar", Shorts, embed), ou
 * `null`. O identificador tem forma fixa, então o que vai para o `src` do
 * iframe é sempre montado aqui, e nunca copiado do texto do usuário.
 */
export function youtubeId(url) {
  return YOUTUBE.exec(String(url ?? '').trim())?.[1] ?? null
}

export function youtubeWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`
}

/** `youtube-nocookie`: o YouTube só grava cookie depois que a pessoa dá play. */
export function youtubeEmbedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${id}`
}

/**
 * Consome, logo abaixo de uma imagem ou vídeo, as linhas `Legenda:` e
 * `Crédito:`. O que sobrar no mesmo trecho segue como parágrafo.
 */
function takeCaptions(lines, { credit = true } = {}) {
  const found = { caption: '', credit: '' }
  let rest = lines
  while (rest.length) {
    if (!found.caption && CAPTION.test(rest[0])) found.caption = rest[0].replace(CAPTION, '')
    else if (credit && !found.credit && CREDIT.test(rest[0])) found.credit = rest[0].replace(CREDIT, '')
    else break
    rest = rest.slice(1)
  }
  return { ...found, rest }
}

/**
 * Quebra o corpo da notícia em blocos.
 *
 * O corpo é gravado como texto puro, não como HTML: um editor de HTML traria
 * marcação do usuário e a pergunta de como sanitizá-la. O formato reconhece
 * convenções de texto, separadas por linha em branco:
 *
 *   ## Intertítulo              linha começando com ##
 *   ### Intertítulo menor       linha começando com ###
 *   - item                      linhas seguidas começando com - ou *
 *   1. item                     linhas seguidas começando com número e ponto
 *   > citação                   linhas seguidas começando com >; a última,
 *   > — Autor                   se começar com travessão, é o autor
 *   ---                         divisor
 *   ![texto alternativo](url)   imagem, seguida opcionalmente das linhas
 *   Legenda: …                  `Legenda:` e `Crédito:`
 *   Crédito: …
 *   https://youtu.be/…          vídeo do YouTube, sozinho na linha, seguido
 *   Legenda: …                  opcionalmente de `Legenda:`
 *
 * Qualquer outra coisa é parágrafo. Nada vira marcação executável: o resultado
 * é sempre texto que o React escapa, então uma tag colada no painel aparece
 * como texto na página, e não como HTML.
 */
export function parseArticleBody(content) {
  const text = String(content ?? '').trim()
  if (!text) return []

  const blocks = []

  for (const chunk of text.split(/\n\s*\n/)) {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!lines.length) continue

    if (lines.length === 1 && DIVIDER.test(lines[0])) {
      blocks.push({ type: 'divider' })
      continue
    }

    // Um bloco em que TODAS as linhas começam com marcador vira lista. Exigir
    // todas evita que um parágrafo com um travessão solto no início vire item.
    if (lines.every((line) => BULLET.test(line))) {
      blocks.push({ type: 'list', ordered: false, items: lines.map((line) => line.replace(BULLET, '')) })
      continue
    }

    if (lines.every((line) => NUMBERED.test(line))) {
      blocks.push({ type: 'list', ordered: true, items: lines.map((line) => line.replace(NUMBERED, '')) })
      continue
    }

    if (lines.every((line) => QUOTE.test(line))) {
      const quoted = lines.map((line) => line.replace(QUOTE, '').trim()).filter(Boolean)
      const cite = quoted.length > 1 && CITE.test(quoted.at(-1)) ? quoted.pop().replace(CITE, '') : ''
      if (quoted.length) blocks.push({ type: 'quote', text: quoted.join('\n'), cite })
      continue
    }

    const image = IMAGE.exec(lines[0])
    const videoId = image ? null : youtubeId(lines[0])
    if (image || videoId) {
      const { caption, credit, rest } = takeCaptions(lines.slice(1), { credit: Boolean(image) })
      blocks.push(
        image
          ? { type: 'image', url: image[2], alt: image[1].trim(), caption, credit }
          : { type: 'video', videoId, url: youtubeWatchUrl(videoId), caption },
      )
      if (rest.length) blocks.push({ type: 'paragraph', text: rest.join('\n') })
      continue
    }

    // O intertítulo é sempre uma linha só; se vier texto colado abaixo, ele
    // segue como parágrafo próprio.
    const heading = HEADING.exec(lines[0])
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: lines[0].replace(HEADING, '') })
      if (lines.length > 1) blocks.push({ type: 'paragraph', text: lines.slice(1).join('\n') })
      continue
    }

    blocks.push({ type: 'paragraph', text: lines.join('\n') })
  }

  return blocks
}

/**
 * Inverso de `parseArticleBody`: recebe blocos no mesmo formato que ela devolve
 * e escreve o texto que vai para `news.content`.
 *
 * O editor em blocos do painel grava por aqui, então o banco guarda texto puro
 * e a página pública lê tudo pela mesma função de sempre. Campos de uma linha
 * só no formato — intertítulo, item de lista, legenda — têm a quebra trocada
 * por espaço: uma quebra ali faria o bloco virar outra coisa ao ser lido de
 * volta. Bloco vazio some, como já sumia na leitura.
 */
export function serializeArticleBody(blocks) {
  const oneLine = (text) => String(text ?? '').replace(/\s*\n\s*/g, ' ').trim()
  // Linha em branco dentro do bloco o partiria em dois na leitura.
  const lines = (text) =>
    String(text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  const captions = (block) =>
    [
      oneLine(block.caption) && `Legenda: ${oneLine(block.caption)}`,
      oneLine(block.credit) && `Crédito: ${oneLine(block.credit)}`,
    ].filter(Boolean)

  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading': {
          const text = oneLine(block.text)
          return text ? `${block.level === 3 ? '###' : '##'} ${text}` : ''
        }

        case 'list':
          return block.items
            .map(oneLine)
            .filter(Boolean)
            .map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`))
            .join('\n')

        case 'quote': {
          const quoted = lines(block.text)
          if (!quoted.length) return ''
          if (oneLine(block.cite)) quoted.push(`— ${oneLine(block.cite)}`)
          return quoted.map((line) => `> ${line}`).join('\n')
        }

        case 'divider':
          return '---'

        case 'image': {
          if (!/^https?:\/\/[^\s)]+$/.test(block.url ?? '')) return ''
          const alt = oneLine(block.alt).replace(/[[\]]/g, '')
          return [`![${alt}](${block.url})`, ...captions(block)].join('\n')
        }

        case 'video': {
          const id = block.videoId ?? youtubeId(block.url)
          if (!id) return ''
          return [youtubeWatchUrl(id), ...captions({ caption: block.caption })].join('\n')
        }

        default:
          return lines(block.text).join('\n')
      }
    })
    .filter(Boolean)
    .join('\n\n')
}

/** Texto corrido do corpo, para descrição e `articleBody` do SEO. */
export function articlePlainText(content) {
  return parseArticleBody(content)
    .map((block) => {
      if (block.type === 'list') return block.items.join(' ')
      if (block.type === 'quote') return [block.text, block.cite].filter(Boolean).join(' — ')
      return block.text ?? ''
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Todas as fotos da notícia na ordem em que aparecem — capa, corpo, galeria —,
 * para o `image` do dado estruturado. A página e o `<head>` escrito no
 * servidor usam esta mesma função.
 */
export function articleImageUrls({ cover, blocks = [], gallery = [] }) {
  return [
    cover,
    ...blocks.filter((block) => block.type === 'image').map((block) => block.url),
    ...normalizeGallery(gallery).map((photo) => photo.url),
  ].filter(Boolean)
}


/**
 * "Atualizado em" só aparece quando houve correção depois de publicada, e
 * apenas se ela for mesmo posterior à publicação — republicar uma notícia
 * arquivada pode deixar `content_updated_at` para trás de `published_at`, e
 * anunciar uma atualização mais velha que a própria notícia confundiria.
 */
export function contentUpdatedAfterPublish(item) {
  if (!item?.content_updated_at || !item?.published_at) return null
  const updated = new Date(item.content_updated_at)
  const published = new Date(item.published_at)
  if (Number.isNaN(updated.getTime()) || Number.isNaN(published.getTime())) return null
  return updated > published ? item.content_updated_at : null
}
