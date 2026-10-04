import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Image } from '@/components/ui/image'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { useLocale } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { cn, truncate } from '@/lib/utils'

/**
 * Cartão de categoria com imagem de capa, configurada em /admin/categorias.
 *
 * A faixa é sempre renderizada, mesmo sem imagem: categorias com e sem capa
 * aparecem lado a lado no mesmo trilho, e cartões de formatos diferentes
 * deixariam a fileira desalinhada. Sem imagem, a faixa exibe o ícone da
 * categoria sobre o tom de acento — o mesmo ícone que o cartão mostrava antes,
 * agora no papel de reserva.
 */
export function CategoryCard({ category, className }) {
  const count = category.published_count
  const { t, locale } = useLocale()
  const catalogLang = locale === DEFAULT_LOCALE ? undefined : DEFAULT_LOCALE

  return (
    <Link
      to={`/categoria/${category.slug}`}
      className={cn(
        ' border bg-body   d-flex flex-column overflow-hidden rounded-3 border  ',
        className,
      )}
    >
      <div className="position-relative">
        {category.image_url ? (
          <Image
            src={category.image_url}
            alt=""
            ratio="ratio-16x9"
                        fallbackIcon={(props) => <CategoryIcon name={category.icon} {...props} />}
          />
        ) : (
          <div className="bg-primary-subtle text-primary-emphasis/70 d-flex align-items-center justify-content-center">
            <CategoryIcon name={category.icon} className="h-fx-10 w-fx-10" />
          </div>
        )}

        {/* A seta ganha superfície própria porque flutua sobre a imagem, onde
            não há contraste garantido com o que estiver atrás. */}
        <span className="bg-body/90 text-body-secondary position-absolute top-0 end-0 d-flex h-fx-8 w-fx-8 align-items-center justify-content-center rounded-2 shadow-sm">
          <ArrowUpRight
            className="icon"
            aria-hidden="true"
          />
        </span>
      </div>

      <div className="d-flex flex-grow-1 flex-column gap-2 p-3">
        <div className="space-y-1" lang={catalogLang}>
          <h3 className="lh-sm fw-semibold">{category.name}</h3>
          {category.description ? (
            <p className="text-body-secondary line-clamp-2 fs-7 lh-base">
              {truncate(category.description, 110)}
            </p>
          ) : null}
        </div>

        {typeof count === 'number' ? (
          <p className="text-body-secondary mt-auto pt-1 fs-8 tabular-nums">
            {count === 0 ? t('categories.cardNone') : t('categories.cardCount', { count })}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
