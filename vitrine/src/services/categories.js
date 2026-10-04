import { api } from '@/lib/api'

/** Todas as categorias, na ordem definida pelo administrador. */
export async function listCategories() {
  return api.get('/categories')
}

/** Categorias com a contagem de iniciativas publicadas — alimenta a home. */
export async function listCategoriesWithCounts() {
  return api.get('/categories/with-counts')
}

export async function getCategoryBySlug(slug) {
  return api.get(`/categories/slug/${encodeURIComponent(slug)}`)
}

export async function createCategory(payload) {
  return api.post('/categories', payload)
}

export async function updateCategory(id, payload) {
  return api.put(`/categories/${id}`, payload)
}

/** Com iniciativas vinculadas, a API responde com a explicação do bloqueio. */
export async function deleteCategory(id) {
  await api.delete(`/categories/${id}`)
}

/** Persiste a nova ordem após arrastar/reordenar — numa transação, no servidor. */
export async function reorderCategories(orderedIds) {
  await api.post('/categories/reorder', { ids: orderedIds })
}
