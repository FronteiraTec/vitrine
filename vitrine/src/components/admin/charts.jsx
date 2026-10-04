import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { STATUS_META, STATUS_ORDER } from '@/lib/constants'
import { cn } from '@/lib/utils'

/**
 * Gráficos do dashboard em HTML/SVG puro — duas visualizações simples não
 * justificam uma biblioteca de charts no bundle.
 *
 * Decisões de leitura:
 *  · Barras de categoria usam UMA cor só. A identidade já está no rótulo do
 *    eixo; colorir cada barra de um jeito seria cor sem informação.
 *  · O medidor de status usa a paleta reservada de status, que é semântica —
 *    e sempre acompanhada de rótulo e contagem, nunca cor sozinha.
 *  · Ambos têm alternativa em tabela para leitores de tela e para quem
 *    precisa do número exato.
 */

export function ChartFrame({ title, description, children, tableView, action }) {
  const [showTable, setShowTable] = useState(false)

  return (
    <section className="border bg-body rounded-3">
      <header className="d-flex align-items-start justify-content-between gap-3 p-3 pb-0 p-sm-4 pb-sm-0">
        <div className="min-w-0 space-y-1">
          <h2 className="mb-0 fs-6 fw-semibold">{title}</h2>
          {description ? <p className="text-body-secondary mb-0 fs-7">{description}</p> : null}
        </div>
        <div className="d-flex flex-shrink-0 align-items-center gap-1">
          {action}
          {tableView ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowTable((current) => !current)}
              aria-pressed={showTable}
              aria-label={showTable ? 'Ver gráfico' : 'Ver como tabela'}
              title={showTable ? 'Ver gráfico' : 'Ver como tabela'}
            >
              <Table2 />
            </Button>
          ) : null}
        </div>
      </header>
      <div className="p-3 p-sm-4">{showTable && tableView ? tableView : children}</div>
    </section>
  )
}

/** Barras horizontais, cor única, extremidade arredondada e rótulo direto. */
export function CategoryBarChart({ data = [] }) {
  const rows = data.filter((row) => row.total > 0).slice(0, 8)
  const max = Math.max(1, ...rows.map((row) => row.total))

  const tableView = (
    <div className="overflow-x-auto">
      <table className="table table-hover align-middle fs-7 mb-0">
        <thead className="text-body-secondary text-start">
          <tr>
            <th scope="col" className="py-2 fw-medium">
              Categoria
            </th>
            <th scope="col" className="py-2 text-end fw-medium">
              Total
            </th>
            <th scope="col" className="py-2 text-end fw-medium">
              Publicadas
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-2">{row.name}</td>
              <td className="py-2 text-end tabular-nums">{row.total}</td>
              <td className="text-body-secondary py-2 text-end tabular-nums">
                {row.published}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <ChartFrame
      title="Iniciativas por categoria"
      description="Total cadastrado em cada categoria, publicado ou não."
      tableView={rows.length ? tableView : null}
    >
      {rows.length === 0 ? (
        <EmptyState compact title="Sem dados ainda" description="Cadastre iniciativas para ver a distribuição." />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="mb-2 d-flex align-items-baseline justify-content-between gap-2">
                <Link
                  to="/admin/iniciativas"
                  className="text-body text-truncate fs-7"
                >
                  {row.name}
                </Link>
                <span className="text-body-secondary flex-shrink-0 fs-8 tabular-nums">
                  <span className="text-body fw-medium">{row.total}</span>
                  {row.published < row.total ? ` · ${row.published} publicadas` : null}
                </span>
              </div>
              <div
                className="bg-body-secondary h-fx-2 overflow-hidden rounded-pill"
                role="img"
                aria-label={`${row.name}: ${row.total} iniciativas, ${row.published} publicadas`}
              >
                <div
                  className="bg-primary h-100 rounded-pill"
                  style={{ width: `${Math.max(3, (row.total / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  )
}

/**
 * Medidor segmentado de status: uma barra empilhada com 2px de respiro entre
 * segmentos, legenda com rótulo e contagem, e destaque no hover.
 */
export function StatusMeter({ byStatus = {}, total = 0 }) {
  const titleId = useId()
  const [hovered, setHovered] = useState(null)

  const segments = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_META[status].label,
    fill: STATUS_META[status].fill,
    count: Number(byStatus[status] ?? 0),
  })).filter((segment) => segment.count > 0)

  const sum = segments.reduce((accumulator, segment) => accumulator + segment.count, 0) || 1

  const tableView = (
    <table className="table table-hover align-middle fs-7 mb-0">
      <thead className="text-body-secondary text-start">
        <tr>
          <th scope="col" className="py-2 fw-medium">
            Status
          </th>
          <th scope="col" className="py-2 text-end fw-medium">
            Iniciativas
          </th>
          <th scope="col" className="py-2 text-end fw-medium">
            Participação
          </th>
        </tr>
      </thead>
      <tbody>
        {segments.map((segment) => (
          <tr key={segment.status}>
            <td className="py-2">{segment.label}</td>
            <td className="py-2 text-end tabular-nums">{segment.count}</td>
            <td className="text-body-secondary py-2 text-end tabular-nums">
              {Math.round((segment.count / sum) * 100)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <ChartFrame
      title="Distribuição por status"
      description={`${total} ${total === 1 ? 'iniciativa' : 'iniciativas'} no fluxo editorial.`}
      tableView={segments.length ? tableView : null}
    >
      {segments.length === 0 ? (
        <EmptyState compact title="Sem dados ainda" description="Cadastre iniciativas para ver a distribuição." />
      ) : (
        <div className="space-y-3">
          <div
            className="d-flex h-fx-3 w-100 gap-1 overflow-hidden rounded-pill"
            role="img"
            aria-labelledby={titleId}
          >
            <span id={titleId} className="visually-hidden">
              Distribuição por status:{' '}
              {segments.map((segment) => `${segment.label}, ${segment.count}`).join('; ')}
            </span>
            {segments.map((segment) => (
              <span
                key={segment.status}
                onMouseEnter={() => setHovered(segment.status)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  'h-100 rounded-1',
                  hovered && hovered !== segment.status && 'opacity-25',
                )}
                style={{
                  width: `${(segment.count / sum) * 100}%`,
                  backgroundColor: segment.fill,
                }}
              />
            ))}
          </div>

          {/* Uma linha por status: em duas colunas a legenda se amontoava no topo
              do cartão e deixava o resto vazio ao lado do gráfico de categorias. */}
          <ul className="list-divided">
            {segments.map((segment) => (
              <li
                key={segment.status}
                onMouseEnter={() => setHovered(segment.status)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  'd-flex align-items-center gap-3 py-2 fs-7',
                  hovered && hovered !== segment.status && 'opacity-50',
                )}
              >
                <span
                  className="h-fx-3 w-fx-3 flex-shrink-0 rounded-pill"
                  style={{ backgroundColor: segment.fill }}
                  aria-hidden="true"
                />
                <span className="text-body-secondary flex-grow-1 text-truncate">{segment.label}</span>
                <span className="fw-medium tabular-nums">{segment.count}</span>
                <span className="text-body-secondary w-fx-12 text-end fs-8 tabular-nums">
                  {Math.round((segment.count / sum) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartFrame>
  )
}
