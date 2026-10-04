import { Link } from 'react-router-dom'
import { Image } from '@/components/ui/image'
import { Badge } from '@/components/ui/badge'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { useLocale } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { cn, truncate } from '@/lib/utils'

/**
 * Cartão de iniciativa da vitrine pública.
 *
 * O card inteiro é clicável por uma "stretched link" — o link real fica no
 * título, então leitores de tela anunciam um único link com nome significativo,
 * e não um bloco genérico. As tags ficam acima da camada de clique para não
 * serem engolidas pela área do link.
 *
 * Não há rodapé com "Ver detalhes": o cartão todo já é o alvo do clique, e um
 * rótulo repetindo isso em cada item da grade só somava ruído. A localização
 * também saiu daqui — ela continua na página da iniciativa, onde há espaço para
 * o endereço inteiro sem truncar.
 */
export function InitiativeCard({ initiative, eager = false, className }) {
  const { name, slug, short_description: summary, cover_image: cover, category, tags } = initiative
  const visibleTags = (tags ?? []).slice(0, 3)
  // Iniciativas são cadastradas em português. Com a interface em outro idioma,
  // o cartão declara o idioma do próprio texto — o leitor de tela troca de voz
  // em vez de ler português com pronúncia inglesa.
  const { locale } = useLocale()
  const catalogLang = locale === DEFAULT_LOCALE ? undefined : DEFAULT_LOCALE

  return (
    <article
      className={cn(
        'border bg-body position-relative d-flex flex-column overflow-hidden rounded-3',
        'card-interactive',
        className,
      )}
    >
      <Image
        src={cover}
        alt=""
        eager={eager}
        ratio="ratio-16x10"
      />

      <div className="d-flex flex-grow-1 flex-column gap-2 p-3" lang={catalogLang}>
        {category ? (
          <p className="text-primary d-flex align-items-center gap-1 fs-8 fw-semibold text-uppercase">
            <CategoryIcon name={category.icon} className="icon-sm" />
            {category.name}
          </p>
        ) : null}

        <h3 className="lh-sm fw-semibold tracking-tight">
          <Link
            to={`/iniciativa/${slug}`}
            className="stretched-link"
          >
            {name}
          </Link>
        </h3>

        {summary ? (
          <p className="text-body-secondary line-clamp-3 fs-7 lh-base">
            {truncate(summary, 165)}
          </p>
        ) : null}

        {visibleTags.length ? (
          <ul className="position-relative z-2 mt-auto d-flex flex-wrap gap-1 pt-1">
            {visibleTags.map((tag) => (
              <li key={tag.id}>
                <Badge size="sm" variant="neutral">
                  {tag.name}
                </Badge>
              </li>
            ))}
            {tags.length > visibleTags.length ? (
              <li>
                <Badge size="sm" variant="outline">
                  +{tags.length - visibleTags.length}
                </Badge>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </article>
  )
}

/** Grade responsiva padrão: 1 → 2 → 3 colunas. */
export function InitiativeGrid({ initiatives, eagerCount = 3, className }) {
  return (
    <div className={cn('d-grid grid-cols-1 gap-5 grid-cols-sm-2 grid-cols-lg-3', className)}>
      {initiatives.map((initiative, index) => (
        <InitiativeCard
          key={initiative.id}
          initiative={initiative}
          eager={index < eagerCount}
        />
      ))}
    </div>
  )
}
