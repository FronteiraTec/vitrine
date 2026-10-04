import { Link } from 'react-router-dom'
import { Newspaper } from 'lucide-react'
import { Image } from '@/components/ui/image'
import { useLocale } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE, LOCALES, newsArticlePath } from '@/i18n/config'
import { cn, truncate } from '@/lib/utils'

/**
 * Cartão de notícia. A data usa `published_at` com recuo para `created_at`:
 * uma notícia recém-publicada sempre tem o primeiro, mas o rascunho listado no
 * painel ainda não — e um cartão sem data ficaria truncado.
 *
 * O link vai para a URL do idioma em que o cartão está (`item.locale`). Quando
 * o cartão é um RECUO — a notícia não tem tradução no idioma da página e
 * aparece no original —, o texto dele ganha `lang` próprio, para o leitor de
 * tela trocar de voz, e um aviso visível do idioma, para ninguém achar que a
 * tradução quebrou.
 */
export function NewsCard({ item, className, featured = false }) {
  const { locale, formatDate, t, languageName } = useLocale()
  const date = item.published_at ?? item.created_at
  const itemLocale = LOCALES[item.locale] ? item.locale : DEFAULT_LOCALE
  const fallback = itemLocale !== locale
  const lang = fallback ? itemLocale : undefined

  return (
    <article className={className}>
      <Link
        to={newsArticlePath(itemLocale, item.slug)}
        hrefLang={fallback ? LOCALES[itemLocale].hreflang : undefined}
        className="border bg-body d-flex h-100 flex-column overflow-hidden rounded-3"
      >
        <Image
          src={item.cover_image}
          alt=""
          ratio={featured ? 'ratio-16x9' : 'ratio-16x10'}
                    fallbackIcon={Newspaper}
        />

        <div className="d-flex flex-grow-1 flex-column gap-2 p-3">
          {/* Chapéu e data na mesma linha: são os dois rótulos que situam a
              notícia antes do título, e empilhá-los empurraria a manchete para
              baixo em todo cartão. */}
          {item.kicker || date || fallback ? (
            <div className="d-flex flex-wrap align-items-center column-gap-2 fs-8 tracking-wide text-uppercase">
              {item.kicker ? (
                <span className="text-primary fw-bold" lang={lang}>
                  {item.kicker}
                </span>
              ) : null}
              {item.kicker && date ? (
                <span className="text-body-secondary opacity-50" aria-hidden="true">
                  ·
                </span>
              ) : null}
              {date ? (
                <time dateTime={new Date(date).toISOString()} className="text-body-secondary">
                  {formatDate(date)}
                </time>
              ) : null}
              {fallback ? (
                <>
                  <span className="text-body-secondary opacity-50" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-body-secondary fw-semibold">
                    {t('news.card.inLanguage', { language: languageName(itemLocale) })}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}

          <h3
            lang={lang}
            className={cn(
              'lh-sm fw-semibold',
              featured ? 'fs-5' : 'fs-6',
            )}
          >
            {item.name}
          </h3>

          {item.excerpt ? (
            <p lang={lang} className="text-body-secondary line-clamp-3 fs-7 lh-base">
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
    <div className={cn('d-grid grid-cols-1 gap-5 grid-cols-sm-2 grid-cols-lg-3', className)}>
      {items.map((item) => (
        <NewsCard key={`${item.id}-${item.locale ?? DEFAULT_LOCALE}`} item={item} />
      ))}
    </div>
  )
}
