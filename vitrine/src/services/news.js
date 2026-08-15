import { friendlyError, requireSupabase } from '@/lib/supabase'
import { PAGE_SIZE, STATUS } from '@/lib/constants'
import { normalizeGallery } from '@/lib/news-content'
import { normalizeSearch } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Projeções                                                                   */
/* -------------------------------------------------------------------------- */

/** Colunas do card. Sem `content`: a listagem não carrega o corpo da notícia. */
const CARD_COLUMNS = `
  id, name, kicker, slug, excerpt, cover_image, status, published_at, created_at, updated_at
`

const DETAIL_COLUMNS = `
  id, name, kicker, slug, excerpt, content,
  cover_image, cover_caption, cover_credit, gallery, status,
  created_by, created_at, updated_at, published_at, content_updated_at,
  author:profiles!created_by(id, name, avatar_url)
`

const ADMIN_LIST_COLUMNS = `
  id, name, slug, status, cover_image, updated_at, created_at, published_at, created_by,
  author:profiles!created_by(id, name)
`

function unwrap({ data, error }) {
  if (error) throw new Error(friendlyError(error))
  return data
}

/**
 * A migration 0006 ainda não rodou neste projeto Supabase.
 *
 * Nas telas públicas isso vira "nada publicado ainda": o visitante não tem o
 * que fazer com "Could not find the table 'public.news' in the schema cache", e
 * a página inteira não deveria cair por causa de uma migration pendente. As
 * consultas do painel NÃO usam este recuo de propósito — quem opera precisa ver
 * o erro de verdade para saber que falta aplicar a migration.
 *
 * Coluna faltando NÃO conta como tabela faltando. Com a 0009 pendente, a 0006
 * já aplicada e notícias publicadas no ar, tratar `column news.gallery does not
 * exist` como "nada publicado" esconderia conteúdo que existe — o visitante
 * veria a listagem vazia sem que ninguém percebesse. Melhor deixar o erro subir.
 */
function isMissingTable(error) {
  if (error?.code === '42P01' || error?.code === 'PGRST205') return true

  const message = error?.message ?? ''
  if (/\bcolumn\b/i.test(message)) return false
  return /does not exist|schema cache/i.test(message)
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
 * Listagem paginada de /noticias.
 *
 * A busca textual usa o índice GIN sobre `search_vector`, que reúne título,
 * resumo e corpo. O termo é desacentuado do mesmo modo que na indexação, para
 * os dois lados casarem.
 */
export async function searchNews({ q = '', sort = 'recent', page = 1, pageSize = PAGE_SIZE } = {}) {
  const supabase = requireSupabase()
  const term = normalizeSearch(q)

  let query = supabase
    .from('news')
    .select(CARD_COLUMNS, { count: 'exact' })
    .eq('status', STATUS.PUBLISHED)

  if (term) {
    query = query.textSearch('search_vector', term, { type: 'websearch', config: 'portuguese' })
  }

  const from = (page - 1) * pageSize
  query = applySort(query, sort).range(from, from + pageSize - 1)

  const { data, error, count } = await query
  const empty = { items: [], total: 0, page, pageSize, pageCount: 1 }

  if (error) {
    if (isMissingTable(error)) return empty
    throw new Error(friendlyError(error))
  }

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  }
}

/** Últimas notícias — alimenta a seção da home. */
export async function listLatestNews(limit = 3) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('news')
    .select(CARD_COLUMNS)
    .eq('status', STATUS.PUBLISHED)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    if (isMissingTable(error)) return []
    throw new Error(friendlyError(error))
  }
  return data ?? []
}

export async function getPublishedNewsBySlug(slug) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('news')
    .select(DETAIL_COLUMNS)
    .eq('slug', slug)
    .eq('status', STATUS.PUBLISHED)
    .maybeSingle()

  if (error) {
    // Sem a tabela, o resultado é o mesmo de um slug inexistente: a página de
    // detalhe mostra "notícia não encontrada", que é a verdade para o visitante.
    if (isMissingTable(error)) return null
    throw new Error(friendlyError(error))
  }
  return data
}

/** Outras notícias, para o rodapé da página de detalhes. */
export async function listRelatedNews(excludeId, limit = 3) {
  const supabase = requireSupabase()
  let query = supabase
    .from('news')
    .select(CARD_COLUMNS)
    .eq('status', STATUS.PUBLISHED)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query
  if (error) {
    if (isMissingTable(error)) return []
    throw new Error(friendlyError(error))
  }
  return data ?? []
}

/* -------------------------------------------------------------------------- */
/* Área administrativa                                                         */
/* -------------------------------------------------------------------------- */

export async function listNewsAdmin({
  q = '',
  status = null,
  createdBy = null,
  sort = 'recent',
  page = 1,
  pageSize = 20,
} = {}) {
  const supabase = requireSupabase()
  const term = normalizeSearch(q)

  let query = supabase.from('news').select(ADMIN_LIST_COLUMNS, { count: 'exact' })

  if (term) {
    query = query.textSearch('search_vector', term, { type: 'websearch', config: 'portuguese' })
  }
  if (status) query = query.eq('status', status)
  if (createdBy) query = query.eq('created_by', createdBy)

  const from = (page - 1) * pageSize
  query = sort === 'recent' ? query.order('updated_at', { ascending: false }) : applySort(query, sort)
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

export async function getNewsById(id) {
  const supabase = requireSupabase()
  return unwrap(await supabase.from('news').select(DETAIL_COLUMNS).eq('id', id).maybeSingle())
}

/** Fila de revisão. */
export async function listPendingNews(limit = 20) {
  const supabase = requireSupabase()
  return unwrap(
    await supabase
      .from('news')
      .select(ADMIN_LIST_COLUMNS)
      .eq('status', STATUS.PENDING_REVIEW)
      .order('updated_at', { ascending: true })
      .limit(limit),
  )
}

export async function getNewsReviewHistory(newsId) {
  const supabase = requireSupabase()
  return unwrap(
    await supabase
      .from('news_reviews')
      .select('id, from_status, to_status, notes, created_at, reviewer:profiles(id, name)')
      .eq('news_id', newsId)
      .order('created_at', { ascending: false }),
  )
}

/** Slugs publicados — usado para gerar o sitemap. */
export async function listPublishedNewsSlugs() {
  const supabase = requireSupabase()
  return unwrap(
    await supabase
      .from('news')
      .select('slug, updated_at')
      .eq('status', STATUS.PUBLISHED)
      .order('updated_at', { ascending: false }),
  )
}

/* -------------------------------------------------------------------------- */
/* Escrita                                                                     */
/* -------------------------------------------------------------------------- */

const WRITABLE_FIELDS = [
  'name',
  'kicker',
  'slug',
  'excerpt',
  'content',
  'cover_image',
  'cover_caption',
  'cover_credit',
  'gallery',
]

/**
 * Mantém apenas colunas reais da tabela e normaliza strings vazias em null.
 *
 * `gallery` é `not null` no banco: a galeria vazia vai como `[]`, nunca como
 * null. Por isso o array é tratado antes do recuo `?? null`.
 */
function toRow(values) {
  const row = {}
  for (const field of WRITABLE_FIELDS) {
    if (!(field in values)) continue
    const value = values[field]
    if (field === 'gallery') {
      row[field] = normalizeGallery(value).map(({ url, caption, credit }) => ({
        url,
        // Campo em branco não vai como string vazia: some do objeto e a página
        // pública decide o que mostrar com um `?` só.
        ...(caption ? { caption } : {}),
        ...(credit ? { credit } : {}),
      }))
    } else {
      row[field] = typeof value === 'string' ? value.trim() || null : (value ?? null)
    }
  }
  return row
}

/**
 * Cria ou atualiza uma notícia.
 *
 * Diferente de `saveInitiative`, aqui é uma requisição só: a notícia não tem
 * tabelas filhas para sincronizar, então a gravação é atômica de fato — sem a
 * ressalva de transação distribuída que vale para as iniciativas.
 */
export async function saveNews({ id, values }) {
  const supabase = requireSupabase()
  const row = toRow(values)

  if (id) {
    return unwrap(await supabase.from('news').update(row).eq('id', id).select('id, slug').single())
  }
  return unwrap(await supabase.from('news').insert(row).select('id, slug').single())
}

/**
 * Muda o status pela função do banco, que valida a transição, checa o papel e
 * grava a observação no histórico — tudo em uma transação só.
 */
export async function changeNewsStatus(id, status, notes = null) {
  const supabase = requireSupabase()
  const { error } = await supabase.rpc('set_news_status', {
    p_id: id,
    p_status: status,
    p_notes: notes,
  })
  if (error) throw new Error(friendlyError(error))
}

export async function deleteNews(id) {
  const supabase = requireSupabase()
  const { error } = await supabase.from('news').delete().eq('id', id)
  if (error) throw new Error(friendlyError(error))
}
