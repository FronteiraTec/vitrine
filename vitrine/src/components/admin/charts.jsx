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

function ChartFrame({ title, description, children, tableView, action }) {
  const [showTable, setShowTable] = useState(false)

  return (
    <section className="border-border bg-card rounded-lg border">
      <header className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
        </div>
        <div className="flex items-center gap-1">
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
      <div className="px-5 pb-5">{showTable && tableView ? tableView : children}</div>
    </section>
  )
}

/** Barras horizontais, cor única, extremidade arredondada e rótulo direto. */
export function CategoryBarChart({ data = [] }) {
  const rows = data.filter((row) => row.total > 0).slice(0, 8)
  const max = Math.max(1, ...rows.map((row) => row.total))

  const tableView = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-border border-b text-left">
          <tr>
            <th scope="col" className="py-2 font-medium">
              Categoria
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Total
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Publicadas
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-border border-b last:border-0">
              <td className="py-2">{row.name}</td>
              <td className="py-2 text-right tabular-nums">{row.total}</td>
              <td className="text-muted-foreground py-2 text-right tabular-nums">
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
            <li key={row.id} className="group">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <Link
                  to="/admin/iniciativas"
                  className="text-foreground group-hover:text-brand truncate text-sm transition-colors"
                >
                  {row.name}
                </Link>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  <span className="text-foreground font-medium">{row.total}</span>
                  {row.published < row.total ? ` · ${row.published} publicadas` : null}
                </span>
              </div>
              <div
                className="bg-muted h-2 overflow-hidden rounded-full"
                role="img"
                aria-label={`${row.name}: ${row.total} iniciativas, ${row.published} publicadas`}
              >
                <div
                  className="bg-brand h-full rounded-full transition-[width] duration-500"
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
    <table className="w-full text-sm">
      <thead className="text-muted-foreground border-border border-b text-left">
        <tr>
          <th scope="col" className="py-2 font-medium">
            Status
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            Iniciativas
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            Participação
          </th>
        </tr>
      </thead>
      <tbody>
        {segments.map((segment) => (
          <tr key={segment.status} className="border-border border-b last:border-0">
            <td className="py-2">{segment.label}</td>
            <td className="py-2 text-right tabular-nums">{segment.count}</td>
            <td className="text-muted-foreground py-2 text-right tabular-nums">
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
        <div className="space-y-4">
          <div
            className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-labelledby={titleId}
          >
            <span id={titleId} className="sr-only">
              Distribuição por status:{' '}
              {segments.map((segment) => `${segment.label}, ${segment.count}`).join('; ')}
            </span>
            {segments.map((segment) => (
              <span
                key={segment.status}
                onMouseEnter={() => setHovered(segment.status)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  'h-full rounded-sm transition-opacity duration-150',
                  hovered && hovered !== segment.status && 'opacity-35',
                )}
                style={{
                  width: `${(segment.count / sum) * 100}%`,
                  backgroundColor: segment.fill,
                }}
              />
            ))}
          </div>

          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {segments.map((segment) => (
              <li
                key={segment.status}
                onMouseEnter={() => setHovered(segment.status)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  'flex items-center gap-2 text-sm transition-opacity',
                  hovered && hovered !== segment.status && 'opacity-50',
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.fill }}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground flex-1 truncate">{segment.label}</span>
                <span className="font-medium tabular-nums">{segment.count}</span>
                <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
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
