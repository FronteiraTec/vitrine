import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { InitiativeGridSkeleton, Skeleton } from '@/components/ui/skeleton'
import { InitiativeGrid } from '@/components/initiatives/InitiativeCard'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { useCategoryBySlug, useInitiativeSearch } from '@/hooks/use-queries'
import { useDocumentMeta } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { PAGE_SIZE } from '@/lib/constants'
import { NotFoundPage } from './NotFoundPage'

function Breadcrumb({ category, catalogLang }) {
  const { t } = useLocale()

  return (
    <nav aria-label={t('common.breadcrumb')} className="text-body-secondary mb-4 fs-7">
      <ol className="d-flex flex-wrap align-items-center gap-1">
        <li>
          <Link to="/">
            {t('common.home')}
          </Link>
        </li>
        <ChevronRight className="icon-sm flex-shrink-0" aria-hidden="true" />
        <li>
          <Link to="/categorias">
            {t('categories.title')}
          </Link>
        </li>
        <ChevronRight className="icon-sm flex-shrink-0" aria-hidden="true" />
        <li className="text-body fw-medium" aria-current="page" lang={catalogLang}>
          {category.name}
        </li>
      </ol>
    </nav>
  )
}

export function CategoryPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(1)
  const { t, locale } = useLocale()
  // Nome e descrição da categoria são cadastrados em português.
  const catalogLang = locale === DEFAULT_LOCALE ? undefined : DEFAULT_LOCALE

  const {
    data: category,
    isPending: categoryPending,
    isError: categoryError,
    refetch: refetchCategory,
  } = useCategoryBySlug(slug)

  const { data, isPending, isFetching, isError, error, refetch } = useInitiativeSearch(
    {
      categoryIds: category ? [category.id] : [],
      page,
      pageSize: PAGE_SIZE,
      sort: 'recent',
    },
    { ready: Boolean(category) },
  )

  useDocumentMeta({
    title: category?.name,
    description:
      category?.description ?? t('category.metaDescription', { name: category?.name ?? '' }),
    image: category?.image_url,
  })

  if (categoryPending) {
    return (
      <div className="container py-5">
        <Skeleton className="h-fx-8 w-fx-64" />
        <Skeleton className="mt-3 h-fx-4 w-100 mw-xl" />
        <div className="mt-5">
          <InitiativeGridSkeleton count={6} />
        </div>
      </div>
    )
  }

  if (categoryError) {
    return (
      <div className="container py-5">
        <ErrorState description={t('category.loadError')} onRetry={() => refetchCategory()} />
      </div>
    )
  }

  if (!category) {
    return (
      <NotFoundPage
        title={t('category.notFoundTitle')}
        description={t('category.notFoundDescription')}
      />
    )
  }

  const results = data?.items ?? []

  return (
    <>
      <div className="border bg-body-tertiary border-bottom">
        <div className="container py-5 py-sm-5">
          <Breadcrumb category={category} catalogLang={catalogLang} />

          <div className="d-flex flex-column gap-3 flex-sm-row align-items-sm-start">
            <span className="bg-primary text-white d-flex h-fx-14 w-fx-14 flex-shrink-0 align-items-center justify-content-center rounded-3">
              <CategoryIcon name={category.icon} className="h-fx-7 w-fx-7" />
            </span>
            <div className="space-y-2">
              <h1 className="fw-bold fs-3 fs-sm-2" lang={catalogLang}>
                {category.name}
              </h1>
              {category.description ? (
                <p className="text-body-secondary mw-2xl lh-base text-pretty" lang={catalogLang}>
                  {category.description}
                </p>
              ) : null}
              <p className="text-body-secondary fs-7 tabular-nums">
                {t('category.published', { count: data?.total ?? 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container space-y-5 py-5">
        {isError ? (
          <ErrorState description={error?.message} onRetry={() => refetch()} />
        ) : isPending ? (
          <InitiativeGridSkeleton count={6} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={t('category.emptyTitle')}
            description={t('category.emptyDescription')}
            action={
              <Button variant="outline" asChild>
                <Link to="/buscar">{t('common.exploreAll')}</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className={isFetching ? 'opacity-50' : undefined}>
              <InitiativeGrid initiatives={results} />
            </div>
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              onPageChange={(next) => {
                setPage(next)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </>
        )}
      </div>
    </>
  )
}
