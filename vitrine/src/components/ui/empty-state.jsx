import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'
import { Button } from './button'

/**
 * Estado vazio padrão da aplicação. Um único componente para busca sem
 * resultados, listas vazias e seções ainda não preenchidas.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
}) {
  return (
    <div
      className={cn(
        'd-flex flex-column align-items-center justify-content-center text-center border border-2 border-dashed rounded-3',
        compact ? 'gap-2 px-4 py-4' : 'gap-3 px-4 py-5',
        className,
      )}
    >
      <div
        className="d-flex align-items-center justify-content-center rounded-circle bg-body-secondary text-body-secondary"
        style={{ width: '2.75rem', height: '2.75rem' }}
      >
        <Icon className="icon-lg" aria-hidden="true" />
      </div>

      <div>
        <p className="fw-semibold mb-1">{title}</p>
        {description ? (
          <p className="text-body-secondary small mb-0 mx-auto text-pretty" style={{ maxWidth: '24rem' }}>
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

/** Estado de erro com ação de nova tentativa. */
export function ErrorState({ title, description, onRetry, className }) {
  const { t } = useLocale()

  return (
    <div
      role="alert"
      className={cn(
        'alert alert-danger d-flex flex-column align-items-center justify-content-center gap-3 text-center py-4',
        className,
      )}
    >
      <AlertCircle className="icon-xl" aria-hidden="true" />

      <div>
        <p className="fw-semibold mb-1">{title ?? t('common.errorTitle')}</p>
        {description ? (
          <p className="small mb-0 mx-auto text-pretty" style={{ maxWidth: '30rem' }}>
            {description}
          </p>
        ) : null}
      </div>

      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="icon" aria-hidden="true" />
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}
