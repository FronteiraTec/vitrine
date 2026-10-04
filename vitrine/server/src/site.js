/**
 * A identidade do site (`site_settings`) lida pelo servidor: nome no e-mail de
 * senha, `<head>` das notícias, sitemaps e feed.
 *
 * Cache curto em memória, porque é lida a cada notícia servida e muda raramente.
 * Salvar a aparência no painel limpa o cache na hora (`invalidateSite`).
 */
import { ANON, queryAs } from './db.js'
import { SITE_DEFAULTS } from '../../src/lib/seo.js'

const TTL_MS = 60 * 1000
let cached = null
let cachedAt = 0

export async function loadSiteRow() {
  const now = Date.now()
  if (cached && now - cachedAt < TTL_MS) return cached

  try {
    const rows = await queryAs(
      ANON,
      'select brand_name, logo_url, footer_description from public.site_settings limit 1',
    )
    cached = rows[0] ?? {}
  } catch (error) {
    // Identidade é enfeite: sem ela, os padrões do código assumem.
    console.error('[site] não foi possível ler site_settings:', error.message)
    cached = cached ?? {}
  }
  cachedAt = now
  return cached
}

export async function loadSiteName() {
  const row = await loadSiteRow()
  return row.brand_name || SITE_DEFAULTS.name
}

export function invalidateSite() {
  cached = null
  cachedAt = 0
}
