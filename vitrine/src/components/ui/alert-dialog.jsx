import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger

/**
 * Confirmação para ações destrutivas ou irreversíveis.
 * O botão de confirmação recebe foco apenas por teclado; o padrão do Radix
 * mantém o cancelamento como ação segura ao pressionar Esc.
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
        <AlertDialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]" />
        <AlertDialogPrimitive.Content className="bg-card shadow-float data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6">
          <div className="flex gap-4">
            {destructive ? (
              <div className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-full">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <AlertDialogPrimitive.Title className="text-base leading-tight font-semibold">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="text-muted-foreground text-sm">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
