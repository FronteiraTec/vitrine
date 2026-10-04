import { Link, useParams, useSearchParams } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { NewsGrid } from '@/components/news/NewsCard'
import { useAuthor, useAuthorNews } from '@/hooks/use-queries'
import { useDocumentMeta, useSite, useStructuredData } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE, LOCALES, newsListPath } from '@/i18n/config'
import { authorJsonLd, breadcrumbJsonLd, truncateAt } from '@/lib/seo'

/**
 * Página pública do autor.
 *
 * Existe por duas razões, nesta ordem:
 *
 * 1. É o destino do `rel="author"` da assinatura e da URL do campo `author` no
 *    JSON-LD da notícia. Sem ela, o dado estruturado nomeia alguém sem
 *    qualquer forma de verificar quem é.
 *
 * 2. Autoria identificável é um dos critérios de transparência que o Google
 *    observa em veículos de notícia — junto de expediente, política editorial
 *    e canal de contato.
 *
 * Só aparece quem tem notícia publicada: o recorte vem da policy da migration
 * 0012, não de um filtro daqui. Um endereço de autor sem nada assinado seria
 * uma página vazia para o leitor e uma URL rasa para o rastreador.
 */
export function AuthorPage() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('pagina')) || 1)

  const { t, rich, locale, formatDate } = useLocale()
  // A página do autor não tem endereço por idioma: as notícias aparecem na
  // língua do leitor quando há tradução, e no original quando não há.
  const { data: author, isPending, isError, error, refetch } = useAuthor(slug)
  const { data: news } = useAuthorNews(author?.id, page, locale)
  // Nome, cargo e biografia são cadastrados em português.
  const catalogLang = locale === DEFAULT_LOCALE ? undefined : DEFAULT_LOCALE

  const site = useSite()

  useDocumentMeta({
    title: author?.name ?? t('author.metaFallbackTitle'),
    description: author?.bio
      ? truncateAt(author.bio, 200)
      : author?.name
        ? t('author.metaDescription', { name: author.name })
        : undefined,
    image: author?.avatar_url ?? undefined,
    path: slug ? `/autor/${slug}` : undefined,
    type: 'profile',
  })

  useStructuredData(
    author
      ? [
          authorJsonLd({ author, site }),
          breadcrumbJsonLd({
            site,
            trail: [
              { name: LOCALES[locale].seo.home, path: '/' },
              { name: LOCALES[locale].seo.news, path: newsListPath(locale) },
              { name: author.name, path: `/autor/${author.slug}` },
            ],
          }),
        ]
      : null,
  )

  if (isPending) {
    return (
      <div className="container space-y-4 py-5">
        <Skeleton className="icon-sm rounded-pill" />
        <Skeleton className="h-fx-9 w-fx-64" />
        <Skeleton className="h-fx-20 w-100 mw-2xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container py-5">
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!author) {
    return (
      <div className="container py-5">
        <EmptyState
          icon={UserRound}
          title={t('author.notFoundTitle')}
          description={t('author.notFoundDescription')}
          action={
            <Button variant="outline" asChild>
              <Link to={newsListPath(locale)}>{t('news.detail.seeAll')}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <>
      <header className="border bg-body-tertiary border-bottom">
        <div className="container d-flex flex-column gap-3 py-5 flex-sm-row align-items-sm-start py-sm-5">
          <Avatar src={author.avatar_url} name={author.name} size="lg" className="icon-sm" />

          <div className="min-w-0 space-y-2">
            <div>
              <h1 className="fw-bold fs-3 lh-sm text-balance fs-sm-2">
                {author.name}
              </h1>
              {author.job_title ? (
                <p className="text-primary mt-1 fs-7 fw-semibold" lang={catalogLang}>
                  {author.job_title}
                </p>
              ) : null}
            </div>

            {author.bio ? (
              <p className="text-body-secondary mw-2xl lh-base text-pretty" lang={catalogLang}>
                {author.bio}
              </p>
            ) : null}

            {/* A data de atualização do perfil é pedida explicitamente pelas
                boas práticas de transparência editorial: diz ao leitor quão
                atual é a informação sobre quem assina. Só aparece quando existe
                — o carimbo nasce na primeira edição do perfil, e inventar uma
                data para quem nunca editou não informaria nada. */}
            {author.profile_updated_at ? (
              <p className="text-body-secondary fs-8">
                {rich(
                  'author.updatedAt',
                  {
                    time: (text) => (
                      <time dateTime={new Date(author.profile_updated_at).toISOString()}>
                        {text}
                      </time>
                    ),
                  },
                  { date: formatDate(author.profile_updated_at) },
                )}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="container py-5">
        <h2 className="fw-bold mb-4 fs-4">
          {news?.total ? t('author.newsCount', { count: news.total }) : t('author.newsTitle')}
        </h2>

        {!news ? (
          <div className="d-grid grid-cols-1 gap-3 grid-cols-sm-2 grid-cols-lg-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-fx-80" />
            ))}
          </div>
        ) : news.items.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title={t('author.emptyTitle')}
            description={t('author.emptyDescription')}
          />
        ) : (
          <>
            <NewsGrid items={news.items} />
            <Pagination
              page={news.page}
              pageCount={news.pageCount}
              onPageChange={(next) => {
                const merged = new URLSearchParams(params)
                merged.set('pagina', String(next))
                setParams(merged, { replace: true })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="pt-5"
            />
          </>
        )}
      </div>
    </>
  )
}
