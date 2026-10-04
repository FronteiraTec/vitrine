import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { CategoryCard } from '@/components/categories/CategoryCard'
import { useCategoriesWithCounts } from '@/hooks/use-queries'
import { useDocumentMeta } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'

export function CategoriesPage() {
  const { data, isPending, isError, error, refetch } = useCategoriesWithCounts()
  const { t } = useLocale()

  useDocumentMeta({
    title: t('categories.title'),
    description: t('categories.metaDescription'),
  })

  return (
    <>
      <div className="border bg-body-tertiary border-bottom">
        <div className="container py-5 py-sm-5">
          <h1 className="fw-bold fs-3 fs-sm-2">{t('categories.title')}</h1>
          <p className="text-body-secondary mt-2 mw-2xl lh-base text-pretty">
            {t('categories.description')}
          </p>
        </div>
      </div>

      <div className="container py-5">
        {isError ? (
          <ErrorState description={error?.message} onRetry={() => refetch()} />
        ) : isPending ? (
          <div className="d-grid grid-cols-1 gap-3 grid-cols-sm-2 grid-cols-lg-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-fx-80" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title={t('categories.emptyTitle')}
            description={t('categories.emptyDescription')}
          />
        ) : (
          <div className="d-grid grid-cols-1 gap-3 grid-cols-sm-2 grid-cols-lg-3">
            {data.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
