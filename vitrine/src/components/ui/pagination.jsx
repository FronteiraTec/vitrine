import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

/**
 * Constrói a régua de páginas com elipses: 1 … 4 5 6 … 20
 * Mantém sempre a primeira, a última e uma janela ao redor da atual.
 */
function buildRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current, current - 1, current + 1])
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p))

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const result = []
  let previous = 0
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push(`gap-${page}`)
    result.push(page)
    previous = page
  }
  return result
}

export function Pagination({ page, pageCount, onPageChange, className }) {
  if (pageCount <= 1) return null
  const range = buildRange(page, pageCount)

  return (
    <nav
      className={cn('flex items-center justify-center gap-1', className)}
      aria-label="Paginação de resultados"
    >
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeft aria-hidden="true" />
      </Button>

      <ul className="flex items-center gap-1">
        {range.map((item) =>
          typeof item === 'string' ? (
            <li key={item} className="text-muted-foreground px-1.5 text-sm" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <Button
                variant={item === page ? 'primary' : 'ghost'}
                size="icon-sm"
                onClick={() => onPageChange(item)}
                aria-label={`Página ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className="tabular-nums"
              >
                {item}
              </Button>
            </li>
          ),
        )}
      </ul>

      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Próxima página"
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}
