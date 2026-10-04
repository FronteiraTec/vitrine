import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

/**
 * Select do Radix com a aparência do `.form-select`.
 *
 * O `<select>` nativo do Bootstrap seria mais simples, mas não aceita conteúdo
 * rico nas opções (ícone, descrição) nem controle de estado aberto — que várias
 * telas do painel usam. O Radix mantém teclado, busca por digitação e leitura
 * de tela corretos.
 */
export function SelectTrigger({ className, children, size = 'md', ...props }) {
  return (
    <SelectPrimitive.Trigger
      className={cn('select-trigger', size === 'sm' && 'select-trigger-sm', className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="icon text-body-secondary" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({ className, children, position = 'popper', ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn('menu-panel', className)}
        style={
          position === 'popper'
            ? { minWidth: 'var(--radix-select-trigger-width)' }
            : undefined
        }
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="d-flex justify-content-center py-1">
          <ChevronUp className="icon-sm" aria-hidden="true" />
        </SelectPrimitive.ScrollUpButton>

        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>

        <SelectPrimitive.ScrollDownButton className="d-flex justify-content-center py-1">
          <ChevronDown className="icon-sm" aria-hidden="true" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item className={cn('menu-item position-relative pe-4', className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="position-absolute end-0 me-2 d-flex align-items-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="icon-sm" aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

export function SelectLabel({ className, ...props }) {
  return (
    <SelectPrimitive.Label
      className={cn('px-3 py-2 small text-body-secondary fw-medium', className)}
      {...props}
    />
  )
}
