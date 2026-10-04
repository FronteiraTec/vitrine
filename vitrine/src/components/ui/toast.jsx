import { Toaster as SonnerToaster, toast } from 'sonner'

/** Feedback visual após ações — posicionado fora do fluxo de foco. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      offset={16}
      duration={4000}
      toastOptions={{
        classNames: {
          toast: 'card shadow d-flex flex-row align-items-center gap-3 p-3 small',
          title: 'fw-medium',
          description: 'text-body-secondary small',
          actionButton: 'btn btn-primary btn-sm',
          cancelButton: 'btn btn-secondary btn-sm',
        },
      }}
    />
  )
}

export { toast }
