/**
 * Regras de conteúdo da notícia — o que vale tanto na hora de gravar quanto na
 * hora de exibir. Fica fora de `services/news.js` porque a página pública
 * precisa das mesmas regras sem arrastar o cliente do Supabase junto.
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
    }))
}

/**
 * Quebra o corpo da notícia em blocos.
 *
 * O texto é digitado num textarea, não em editor rico. Em vez de trocar por um
 * editor — que traria HTML do usuário e a pergunta de como sanitizá-lo — o
 * formato reconhece duas convenções de texto puro:
 *
 *   ## Intertítulo      linha começando com ##
 *   - item da lista     linhas seguidas começando com - ou *
 *
 * Qualquer outra coisa é parágrafo. Nada vira marcação executável: o resultado
 * é sempre texto que o React escapa, então uma tag colada no formulário aparece
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

    // Um bloco em que TODAS as linhas começam com marcador vira lista. Exigir
    // todas evita que um parágrafo com um travessão solto no início vire item.
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      blocks.push({ type: 'list', items: lines.map((line) => line.replace(/^[-*]\s+/, '')) })
      continue
    }

    // O intertítulo é sempre uma linha só; se vier texto colado abaixo, ele
    // segue como parágrafo próprio.
    if (/^#{2,3}\s+/.test(lines[0])) {
      blocks.push({ type: 'heading', text: lines[0].replace(/^#{2,3}\s+/, '') })
      if (lines.length > 1) blocks.push({ type: 'paragraph', text: lines.slice(1).join('\n') })
      continue
    }

    blocks.push({ type: 'paragraph', text: lines.join('\n') })
  }

  return blocks
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
