import { Toaster as SonnerToaster, toast } from 'sonner'

/*
 * Embaixo, os avisos sobem 100 px: o canto inferior direito é do mascote do
 * botão de ajuda (uns 70 px de altura, a 16 px da borda), e um aviso por cima
 * dele esconderia o botão justo depois de uma ação.
 */
const OFFSET = { top: 16, right: 16, bottom: 100, left: 16 }

/** Feedback visual após ações — posicionado fora do fluxo de foco. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      offset={OFFSET}
      mobileOffset={OFFSET}
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
