import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { CategoryCard } from '@/components/categories/CategoryCard'
import { useCategoriesWithCounts } from '@/hooks/use-queries'
import { useDocumentMeta } from '@/hooks/use-utils'

export function CategoriesPage() {
  const { data, isPending, isError, error, refetch } = useCategoriesWithCounts()

  useDocumentMeta({
    title: 'Categorias',
    description:
      'Navegue pelo catálogo por categoria: pesquisa, tecnologia, extensão, empreendedorismo e mais.',
  })

  return (
    <>
      <div className="border-border bg-muted/40 border-b">
        <div className="container-page py-12 sm:py-16">
          <h1 className="font-display text-3xl sm:text-4xl">Categorias</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed text-pretty">
            As categorias organizam o catálogo por natureza da iniciativa. Elas são definidas pela
            administração da plataforma e podem mudar conforme a instituição evolui.
          </p>
        </div>
      </div>

      <div className="container-page py-12">
        {isError ? (
          <ErrorState description={error?.message} onRetry={() => refetch()} />
        ) : isPending ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-80" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title="Nenhuma categoria cadastrada"
            description="Assim que a administração criar as primeiras categorias, elas aparecerão aqui."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
