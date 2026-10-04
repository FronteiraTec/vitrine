import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger

/**
 * Confirmação para ações destrutivas ou irreversíveis.
 *
 * O padrão do Radix mantém o cancelamento como ação segura ao pressionar Esc —
 * razão pela qual a primitiva foi mantida na migração para o Bootstrap.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  destructive = false,
  loading = false,
}) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="dialog-overlay" />
        <AlertDialogPrimitive.Content className="dialog-panel dialog-sm p-4">
          <div className="d-flex gap-3">
            {destructive ? (
              <div
                className="d-flex align-items-center justify-content-center rounded-circle bg-danger-subtle text-danger flex-shrink-0"
                style={{ width: '2.5rem', height: '2.5rem' }}
              >
                <AlertTriangle className="icon-lg" aria-hidden="true" />
              </div>
            ) : null}

            <div>
              <AlertDialogPrimitive.Title className="h6 mb-1">{title}</AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="text-body-secondary small mb-0">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>

          <div className="mt-4 d-flex flex-column-reverse flex-sm-row justify-content-sm-end gap-2">
            <AlertDialogPrimitive.Cancel
              className={cn(buttonVariants({ variant: 'outline' }))}
              disabled={loading}
            >
              {cancelLabel}
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              className={cn(buttonVariants({ variant: destructive ? 'destructive' : 'primary' }))}
              onClick={(event) => {
                // Mantém o diálogo aberto enquanto a ação assíncrona roda.
                event.preventDefault()
                onConfirm?.()
              }}
              disabled={loading}
            >
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
