import { api } from '@/lib/api'
import { PAGE_SIZE } from '@/lib/constants'
import { normalizeSearch } from '@/lib/utils'

/**
 * Iniciativas. A API devolve o mesmo formato que o PostgREST devolvia
 * (`category`, `tags`, `team` e `links` embutidos), então as telas não sabem
 * de onde os dados vêm.
 */

/** Ordena equipe, links e tags — a ordem gravada é a da tela. */
function normalizeDetail(initiative) {
  if (!initiative) return null
  return {
    ...initiative,
    team: [...(initiative.team ?? [])].sort((a, b) => a.position - b.position),
    links: [...(initiative.links ?? [])].sort((a, b) => a.position - b.position),
    tags: [...(initiative.tags ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  }
}

/* -------------------------------------------------------------------------- */
/* Vitrine pública                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Busca paginada da vitrine. O termo é desacentuado do mesmo modo que o
 * índice de busca, para os dois lados casarem.
 */
export async function searchInitiatives({
  q = '',
  categoryIds = [],
  areas = [],
  tagIds = [],
  sort = 'recent',
  page = 1,
  pageSize = PAGE_SIZE,
} = {}) {
  return api.get('/initiatives/search', {
    q: normalizeSearch(q),
    categoryIds,
    areas,
    tagIds,
    sort,
    page,
    pageSize,
  })
}

/** Destaques da home: as publicações mais recentes. */
export async function listFeaturedInitiatives(limit = 6) {
  return api.get('/initiatives/featured', { limit })
}

export async function getPublishedInitiativeBySlug(slug) {
  return normalizeDetail(await api.get(`/initiatives/slug/${encodeURIComponent(slug)}`))
}

/** Outras iniciativas da mesma categoria, para o rodapé da página de detalhes. */
export async function listRelatedInitiatives(categoryId, excludeId, limit = 3) {
  if (!categoryId) return []
  return api.get('/initiatives/related', { categoryId, excludeId, limit })
}

/* -------------------------------------------------------------------------- */
/* Área administrativa                                                         */
/* -------------------------------------------------------------------------- */

export async function listInitiativesAdmin({
  q = '',
  status = null,
  categoryId = null,
  createdBy = null,
  sort = 'recent',
  page = 1,
  pageSize = 20,
} = {}) {
  return api.get('/admin/initiatives', {
    q: normalizeSearch(q),
    status,
    categoryId,
    createdBy,
    sort,
    page,
    pageSize,
  })
}

export async function getInitiativeById(id) {
  return normalizeDetail(await api.get(`/initiatives/${id}`))
}

/** Fila de revisão do dashboard. */
export async function listPendingReview(limit = 20) {
  return api.get('/admin/initiatives/pending', { limit })
}

export async function listRecentInitiatives(limit = 5) {
  return api.get('/admin/initiatives/recent', { limit })
}

export async function getReviewHistory(initiativeId) {
  return api.get(`/initiatives/${initiativeId}/reviews`)
}

/* -------------------------------------------------------------------------- */
/* Escrita                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Cria ou atualiza uma iniciativa junto com tags, equipe e links — numa
 * transação só, no servidor: ou tudo é gravado, ou nada muda.
 */
export async function saveInitiative({ id, values, tagIds = [], team = [], links = [] }) {
  const body = { values, tagIds, team, links }
  return id ? api.put(`/initiatives/${id}`, body) : api.post('/initiatives', body)
}

/**
 * Muda o status pela função do banco, que valida a transição, checa o papel
 * e grava a observação no histórico — tudo em uma transação só.
 */
export async function changeInitiativeStatus(id, status, notes = null) {
  await api.post(`/initiatives/${id}/status`, { status, notes })
}

export async function deleteInitiative(id) {
  await api.delete(`/initiatives/${id}`)
}
