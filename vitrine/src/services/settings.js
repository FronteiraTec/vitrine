import { api } from '@/lib/api'

/**
 * A linha única de `site_settings`. `null` quando não existe: o cabeçalho é
 * renderizado em toda página, e sem a linha os padrões do código assumem.
 */
export async function getSiteSettings() {
  return api.get('/site-settings')
}

/**
 * Grava a linha única. Só administrador — e o banco recusa cor fora do
 * formato `#rrggbb` (ver `db/migrations/20250101000005_site_settings.sql`).
 */
export async function updateSiteSettings(values) {
  return api.put('/site-settings', values)
}
