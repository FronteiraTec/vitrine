import { friendlyError, requireSupabase } from '@/lib/supabase'
import { PAGE_SIZE, STATUS } from '@/lib/constants'
import { normalizeSearch } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Projeções                                                                   */
/* -------------------------------------------------------------------------- */

/** Colunas do card. Deliberadamente enxuto: a listagem não carrega o texto longo. */
const CARD_COLUMNS = `
  id, name, slug, short_description, cover_image, areas, location, city, state,
  status, published_at, created_at, updated_at,
  category:categories(id, name, slug, icon),
  tags:tags(id, name, slug)
`

const DETAIL_COLUMNS = `
  id, name, slug, short_description, description, cover_image, gallery, areas,
  status, location, campus, city, state, email, phone, website,
  category_id, created_by, created_at, updated_at, published_at,
  category:categories(id, name, slug, icon, description),
  tags:tags(id, name, slug),
  team:initiative_people(role, position, person:people(id, name, email, role, photo_url)),
  links:initiative_links(id, label, url, type, position)
`

const ADMIN_LIST_COLUMNS = `
  id, name, slug, status, cover_image, updated_at, created_at, published_at, created_by,
  category:categories(id, name, slug),
  author:profiles!created_by(id, name)
`

function unwrap({ data, error }) {
  if (error) throw new Error(friendlyError(error))
  return data
}

/** Ordena a equipe e os links por `position` — o PostgREST não garante ordem em embeds. */
function normalizeDetail(initiative) {
  if (!initiative) return null
  return {
    ...initiative,
    team: [...(initiative.team ?? [])].sort((a, b) => a.position - b.position),
    links: [...(initiative.links ?? [])].sort((a, b) => a.position - b.position),
    tags: [...(initiative.tags ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  }
}

function applySort(query, sort) {
  switch (sort) {
    case 'oldest':
      return query
        .order('published_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
    case 'name_asc':
      return query.order('name', { ascending: true })
    case 'name_desc':
      return query.order('name', { ascending: false })
    case 'recent':
    default:
      return query
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
  }
}

/* -------------------------------------------------------------------------- */
/* Vitrine pública                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Busca paginada da vitrine.
 *
 * A busca textual usa o índice GIN sobre `search_vector`, que já reúne nome,
 * descrições, categoria, tags, áreas, pessoas e localização. O termo é
 * desacentuado do mesmo modo que na indexação, para os dois lados casarem.
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
  const supabase = requireSupabase()
  const term = normalizeSearch(q)

  let query = supabase
    .from('initiatives')
    // `initiative_tags!inner` filtra sem recortar o embed `tags`, que continua
    // completo para exibição no card.
    .select(tagIds.length ? `${CARD_COLUMNS}, initiative_tags!inner(tag_id)` : CARD_COLUMNS, {
      count: 'exact',
    })
    .eq('status', STATUS.PUBLISHED)

  if (term) {
    query = query.textSearch('search_vector', term, { type: 'websearch', config: 'portuguese' })
  }
  if (categoryIds.length) query = query.in('category_id', categoryIds)
  if (areas.length) query = query.overlaps('areas', areas)
  if (tagIds.length) query = query.in('initiative_tags.tag_id', tagIds)

  const from = (page - 1) * pageSize
  query = applySort(query, sort).range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw new Error(friendlyError(error))

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  }
}

/** Destaques da home: as publicações mais recentes. */
export async function listFeaturedInitiatives(limit = 6) {
  const supabase = requireSupabase()
  return unwrap(
    await supabase
      .from('initiatives')
      .select(CARD_COLUMNS)
      .eq('status', STATUS.PUBLISHED)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit),
  )
}

export async function getPublishedInitiativeBySlug(slug) {
  const supabase = requireSupabase()
  const data = unwrap(
    await supabase
      .from('initiatives')
      .select(DETAIL_COLUMNS)
      .eq('slug', slug)
      .eq('status', STATUS.PUBLISHED)
      .maybeSingle(),
  )
  return normalizeDetail(data)
}

/** Outras iniciativas da mesma categoria, para o rodapé da página de detalhes. */
export async function listRelatedInitiatives(categoryId, excludeId, limit = 3) {
  if (!categoryId) return []
  const supabase = requireSupabase()
  return unwrap(
    await supabase
      .from('initiatives')
      .select(CARD_COLUMNS)
      .eq('status', STATUS.PUBLISHED)
      .eq('category_id', categoryId)
      .neq('id', excludeId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit),
  )
}

/** Slugs publicados — usado para gerar o sitemap. */
export async function listPublishedSlugs() {
  const supabase = requireSupabase()
  return unwrap(
    await supabase
      .from('initiatives')
      .select('slug, updated_at')
      .eq('status', STATUS.PUBLISHED)
      .order('updated_at', { ascending: false }),
  )
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
  const supabase = requireSupabase()
  const term = normalizeSearch(q)

  let query = supabase.from('initiatives').select(ADMIN_LIST_COLUMNS, { count: 'exact' })

  if (term) {
    query = query.textSearch('search_vector', term, { type: 'websearch', config: 'portuguese' })
  }
  if (status) query = query.eq('status', status)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (createdBy) query = query.eq('created_by', createdBy)

  const from = (page - 1) * pageSize
  query =
    sort === 'recent'
      ? query.order('updated_at', { ascending: false })
      : applySort(query, sort)
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw new Error(friendlyError(error))

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  }
}

export async function getInitiativeById(id) {
  const supabase = requireSupabase()
  const data = unwrap(
    await supabase.from('initiatives').select(DETAIL_COLUMNS).eq('id', id).maybeSingle(),
  )
  return normalizeDetail(data)
}

/** Fila de revisão do dashboard. */
export async function listPendingReview(limit = 20) {
  const supabase = requireSupabase()
  return unwrap(
    await supabase
      .from('initiatives')
      .select(ADMIN_LIST_COLUMNS)
      .eq('status', STATUS.PENDING_REVIEW)
      .order('updated_at', { ascending: true })
      .limit(limit),
  )
}

export async function listRecentInitiatives(limit = 5) {
  const supabase = requireSupabase()
  return unwrap(
    await supabase
      .from('initiatives')
      .select(ADMIN_LIST_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit),
  )
}

export async function getReviewHistory(initiativeId) {
  const supabase = requireSupabase()
  return unwrap(
    await supabase
      .from('initiative_reviews')
      .select('id, from_status, to_status, notes, created_at, reviewer:profiles(id, name)')
      .eq('initiative_id', initiativeId)
      .order('created_at', { ascending: false }),
  )
}

/* -------------------------------------------------------------------------- */
/* Escrita                                                                     */
/* -------------------------------------------------------------------------- */

const WRITABLE_FIELDS = [
  'category_id',
  'name',
  'slug',
  'short_description',
  'description',
  'cover_image',
  'gallery',
  'areas',
  'location',
  'campus',
  'city',
  'state',
  'email',
  'phone',
  'website',
]

/** Mantém apenas colunas reais da tabela e normaliza strings vazias em null. */
function toRow(values) {
  const row = {}
  for (const field of WRITABLE_FIELDS) {
    if (!(field in values)) continue
    const value = values[field]
    if (Array.isArray(value)) {
      row[field] = value
    } else if (typeof value === 'string') {
      row[field] = value.trim() === '' ? null : value.trim()
    } else {
      row[field] = value ?? null
    }
  }
  return row
}

/**
 * Sincroniza uma tabela de relacionamento: remove o que saiu, insere o que
 * entrou. Mais barato e menos destrutivo que apagar tudo e recriar.
 */
async function syncTags(supabase, initiativeId, tagIds) {
  const current = unwrap(
    await supabase.from('initiative_tags').select('tag_id').eq('initiative_id', initiativeId),
  )
  const currentIds = new Set((current ?? []).map((row) => row.tag_id))
  const nextIds = new Set(tagIds)

  const toRemove = [...currentIds].filter((id) => !nextIds.has(id))
  const toAdd = [...nextIds].filter((id) => !currentIds.has(id))

  if (toRemove.length) {
    const { error } = await supabase
      .from('initiative_tags')
      .delete()
      .eq('initiative_id', initiativeId)
      .in('tag_id', toRemove)
    if (error) throw new Error(friendlyError(error))
  }
  if (toAdd.length) {
    const { error } = await supabase
      .from('initiative_tags')
      .insert(toAdd.map((tagId) => ({ initiative_id: initiativeId, tag_id: tagId })))
    if (error) throw new Error(friendlyError(error))
  }
}

async function syncTeam(supabase, initiativeId, team) {
  const { error: deleteError } = await supabase
    .from('initiative_people')
    .delete()
    .eq('initiative_id', initiativeId)
  if (deleteError) throw new Error(friendlyError(deleteError))

  const rows = (team ?? [])
    .filter((member) => member.person_id)
    .map((member, index) => ({
      initiative_id: initiativeId,
      person_id: member.person_id,
      role: member.role?.trim() || null,
      position: index,
    }))

  if (rows.length) {
    const { error } = await supabase.from('initiative_people').insert(rows)
    if (error) throw new Error(friendlyError(error))
  }
}

async function syncLinks(supabase, initiativeId, links) {
  const { error: deleteError } = await supabase
    .from('initiative_links')
    .delete()
    .eq('initiative_id', initiativeId)
  if (deleteError) throw new Error(friendlyError(deleteError))

  const rows = (links ?? [])
    .filter((link) => link.url?.trim() && link.label?.trim())
    .map((link, index) => ({
      initiative_id: initiativeId,
      label: link.label.trim(),
      url: link.url.trim(),
      type: link.type || 'other',
      position: index,
    }))

  if (rows.length) {
    const { error } = await supabase.from('initiative_links').insert(rows)
    if (error) throw new Error(friendlyError(error))
  }
}

/**
 * Cria ou atualiza uma iniciativa junto com tags, equipe e links.
 *
 * O PostgREST não expõe transações de múltiplas requisições: a iniciativa é
 * gravada primeiro e os relacionamentos em seguida. Se um relacionamento
 * falhar, o registro principal permanece salvo e o usuário recebe o erro —
 * comportamento aceitável porque nada disso é destrutivo e o formulário
 * continua carregado com os dados.
 */
export async function saveInitiative({ id, values, tagIds = [], team = [], links = [] }) {
  const supabase = requireSupabase()
  const row = toRow(values)

  let initiative
  if (id) {
    initiative = unwrap(
      await supabase.from('initiatives').update(row).eq('id', id).select('id, slug').single(),
    )
  } else {
    initiative = unwrap(
      await supabase.from('initiatives').insert(row).select('id, slug').single(),
    )
  }

  await syncTags(supabase, initiative.id, tagIds)
  await syncTeam(supabase, initiative.id, team)
  await syncLinks(supabase, initiative.id, links)

  return initiative
}

/**
 * Muda o status pela função do banco, que valida a transição, checa o papel
 * e grava a observação no histórico — tudo em uma transação só.
 */
export async function changeInitiativeStatus(id, status, notes = null) {
  const supabase = requireSupabase()
  const { error } = await supabase.rpc('set_initiative_status', {
    p_id: id,
    p_status: status,
    p_notes: notes,
  })
  if (error) throw new Error(friendlyError(error))
}

export async function deleteInitiative(id) {
  const supabase = requireSupabase()
  const { error } = await supabase.from('initiatives').delete().eq('id', id)
  if (error) throw new Error(friendlyError(error))
}
