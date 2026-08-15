import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-md border border-input bg-card text-sm text-foreground shadow-subtle transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20'

export function Input({ className, type = 'text', ...props }) {
  return <input type={type} className={cn(fieldBase, 'h-10 px-3 py-2', className)} {...props} />
}

export function Textarea({ className, rows = 5, ...props }) {
  return (
    <textarea rows={rows} className={cn(fieldBase, 'resize-y px-3 py-2 leading-relaxed', className)} {...props} />
  )
}

export { fieldBase }
