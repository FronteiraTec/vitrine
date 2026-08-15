import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as categoriesService from '@/services/categories'
import * as initiativesService from '@/services/initiatives'
import * as taxonomyService from '@/services/taxonomy'
import * as adminService from '@/services/admin'
import * as settingsService from '@/services/settings'
import * as newsService from '@/services/news'
import { resolveSiteSettings } from '@/lib/site-settings'
import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * Chaves de cache centralizadas. Manter tudo aqui evita invalidações que
 * "quase" batem com a chave usada na consulta.
 */
export const keys = {
  categories: ['categories'],
  categoriesWithCounts: ['categories', 'counts'],
  category: (slug) => ['categories', 'slug', slug],
  tags: ['tags'],
  areas: ['areas'],
  people: (search) => ['people', search ?? ''],
  featured: ['initiatives', 'featured'],
  search: (filters) => ['initiatives', 'search', filters],
  initiativeBySlug: (slug) => ['initiatives', 'slug', slug],
  related: (categoryId, excludeId) => ['initiatives', 'related', categoryId, excludeId],
  adminList: (filters) => ['initiatives', 'admin', filters],
  initiative: (id) => ['initiatives', 'id', id],
  reviewHistory: (id) => ['initiatives', 'reviews', id],
  pendingReview: ['initiatives', 'pending'],
  recent: ['initiatives', 'recent'],
  stats: ['dashboard', 'stats'],
  activity: ['dashboard', 'activity'],
  profiles: ['profiles'],
  siteSettings: ['site-settings'],
  latestNews: ['news', 'latest'],
  newsSearch: (filters) => ['news', 'search', filters],
  newsBySlug: (slug) => ['news', 'slug', slug],
  relatedNews: (excludeId) => ['news', 'related', excludeId],
  newsAdminList: (filters) => ['news', 'admin', filters],
  newsItem: (id) => ['news', 'id', id],
  newsReviewHistory: (id) => ['news', 'reviews', id],
  pendingNews: ['news', 'pending'],
}

// Sem credenciais não há o que buscar — as telas mostram a orientação de setup.
const enabled = isSupabaseConfigured

/* ------------------------------ taxonomias -------------------------------- */

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: categoriesService.listCategories,
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useCategoriesWithCounts() {
  return useQuery({
    queryKey: keys.categoriesWithCounts,
    queryFn: categoriesService.listCategoriesWithCounts,
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useCategoryBySlug(slug) {
  return useQuery({
    queryKey: keys.category(slug),
    queryFn: () => categoriesService.getCategoryBySlug(slug),
    enabled: enabled && Boolean(slug),
  })
}

export function useTags() {
  return useQuery({
    queryKey: keys.tags,
    queryFn: taxonomyService.listTags,
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useAreas() {
  return useQuery({
    queryKey: keys.areas,
    queryFn: taxonomyService.listUsedAreas,
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function usePeople(search = '') {
  return useQuery({
    queryKey: keys.people(search),
    queryFn: () => taxonomyService.listPeople(search),
    staleTime: 60 * 1000,
    enabled,
  })
}

/* -------------------------- identidade do site ---------------------------- */

/**
 * Linha crua de `site_settings` — para o formulário da tela de aparência,
 * que precisa distinguir "carregando" de "sem valor".
 *
 * `staleTime` alto porque a identidade muda raramente e é lida em toda página;
 * quem salva invalida a chave na hora.
 */
export function useSiteSettingsQuery() {
  return useQuery({
    queryKey: keys.siteSettings,
    queryFn: settingsService.getSiteSettings,
    staleTime: 10 * 60 * 1000,
    enabled,
  })
}

/**
 * Identidade já resolvida: sempre um objeto completo, nunca `undefined`.
 *
 * Cabeçalho e rodapé são renderizados em toda rota — inclusive antes da
 * consulta responder e na renderização de servidor do `npm run smoke`. Cair
 * nos defaults do código evita layout piscando e um `?.` em cada campo.
 */
export function useSiteSettings() {
  const { data } = useSiteSettingsQuery()
  return useMemo(() => resolveSiteSettings(data), [data])
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: settingsService.updateSiteSettings,
    // Escreve a resposta direto no cache: a marca no topo da tela muda no
    // mesmo instante em que o salvamento confirma, sem uma segunda ida à rede.
    onSuccess: (data) => queryClient.setQueryData(keys.siteSettings, data),
  })
}

/* ------------------------------- vitrine ---------------------------------- */

export function useFeaturedInitiatives(limit = 6) {
  return useQuery({
    queryKey: [...keys.featured, limit],
    queryFn: () => initiativesService.listFeaturedInitiatives(limit),
    staleTime: 60 * 1000,
    enabled,
  })
}

/**
 * `ready` permite adiar a busca até que uma dependência exista — a página de
 * categoria, por exemplo, só pode filtrar depois de resolver o slug. Sem isso
 * ela dispararia primeiro uma consulta sem filtro, trazendo o catálogo inteiro.
 */
export function useInitiativeSearch(filters, { ready = true } = {}) {
  return useQuery({
    queryKey: keys.search(filters),
    queryFn: () => initiativesService.searchInitiatives(filters),
    // Mantém a página anterior visível enquanto a próxima carrega: sem isso a
    // grade "pisca" a cada mudança de filtro.
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
    enabled: enabled && ready,
  })
}

export function usePublishedInitiative(slug) {
  return useQuery({
    queryKey: keys.initiativeBySlug(slug),
    queryFn: () => initiativesService.getPublishedInitiativeBySlug(slug),
    enabled: enabled && Boolean(slug),
  })
}

export function useRelatedInitiatives(categoryId, excludeId) {
  return useQuery({
    queryKey: keys.related(categoryId, excludeId),
    queryFn: () => initiativesService.listRelatedInitiatives(categoryId, excludeId),
    enabled: enabled && Boolean(categoryId),
  })
}

/* -------------------------------- notícias -------------------------------- */

export function useLatestNews(limit = 3) {
  return useQuery({
    queryKey: [...keys.latestNews, limit],
    queryFn: () => newsService.listLatestNews(limit),
    staleTime: 60 * 1000,
    enabled,
  })
}

export function useNewsSearch(filters) {
  return useQuery({
    queryKey: keys.newsSearch(filters),
    queryFn: () => newsService.searchNews(filters),
    // Mantém a página anterior visível enquanto a próxima carrega.
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
    enabled,
  })
}

export function usePublishedNews(slug) {
  return useQuery({
    queryKey: keys.newsBySlug(slug),
    queryFn: () => newsService.getPublishedNewsBySlug(slug),
    enabled: enabled && Boolean(slug),
  })
}

export function useRelatedNews(excludeId) {
  return useQuery({
    queryKey: keys.relatedNews(excludeId),
    queryFn: () => newsService.listRelatedNews(excludeId),
    enabled,
  })
}

export function useAdminNews(filters) {
  return useQuery({
    queryKey: keys.newsAdminList(filters),
    queryFn: () => newsService.listNewsAdmin(filters),
    placeholderData: (previous) => previous,
    enabled,
  })
}

export function useNewsItem(id) {
  return useQuery({
    queryKey: keys.newsItem(id),
    queryFn: () => newsService.getNewsById(id),
    enabled: enabled && Boolean(id),
  })
}

export function useNewsReviewHistory(id) {
  return useQuery({
    queryKey: keys.newsReviewHistory(id),
    queryFn: () => newsService.getNewsReviewHistory(id),
    enabled: enabled && Boolean(id),
  })
}

/** `ready` evita buscar a fila para quem não revisa (o contador nem aparece). */
export function usePendingNews({ ready = true } = {}) {
  return useQuery({
    queryKey: keys.pendingNews,
    queryFn: () => newsService.listPendingNews(),
    enabled: enabled && ready,
  })
}

/** Invalida tudo que depende do acervo de notícias. */
function useInvalidateNews() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['news'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useSaveNews() {
  const invalidate = useInvalidateNews()
  return useMutation({ mutationFn: newsService.saveNews, onSuccess: invalidate })
}

export function useChangeNewsStatus() {
  const invalidate = useInvalidateNews()
  return useMutation({
    mutationFn: ({ id, status, notes }) => newsService.changeNewsStatus(id, status, notes),
    onSuccess: invalidate,
  })
}

export function useDeleteNews() {
  const invalidate = useInvalidateNews()
  return useMutation({ mutationFn: newsService.deleteNews, onSuccess: invalidate })
}

/* -------------------------------- admin ----------------------------------- */

export function useAdminInitiatives(filters) {
  return useQuery({
    queryKey: keys.adminList(filters),
    queryFn: () => initiativesService.listInitiativesAdmin(filters),
    placeholderData: (previous) => previous,
    enabled,
  })
}

export function useInitiative(id) {
  return useQuery({
    queryKey: keys.initiative(id),
    queryFn: () => initiativesService.getInitiativeById(id),
    enabled: enabled && Boolean(id),
  })
}

export function useReviewHistory(id) {
  return useQuery({
    queryKey: keys.reviewHistory(id),
    queryFn: () => initiativesService.getReviewHistory(id),
    enabled: enabled && Boolean(id),
  })
}

/** `ready` evita buscar a fila para quem não revisa (o contador nem aparece). */
export function usePendingReview({ ready = true } = {}) {
  return useQuery({
    queryKey: keys.pendingReview,
    queryFn: () => initiativesService.listPendingReview(),
    enabled: enabled && ready,
  })
}

export function useRecentInitiatives() {
  return useQuery({
    queryKey: keys.recent,
    queryFn: () => initiativesService.listRecentInitiatives(),
    enabled,
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: keys.stats,
    queryFn: adminService.getDashboardStats,
    staleTime: 60 * 1000,
    enabled,
  })
}

export function useActivity(limit = 15) {
  return useQuery({
    queryKey: [...keys.activity, limit],
    queryFn: () => adminService.listActivity(limit),
    staleTime: 30 * 1000,
    enabled,
  })
}

export function useProfiles() {
  return useQuery({
    queryKey: keys.profiles,
    queryFn: adminService.listProfiles,
    enabled,
  })
}

/* ------------------------------- mutações --------------------------------- */

/** Invalida tudo que depende do catálogo de iniciativas. */
function useInvalidateInitiatives() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['initiatives'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: keys.categoriesWithCounts })
    queryClient.invalidateQueries({ queryKey: keys.areas })
  }
}

export function useSaveInitiative() {
  const invalidate = useInvalidateInitiatives()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: initiativesService.saveInitiative,
    onSuccess: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: keys.tags })
    },
  })
}

export function useChangeStatus() {
  const invalidate = useInvalidateInitiatives()
  return useMutation({
    mutationFn: ({ id, status, notes }) =>
      initiativesService.changeInitiativeStatus(id, status, notes),
    onSuccess: invalidate,
  })
}

export function useDeleteInitiative() {
  const invalidate = useInvalidateInitiatives()
  return useMutation({
    mutationFn: initiativesService.deleteInitiative,
    onSuccess: invalidate,
  })
}

function useInvalidateCategories() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: keys.stats })
  }
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({ mutationFn: categoriesService.createCategory, onSuccess: invalidate })
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: ({ id, values }) => categoriesService.updateCategory(id, values),
    onSuccess: invalidate,
  })
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({ mutationFn: categoriesService.deleteCategory, onSuccess: invalidate })
}

export function useReorderCategories() {
  const invalidate = useInvalidateCategories()
  return useMutation({ mutationFn: categoriesService.reorderCategories, onSuccess: invalidate })
}

export function useCreatePerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: taxonomyService.createPerson,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }) => adminService.updateProfileRole(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.profiles }),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminService.createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.profiles }),
  })
}
