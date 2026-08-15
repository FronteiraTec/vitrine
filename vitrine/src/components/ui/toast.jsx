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
          toast:
            'group flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm shadow-float',
          title: 'font-medium text-foreground',
          description: 'text-muted-foreground text-[0.8125rem]',
          actionButton: 'rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground',
          cancelButton: 'rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground',
          success: '[&_[data-icon]]:text-status-published',
          error: '[&_[data-icon]]:text-destructive',
          warning: '[&_[data-icon]]:text-status-review',
        },
      }}
    />
  )
}

export { toast }
