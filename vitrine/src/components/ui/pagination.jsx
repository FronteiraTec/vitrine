import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'

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

/**
 * Paginação sobre a marcação do Bootstrap (`.pagination` / `.page-item` /
 * `.page-link`), que já traz o estado ativo e o desabilitado prontos.
 */
export function Pagination({ page, pageCount, onPageChange, className }) {
  const { t } = useLocale()
  if (pageCount <= 1) return null
  const range = buildRange(page, pageCount)

  return (
    <nav aria-label={t('pagination.label')} className={cn('d-flex justify-content-center', className)}>
      <ul className="pagination mb-0">
        <li className={cn('page-item', page <= 1 && 'disabled')}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t('pagination.previous')}
          >
            <ChevronLeft className="icon" aria-hidden="true" />
          </button>
        </li>

        {range.map((item) =>
          typeof item === 'string' ? (
            <li key={item} className="page-item disabled" aria-hidden="true">
              <span className="page-link">…</span>
            </li>
          ) : (
            <li key={item} className={cn('page-item', item === page && 'active')}>
              <button
                type="button"
                className="page-link font-monospace"
                onClick={() => onPageChange(item)}
                aria-label={t('pagination.page', { page: item })}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            </li>
          ),
        )}

        <li className={cn('page-item', page >= pageCount && 'disabled')}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label={t('pagination.next')}
          >
            <ChevronRight className="icon" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
