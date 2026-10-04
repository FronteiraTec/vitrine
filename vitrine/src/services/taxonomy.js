import { api } from '@/lib/api'

/* --------------------------------- tags ---------------------------------- */

export async function listTags() {
  return api.get('/tags')
}

/**
 * Resolve uma lista de nomes de tags em ids, criando as que ainda não existem.
 * Assim o editor digita livremente sem precisar cadastrar tags antes.
 */
export async function resolveTagIds(names) {
  const cleaned = [...new Set((names ?? []).map((name) => name.trim()).filter(Boolean))]
  if (cleaned.length === 0) return []
  return api.post('/tags/resolve', { names: cleaned })
}

export async function deleteTag(id) {
  await api.delete(`/tags/${id}`)
}

/* -------------------------------- pessoas -------------------------------- */

/** Até 200 pessoas, filtradas pelo nome. Quem digita "50%" busca esse texto. */
export async function listPeople(search = '') {
  return api.get('/people', { search: search.trim() })
}

export async function createPerson(payload) {
  return api.post('/people', payload)
}

export async function updatePerson(id, payload) {
  return api.put(`/people/${id}`, payload)
}

export async function deletePerson(id) {
  await api.delete(`/people/${id}`)
}

/* ------------------------------- áreas ----------------------------------- */

/**
 * Áreas em uso no catálogo publicado. Ficam em `initiatives.areas` (text[]) em
 * vez de uma tabela própria: são um vocabulário curto e estável.
 */
export async function listUsedAreas() {
  const areas = await api.get('/areas')
  return [...areas].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))
}
