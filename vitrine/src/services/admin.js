import { friendlyError, requireSupabase } from '@/lib/supabase'

function unwrap({ data, error }) {
  if (error) throw new Error(friendlyError(error))
  return data
}

/* -------------------------------- perfis --------------------------------- */

const PROFILE_COLUMNS = 'id, name, email, role, avatar_url, is_active, created_at'

export async function listProfiles() {
  const supabase = requireSupabase()
  return unwrap(await supabase.from('profiles').select(PROFILE_COLUMNS).order('name'))
}

/**
 * Alterar papel ou situação é restrito a administradores — a regra é aplicada
 * pelo trigger `guard_profile_changes`, não só pela interface.
 */
export async function updateProfileRole(id, { role, is_active: isActive }) {
  const supabase = requireSupabase()
  const payload = {}
  if (role !== undefined) payload.role = role
  if (isActive !== undefined) payload.is_active = isActive

  return unwrap(
    await supabase.from('profiles').update(payload).eq('id', id).select(PROFILE_COLUMNS).single(),
  )
}

/**
 * Cria uma conta de acesso.
 *
 * Vai pela Edge Function `criar-usuario` e não pelo cliente: a API de
 * administração do Auth exige a `service_role key`, que ignora todo o RLS e por
 * isso nunca pode estar no navegador. O `invoke` anexa o JWT da sessão
 * automaticamente, e a função confirma no banco que quem pediu é admin ativo.
 */
export async function createUser({ name, email, password, role }) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.functions.invoke('criar-usuario', {
    body: { name, email, password, role },
  })

  if (error) {
    /*
     * O supabase-js embrulha respostas 4xx/5xx num FunctionsHttpError cuja
     * mensagem é sempre genérica ("non-2xx status code"). O motivo real vem no
     * corpo, que precisa ser lido do `context` — sem isto o administrador veria
     * "erro" em vez de "já existe uma conta com este e-mail".
     */
    let message = error.message
    try {
      const body = await error.context?.json()
      if (body?.error) message = body.error
    } catch {
      // Resposta sem corpo JSON (timeout, função não publicada): fica a genérica.
    }

    if (/failed to send|fetch|not found/i.test(message)) {
      message =
        'A função criar-usuario não respondeu. Verifique se ela foi publicada no Supabase (supabase functions deploy criar-usuario).'
    }
    throw new Error(message)
  }

  return data
}

export async function updateOwnProfile(id, { name, avatar_url: avatarUrl }) {
  const supabase = requireSupabase()
  const payload = {}
  if (name !== undefined) payload.name = name.trim()
  if (avatarUrl !== undefined) payload.avatar_url = avatarUrl

  return unwrap(
    await supabase.from('profiles').update(payload).eq('id', id).select(PROFILE_COLUMNS).single(),
  )
}

/* ------------------------------- dashboard -------------------------------- */

/** Métricas do dashboard em uma única chamada (ver `dashboard_stats()` no SQL). */
export async function getDashboardStats() {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('dashboard_stats')
  if (error) throw new Error(friendlyError(error))
  return {
    total: data?.total ?? 0,
    byStatus: data?.by_status ?? {},
    categories: data?.categories ?? 0,
    people: data?.people ?? 0,
    byCategory: data?.by_category ?? [],
  }
}

export async function listActivity(limit = 20) {
  const supabase = requireSupabase()
  return unwrap(
    await supabase
      .from('activity_log')
      .select('id, actor_name, action, entity_type, entity_id, entity_name, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
  )
}
