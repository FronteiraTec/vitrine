import { Link } from 'react-router-dom'
import { useSiteSettings } from '@/hooks/use-queries'
import { useLocale } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'

/**
 * Marca da plataforma: símbolo + wordmark, ambos definidos em
 * `/admin/aparencia`. Sem personalização, cai no logotipo da INNE e no nome
 * "Vitrine", que era o conteúdo fixo antes da tela existir.
 *
 * O símbolo é a marca em si, não uma versão colorida por tema — por isso segue
 * igual em fundos claros e escuros (`inverted` afeta só a legenda de apoio).
 */
export function Logo({ to = '/', className, compact = false, inverted = false }) {
  const { brandName, brandTagline, logoUrl } = useSiteSettings()
  const { t } = useLocale()

  const content = (
    <>
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className="h-fx-9 w-fx-9 flex-shrink-0 object-fit-contain"
      />
      {!compact ? (
        <span className="d-flex flex-column lh-1">
          <span className="fw-bold fs-5 tracking-tight">{brandName}</span>
          {brandTagline ? (
            <span
              className={cn(
                'mt-1 fw-medium text-uppercase',
                inverted ? 'opacity-75' : 'text-body-secondary',
              )}
            >
              {brandTagline}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  )

  const classes = cn(
    'd-flex align-items-center gap-2 rounded-2',
    className,
  )

  if (!to) return <span className={classes}>{content}</span>

  return (
    <Link to={to} className={classes} aria-label={t('logo.home', { brand: brandName })}>
      {content}
    </Link>
  )
}
