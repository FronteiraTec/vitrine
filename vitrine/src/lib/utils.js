import { clsx } from 'clsx'

/**
 * Junta classes condicionais.
 *
 * Era `twMerge(clsx(...))`. O `tailwind-merge` existia para resolver conflito
 * entre utilitários do Tailwind — `px-2 px-4` virava `px-4`. Sem Tailwind não
 * há esse conflito a resolver: as classes do Bootstrap são compostas, não
 * concorrentes, e o que sobra é a cascata normal do CSS.
 */
export function cn(...inputs) {
  return clsx(inputs)
}

/**
 * Gera um slug amigável para URLs a partir de um texto livre.
 * Remove acentos, símbolos e colapsa separadores.
 */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Formata uma data ISO. Retorna '' quando ausente.
 *
 * O idioma é opcional e cai no português: o painel administrativo só existe
 * em português e chama sem ele. A vitrine pública passa o idioma da página
 * (via `useLocale().formatDate`), e "29 de set. de 2026" vira "Sep 29, 2026".
 */
export function formatDate(value, options, locale = 'pt-BR') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date)
}

/** Formata apenas o horário — 24 h em português e espanhol, AM/PM em inglês. */
export function formatTime(value, locale = 'pt-BR') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)
}

/** Distância relativa em linguagem natural ("há 3 dias"). */
export function formatRelative(value, locale = 'pt-BR') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const divisions = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' },
  ]
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  let duration = diffSeconds
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }
  return ''
}

/** Trunca preservando palavras inteiras. */
export function truncate(value, max = 160) {
  const text = String(value ?? '').trim()
  if (text.length <= max) return text
  return `${text.slice(0, text.lastIndexOf(' ', max) || max).trimEnd()}…`
}

/** Iniciais para avatares (no máximo duas letras). */
export function initials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Normaliza texto para busca client-side (sem acentos, minúsculo). */
export function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Escapa os curingas do operador `ilike` do PostgREST para que a busca do
 * usuário não seja interpretada como padrão. Também neutraliza a vírgula, que
 * separa condições dentro de `.or()`.
 */
export function escapeLike(value) {
  return String(value ?? '')
    .replace(/[\\%_]/g, (match) => `\\${match}`)
    .replace(/[,()]/g, ' ')
    .trim()
}

/** Garante que uma URL fornecida pelo usuário seja segura para href. */
export function safeExternalUrl(url) {
  if (!url) return null
  const raw = String(url).trim()
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

/** Rótulo curto de um domínio, para exibir links sem poluir a interface. */
export function displayUrl(url) {
  const safe = safeExternalUrl(url)
  if (!safe) return ''
  return safe.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}
