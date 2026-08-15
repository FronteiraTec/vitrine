import { friendlyError, requireSupabase } from '@/lib/supabase'
import { escapeLike, slugify } from '@/lib/utils'

function unwrap({ data, error }) {
  if (error) throw new Error(friendlyError(error))
  return data
}

/* --------------------------------- tags ---------------------------------- */

export async function listTags() {
  const supabase = requireSupabase()
  return unwrap(await supabase.from('tags').select('id, name, slug').order('name'))
}

/**
 * Resolve uma lista de nomes de tags em ids, criando as que ainda não existem.
 * Assim o editor digita livremente sem precisar cadastrar tags antes.
 */
export async function resolveTagIds(names) {
  const supabase = requireSupabase()
  const cleaned = [...new Set((names ?? []).map((name) => name.trim()).filter(Boolean))]
  if (cleaned.length === 0) return []

  const slugs = cleaned.map(slugify)
  const existing = unwrap(await supabase.from('tags').select('id, name, slug').in('slug', slugs))
  const bySlug = new Map((existing ?? []).map((tag) => [tag.slug, tag]))

  const missing = cleaned.filter((name) => !bySlug.has(slugify(name)))
  if (missing.length) {
    const created = unwrap(
      await supabase
        .from('tags')
        .insert(missing.map((name) => ({ name, slug: slugify(name) })))
        .select('id, name, slug'),
    )
    for (const tag of created ?? []) bySlug.set(tag.slug, tag)
  }

  return slugs.map((slug) => bySlug.get(slug)?.id).filter(Boolean)
}

export async function deleteTag(id) {
  const supabase = requireSupabase()
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw new Error(friendlyError(error))
}

/* -------------------------------- pessoas -------------------------------- */

const PERSON_COLUMNS = 'id, name, email, role, photo_url, created_at'

export async function listPeople(search = '') {
  const supabase = requireSupabase()
  let query = supabase.from('people').select(PERSON_COLUMNS).order('name').limit(200)
  // `escapeLike` neutraliza os curingas do PostgREST: quem digita "50%" está
  // buscando esse texto, não pedindo um padrão.
  const term = escapeLike(search)
  if (term) query = query.ilike('name', `%${term}%`)
  return unwrap(await query)
}

export async function createPerson(payload) {
  const supabase = requireSupabase()
  return unwrap(await supabase.from('people').insert(payload).select(PERSON_COLUMNS).single())
}

export async function updatePerson(id, payload) {
  const supabase = requireSupabase()
  return unwrap(
    await supabase.from('people').update(payload).eq('id', id).select(PERSON_COLUMNS).single(),
  )
}

export async function deletePerson(id) {
  const supabase = requireSupabase()
  const { error } = await supabase.from('people').delete().eq('id', id)
  if (error) throw new Error(friendlyError(error))
}

/* ------------------------------- áreas ----------------------------------- */

/**
 * Áreas em uso no catálogo publicado. Ficam em `initiatives.areas` (text[]) em
 * vez de uma tabela própria: são um vocabulário curto e estável, e essa escolha
 * evita mais um join em todas as consultas da vitrine.
 */
export async function listUsedAreas() {
  const supabase = requireSupabase()
  const data = unwrap(
    await supabase.from('initiatives').select('areas').eq('status', 'published'),
  )
  const counts = new Map()
  for (const row of data ?? []) {
    for (const area of row.areas ?? []) {
      counts.set(area, (counts.get(area) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))
}
