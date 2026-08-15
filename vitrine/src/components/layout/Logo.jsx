import { Link } from 'react-router-dom'
import { useSiteSettings } from '@/hooks/use-queries'
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

  const content = (
    <>
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className="size-9 shrink-0 object-contain"
      />
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-xl tracking-tight">{brandName}</span>
          {brandTagline ? (
            <span
              className={cn(
                'mt-0.5 text-[0.625rem] font-medium tracking-[0.16em] uppercase',
                inverted ? 'opacity-70' : 'text-muted-foreground',
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
    'flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-85',
    className,
  )

  if (!to) return <span className={classes}>{content}</span>

  return (
    <Link to={to} className={classes} aria-label={`${brandName} — página inicial`}>
      {content}
    </Link>
  )
}
