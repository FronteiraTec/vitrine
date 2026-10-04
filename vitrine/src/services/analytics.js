import { api } from '@/lib/api'

/**
 * Relatório de audiência do período: totais, período anterior, série diária,
 * ranking de conteúdos e os recortes por lugar, canal e idioma.
 *
 * `from` e `to` em 'AAAA-MM-DD'; `type` ('news' | 'initiative') e `id`
 * restringem a um tipo ou a um conteúdo.
 */
export async function getAudience({ from, to, type, id } = {}) {
  return api.get('/analytics', { from, to, type, id })
}

export const AUDIENCE_EXPORT_LIMIT = 50000

/** Linhas brutas do período (dia × conteúdo × lugar × canal), para a planilha. */
export async function getAudienceRows({ from, to, type, id } = {}) {
  return api.get('/analytics/rows', { from, to, type, id })
}
