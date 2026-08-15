import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import { Image } from '@/components/ui/image'
import { Badge } from '@/components/ui/badge'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { cn, truncate } from '@/lib/utils'

function locationLabel(initiative) {
  return [initiative.location, initiative.city, initiative.state].filter(Boolean).join(' · ')
}

/**
 * Cartão de iniciativa da vitrine pública.
 *
 * O card inteiro é clicável por uma "stretched link" — o link real fica no
 * título, então leitores de tela anunciam um único link com nome significativo,
 * e não um bloco genérico. As tags ficam acima da camada de clique para não
 * serem engolidas pela área do link.
 */
export function InitiativeCard({ initiative, eager = false, className }) {
  const { name, slug, short_description: summary, cover_image: cover, category, tags } = initiative
  const location = locationLabel(initiative)
  const visibleTags = (tags ?? []).slice(0, 3)

  return (
    <article
      className={cn(
        'group border-border bg-card relative flex flex-col overflow-hidden rounded-lg border transition-all duration-200',
        'hover:border-brand/35 hover:shadow-float focus-within:border-brand/35 focus-within:shadow-float',
        className,
      )}
    >
      <Image
        src={cover}
        alt=""
        eager={eager}
        ratio="aspect-[16/10]"
        className="transition-transform duration-500 group-hover:scale-[1.03]"
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        {category ? (
          <p className="text-brand flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] uppercase">
            <CategoryIcon name={category.icon} className="size-3.5" />
            {category.name}
          </p>
        ) : null}

        <h3 className="text-[1.0625rem] leading-snug font-semibold tracking-tight">
          <Link
            to={`/iniciativa/${slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {name}
          </Link>
        </h3>

        {summary ? (
          <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
            {truncate(summary, 165)}
          </p>
        ) : null}

        <div className="mt-auto space-y-3 pt-1">
          {visibleTags.length ? (
            <ul className="relative z-10 flex flex-wrap gap-1.5">
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

          <div className="border-border flex items-center justify-between gap-3 border-t pt-3">
            {location ? (
              <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{location}</span>
              </p>
            ) : (
              <span />
            )}
            <span className="text-brand flex shrink-0 items-center gap-1 text-xs font-medium">
              Ver detalhes
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

/** Grade responsiva padrão: 1 → 2 → 3 colunas. */
export function InitiativeGrid({ initiatives, eagerCount = 3, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
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
