import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }) {
  return <div className={cn('bg-muted animate-pulse rounded-md', className)} {...props} />
}

/** Esqueleto com a mesma proporção do InitiativeCard, evitando salto de layout. */
export function InitiativeCardSkeleton() {
  return (
    <div className="surface overflow-hidden">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-5 w-4/5" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function InitiativeGridSkeleton({ count = 6 }) {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Carregando iniciativas"
    >
      {Array.from({ length: count }, (_, index) => (
        <InitiativeCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function TableRowsSkeleton({ rows = 6, cols = 5 }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr key={rowIndex} className="border-border border-b">
      {Array.from({ length: cols }, (_, colIndex) => (
        <td key={colIndex} className="px-4 py-4">
          <Skeleton className={cn('h-4', colIndex === 0 ? 'w-48' : 'w-20')} />
        </td>
      ))}
    </tr>
  ))
}
