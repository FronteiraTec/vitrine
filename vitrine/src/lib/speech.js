/**
 * Preparação do texto para a leitura em voz alta.
 *
 * Separado do componente porque é lógica pura — dá para testar sem montar
 * React nem simular a Web Speech API.
 */

/**
 * Fatia o texto em enunciados curtos.
 *
 * Não é estética: o Chrome interrompe a fala depois de cerca de 15 segundos
 * quando a voz é remota, e uma notícia inteira num único enunciado para no meio
 * sem aviso. Enfileirar trechos curtos contorna isso sem o truque de
 * `pause()`/`resume()` em `setInterval`, que corta palavras ao meio.
 *
 * Quebra no fim da frase; se a frase passar do limite, quebra na vírgula ou no
 * espaço mais próximo — nunca no meio de uma palavra.
 */
export function splitForSpeech(text, limit = 180) {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return []

  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean]
  const chunks = []
  let buffer = ''

  const flush = () => {
    const value = buffer.trim()
    if (value) chunks.push(value)
    buffer = ''
  }

  for (const sentence of sentences) {
    if (sentence.length > limit) {
      flush()
      let rest = sentence.trim()
      while (rest.length > limit) {
        const slice = rest.slice(0, limit)
        const cut = Math.max(slice.lastIndexOf(', '), slice.lastIndexOf(' '))
        const at = cut > limit * 0.5 ? cut : limit
        chunks.push(rest.slice(0, at).trim())
        rest = rest.slice(at).trim()
      }
      buffer = rest
      continue
    }

    if ((buffer + sentence).length > limit) flush()
    buffer += sentence
  }

  flush()
  return chunks
}

/**
 * Monta o texto que será lido de uma notícia.
 *
 * Recebe os blocos já interpretados por `parseArticleBody`, e não o DOM. Ler a
 * página traria menu, "Compartilhe", rótulo de botão e a lista de outras
 * notícias junto — exatamente o que o recurso deve evitar. Aqui entra só o que
 * é conteúdo editorial, na ordem em que aparece.
 */
export function buildArticleSpeech({ kicker, title, lead, blocks = [] } = {}) {
  const parts = []

  if (kicker) parts.push(`${kicker}.`)
  if (title) parts.push(`${title}.`)
  if (lead) parts.push(lead)

  // Imagem, vídeo e divisor não têm texto próprio e ficam de fora, como a capa
  // e a galeria já ficavam.
  for (const block of blocks) {
    if (block.type === 'heading') parts.push(`${block.text}.`)
    else if (block.type === 'list') parts.push(block.items.join('. '))
    else if (block.type === 'quote') parts.push(block.cite ? `${block.text} (${block.cite})` : block.text)
    else if (block.text) parts.push(block.text)
  }

  return parts.join('\n\n')
}
