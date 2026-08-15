import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
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
  useDashboardStats,
  usePendingReview,
  useRecentInitiatives,
} from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'
import { STATUS, STATUS_META } from '@/lib/constants'
import { formatDate, formatRelative, formatTime } from '@/lib/utils'

/** Cartão de métrica — número em destaque, rótulo abaixo, link opcional. */
function MetricCard({ label, value, hint, icon: Icon, to, loading, accent }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <span
          className={
            accent ?? 'bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md'
          }
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-16" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
    </>
  )

  const className =
    'border-border bg-card block rounded-lg border p-5 transition-colors' +
    (to ? ' hover:border-brand/40' : '')

  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

function ActivityTimeline() {
  const { data, isPending, isError } = useActivity(12)

  const ACTION_LABEL = {
    created: 'criou',
    updated: 'editou',
    deleted: 'excluiu',
    status_changed: 'alterou o status de',
  }

  const ENTITY_LABEL = {
    initiatives: 'a iniciativa',
    categories: 'a categoria',
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) return <p className="text-muted-foreground text-sm">Não foi possível carregar a atividade.</p>

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
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.day} className="space-y-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase">
            {group.day === today ? 'Hoje' : formatDate(group.date, { weekday: 'long' })}
          </p>
          <ol className="border-border space-y-3 border-l pl-4">
            {group.entries.map((entry) => (
              <li key={entry.id} className="relative text-sm">
                <span
                  className="bg-border absolute top-1.5 -left-[1.3125rem] size-2 rounded-full"
                  aria-hidden="true"
                />
                <p className="text-muted-foreground">
                  <time
                    dateTime={entry.created_at}
                    className="text-foreground mr-1.5 font-medium tabular-nums"
                  >
                    {formatTime(entry.created_at)}
                  </time>
                  <span className="text-foreground font-medium">{entry.actor_name}</span>{' '}
                  {ACTION_LABEL[entry.action] ?? 'atualizou'}{' '}
                  {ENTITY_LABEL[entry.entity_type] ?? 'o registro'}{' '}
                  {entry.entity_type === 'initiatives' && entry.entity_id ? (
                    <Link
                      to={`/admin/iniciativas/${entry.entity_id}`}
                      className="text-foreground font-medium hover:underline"
                    >
                      {entry.entity_name}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">{entry.entity_name}</span>
                  )}
                  {entry.action === 'status_changed' && entry.metadata?.to ? (
                    <>
                      {' para '}
                      <span className="text-foreground font-medium">
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

function InitiativeMiniList({ items, emptyTitle, emptyDescription, showStatus = true }) {
  if (!items?.length) {
    return <EmptyState compact title={emptyTitle} description={emptyDescription} />
  }

  return (
    <ul className="divide-border divide-y">
      {items.map((initiative) => (
        <li key={initiative.id}>
          <Link
            to={`/admin/iniciativas/${initiative.id}`}
            className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors"
          >
            <Image
              src={initiative.cover_image}
              alt=""
              ratio="size-10"
              wrapperClassName="rounded-md shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{initiative.name}</p>
              <p className="text-muted-foreground truncate text-xs">
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          accent="flex size-8 items-center justify-center rounded-md bg-status-published-bg text-status-published-ink"
        />
        <MetricCard
          label="Em revisão"
          value={Number(byStatus[STATUS.PENDING_REVIEW] ?? 0)}
          hint={canReview ? 'Aguardando sua análise' : 'Aguardando um revisor'}
          icon={ClipboardCheck}
          to={canReview ? '/admin/revisao' : undefined}
          loading={isPending}
          accent="flex size-8 items-center justify-center rounded-md bg-status-review-bg text-status-review-ink"
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
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {isPending ? (
          <>
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </>
        ) : (
          <>
            <CategoryBarChart data={stats.byCategory} />
            <StatusMeter byStatus={byStatus} total={stats.total} />
          </>
        )}
      </div>

      {/* Listas ---------------------------------------------------------- */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="border-border bg-card rounded-lg border p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Aguardando aprovação</h2>
            {canReview && pending?.length ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/revisao">
                  Ver fila
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </div>
          <InitiativeMiniList
            items={pending}
            emptyTitle="Nada na fila"
            emptyDescription="Nenhuma iniciativa aguardando revisão no momento."
            showStatus={false}
          />
        </section>

        <section className="border-border bg-card rounded-lg border p-5">
          <h2 className="mb-3 text-sm font-semibold">Cadastradas recentemente</h2>
          <InitiativeMiniList
            items={recent}
            emptyTitle="Nenhuma iniciativa"
            emptyDescription="Comece criando a primeira."
          />
        </section>
      </div>

      <section className="border-border bg-card mt-6 rounded-lg border p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Atividade recente</h2>
          {isAdmin ? (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/usuarios">
                <UserPlus aria-hidden="true" />
                Equipe
              </Link>
            </Button>
          ) : null}
        </div>
        <ActivityTimeline />
      </section>
    </>
  )
}
