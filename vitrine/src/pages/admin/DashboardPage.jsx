import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  ChartColumn,
  ClipboardCheck,
  FolderTree,
  Plus,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { CategoryBarChart, StatusMeter } from '@/components/admin/charts'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Image } from '@/components/ui/image'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import {
  useActivity,
  useAudience,
  useDashboardStats,
  usePendingReview,
  useRecentInitiatives,
} from '@/hooks/use-queries'
import { CONTENT_TYPE_LABEL } from '@/lib/audience'
import { useAuth } from '@/contexts/AuthContext'
import {
  ACTIVITY_ACTION_META,
  ACTIVITY_ENTITY_META,
  STATUS,
  STATUS_META,
} from '@/lib/constants'
import { cn, formatDate, formatRelative, formatTime } from '@/lib/utils'

/** Cartão de métrica — número em destaque, rótulo abaixo, link opcional. */
function MetricCard({ label, value, hint, icon: Icon, to, loading, accent }) {
  const body = (
    <>
      <div className="d-flex align-items-center justify-content-between gap-2">
        <p className="text-body-secondary mb-0 fs-7 fw-medium">{label}</p>
        <span
          className={cn(
            'd-flex h-fx-8 w-fx-8 align-items-center justify-content-center rounded-2',
            accent ?? 'bg-body-secondary text-body-secondary',
          )}
        >
          <Icon className="icon" aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-fx-9 w-fx-16" />
      ) : (
        <p className="mt-3 mb-0 fs-3 fw-semibold tracking-tight tabular-nums">{value}</p>
      )}
      {hint ? <p className="text-body-secondary mt-1 mb-0 fs-8">{hint}</p> : null}
    </>
  )

  // `bg-body` sai com `!important` e segura o fundo; quem marca o cartão
  // clicável no hover é a sombra de `card-interactive`.
  const className = cn(
    'border bg-body d-block rounded-3 p-3 p-sm-4',
    to && 'list-link card-interactive',
  )

  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

/**
 * Cartão de seção do dashboard. O cabeçalho tem altura mínima de botão, para
 * que cartões lado a lado — um com ação, outro sem — alinhem a primeira linha.
 */
function DashboardSection({ title, action, className, children }) {
  return (
    <section className={cn('border bg-body rounded-3 p-3 p-sm-4', className)}>
      <div className="mb-3 d-flex min-h-fx-8 align-items-center justify-content-between gap-2">
        <h2 className="mb-0 fs-6 fw-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function ActivityTimeline() {
  const { data, isPending, isError } = useActivity(12)

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="d-flex gap-2">
            <Skeleton className="icon-sm rounded-pill" />
            <Skeleton className="h-fx-4 flex-grow-1" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) return <p className="text-body-secondary fs-7">Não foi possível carregar a atividade.</p>

  if (!data?.length) {
    return (
      <EmptyState
        compact
        icon={Activity}
        title="Nenhuma atividade ainda"
        description="As ações da equipe aparecem aqui conforme o catálogo é editado."
      />
    )
  }

  // Agrupa por dia para a timeline ganhar cabeçalhos ("Hoje", "12 de mar.").
  const groups = []
  for (const entry of data) {
    const day = new Date(entry.created_at).toDateString()
    const last = groups[groups.length - 1]
    if (last?.day === day) last.entries.push(entry)
    else groups.push({ day, date: entry.created_at, entries: [entry] })
  }

  const today = new Date().toDateString()

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.day}>
          <p className="text-body-secondary mb-3 fs-8 fw-semibold tracking-wide text-uppercase">
            {group.day === today ? 'Hoje' : formatDate(group.date, { weekday: 'long' })}
          </p>
          <ol className="timeline">
            {group.entries.map((entry) => (
              <li key={entry.id} className="fs-7">
                <p className="text-body-secondary mb-0">
                  <time
                    dateTime={entry.created_at}
                    className="text-body me-2 fw-medium tabular-nums"
                  >
                    {formatTime(entry.created_at)}
                  </time>
                  <span className="text-body fw-medium">{entry.actor_name}</span>{' '}
                  {ACTIVITY_ACTION_META[entry.action]?.verb ?? 'atualizou'}{' '}
                  {ACTIVITY_ENTITY_META[entry.entity_type]?.article ?? 'o registro'}{' '}
                  {entry.entity_type === 'initiatives' && entry.entity_id ? (
                    <Link
                      to={`/admin/iniciativas/${entry.entity_id}`}
                      className="text-body fw-medium hover-underline"
                    >
                      {entry.entity_name}
                    </Link>
                  ) : (
                    <span className="text-body fw-medium">{entry.entity_name}</span>
                  )}
                  {entry.action === 'status_changed' && entry.metadata?.to ? (
                    <>
                      {' para '}
                      <span className="text-body fw-medium">
                        {STATUS_META[entry.metadata.to]?.label ?? entry.metadata.to}
                      </span>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}

/** Os últimos 7 dias, de hoje para trás, em dias locais. */
function lastWeek() {
  const pad = (n) => String(n).padStart(2, '0')
  const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 6)
  return { from: iso(start), to: iso(today) }
}

const count = new Intl.NumberFormat('pt-BR')

/** Os conteúdos mais abertos na semana — a porta de entrada da tela de audiência. */
function AudienceSummary() {
  const [range] = useState(lastWeek)
  const { data, isPending, isError } = useAudience(range)

  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-fx-8" />
        ))}
      </div>
    )
  }

  if (isError) return <p className="text-body-secondary fs-7">Não foi possível carregar a audiência.</p>

  const top = data.items.filter((item) => item.name).slice(0, 5)

  if (!top.length) {
    return (
      <EmptyState
        compact
        icon={ChartColumn}
        title="Nenhum acesso nos últimos 7 dias"
        description="As visualizações de notícias e iniciativas publicadas aparecem aqui."
      />
    )
  }

  return (
    <>
      <p className="text-body-secondary mb-2 fs-7">
        <span className="text-body fw-semibold">{count.format(data.totals.views)}</span> visualizações e{' '}
        <span className="text-body fw-semibold">{count.format(data.totals.visitors)}</span> leitores
        únicos na semana.
      </p>
      <ol className="list-divided list-unstyled mb-0">
        {top.map((item) => (
          <li key={`${item.type}:${item.id}`} className="d-flex align-items-baseline gap-3 py-2 fs-7">
            <span className="min-w-0 flex-grow-1">
              <span className="d-block text-truncate fw-medium">{item.name}</span>
              <span className="text-body-secondary fs-8">{CONTENT_TYPE_LABEL[item.type]}</span>
            </span>
            <span className="flex-shrink-0 fw-medium tabular-nums">{count.format(item.views)}</span>
          </li>
        ))}
      </ol>
    </>
  )
}

function InitiativeMiniList({ items, emptyTitle, emptyDescription, showStatus = true }) {
  if (!items?.length) {
    return <EmptyState compact title={emptyTitle} description={emptyDescription} />
  }

  return (
    <ul className="list-divided">
      {items.map((initiative) => (
        <li key={initiative.id}>
          <Link
            to={`/admin/iniciativas/${initiative.id}`}
            className="list-link d-flex align-items-center gap-3 rounded-2 px-2 py-3"
          >
            <Image
              src={initiative.cover_image}
              alt=""
              ratio="ratio-1x1 w-fx-10"
              wrapperClassName="rounded-2 flex-shrink-0"
            />
            <div className="min-w-0 flex-grow-1">
              <p className="mb-1 text-truncate fs-7 fw-medium">{initiative.name}</p>
              <p className="text-body-secondary mb-0 text-truncate fs-8">
                {initiative.category?.name} · {formatRelative(initiative.updated_at)}
              </p>
            </div>
            {showStatus ? <StatusBadge status={initiative.status} size="sm" /> : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function DashboardPage() {
  const { profile, canReview, isAdmin } = useAuth()
  const { data: stats, isPending, isError, error, refetch } = useDashboardStats()
  const { data: pending } = usePendingReview()
  const { data: recent } = useRecentInitiatives()

  const byStatus = stats?.byStatus ?? {}
  const firstName = profile?.name?.split(' ')[0] ?? ''

  if (isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : 'Dashboard'}
        description="Panorama do catálogo e do que precisa da sua atenção agora."
        actions={
          <>
            {isAdmin ? (
              <Button variant="outline" asChild>
                <Link to="/admin/categorias">
                  <FolderTree aria-hidden="true" />
                  Categorias
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link to="/admin/iniciativas/nova">
                <Plus aria-hidden="true" />
                Nova iniciativa
              </Link>
            </Button>
          </>
        }
      />

      {/* Métricas -------------------------------------------------------- */}
      <div className="d-grid grid-cols-2 gap-3 gap-sm-4 grid-cols-lg-4">
        <MetricCard
          label="Iniciativas"
          value={stats?.total ?? 0}
          hint="Total no catálogo"
          icon={Sparkles}
          to="/admin/iniciativas"
          loading={isPending}
        />
        <MetricCard
          label="Publicadas"
          value={Number(byStatus[STATUS.PUBLISHED] ?? 0)}
          hint="Visíveis na vitrine"
          icon={Sparkles}
          to="/admin/iniciativas"
          loading={isPending}
          accent="badge-status-published"
        />
        <MetricCard
          label="Em revisão"
          value={Number(byStatus[STATUS.PENDING_REVIEW] ?? 0)}
          hint={canReview ? 'Aguardando sua análise' : 'Aguardando um revisor'}
          icon={ClipboardCheck}
          to={canReview ? '/admin/revisao' : undefined}
          loading={isPending}
          accent="badge-status-review"
        />
        <MetricCard
          label="Categorias"
          value={stats?.categories ?? 0}
          hint={`${stats?.people ?? 0} pessoas cadastradas`}
          icon={FolderTree}
          to={isAdmin ? '/admin/categorias' : undefined}
          loading={isPending}
        />
      </div>

      {/* Gráficos -------------------------------------------------------- */}
      <div className="mt-4 d-grid gap-4 grid-cols-1 grid-cols-lg-2">
        {isPending ? (
          <>
            <Skeleton className="h-fx-72" />
            <Skeleton className="h-fx-72" />
          </>
        ) : (
          <>
            <CategoryBarChart data={stats.byCategory} />
            <StatusMeter byStatus={byStatus} total={stats.total} />
          </>
        )}
      </div>

      {/* Listas ---------------------------------------------------------- */}
      {/* Metade da linha para cada: numa proporção 2/1, a coluna estreita
          cortava o nome das iniciativas enquanto a larga sobrava vazia. */}
      <div className="mt-4 d-grid align-items-start gap-4 grid-cols-1 grid-cols-lg-2">
        <DashboardSection
          title="Aguardando aprovação"
          action={
            canReview && pending?.length ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/revisao">
                  Ver fila
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : null
          }
        >
          <InitiativeMiniList
            items={pending}
            emptyTitle="Nada na fila"
            emptyDescription="Nenhuma iniciativa aguardando revisão no momento."
            showStatus={false}
          />
        </DashboardSection>

        <DashboardSection title="Cadastradas recentemente">
          <InitiativeMiniList
            items={recent}
            emptyTitle="Nenhuma iniciativa"
            emptyDescription="Comece criando a primeira."
          />
        </DashboardSection>
      </div>

      <DashboardSection
        title="Mais acessados nos últimos 7 dias"
        className="mt-4"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/audiencia?periodo=7">
              Ver relatório
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      >
        <AudienceSummary />
      </DashboardSection>

      <DashboardSection
        title="Atividade recente"
        className="mt-4"
        action={
          isAdmin ? (
            <div className="d-flex gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/usuarios">
                  <UserPlus aria-hidden="true" />
                  Equipe
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/atividade">
                  Ver tudo
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : null
        }
      >
        <ActivityTimeline />
      </DashboardSection>
    </>
  )
}
