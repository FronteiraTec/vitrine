import { cn } from '@/lib/utils'

export function Card({ className, ...props }) {
  return <div className={cn('card', className)} {...props} />
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('card-header bg-transparent', className)} {...props} />
}

export function CardTitle({ className, as: Comp = 'h3', ...props }) {
  return <Comp className={cn('card-title h6 mb-0', className)} {...props} />
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('card-text text-body-secondary small mb-0', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('card-body', className)} {...props} />
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('card-footer bg-transparent d-flex align-items-center gap-3', className)}
      {...props}
    />
  )
}
