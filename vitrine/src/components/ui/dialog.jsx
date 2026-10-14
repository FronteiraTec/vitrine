import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({ className, children, size = 'md', ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content
        className={cn('dialog-panel', `dialog-${size}`, className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="btn btn-ghost btn-icon btn-sm position-absolute top-0 end-0 m-3"
          aria-label="Fechar"
        >
          <X className="icon" aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

// O espaçamento vem de utilitários, não das variáveis `--bs-modal-*`: o Bootstrap
// só as define dentro de `.modal`, que o painel do Radix não usa — sem isto,
// cabeçalho, corpo e rodapé ficam colados na borda.
export function DialogHeader({ className, ...props }) {
  return (
    <div className={cn('modal-header border-0 p-4 pb-2 pe-5 d-block', className)} {...props} />
  )
}

export function DialogTitle({ className, ...props }) {
  return <DialogPrimitive.Title className={cn('modal-title h5 mb-1', className)} {...props} />
}

export function DialogDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description
      className={cn('text-body-secondary small mb-0', className)}
      {...props}
    />
  )
}

export function DialogBody({ className, ...props }) {
  return (
    <div className={cn('modal-body flex-grow-1 overflow-auto p-4 pt-0', className)} {...props} />
  )
}

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        'modal-footer bg-body-tertiary px-4 py-3 d-flex flex-column-reverse flex-sm-row justify-content-sm-end gap-2',
        className,
      )}
      {...props}
    />
  )
}
