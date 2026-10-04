import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { ChartFrame } from '@/components/admin/charts'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCount } from '@/lib/audience'
import { cn } from '@/lib/utils'

/**
 * Gráficos da tela de audiência, em SVG/HTML puro como os do dashboard.
 *
 * Decisões de leitura:
 *  · Uma série só por gráfico, numa cor só (a primária). O que muda de uma
 *    coluna para outra é a altura; colorir por dia ou por país seria cor sem
 *    informação.
 *  · Rótulo direto só no pico; o resto fica no eixo, na dica ao passar o mouse
 *    (ou navegar pelas setas) e na tabela, que todo gráfico tem.
 *  · "Leitores únicos" nunca divide eixo com "visualizações": aparece na dica
 *    e na tabela. Dois números de escala diferente no mesmo eixo sugerem uma
 *    relação que não existe.
 */


/** Largura do elemento, acompanhando o redimensionamento. */
function useElementWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return undefined
    setWidth(element.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

/**
 * Marcas redondas no eixo: 0, 5, 10… — o topo sempre no máximo ou acima.
 * Passo inteiro: visualização é contagem, e "2,5 visualizações" não existe.
 */
function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1]
  const raw = Math.max(1, max / count)
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = Math.max(
    1,
    [1, 2, 5, 10].map((factor) => factor * magnitude).find((value) => value >= raw),
  )
  const ticks = []
  for (let value = 0; value < max + step; value += step) ticks.push(value)
  return ticks
}

/** Coluna com o topo arredondado (4 px) e a base reta, apoiada no eixo. */
function columnPath(x, y, width, height) {
  const radius = Math.min(4, width / 2, height)
  return [
    `M${x},${y + height}`,
    `V${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `H${x + width - radius}`,
    `Q${x + width},${y} ${x + width},${y + radius}`,
    `V${y + height}`,
    'Z',
  ].join(' ')
}

const PLOT_HEIGHT = 200
const PAD_TOP = 22 // espaço para o rótulo do pico
const AXIS_BAND = 26
const LEFT = 44
const RIGHT = 8

/**
 * Visualizações por período (dia, semana ou mês), em colunas.
 *
 * `points`: `[{ key, tick, label, views, visitors }]` — `tick` é o rótulo
 * curto do eixo, `label` o completo, da dica e da tabela.
 */
export function ViewsTimeline({ points, title, description, unitLabel = 'Período' }) {
  const [ref, width] = useElementWidth()
  const [active, setActive] = useState(null)
  const liveId = useId()

  const total = points.reduce((sum, point) => sum + point.views, 0)
  const max = Math.max(0, ...points.map((point) => point.views))
  const ticks = niceTicks(max)
  const top = ticks.at(-1) || 1

  const plotWidth = Math.max(0, width - LEFT - RIGHT)
  const band = points.length ? plotWidth / points.length : 0
  // Coluna fina, no máximo 24 px, e sempre 2 px de respiro até a vizinha.
  const barWidth = Math.max(1, Math.min(24, band - 2))
  const x = (index) => LEFT + index * band + (band - barWidth) / 2
  const y = (value) => PAD_TOP + PLOT_HEIGHT - (value / top) * PLOT_HEIGHT
  const height = PAD_TOP + PLOT_HEIGHT + AXIS_BAND

  // Rótulos do eixo X: no máximo um a cada ~64 px, sem amontoar.
  const every = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(plotWidth / 64))))
  const peak = points.findIndex((point) => point.views === max && max > 0)

  const indexAt = useCallback(
    (clientX, rect) => {
      if (!points.length || band <= 0) return null
      const index = Math.floor((clientX - rect.left - LEFT) / band)
      return Math.min(points.length - 1, Math.max(0, index))
    },
    [points.length, band],
  )

  function handleKeyDown(event) {
    if (!points.length) return
    const last = points.length - 1
    const current = active ?? last
    const next = {
      ArrowLeft: Math.max(0, current - 1),
      ArrowRight: Math.min(last, current + 1),
      Home: 0,
      End: last,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    setActive(next)
  }

  const activePoint = active === null ? null : points[active]
  const tooltipLeft = activePoint ? Math.min(Math.max(x(active) + barWidth / 2, 70), width - 70) : 0

  const tableView = (
    <div className="overflow-x-auto max-h-fx-80">
      <table className="table table-hover align-middle fs-7 mb-0">
        <thead className="text-body-secondary text-start">
          <tr>
            <th scope="col" className="py-2 fw-medium">
              {unitLabel}
            </th>
            <th scope="col" className="py-2 text-end fw-medium">
              Visualizações
            </th>
            <th scope="col" className="py-2 text-end fw-medium">
              Leitores únicos
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <td className="py-2">{point.label}</td>
              <td className="py-2 text-end tabular-nums">{formatCount(point.views)}</td>
              <td className="text-body-secondary py-2 text-end tabular-nums">
                {formatCount(point.visitors)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <ChartFrame title={title} description={description} tableView={total ? tableView : null}>
      {total === 0 ? (
        <EmptyState
          compact
          title="Nenhum acesso no período"
          description="Quando alguém abrir uma notícia ou iniciativa publicada, a contagem aparece aqui."
        />
      ) : (
        <div
          ref={ref}
          className="audience-chart position-relative"
          tabIndex={0}
          role="group"
          aria-label={`${title}. Use as setas para percorrer os valores.`}
          aria-describedby={liveId}
          onKeyDown={handleKeyDown}
          onFocus={() => setActive((current) => current ?? points.length - 1)}
          onBlur={() => setActive(null)}
        >
          <svg
            width={width}
            height={height}
            className="d-block"
            aria-hidden="true"
            onPointerMove={(event) =>
              setActive(indexAt(event.clientX, event.currentTarget.getBoundingClientRect()))
            }
            onPointerLeave={() => setActive(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={LEFT}
                  x2={width - RIGHT}
                  y1={y(tick)}
                  y2={y(tick)}
                  className="audience-chart-grid"
                />
                <text x={LEFT - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="audience-chart-tick">
                  {formatCount(tick)}
                </text>
              </g>
            ))}

            {activePoint ? (
              <rect
                x={LEFT + active * band}
                y={PAD_TOP}
                width={band}
                height={PLOT_HEIGHT}
                className="audience-chart-hover"
              />
            ) : null}

            {points.map((point, index) =>
              point.views > 0 ? (
                <path
                  key={point.key}
                  d={columnPath(x(index), y(point.views), barWidth, PAD_TOP + PLOT_HEIGHT - y(point.views))}
                  className={cn('audience-chart-bar', active !== null && active !== index && 'is-muted')}
                />
              ) : null,
            )}

            {/* O rótulo do pico some quando a dica está sobre ele. */}
            {peak >= 0 && active !== peak ? (
              <text
                x={x(peak) + barWidth / 2}
                y={y(max) - 6}
                textAnchor="middle"
                className="audience-chart-peak"
              >
                {formatCount(max)}
              </text>
            ) : null}

            {points.map((point, index) => {
              if (index % every !== 0) return null
              const center = x(index) + barWidth / 2
              // Os rótulos das pontas encostam na borda em vez de serem cortados.
              const anchor = center < LEFT + 24 ? 'start' : center > width - RIGHT - 24 ? 'end' : 'middle'
              return (
                <text
                  key={point.key}
                  x={anchor === 'start' ? LEFT : anchor === 'end' ? width - RIGHT : center}
                  y={PAD_TOP + PLOT_HEIGHT + 18}
                  textAnchor={anchor}
                  className="audience-chart-tick"
                >
                  {point.tick}
                </text>
              )
            })}
          </svg>

          {activePoint ? (
            <div
              className="audience-chart-tooltip"
              style={{ left: tooltipLeft, top: y(activePoint.views) - 10 }}
            >
              <p className="mb-1 fw-semibold tabular-nums">
                {formatCount(activePoint.views)}{' '}
                <span className="fw-normal text-body-secondary">
                  {activePoint.views === 1 ? 'visualização' : 'visualizações'}
                </span>
              </p>
              <p className="mb-1 tabular-nums">
                {formatCount(activePoint.visitors)}{' '}
                <span className="text-body-secondary">
                  {activePoint.visitors === 1 ? 'leitor único' : 'leitores únicos'}
                </span>
              </p>
              <p className="text-body-secondary mb-0 fs-8">{activePoint.label}</p>
            </div>
          ) : null}

          <p id={liveId} className="visually-hidden" aria-live="polite">
            {activePoint
              ? `${activePoint.label}: ${formatCount(activePoint.views)} visualizações, ${formatCount(activePoint.visitors)} leitores únicos.`
              : `Total do período: ${formatCount(total)} visualizações.`}
          </p>
        </div>
      )}
    </ChartFrame>
  )
}

/**
 * Ranking em barras horizontais: rótulo, valor no fim e barra fina abaixo,
 * numa cor só. Mostra os primeiros `limit`; a tabela traz todos.
 *
 * `rows`: `[{ key, label, views, visitors }]`, já ordenado.
 */
export function RankList({ title, description, rows, limit = 8, columnLabel = 'Item', empty, footer }) {
  const shown = rows.slice(0, limit)
  const rest = rows.slice(limit)
  const max = Math.max(1, ...shown.map((row) => row.views))
  const total = rows.reduce((sum, row) => sum + row.views, 0)
  const restViews = rest.reduce((sum, row) => sum + row.views, 0)

  const tableView = (
    <div className="overflow-x-auto max-h-fx-80">
      <table className="table table-hover align-middle fs-7 mb-0">
        <thead className="text-body-secondary text-start">
          <tr>
            <th scope="col" className="py-2 fw-medium">
              {columnLabel}
            </th>
            <th scope="col" className="py-2 text-end fw-medium">
              Visualizações
            </th>
            <th scope="col" className="py-2 text-end fw-medium">
              Leitores únicos
            </th>
            <th scope="col" className="py-2 text-end fw-medium">
              Participação
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="py-2">{row.label}</td>
              <td className="py-2 text-end tabular-nums">{formatCount(row.views)}</td>
              <td className="text-body-secondary py-2 text-end tabular-nums">{formatCount(row.visitors)}</td>
              <td className="text-body-secondary py-2 text-end tabular-nums">
                {total ? Math.round((row.views / total) * 100) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <ChartFrame title={title} description={description} tableView={rows.length ? tableView : null}>
      {rows.length === 0 ? (
        (empty ?? <EmptyState compact title="Sem dados no período" />)
      ) : (
        <>
          <ul className="space-y-3">
            {shown.map((row) => (
              <li key={row.key}>
                <div className="mb-2 d-flex align-items-baseline justify-content-between gap-2">
                  <span className="text-truncate fs-7">{row.label}</span>
                  <span className="text-body-secondary flex-shrink-0 fs-8 tabular-nums">
                    <span className="text-body fw-medium">{formatCount(row.views)}</span>
                    {' · '}
                    {total ? Math.round((row.views / total) * 100) : 0}%
                  </span>
                </div>
                <div
                  className="bg-body-secondary h-fx-2 overflow-hidden rounded-pill"
                  role="img"
                  aria-label={`${row.label}: ${formatCount(row.views)} visualizações, ${formatCount(row.visitors)} leitores únicos`}
                >
                  <div
                    className="bg-primary h-100 rounded-pill"
                    style={{ width: `${Math.max(2, (row.views / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          {rest.length ? (
            <p className="text-body-secondary mt-3 mb-0 fs-8">
              Mais {formatCount(rest.length)} {rest.length === 1 ? 'item' : 'itens'}, com{' '}
              {formatCount(restViews)} visualizações — veja todos na tabela.
            </p>
          ) : null}
          {footer}
        </>
      )}
    </ChartFrame>
  )
}

/**
 * Número de destaque com a variação em relação ao período anterior de mesma
 * duração. A direção é dita por seta e por sinal, além da cor.
 */
export function StatTile({ label, value, previous, hint, days, decimals = 0, loading }) {
  let delta = null
  if (!loading && previous !== undefined && previous !== null) {
    if (previous === 0 && value > 0) {
      delta = { text: `Nenhum acesso nos ${days} dias anteriores`, tone: 'text-body-secondary', icon: null }
    } else if (previous > 0) {
      const change = Math.round(((value - previous) / previous) * 100)
      const up = change >= 0
      delta = {
        text: `${up ? '+' : '−'}${Math.abs(change)}% em relação aos ${days} dias anteriores`,
        tone: change === 0 ? 'text-body-secondary' : up ? 'text-success' : 'text-danger',
        icon: change === 0 ? null : up ? TrendingUp : TrendingDown,
      }
    }
  }

  return (
    <div className={cn('border bg-body rounded-3 p-3 p-sm-4', loading && 'opacity-50')}>
      <p className="text-body-secondary mb-0 fs-7 fw-medium">{label}</p>
      <p className="mt-2 mb-0 fs-3 fw-semibold tracking-tight">
        {decimals ? value.toLocaleString('pt-BR', { maximumFractionDigits: decimals }) : formatCount(value)}
      </p>
      {delta ? (
        <p className={cn('mt-1 mb-0 d-flex align-items-center gap-1 fs-8', delta.tone)}>
          {delta.icon ? <delta.icon className="icon-sm" aria-hidden="true" /> : null}
          {delta.text}
        </p>
      ) : null}
      {hint ? <p className="text-body-secondary mt-1 mb-0 fs-8">{hint}</p> : null}
    </div>
  )
}
