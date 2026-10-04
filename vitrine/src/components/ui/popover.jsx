import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

/**
 * Painel ancorado a um gatilho.
 *
 * Não é modal: o conteúdo da página continua legível atrás. É o que o painel de
 * acessibilidade precisa — quem aumenta a fonte ou liga o alto contraste quer
 * ver o efeito no texto enquanto ajusta.
 *
 * O Radix cuida do que não se deve reimplementar: foco vai para o painel ao
 * abrir e volta ao gatilho ao fechar, `Esc` fecha, clique fora fecha, e o
 * gatilho ganha `aria-expanded`/`aria-controls` sozinho. O popover do Bootstrap
 * depende do JavaScript dele e não oferece nada disso.
 */
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverClose = PopoverPrimitive.Close
export const PopoverAnchor = PopoverPrimitive.Anchor

export function PopoverContent({ className, align = 'center', sideOffset = 8, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn('popover-panel', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
