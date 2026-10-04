import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, FileSpreadsheet, Search, SearchX } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { TableRowsSkeleton, Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActivityLog, useProfiles } from '@/hooks/use-queries'
import { useDebouncedValue } from '@/hooks/use-utils'
import { ACTIVITY_EXPORT_LIMIT, listActivityForExport, SYSTEM_ACTOR } from '@/services/admin'
import {
  ACTIVITY_ACTION_META,
  ACTIVITY_ENTITY_META,
  ACTIVITY_PAGE_SIZE,
  STATUS_META,
} from '@/lib/constants'
import { buildXlsx, downloadBlob } from '@/lib/xlsx'
import { formatDate, formatRelative } from '@/lib/utils'

const ALL = '__all__'

const EMPTY_FILTERS = {
  q: '',
  action: ALL,
  entityType: ALL,
  actorId: ALL,
  from: '',
  to: '',
}

/** Estado dos controles → filtros do serviço (o "todos" vira ausência de filtro). */
function toQueryFilters(filters, q) {
  return {
    q,
    action: filters.action === ALL ? null : filters.action,
    entityType: filters.entityType === ALL ? null : filters.entityType,
    actorId: filters.actorId === ALL ? null : filters.actorId,
    from: filters.from || null,
    to: filters.to || null,
  }
}

function formatDateTime(value) {
  return formatDate(value, { hour: '2-digit', minute: '2-digit' })
}

/** `AAAA-MM-DD` do dia local, para o nome do arquivo. */
function localDateStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Endereço do registro no painel, quando ainda há o que abrir. */
function entityHref(entry) {
  const path = ACTIVITY_ENTITY_META[entry.entity_type]?.adminPath
  if (!path || !entry.entity_id || entry.action === 'deleted') return null
  return `${path}/${entry.entity_id}`
}

function EntityName({ entry }) {
  const href = entityHref(entry)
  const name = entry.entity_name || 'Sem nome'
  return href ? (
    <Link to={href} className="text-body fw-medium hover-underline">
      {name}
    </Link>
  ) : (
    <span className="text-body fw-medium">{name}</span>
  )
}

function StatusChange({ metadata }) {
  if (!metadata?.to) return null
  return (
    <span className="d-inline-flex flex-wrap align-items-center gap-1">
      {metadata.from ? <StatusBadge status={metadata.from} size="sm" /> : null}
      <ArrowRight className="icon-sm text-body-secondary" aria-hidden="true" />
      <span className="visually-hidden">para</span>
      <StatusBadge status={metadata.to} size="sm" />
    </span>
  )
}

/** Uma linha da planilha por registro do log, na ordem de `EXPORT_COLUMNS`. */
const EXPORT_COLUMNS = [
  { header: 'Data e hora', width: 18 },
  { header: 'Usuário', width: 28 },
  { header: 'Ação', width: 20 },
  { header: 'Tipo', width: 12 },
  { header: 'Registro', width: 50 },
  { header: 'Status anterior', width: 16 },
  { header: 'Novo status', width: 16 },
  { header: 'ID do registro', width: 38 },
]

function toExportRow(entry) {
  const statusLabel = (value) => (value ? (STATUS_META[value]?.label ?? value) : '')
  return [
    new Date(entry.created_at),
    entry.actor_name ?? 'Sistema',
    ACTIVITY_ACTION_META[entry.action]?.label ?? entry.action,
    ACTIVITY_ENTITY_META[entry.entity_type]?.label ?? entry.entity_type,
    entry.entity_name,
    statusLabel(entry.metadata?.from),
    statusLabel(entry.metadata?.to),
    entry.entity_id,
  ]
}

export function ActivityLogPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const debouncedQ = useDebouncedValue(filters.q, 350)
  const { data: profiles = [] } = useProfiles()

  const queryFilters = useMemo(() => toQueryFilters(filters, debouncedQ), [filters, debouncedQ])
  const { data, isPending, isFetching, isError, error, refetch } = useActivityLog({
    ...queryFilters,
    page,
    pageSize: ACTIVITY_PAGE_SIZE,
  })

  const items = data?.items ?? []
  const hasFilters = Object.keys(EMPTY_FILTERS).some((key) => filters[key] !== EMPTY_FILTERS[key])

  function setFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  async function exportSpreadsheet() {
    setExporting(true)
    try {
      // Busca com o texto digitado, não o atrasado pelo debounce: quem digita
      // e clica em seguida espera exportar o que acabou de escrever.
      const { items: rows, truncated } = await listActivityForExport(
        toQueryFilters(filters, filters.q),
      )
      if (!rows.length) {
        toast.info('Nenhum registro para exportar com esses filtros.')
        return
      }

      const blob = buildXlsx({
        sheetName: 'Atividade',
        columns: EXPORT_COLUMNS,
        rows: rows.map(toExportRow),
      })
      downloadBlob(blob, `atividade-${localDateStamp()}.xlsx`)

      if (truncated) {
        toast.warning(
          `A planilha traz os ${ACTIVITY_EXPORT_LIMIT.toLocaleString('pt-BR')} registros mais recentes. Use o filtro de período para exportar o restante.`,
        )
      } else {
        toast.success(
          `Planilha exportada com ${rows.length.toLocaleString('pt-BR')} ${rows.length === 1 ? 'registro' : 'registros'}.`,
        )
      }
    } catch (exportError) {
      toast.error(exportError.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Atividade"
        description="Tudo o que a equipe criou, editou, publicou ou excluiu no painel. A exportação leva todos os registros do filtro atual, não só a página visível."
        actions={
          <Button
            variant="outline"
            onClick={exportSpreadsheet}
            loading={exporting}
            disabled={!data?.total}
          >
            {exporting ? null : <FileSpreadsheet aria-hidden="true" />}
            Exportar Excel
          </Button>
        }
      />

      {/* Filtros ---------------------------------------------------------- */}
      <div className="border bg-body mb-3 space-y-2 rounded-3 p-3">
        <div className="d-flex flex-column gap-2 flex-lg-row align-items-lg-center">
          <div className="position-relative flex-grow-1">
            <label htmlFor="atividade-busca" className="visually-hidden">
              Buscar no log
            </label>
            <Search
              className="text-body-secondary pe-none position-absolute top-50 start-0 icon translate-middle-y"
              aria-hidden="true"
            />
            <Input
              id="atividade-busca"
              type="search"
              value={filters.q}
              onChange={(event) => setFilter('q', event.target.value)}
              placeholder="Buscar por registro ou usuário…"
              className="ps-5"
            />
          </div>

          <div className="d-flex flex-wrap gap-2">
            <Select value={filters.action} onValueChange={(value) => setFilter('action', value)}>
              <SelectTrigger className="w-fx-44" aria-label="Filtrar por ação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as ações</SelectItem>
                {Object.entries(ACTIVITY_ACTION_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.entityType}
              onValueChange={(value) => setFilter('entityType', value)}
            >
              <SelectTrigger className="w-fx-40" aria-label="Filtrar por tipo de registro">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os tipos</SelectItem>
                {Object.entries(ACTIVITY_ENTITY_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.actorId} onValueChange={(value) => setFilter('actorId', value)}>
              <SelectTrigger className="w-fx-48" aria-label="Filtrar por usuário">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os usuários</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name || profile.email}
                  </SelectItem>
                ))}
                <SelectItem value={SYSTEM_ACTOR}>Sistema (sem usuário)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <label htmlFor="atividade-de" className="text-body-secondary fs-7">
            De
          </label>
          <Input
            id="atividade-de"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => setFilter('from', event.target.value)}
            className="w-auto"
          />
          <label htmlFor="atividade-ate" className="text-body-secondary fs-7">
            até
          </label>
          <Input
            id="atividade-ate"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => setFilter('to', event.target.value)}
            className="w-auto"
          />

          {hasFilters ? (
            <Button variant="subtle" onClick={resetFilters}>
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {isError ? (
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      ) : (
        <>
          {/* Tabela (>= md) ---------------------------------------------- */}
          <div className="border bg-body d-none overflow-hidden rounded-3 d-md-block">
            <div className="overflow-x-auto">
              <table className="table table-hover align-middle fs-7 mb-0">
                <caption className="visually-hidden">
                  Log de atividade com data, usuário, ação, registro afetado e mudança de status
                </caption>
                <thead className="bg-body-tertiary text-body-secondary">
                  <tr className="text-start">
                    <th scope="col" className="px-3 py-2 fw-medium text-nowrap">
                      Data e hora
                    </th>
                    <th scope="col" className="px-3 py-2 fw-medium">
                      Usuário
                    </th>
                    <th scope="col" className="px-3 py-2 fw-medium">
                      Ação
                    </th>
                    <th scope="col" className="px-3 py-2 fw-medium">
                      Registro
                    </th>
                    <th scope="col" className="px-3 py-2 fw-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className={isFetching && !isPending ? 'opacity-50' : undefined}>
                  {isPending ? (
                    <TableRowsSkeleton rows={10} cols={5} />
                  ) : (
                    items.map((entry) => (
                      <tr key={entry.id} className="border border-top">
                        <td className="px-3 py-2 text-nowrap">
                          <time dateTime={entry.created_at} className="d-block tabular-nums">
                            {formatDateTime(entry.created_at)}
                          </time>
                          <span className="text-body-secondary fs-8">
                            {formatRelative(entry.created_at)}
                          </span>
                        </td>
                        <td className="max-w-fx-48 text-truncate px-3 py-2">
                          {entry.actor_name ?? 'Sistema'}
                        </td>
                        <td className="text-body-secondary px-3 py-2 text-nowrap">
                          {ACTIVITY_ACTION_META[entry.action]?.label ?? entry.action}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-body-secondary d-block fs-8">
                            {ACTIVITY_ENTITY_META[entry.entity_type]?.label ?? entry.entity_type}
                          </span>
                          <span className="line-clamp-2 mw-xs">
                            <EntityName entry={entry} />
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {entry.action === 'status_changed' ? (
                            <StatusChange metadata={entry.metadata} />
                          ) : (
                            <span className="text-body-secondary">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cartões (< md) ---------------------------------------------- */}
          <ul className="space-y-2 d-md-none">
            {isPending
              ? Array.from({ length: 6 }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="h-fx-20" />
                  </li>
                ))
              : items.map((entry) => (
                  <li key={entry.id} className="border bg-body space-y-1 rounded-3 p-3 fs-7">
                    <p className="text-body-secondary mb-0">
                      <span className="text-body fw-medium">{entry.actor_name ?? 'Sistema'}</span>{' '}
                      {ACTIVITY_ACTION_META[entry.action]?.verb ?? 'atualizou'}{' '}
                      {ACTIVITY_ENTITY_META[entry.entity_type]?.article ?? 'o registro'}{' '}
                      <EntityName entry={entry} />
                    </p>
                    {entry.action === 'status_changed' ? (
                      <StatusChange metadata={entry.metadata} />
                    ) : null}
                    <p className="text-body-secondary mb-0 fs-8">
                      <time dateTime={entry.created_at} className="tabular-nums">
                        {formatDateTime(entry.created_at)}
                      </time>
                    </p>
                  </li>
                ))}
          </ul>

          {!isPending && items.length === 0 ? (
            <EmptyState
              icon={hasFilters ? SearchX : Activity}
              title={hasFilters ? 'Nenhum registro encontrado' : 'Nenhuma atividade ainda'}
              description={
                hasFilters
                  ? 'Ajuste os filtros ou amplie o período para ver mais registros.'
                  : 'As ações da equipe aparecem aqui conforme o catálogo é editado.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Limpar filtros
                  </Button>
                ) : null
              }
              className="bg-body"
            />
          ) : null}

          {data && data.total > 0 ? (
            <div className="mt-4 d-flex flex-column align-items-center gap-2">
              <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} />
              <p className="text-body-secondary fs-8 tabular-nums">
                {data.total.toLocaleString('pt-BR')} {data.total === 1 ? 'registro' : 'registros'}
                {data.pageCount > 1 ? ` · página ${data.page} de ${data.pageCount}` : ''}
              </p>
            </div>
          ) : null}
        </>
      )}
    </>
  )
}
