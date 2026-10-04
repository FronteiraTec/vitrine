import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'

/**
 * Painel lateral (gaveta). Usado no menu em telas pequenas e nos filtros de
 * busca — mesma semântica de diálogo modal do Radix.
 *
 * O `.offcanvas` do Bootstrap faria o mesmo visual, mas depende do JavaScript
 * dele para abrir, fechar e prender o foco, e esse estado não conversa com o
 * React. Aqui a aparência é do Bootstrap e o comportamento é do Radix.
 */
export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

const sides = {
  left: 'sheet-start',
  right: 'sheet-end',
  bottom: 'sheet-bottom',
}

export function SheetContent({ className, children, side = 'right', title, description, ...props }) {
  const { t } = useLocale()

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className={cn('sheet-panel', sides[side], className)} {...props}>
        <div className="offcanvas-header border-bottom align-items-start">
          <div>
            <DialogPrimitive.Title className="offcanvas-title h6 mb-1">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-body-secondary small mb-0">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="visually-hidden">
                {title}
              </DialogPrimitive.Description>
            )}
          </div>

          <DialogPrimitive.Close className="btn btn-ghost btn-icon btn-sm" aria-label={t('common.close')}>
            <X className="icon" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>

        <div className="offcanvas-body flex-grow-1 overflow-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
