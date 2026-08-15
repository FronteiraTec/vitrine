import { Link } from 'react-router-dom'
import { Newspaper } from 'lucide-react'
import { Image } from '@/components/ui/image'
import { cn, formatDate, truncate } from '@/lib/utils'

/**
 * Cartão de notícia. A data usa `published_at` com recuo para `created_at`:
 * uma notícia recém-publicada sempre tem o primeiro, mas o rascunho listado no
 * painel ainda não — e um cartão sem data ficaria truncado.
 */
export function NewsCard({ item, className, featured = false }) {
  const date = item.published_at ?? item.created_at

  return (
    <article className={cn('group', className)}>
      <Link
        to={`/noticia/${item.slug}`}
        className="border-border bg-card hover:border-brand/35 hover:shadow-raised flex h-full flex-col overflow-hidden rounded-lg border transition-all duration-200"
      >
        <Image
          src={item.cover_image}
          alt=""
          ratio={featured ? 'aspect-[16/9]' : 'aspect-[16/10]'}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
          fallbackIcon={Newspaper}
        />

        <div className="flex flex-1 flex-col gap-2 p-5">
          {/* Chapéu e data na mesma linha: são os dois rótulos que situam a
              notícia antes do título, e empilhá-los empurraria a manchete para
              baixo em todo cartão. */}
          {item.kicker || date ? (
            <div className="flex flex-wrap items-center gap-x-2 text-xs tracking-wide uppercase">
              {item.kicker ? (
                <span className="text-brand font-bold">{item.kicker}</span>
              ) : null}
              {item.kicker && date ? (
                <span className="text-muted-foreground/50" aria-hidden="true">
                  ·
                </span>
              ) : null}
              {date ? (
                <time dateTime={new Date(date).toISOString()} className="text-muted-foreground">
                  {formatDate(date)}
                </time>
              ) : null}
            </div>
          ) : null}

          <h3
            className={cn(
              'group-hover:text-brand leading-snug font-semibold transition-colors',
              featured ? 'text-lg' : 'text-base',
            )}
          >
            {item.name}
          </h3>

          {item.excerpt ? (
            <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
              {truncate(item.excerpt, 160)}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  )
}

export function NewsGrid({ items, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  )
}
