import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

export function DropdownMenuContent({ className, sideOffset = 6, align = 'end', ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn('menu-panel dropdown-panel', className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

export function DropdownMenuItem({ className, destructive, inset, ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn('menu-item', destructive && 'menu-item-danger', inset && 'ps-4', className)}
      {...props}
    />
  )
}

export function DropdownMenuCheckboxItem({ className, children, ...props }) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn('menu-item position-relative ps-4', className)}
      {...props}
    >
      <span className="position-absolute start-0 ms-2 d-flex align-items-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="icon-sm" aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

/**
 * Opção exclusiva dentro de um `DropdownMenuRadioGroup`. O Radix entrega
 * `role="menuitemradio"` com `aria-checked`, então o leitor de tela anuncia
 * qual opção está marcada — o sinal visual não é o único.
 */
export function DropdownMenuRadioItem({ className, children, ...props }) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn('menu-item position-relative ps-4', className)}
      {...props}
    >
      <span className="position-absolute start-0 ms-2 d-flex align-items-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="icon-sm" aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-3 py-2 small text-body-secondary fw-medium', className)}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Separator className={cn('dropdown-divider', className)} {...props} />
  )
}
