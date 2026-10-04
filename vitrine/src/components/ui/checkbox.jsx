import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * As primitivas do Radix são mantidas, e não trocadas por `.form-check-input`.
 *
 * O Radix entrega um <button> com `role` e `aria-checked` corretos, estado
 * indeterminado de verdade e vínculo com o rótulo — coisas que um input
 * estilizado não dá de graça. O que muda na migração é só a aparência, escrita
 * em `.check-box` e `.switch` no SCSS do projeto.
 */
export function Checkbox({ className, ...props }) {
  return (
    <CheckboxPrimitive.Root className={cn('check-box', className)} {...props}>
      <CheckboxPrimitive.Indicator className="d-flex align-items-center justify-content-center">
        {props.checked === 'indeterminate' ? (
          <Minus className="icon-sm" strokeWidth={3} />
        ) : (
          <Check className="icon-sm" strokeWidth={3.5} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root className={cn('switch', className)} {...props}>
      <SwitchPrimitive.Thumb className="switch-thumb" />
    </SwitchPrimitive.Root>
  )
}
