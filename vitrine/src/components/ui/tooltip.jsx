import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export const TooltipProvider = TooltipPrimitive.Provider

/**
 * Dica flutuante.
 *
 * Quem controla abertura, atraso, foco e fechamento é o Radix — o tooltip do
 * Bootstrap depende do JavaScript dele e não seria acionável por teclado sem
 * trabalho extra. Do Bootstrap aqui vem só a superfície.
 */
export function Tooltip({ content, children, side = 'top', className, ...props }) {
  if (!content) return children

  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn('tooltip-panel', className)}
        >
          {content}
          <TooltipPrimitive.Arrow className="tooltip-arrow" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
