import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { STATUS_META } from '@/lib/constants'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground ring-border',
        brand: 'bg-accent text-accent-foreground ring-brand/20',
        outline: 'bg-card text-foreground ring-border',
      },
      size: {
        sm: 'px-2 py-0.5 text-[0.6875rem]',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'md' },
  },
)

export function Badge({ className, variant, size, ...props }) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

/** Badge do workflow editorial, com ponto colorido e rótulo em português. */
export function StatusBadge({ status, size = 'md', showDot = true, className }) {
  const meta = STATUS_META[status]
  if (!meta) return null
  return (
    <span
      className={cn(
        badgeVariants({ size }),
        'ring-inset',
        meta.className,
        className,
      )}
    >
      {showDot ? <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden="true" /> : null}
      {meta.label}
    </span>
  )
}

export { badgeVariants }
