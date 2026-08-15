/**
 * Vocabulário compartilhado entre banco, admin e vitrine pública.
 * Os valores precisam espelhar os enums definidos em supabase/migrations.
 */

export const STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
}

export const STATUS_META = {
  [STATUS.DRAFT]: {
    label: 'Rascunho',
    description: 'Ainda em elaboração, visível apenas para a equipe.',
    className: 'bg-status-draft-bg text-status-draft-ink ring-status-draft/20',
    dot: 'bg-status-draft',
    fill: 'var(--color-status-draft)',
  },
  [STATUS.PENDING_REVIEW]: {
    label: 'Em revisão',
    description: 'Aguardando avaliação de um revisor.',
    className: 'bg-status-review-bg text-status-review-ink ring-status-review/30',
    dot: 'bg-status-review',
    fill: 'var(--color-status-review)',
  },
  [STATUS.PUBLISHED]: {
    label: 'Publicado',
    description: 'Visível na vitrine pública.',
    className: 'bg-status-published-bg text-status-published-ink ring-status-published/25',
    dot: 'bg-status-published',
    fill: 'var(--color-status-published)',
  },
  [STATUS.REJECTED]: {
    label: 'Rejeitado',
    description: 'Devolvido com observações do revisor.',
    className: 'bg-status-rejected-bg text-status-rejected-ink ring-status-rejected/25',
    dot: 'bg-status-rejected',
    fill: 'var(--color-status-rejected)',
  },
  [STATUS.ARCHIVED]: {
    label: 'Arquivado',
    description: 'Removido da vitrine, mantido no histórico.',
    className: 'bg-status-archived-bg text-status-archived-ink ring-status-archived/25',
    dot: 'bg-status-archived',
    fill: 'var(--color-status-archived)',
  },
}

/**
 * Ordem canônica dos status. É também a ordem dos segmentos no medidor do
 * dashboard — a paleta foi validada nesta sequência de vizinhos.
 */
export const STATUS_ORDER = [
  STATUS.PUBLISHED,
  STATUS.PENDING_REVIEW,
  STATUS.DRAFT,
  STATUS.REJECTED,
  STATUS.ARCHIVED,
]

/**
 * Transições permitidas. É a mesma máquina de estados aplicada no banco
 * (trigger `enforce_initiative_transition`), replicada aqui apenas para
 * decidir quais botões mostrar.
 */
export const STATUS_TRANSITIONS = {
  [STATUS.DRAFT]: [STATUS.PENDING_REVIEW, STATUS.PUBLISHED, STATUS.ARCHIVED],
  [STATUS.PENDING_REVIEW]: [STATUS.PUBLISHED, STATUS.REJECTED, STATUS.DRAFT],
  [STATUS.PUBLISHED]: [STATUS.ARCHIVED, STATUS.DRAFT],
  [STATUS.REJECTED]: [STATUS.DRAFT],
  [STATUS.ARCHIVED]: [STATUS.DRAFT, STATUS.PUBLISHED],
}

export const ROLE = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  REVIEWER: 'reviewer',
}

export const ROLE_META = {
  [ROLE.ADMIN]: {
    label: 'Administrador',
    description: 'Acesso completo: publica, gerencia usuários e categorias.',
  },
  [ROLE.EDITOR]: {
    label: 'Editor',
    description: 'Cria e edita iniciativas e as envia para revisão.',
  },
  [ROLE.REVIEWER]: {
    label: 'Revisor',
    description: 'Analisa a fila de revisão, aprovando ou rejeitando.',
  },
}

/** Ações do workflow que exigem papel de revisor ou administrador. */
export const REVIEW_STATUSES = [STATUS.PUBLISHED, STATUS.REJECTED]

export const AREAS = [
  'Tecnologia',
  'Engenharia',
  'Saúde',
  'Gestão',
  'Educação',
  'Meio ambiente',
  'Ciências sociais',
  'Design',
]

export const LINK_TYPES = {
  website: { label: 'Website', icon: 'globe' },
  instagram: { label: 'Instagram', icon: 'instagram' },
  linkedin: { label: 'LinkedIn', icon: 'linkedin' },
  youtube: { label: 'YouTube', icon: 'youtube' },
  github: { label: 'GitHub', icon: 'github' },
  facebook: { label: 'Facebook', icon: 'facebook' },
  other: { label: 'Outro', icon: 'link' },
}

export const BUCKETS = {
  INITIATIVES: 'initiative-images',
  AVATARS: 'avatars',
  CATEGORIES: 'category-images',
  SITE: 'site-assets',
  NEWS: 'news-images',
}

export const PAGE_SIZE = 12
export const ADMIN_PAGE_SIZE = 20

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'name_asc', label: 'Nome (A–Z)' },
  { value: 'name_desc', label: 'Nome (Z–A)' },
]

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
