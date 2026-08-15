import { friendlyError, requireSupabase } from '@/lib/supabase'
import { STATUS } from '@/lib/constants'

const COLUMNS = 'id, name, slug, description, icon, image_url, position, created_at, updated_at'

function unwrap({ data, error }) {
  if (error) throw new Error(friendlyError(error))
  return data
}

/** Todas as categorias, na ordem definida pelo administrador. */
export async function listCategories() {
  const supabase = requireSupabase()
  return unwrap(
    await supabase.from('categories').select(COLUMNS).order('position').order('name'),
  )
}

/**
 * Categorias com a contagem de iniciativas publicadas — alimenta a home.
 * O count vem embutido na própria consulta, evitando N+1.
 */
export async function listCategoriesWithCounts() {
  const supabase = requireSupabase()
  const data = unwrap(
    await supabase
      .from('categories')
      .select(`${COLUMNS}, initiatives(count)`)
      .eq('initiatives.status', STATUS.PUBLISHED)
      .order('position')
      .order('name'),
  )

  return (data ?? []).map(({ initiatives, ...category }) => ({
    ...category,
    published_count: initiatives?.[0]?.count ?? 0,
  }))
}

export async function getCategoryBySlug(slug) {
  const supabase = requireSupabase()
  return unwrap(
    await supabase.from('categories').select(COLUMNS).eq('slug', slug).maybeSingle(),
  )
}

export async function createCategory(payload) {
  const supabase = requireSupabase()
  return unwrap(await supabase.from('categories').insert(payload).select(COLUMNS).single())
}

export async function updateCategory(id, payload) {
  const supabase = requireSupabase()
  return unwrap(
    await supabase.from('categories').update(payload).eq('id', id).select(COLUMNS).single(),
  )
}

export async function deleteCategory(id) {
  const supabase = requireSupabase()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) {
    // FK restritiva: a categoria ainda tem iniciativas associadas.
    if (/foreign key/i.test(error.message)) {
      throw new Error(
        'Esta categoria possui iniciativas vinculadas. Mova-as para outra categoria antes de excluir.',
      )
    }
    throw new Error(friendlyError(error))
  }
}

/** Persiste a nova ordem após arrastar/reordenar na tela de categorias. */
export async function reorderCategories(orderedIds) {
  const supabase = requireSupabase()
  const updates = orderedIds.map((id, index) =>
    supabase.from('categories').update({ position: index + 1 }).eq('id', id),
  )
  const results = await Promise.all(updates)
  const failed = results.find((result) => result.error)
  if (failed) throw new Error(friendlyError(failed.error))
}
