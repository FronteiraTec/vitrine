import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '@/lib/utils'

export function Separator({ className, orientation = 'horizontal', ...props }) {
  return (
    <SeparatorPrimitive.Root
      decorative
      orientation={orientation}
      className={cn('bg-body-secondary flex-shrink-0', className)}
      style={
        orientation === 'horizontal'
          ? { height: '1px', width: '100%' }
          : { width: '1px', height: '100%' }
      }
      {...props}
    />
  )
}

/** Separador com rótulo — divide seções na página de detalhes. */
export function SectionDivider({ label, className }) {
  if (!label) return <Separator className={className} />

  return (
    <div className={cn('d-flex align-items-center gap-3', className)}>
      <h2 className="text-body-secondary text-uppercase fw-semibold small mb-0">{label}</h2>
      <Separator className="flex-grow-1" />
    </div>
  )
}
