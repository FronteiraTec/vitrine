import { useLocale } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'

export function Skeleton({ className, style, ...props }) {
  return <div className={cn('skeleton', className)} style={style} {...props} />
}

/** Esqueleto com a mesma proporção do InitiativeCard, evitando salto de layout. */
export function InitiativeCardSkeleton() {
  return (
    <div className="card h-100 overflow-hidden">
      <Skeleton className="ratio ratio-16x9 rounded-0" />
      <div className="card-body d-flex flex-column gap-3">
        <Skeleton style={{ height: '0.875rem', width: '6rem' }} />
        <Skeleton style={{ height: '1.25rem', width: '80%' }} />
        <div className="d-flex flex-column gap-2">
          <Skeleton style={{ height: '0.75rem', width: '100%' }} />
          <Skeleton style={{ height: '0.75rem', width: '92%' }} />
        </div>
        <div className="d-flex gap-2 pt-1">
          <Skeleton className="rounded-pill" style={{ height: '1.25rem', width: '4rem' }} />
          <Skeleton className="rounded-pill" style={{ height: '1.25rem', width: '5rem' }} />
        </div>
      </div>
    </div>
  )
}

export function InitiativeGridSkeleton({ count = 6 }) {
  const { t } = useLocale()

  return (
    <div className="row g-4" role="status" aria-label={t('common.loadingInitiatives')}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="col-12 col-sm-6 col-lg-4">
          <InitiativeCardSkeleton />
        </div>
      ))}
    </div>
  )
}

export function TableRowsSkeleton({ rows = 6, cols = 5 }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr key={rowIndex}>
      {Array.from({ length: cols }, (_, colIndex) => (
        <td key={colIndex} className="py-3">
          <Skeleton style={{ height: '1rem', width: colIndex === 0 ? '12rem' : '5rem' }} />
        </td>
      ))}
    </tr>
  ))
}
