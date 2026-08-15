import { cn } from '@/lib/utils'

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('bg-card border-border shadow-subtle rounded-lg border', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 p-5 sm:p-6', className)} {...props} />
}

export function CardTitle({ className, as: Comp = 'h3', ...props }) {
  return <Comp className={cn('text-base leading-tight font-semibold', className)} {...props} />
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-muted-foreground text-sm', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('border-border flex items-center gap-3 border-t px-5 py-4 sm:px-6', className)}
      {...props}
    />
  )
}
