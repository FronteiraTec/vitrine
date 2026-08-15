import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '@/lib/utils'

export function Separator({ className, orientation = 'horizontal', ...props }) {
  return (
    <SeparatorPrimitive.Root
      decorative
      orientation={orientation}
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}

/** Separador com rótulo — usado para dividir seções na página de detalhes. */
export function SectionDivider({ label, className }) {
  if (!label) return <Separator className={className} />
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <h2 className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
        {label}
      </h2>
      <Separator className="flex-1" />
    </div>
  )
}
