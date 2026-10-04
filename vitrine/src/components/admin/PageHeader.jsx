import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({ title, description, actions, backTo, backLabel = 'Voltar', className }) {
  return (
    <header className={cn('mb-4 space-y-3', className)}>
      {backTo ? (
        <Link
          to={backTo}
          className="text-body-secondary d-inline-flex align-items-center gap-1 fs-7"
        >
          <ArrowLeft className="icon" aria-hidden="true" />
          {backLabel}
        </Link>
      ) : null}

      <div className="d-flex flex-column gap-3 flex-sm-row align-items-sm-start justify-content-sm-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-truncate fs-4 fw-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-body-secondary mw-2xl fs-7 text-pretty">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="d-flex flex-shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
