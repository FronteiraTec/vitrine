import { api } from '@/lib/api'
import { planArticleTranslation, translationBatches } from '@/lib/machine-translation'

/** O LibreTranslate está no ar, e para quais idiomas. Nunca falha. */
export async function getTranslateStatus() {
  try {
    return await api.get('/translate/status')
  } catch {
    return { available: false, targets: [] }
  }
}

/**
 * Traduz a notícia original para `target` e devolve os valores do formulário
 * de tradução — nada é gravado. Os lotes vão um de cada vez: o tradutor tem
 * um núcleo só na VPS, e requisições em paralelo só entrariam na fila dele.
 */
export async function translateArticle(news, target, { onProgress } = {}) {
  const { texts, build } = planArticleTranslation(news)
  const batches = translationBatches(texts)
  const translated = texts.map(() => '')

  for (const [position, indexes] of batches.entries()) {
    onProgress?.({ done: position, total: batches.length })
    const result = await api.post('/translate', { target, texts: indexes.map((index) => texts[index]) })
    indexes.forEach((index, offset) => {
      translated[index] = result.texts[offset] ?? ''
    })
  }

  onProgress?.({ done: batches.length, total: batches.length })
  return build(translated)
}
