/**
 * Tradução automática: repasse ao LibreTranslate (serviço `translate` do
 * docker-compose, perfil "traducao").
 *
 * A API só traduz listas de textos soltos. Quem sabe o que é texto e o que é
 * marcação — a URL de uma imagem, o `Legenda:` que o leitor do corpo procura —
 * é o painel (`src/lib/machine-translation.js`), que manda só o texto e
 * remonta o resultado. Assim o LibreTranslate nunca vê, nem estraga, a
 * estrutura da notícia.
 *
 * Nada é gravado aqui: o resultado volta para o formulário, alguém revisa e
 * salva pela rota de sempre, sob as regras de sempre do banco.
 */
import { Router } from 'express'
import { requireSession } from '../auth/sessions.js'
import { config } from '../config.js'
import { badRequest, HttpError } from '../http.js'
import { createLimiter } from '../rate-limit.js'
import { DEFAULT_LOCALE, TRANSLATION_LOCALES } from '../../../src/i18n/config.js'

export const translateRouter = Router()
translateRouter.use(requireSession)

/** Código do LibreTranslate para cada idioma da vitrine. */
const ENGINE_CODE = { [DEFAULT_LOCALE]: 'pt', en: 'en', es: 'es' }

/** Por lote: o painel divide a notícia em vários, e mostra o progresso. */
const MAX_TEXTS = 100
const MAX_CHARS = 12_000

// Uma notícia longa dá algumas dezenas de lotes; o teto é contra um laço,
// não contra o uso normal.
const limiter = createLimiter({ windowMs: 60_000, max: 120 })

const unavailable = (message = 'A tradução automática não está disponível agora. Tente de novo em instantes.') =>
  new HttpError(503, message, 'translate_unavailable')

async function engine(path, { body, timeoutMs = config.translate.timeoutMs } = {}) {
  if (!config.translate.url) {
    throw unavailable('A tradução automática está desligada neste servidor (ver README, seção Tradução automática).')
  }

  let response
  try {
    response = await fetch(`${config.translate.url}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError') throw unavailable('O tradutor demorou demais para responder. Tente de novo.')
    throw unavailable()
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    console.error(`[translate] ${path} respondeu ${response.status}:`, data?.error ?? '')
    throw unavailable()
  }
  return data
}

/** O painel pergunta antes de oferecer o botão. Nunca falha: responde `available`. */
translateRouter.get('/status', async (_request, response) => {
  try {
    const languages = await engine('/languages', { timeoutMs: 3_000 })
    const codes = new Set((Array.isArray(languages) ? languages : []).map((item) => item?.code))
    const targets = TRANSLATION_LOCALES.filter((locale) => codes.has(ENGINE_CODE[locale]))
    response.json({ available: codes.has(ENGINE_CODE[DEFAULT_LOCALE]) && targets.length > 0, targets })
  } catch {
    response.json({ available: false, targets: [] })
  }
})

/**
 * `{ target: 'en' | 'es', texts: string[] }` → `{ texts: string[] }`, na mesma
 * ordem. O original é sempre o português. Texto vazio volta vazio, sem ir ao
 * tradutor.
 */
translateRouter.post('/', async (request, response) => {
  const { target, texts } = request.body ?? {}

  if (!TRANSLATION_LOCALES.includes(target)) throw badRequest('Idioma de destino inválido.')
  if (!Array.isArray(texts) || texts.length > MAX_TEXTS || texts.some((text) => typeof text !== 'string')) {
    throw badRequest(`Envie de 1 a ${MAX_TEXTS} textos.`)
  }
  if (texts.reduce((sum, text) => sum + text.length, 0) > MAX_CHARS) {
    throw badRequest('Lote de texto grande demais.')
  }
  if (!limiter.hit(request.auth.userId)) {
    throw new HttpError(429, 'Muitas traduções seguidas. Aguarde um minuto.', 'rate_limit')
  }

  const pending = texts.map((text, index) => ({ text: text.trim(), index })).filter((item) => item.text)
  const result = texts.map(() => '')

  if (pending.length) {
    const data = await engine('/translate', {
      body: {
        q: pending.map((item) => item.text),
        source: ENGINE_CODE[DEFAULT_LOCALE],
        target: ENGINE_CODE[target],
        format: 'text',
        ...(config.translate.apiKey ? { api_key: config.translate.apiKey } : {}),
      },
    })
    const translated = data?.translatedText
    if (!Array.isArray(translated) || translated.length !== pending.length) throw unavailable()
    pending.forEach((item, position) => {
      result[item.index] = String(translated[position] ?? '').trim()
    })
  }

  response.json({ texts: result })
})
