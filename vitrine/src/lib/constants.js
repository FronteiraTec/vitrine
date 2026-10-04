/**
 * Vocabulário compartilhado entre banco, admin e vitrine pública.
 * Os valores precisam espelhar os enums definidos em db/migrations.
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
    className: 'badge-status-draft',
    dot: 'dot-status-draft',
    fill: 'var(--status-draft)',
  },
  [STATUS.PENDING_REVIEW]: {
    label: 'Em revisão',
    description: 'Aguardando avaliação de um revisor.',
    className: 'badge-status-review',
    dot: 'dot-status-review',
    fill: 'var(--status-review)',
  },
  [STATUS.PUBLISHED]: {
    label: 'Publicado',
    description: 'Visível na vitrine pública.',
    className: 'badge-status-published',
    dot: 'dot-status-published',
    fill: 'var(--status-published)',
  },
  [STATUS.REJECTED]: {
    label: 'Rejeitado',
    description: 'Devolvido com observações do revisor.',
    className: 'badge-status-rejected',
    dot: 'dot-status-rejected',
    fill: 'var(--status-rejected)',
  },
  [STATUS.ARCHIVED]: {
    label: 'Arquivado',
    description: 'Removido da vitrine, mantido no histórico.',
    className: 'badge-status-archived',
    dot: 'dot-status-archived',
    fill: 'var(--status-archived)',
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

/**
 * Vocabulário do `activity_log`. As chaves espelham o que o trigger
 * `log_activity()` grava: `action` é a operação, `entity_type` é o nome da
 * tabela (`tg_table_name`). `verb` e `article` montam a frase da timeline do
 * dashboard; `label` é a coluna da tela de atividade e da planilha exportada.
 */
export const ACTIVITY_ACTION_META = {
  created: { label: 'Criação', verb: 'criou' },
  updated: { label: 'Edição', verb: 'editou' },
  status_changed: { label: 'Mudança de status', verb: 'alterou o status de' },
  deleted: { label: 'Exclusão', verb: 'excluiu' },
}

export const ACTIVITY_ENTITY_META = {
  initiatives: { label: 'Iniciativa', article: 'a iniciativa', adminPath: '/admin/iniciativas' },
  news: { label: 'Notícia', article: 'a notícia', adminPath: '/admin/noticias' },
  categories: { label: 'Categoria', article: 'a categoria' },
}

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
export const ACTIVITY_PAGE_SIZE = 25

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'name_asc', label: 'Nome (A–Z)' },
  { value: 'name_desc', label: 'Nome (Z–A)' },
]

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
