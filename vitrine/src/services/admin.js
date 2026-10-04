import { api } from '@/lib/api'

/* -------------------------------- perfis --------------------------------- */

export async function listProfiles() {
  return api.get('/admin/profiles')
}

/**
 * Alterar papel ou situação é restrito a administradores — a regra é aplicada
 * pelo gatilho `guard_profile_changes`, não só pela interface.
 */
export async function updateProfileRole(id, { role, is_active: isActive }) {
  const payload = {}
  if (role !== undefined) payload.role = role
  if (isActive !== undefined) payload.is_active = isActive
  return api.patch(`/admin/profiles/${id}`, payload)
}

/**
 * Cria uma conta de acesso já ativa, com o papel escolhido. O servidor
 * confere no banco que quem pediu é administrador ativo, e a conta e o papel
 * entram numa transação só.
 */
export async function createUser({ name, email, password, role }) {
  return api.post('/admin/users', { name, email, password, role })
}

/**
 * Define uma senha nova para outra conta — o caminho quando a instalação não
 * tem e-mail configurado. As sessões abertas da pessoa são encerradas.
 */
export async function setUserPassword(id, password) {
  await api.post(`/admin/users/${id}/password`, { password })
}

export async function updateOwnProfile(id, { name, avatar_url: avatarUrl }) {
  const payload = {}
  if (name !== undefined) payload.name = name.trim()
  if (avatarUrl !== undefined) payload.avatar_url = avatarUrl
  return api.patch(`/admin/profiles/${id}`, payload)
}

/* ------------------------------- dashboard -------------------------------- */

/** Métricas do dashboard em uma única chamada (ver `dashboard_stats()` no SQL). */
export async function getDashboardStats() {
  return api.get('/admin/dashboard/stats')
}

export async function listActivity(limit = 20) {
  return api.get('/admin/activity', { limit })
}

/** `actorId` que filtra as linhas sem autor: seed, SQL direto no banco. */
export const SYSTEM_ACTOR = 'system'

/**
 * Converte o `AAAA-MM-DD` de um `<input type="date">` na meia-noite LOCAL
 * daquele dia. `new Date('2026-10-03')` seria meia-noite UTC — no Brasil, 21h
 * do dia anterior, e o filtro "a partir de 3/10" traria a noite do dia 2.
 */
function localMidnight(value, addDays = 0) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day + addDays).toISOString()
}

/** Filtros do log no formato da API. "Até 3/10" inclui o dia 3 inteiro. */
function activityQuery({ q, action, entityType, actorId, from, to } = {}) {
  return {
    q: q?.trim(),
    action,
    entityType,
    actorId,
    from: from ? localMidnight(from) : undefined,
    to: to ? localMidnight(to, 1) : undefined,
  }
}

/** Log de atividade paginado e filtrado — a tela `/admin/atividade`. */
export async function listActivityAdmin({ page = 1, pageSize = 25, ...filters } = {}) {
  return api.get('/admin/activity/log', { ...activityQuery(filters), page, pageSize })
}

export const ACTIVITY_EXPORT_LIMIT = 20000

/** Todas as linhas que casam com os filtros, para a planilha — até o teto. */
export async function listActivityForExport(filters = {}) {
  return api.get('/admin/activity/export', activityQuery(filters))
}
