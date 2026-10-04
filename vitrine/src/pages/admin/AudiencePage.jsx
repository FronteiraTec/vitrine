import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ExternalLink, FileSpreadsheet, Info, MapPinOff, X } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { RankList, StatTile, ViewsTimeline } from '@/components/admin/audience-charts'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAudience } from '@/hooks/use-queries'
import {
  cityLabel,
  formatCount,
  CONTENT_TYPE_LABEL,
  countryName,
  localeLabel,
  regionName,
  SOURCE_HINT,
  sourceLabel,
} from '@/lib/audience'
import { STATUS_META } from '@/lib/constants'
import { buildXlsx, downloadBlob } from '@/lib/xlsx'
import { cn } from '@/lib/utils'
import { AUDIENCE_EXPORT_LIMIT, getAudienceRows } from '@/services/analytics'

/* -------------------------------------------------------------------------- */
/* Período                                                                     */
/* -------------------------------------------------------------------------- */

const PERIODS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '365', label: 'Últimos 12 meses' },
  { value: 'mes', label: 'Este mês' },
  { value: 'mes-anterior', label: 'Mês anterior' },
  { value: 'ano', label: 'Este ano' },
  { value: 'personalizado', label: 'Personalizado' },
]

const DATE = /^\d{4}-\d{2}-\d{2}$/

function toIso(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 'AAAA-MM-DD' → Date à meia-noite LOCAL (new Date('AAAA-MM-DD') seria UTC). */
function parseDay(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Período escolhido → `{ from, to }` em dias locais. */
function resolveRange(period, from, to) {
  const today = new Date()
  const days = (count) => {
    const start = new Date(today)
    start.setDate(start.getDate() - (count - 1))
    return { from: toIso(start), to: toIso(today) }
  }
  switch (period) {
    case '7':
    case '90':
    case '365':
      return days(Number(period))
    case 'mes':
      return { from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)), to: toIso(today) }
    case 'mes-anterior':
      return {
        from: toIso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: toIso(new Date(today.getFullYear(), today.getMonth(), 0)),
      }
    case 'ano':
      return { from: toIso(new Date(today.getFullYear(), 0, 1)), to: toIso(today) }
    case 'personalizado':
      if (DATE.test(from ?? '') && DATE.test(to ?? '') && from <= to) return { from, to }
      return days(30)
    default:
      return days(30)
  }
}

const dayLabel = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})
const shortDay = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const fullDay = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const monthTick = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

/**
 * Série diária → pontos do gráfico. Até 92 dias, uma coluna por dia; até dois
 * anos, por semana; além disso, por mês — 365 colunas de 1 px não se leem.
 */
function bucketize(daily) {
  if (daily.length <= 92) {
    return {
      unit: 'Dia',
      points: daily.map((row) => {
        const date = parseDay(row.day)
        return { key: row.day, tick: shortDay.format(date), label: dayLabel.format(date), ...counts(row) }
      }),
    }
  }

  const weekly = daily.length <= 731
  const groups = new Map()
  for (const row of daily) {
    const date = parseDay(row.day)
    let key
    if (weekly) {
      // Semana começando na segunda-feira.
      const start = new Date(date)
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
      key = toIso(start)
    } else {
      key = row.day.slice(0, 7)
    }
    const group = groups.get(key) ?? { key, first: date, last: date, views: 0, visitors: 0 }
    group.last = date
    group.views += row.views
    group.visitors += row.visitors
    groups.set(key, group)
  }

  return {
    unit: weekly ? 'Semana' : 'Mês',
    points: [...groups.values()].map((group) => ({
      key: group.key,
      views: group.views,
      visitors: group.visitors,
      tick: weekly ? shortDay.format(group.first) : monthTick.format(group.first),
      label: weekly
        ? `Semana de ${fullDay.format(group.first)} a ${fullDay.format(group.last)}`
        : monthLabel.format(group.first),
    })),
  }
}

function counts(row) {
  return { views: row.views ?? 0, visitors: row.visitors ?? 0 }
}

/* -------------------------------------------------------------------------- */
/* Conteúdo                                                                    */
/* -------------------------------------------------------------------------- */

function publicPath(item) {
  if (!item.slug) return null
  return item.type === 'news' ? `/noticia/${item.slug}` : `/iniciativa/${item.slug}`
}

const TOP_ITEMS = 15

/** Ranking de notícias e iniciativas. Clicar no título filtra a tela por ele. */
function ItemsRanking({ items, onSelect, selectedId }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, TOP_ITEMS)
  const max = Math.max(1, ...items.map((item) => item.views))

  return (
    <section className="border bg-body rounded-3">
      <header className="p-3 pb-0 p-sm-4 pb-sm-0">
        <h2 className="mb-1 fs-6 fw-semibold">Mais acessados</h2>
        <p className="text-body-secondary mb-0 fs-7">
          Clique no título para ver de onde vieram os leitores daquele conteúdo.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="p-3 p-sm-4">
          <EmptyState compact title="Nenhum conteúdo acessado no período" />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="table table-hover align-middle fs-7 mb-0">
            <caption className="visually-hidden">
              Notícias e iniciativas por número de visualizações no período
            </caption>
            <thead className="bg-body-tertiary text-body-secondary">
              <tr className="text-start">
                <th scope="col" className="px-3 py-2 fw-medium text-end w-fx-12">
                  #
                </th>
                <th scope="col" className="px-3 py-2 fw-medium">
                  Conteúdo
                </th>
                <th scope="col" className="px-3 py-2 fw-medium d-none d-md-table-cell">
                  Tipo
                </th>
                <th scope="col" className="px-3 py-2 fw-medium text-end">
                  Visualizações
                </th>
                <th scope="col" className="px-3 py-2 fw-medium text-end d-none d-sm-table-cell">
                  Leitores únicos
                </th>
                <th scope="col" className="px-3 py-2 d-none d-lg-table-cell w-fx-40">
                  <span className="visually-hidden">Proporção</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((item, index) => {
                const href = publicPath(item)
                const deleted = !item.name
                return (
                  <tr key={`${item.type}:${item.id}`} className={cn(item.id === selectedId && 'table-active')}>
                    <td className="text-body-secondary px-3 py-2 text-end tabular-nums">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="d-flex align-items-center gap-2 min-w-0">
                        {deleted ? (
                          <span className="text-body-secondary fst-italic">Conteúdo excluído</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-link p-0 text-start text-body fw-medium text-decoration-none hover-underline fs-7"
                            onClick={() => onSelect(item)}
                          >
                            {item.name}
                          </button>
                        )}
                        {href && item.status === 'published' ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-body-secondary flex-shrink-0"
                            aria-label={`Abrir "${item.name}" no site`}
                            title="Abrir no site"
                          >
                            <ExternalLink className="icon-sm" aria-hidden="true" />
                          </a>
                        ) : null}
                        {!deleted && item.status && item.status !== 'published' ? (
                          <StatusBadge status={item.status} size="sm" />
                        ) : null}
                      </div>
                    </td>
                    <td className="text-body-secondary px-3 py-2 d-none d-md-table-cell">
                      {CONTENT_TYPE_LABEL[item.type]}
                    </td>
                    <td className="px-3 py-2 text-end fw-medium tabular-nums">{formatCount(item.views)}</td>
                    <td className="text-body-secondary px-3 py-2 text-end tabular-nums d-none d-sm-table-cell">
                      {formatCount(item.visitors)}
                    </td>
                    <td className="px-3 py-2 d-none d-lg-table-cell">
                      <div className="bg-body-secondary h-fx-2 overflow-hidden rounded-pill" aria-hidden="true">
                        <div
                          className="bg-primary h-100 rounded-pill"
                          style={{ width: `${Math.max(2, (item.views / max) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {items.length > TOP_ITEMS ? (
            <div className="border-top p-2 text-center">
              <Button variant="ghost" size="sm" onClick={() => setExpanded((current) => !current)}>
                {expanded ? 'Mostrar só os primeiros' : `Mostrar todos (${formatCount(items.length)})`}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Planilha                                                                    */
/* -------------------------------------------------------------------------- */

const sumColumns = [
  { header: 'Visualizações', width: 14 },
  { header: 'Leitores únicos', width: 16 },
]

async function exportReport({ report, filters, periodLabel, selectedName }) {
  const { items: raw, truncated } = await getAudienceRows(filters)
  const origin = window.location.origin
  const statusLabel = (status) => (status ? (STATUS_META[status]?.label ?? status) : 'Excluído')

  const sheets = [
    {
      sheetName: 'Resumo',
      columns: [
        { header: 'Indicador', width: 34 },
        { header: 'Valor', width: 40 },
      ],
      rows: [
        ['Período', periodLabel],
        ['De', parseDay(report.range.from)],
        ['Até', parseDay(report.range.to)],
        ['Tipo de conteúdo', filters.type ? CONTENT_TYPE_LABEL[filters.type] : 'Notícias e iniciativas'],
        ['Conteúdo', selectedName ?? 'Todos'],
        ['Visualizações', report.totals.views],
        ['Leitores únicos (soma por dia)', report.totals.visitors],
        [`Visualizações nos ${report.range.days} dias anteriores`, report.previous.views],
        [`Leitores únicos nos ${report.range.days} dias anteriores`, report.previous.visitors],
        ['Localização por IP', report.geo ? 'Ativa' : 'Não configurada no servidor'],
        ['Gerado em', new Date()],
      ],
    },
    {
      sheetName: 'Por conteúdo',
      columns: [
        { header: 'Tipo', width: 12 },
        { header: 'Título', width: 60 },
        { header: 'Situação', width: 14 },
        { header: 'Publicado em', width: 18 },
        ...sumColumns,
        { header: 'Endereço', width: 60 },
      ],
      rows: report.items.map((item) => [
        CONTENT_TYPE_LABEL[item.type],
        item.name ?? 'Conteúdo excluído',
        statusLabel(item.status),
        item.published_at ? new Date(item.published_at) : null,
        item.views,
        item.visitors,
        publicPath(item) ? `${origin}${publicPath(item)}` : '',
      ]),
    },
    {
      sheetName: 'Por dia',
      columns: [{ header: 'Dia', width: 14, type: 'day' }, ...sumColumns],
      rows: report.daily.map((row) => [parseDay(row.day), row.views, row.visitors]),
    },
    {
      sheetName: 'Países',
      columns: [{ header: 'País', width: 28 }, { header: 'Código', width: 10 }, ...sumColumns],
      rows: report.countries.map((row) => [countryName(row.country), row.country, row.views, row.visitors]),
    },
    {
      sheetName: 'Estados',
      columns: [{ header: 'País', width: 24 }, { header: 'Estado', width: 28 }, ...sumColumns],
      rows: report.regions.map((row) => [
        countryName(row.country),
        regionName(row.country, row.region),
        row.views,
        row.visitors,
      ]),
    },
    {
      sheetName: 'Cidades',
      columns: [
        { header: 'País', width: 24 },
        { header: 'Estado', width: 24 },
        { header: 'Cidade', width: 28 },
        ...sumColumns,
      ],
      rows: report.cities.map((row) => [
        countryName(row.country),
        regionName(row.country, row.region),
        row.city || 'Não identificada',
        row.views,
        row.visitors,
      ]),
    },
    {
      sheetName: 'Origem',
      columns: [{ header: 'Canal', width: 30 }, ...sumColumns],
      rows: report.sources.map((row) => [sourceLabel(row.source), row.views, row.visitors]),
    },
    {
      sheetName: 'Idioma',
      columns: [{ header: 'Idioma', width: 16 }, ...sumColumns],
      rows: report.locales.map((row) => [localeLabel(row.locale), row.views, row.visitors]),
    },
    {
      sheetName: 'Dados completos',
      columns: [
        { header: 'Dia', width: 12, type: 'day' },
        { header: 'Tipo', width: 12 },
        { header: 'Título', width: 50 },
        { header: 'Idioma', width: 12 },
        { header: 'País', width: 20 },
        { header: 'Estado', width: 22 },
        { header: 'Cidade', width: 24 },
        { header: 'Origem', width: 22 },
        ...sumColumns,
      ],
      rows: raw.map((row) => [
        parseDay(row.day),
        CONTENT_TYPE_LABEL[row.type],
        row.name ?? 'Conteúdo excluído',
        localeLabel(row.locale),
        countryName(row.country),
        regionName(row.country, row.region),
        row.city || 'Não identificada',
        sourceLabel(row.source),
        row.views,
        row.visitors,
      ]),
    },
  ]

  downloadBlob(buildXlsx({ sheets }), `audiencia-${report.range.from}-a-${report.range.to}.xlsx`)
  return { truncated }
}

/* -------------------------------------------------------------------------- */
/* Página                                                                      */
/* -------------------------------------------------------------------------- */

const ALL = '__all__'

export function AudiencePage() {
  const [params, setParams] = useSearchParams()
  const [exporting, setExporting] = useState(false)

  const period = PERIODS.some((option) => option.value === params.get('periodo')) ? params.get('periodo') : '30'
  const type = ['news', 'initiative'].includes(params.get('tipo')) ? params.get('tipo') : null
  const itemId = params.get('item') || null
  const custom = { from: params.get('de') ?? '', to: params.get('ate') ?? '' }

  const range = useMemo(() => resolveRange(period, custom.from, custom.to), [period, custom.from, custom.to])
  const filters = useMemo(() => ({ ...range, type, id: itemId }), [range, type, itemId])
  const { data: report, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useAudience(filters)

  function update(changes) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === undefined || value === '') next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true },
    )
  }

  function changePeriod(value) {
    if (value === 'personalizado') {
      // Começa do período que estava na tela, para a pessoa só ajustar.
      update({ periodo: value, de: range.from, ate: range.to })
    } else {
      update({ periodo: value, de: null, ate: null })
    }
  }

  const selected = itemId ? report?.items?.find((item) => item.id === itemId) : null
  const selectedName = itemId ? (selected?.name ?? 'Conteúdo selecionado') : null
  const periodLabel = PERIODS.find((option) => option.value === period)?.label ?? ''
  const timeline = useMemo(() => bucketize(report?.daily ?? []), [report?.daily])
  const stale = isFetching && isPlaceholderData

  async function handleExport() {
    if (!report) return
    setExporting(true)
    try {
      const { truncated } = await exportReport({ report, filters, periodLabel, selectedName })
      if (truncated) {
        toast.warning(
          `A aba "Dados completos" traz as primeiras ${AUDIENCE_EXPORT_LIMIT.toLocaleString('pt-BR')} linhas. Diminua o período para exportar o restante.`,
        )
      } else {
        toast.success('Planilha de audiência exportada.')
      }
    } catch (exportError) {
      toast.error(exportError.message)
    } finally {
      setExporting(false)
    }
  }

  const rows = {
    countries: (report?.countries ?? []).map((row) => ({
      key: row.country || '—',
      label: countryName(row.country),
      ...counts(row),
    })),
    regions: (report?.regions ?? []).map((row) => ({
      key: `${row.country}:${row.region}`,
      label:
        row.country && row.country !== 'BR' && row.region
          ? `${regionName(row.country, row.region)} (${countryName(row.country)})`
          : regionName(row.country, row.region),
      ...counts(row),
    })),
    cities: (report?.cities ?? []).map((row) => ({
      key: `${row.country}:${row.region}:${row.city}`,
      label: cityLabel(row),
      ...counts(row),
    })),
    sources: (report?.sources ?? []).map((row) => ({
      key: row.source || '—',
      label: sourceLabel(row.source),
      ...counts(row),
    })),
    locales: (report?.locales ?? []).map((row) => ({
      key: row.locale || '—',
      label: localeLabel(row.locale),
      ...counts(row),
    })),
  }

  return (
    <>
      <PageHeader
        title="Audiência"
        description="Quantas vezes cada notícia e iniciativa foi aberta, por quantos leitores e de onde. A planilha leva o período inteiro, com uma aba por recorte."
        actions={
          <Button variant="outline" onClick={handleExport} loading={exporting} disabled={!report?.totals?.views}>
            {exporting ? null : <FileSpreadsheet aria-hidden="true" />}
            Exportar Excel
          </Button>
        }
      />

      {/* Filtros: uma linha, acima de tudo o que eles recortam. ------------ */}
      <div className="border bg-body mb-4 d-flex flex-wrap align-items-center gap-2 rounded-3 p-3">
        <Select value={period} onValueChange={changePeriod}>
          <SelectTrigger className="w-fx-48" aria-label="Período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {period === 'personalizado' ? (
          <>
            <label htmlFor="audiencia-de" className="text-body-secondary fs-7">
              De
            </label>
            <Input
              id="audiencia-de"
              type="date"
              value={custom.from}
              max={custom.to || undefined}
              onChange={(event) => update({ de: event.target.value })}
              className="w-auto"
            />
            <label htmlFor="audiencia-ate" className="text-body-secondary fs-7">
              até
            </label>
            <Input
              id="audiencia-ate"
              type="date"
              value={custom.to}
              min={custom.from || undefined}
              onChange={(event) => update({ ate: event.target.value })}
              className="w-auto"
            />
          </>
        ) : (
          <span className="text-body-secondary fs-7 tabular-nums">
            {fullDay.format(parseDay(range.from))} a {fullDay.format(parseDay(range.to))}
          </span>
        )}

        <Select
          value={type ?? ALL}
          onValueChange={(value) => update({ tipo: value === ALL ? null : value, item: null })}
        >
          <SelectTrigger className="w-fx-56" aria-label="Tipo de conteúdo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Notícias e iniciativas</SelectItem>
            <SelectItem value="news">Só notícias</SelectItem>
            <SelectItem value="initiative">Só iniciativas</SelectItem>
          </SelectContent>
        </Select>

        {itemId ? (
          <Badge variant="outline" className="d-inline-flex align-items-center gap-1 py-1 ps-2 pe-1 fw-normal mw-md">
            <span className="text-truncate">{selectedName}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon p-0"
              onClick={() => update({ item: null })}
              aria-label="Remover o filtro de conteúdo"
            >
              <X className="icon-sm" aria-hidden="true" />
            </button>
          </Badge>
        ) : null}
      </div>

      {isError ? (
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-4">
          <div className="d-grid grid-cols-2 gap-3 gap-sm-4 grid-cols-lg-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-fx-24" />
            ))}
          </div>
          <Skeleton className="h-fx-72" />
        </div>
      ) : (
        <div className={cn('space-y-4', stale && 'opacity-50')} aria-busy={stale}>
          {!report.geo ? (
            <div className="border bg-body-tertiary d-flex align-items-start gap-2 rounded-3 p-3 fs-7">
              <MapPinOff className="text-body-secondary mt-1 icon flex-shrink-0" aria-hidden="true" />
              <p className="mb-0 text-pretty">
                <span className="fw-medium">A localização ainda não está ativa neste servidor.</span>{' '}
                Os acessos continuam sendo contados; país, estado e cidade passam a aparecer quando a
                base de geolocalização for configurada (README, seção Audiência).
              </p>
            </div>
          ) : null}

          <div className="d-grid grid-cols-2 gap-3 gap-sm-4 grid-cols-lg-4">
            <StatTile
              label="Visualizações"
              value={report.totals.views}
              previous={report.previous.views}
              days={report.range.days}
            />
            <StatTile
              label="Leitores únicos"
              value={report.totals.visitors}
              previous={report.previous.visitors}
              days={report.range.days}
              hint="Contados por dia e por conteúdo"
            />
            <StatTile
              label={itemId ? 'Dias com acesso' : 'Conteúdos acessados'}
              value={itemId ? report.daily.filter((row) => row.views > 0).length : report.items.length}
            />
            <StatTile
              label="Média por dia"
              value={report.totals.views / Math.max(1, report.range.days)}
              decimals={1}
              hint="Visualizações"
            />
          </div>

          <ViewsTimeline
            title={`Visualizações por ${timeline.unit.toLowerCase()}`}
            description={selectedName ? `De "${selectedName}".` : 'Notícias e iniciativas publicadas, somadas.'}
            points={timeline.points}
            unitLabel={timeline.unit}
          />

          {itemId ? null : (
            <ItemsRanking
              items={report.items}
              selectedId={itemId}
              onSelect={(item) => update({ item: item.id, tipo: item.type })}
            />
          )}

          <div className="d-grid align-items-start gap-4 grid-cols-1 grid-cols-lg-2">
            <RankList title="Países" rows={rows.countries} columnLabel="País" />
            <RankList title="Estados" rows={rows.regions} columnLabel="Estado" />
            <RankList
              title="Cidades"
              description="Estimadas pelo IP: a operadora pode registrar o acesso numa cidade vizinha."
              rows={rows.cities}
              columnLabel="Cidade"
            />
            <RankList
              title="Origem do acesso"
              rows={rows.sources}
              columnLabel="Canal"
              footer={
                <p className="text-body-secondary mt-3 mb-0 d-flex align-items-start gap-2 fs-8 text-pretty">
                  <Info className="icon-sm mt-1 flex-shrink-0" aria-hidden="true" />
                  {SOURCE_HINT}
                </p>
              }
            />
            <RankList title="Idioma da leitura" rows={rows.locales} columnLabel="Idioma" />
          </div>

          <section className="text-body-secondary fs-8 text-pretty space-y-1">
            <p className="mb-0">
              <span className="fw-medium text-body">Como a contagem funciona.</span> Cada abertura de
              uma notícia ou iniciativa publicada conta uma visualização. Robôs e a equipe logada no
              painel não entram na conta. &quot;Leitores únicos&quot; conta cada navegador uma vez por
              dia em cada conteúdo — quem volta no dia seguinte conta de novo.
            </p>
            <p className="mb-0">
              Nenhum dado pessoal é guardado: nem IP, nem identificador do leitor, só os totais por
              dia. A contagem começou quando este recurso entrou no ar; acessos anteriores não têm
              registro.
            </p>
          </section>
        </div>
      )}
    </>
  )
}
