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
import { useDocumentMeta } from '@/hooks/use-utils'
import { PAGE_SIZE } from '@/lib/constants'
import { NotFoundPage } from './NotFoundPage'

function Breadcrumb({ category }) {
  return (
    <nav aria-label="Trilha de navegação" className="text-muted-foreground mb-6 text-sm">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link to="/" className="hover:text-foreground transition-colors">
            Início
          </Link>
        </li>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
        <li>
          <Link to="/categorias" className="hover:text-foreground transition-colors">
            Categorias
          </Link>
        </li>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
        <li className="text-foreground font-medium" aria-current="page">
          {category.name}
        </li>
      </ol>
    </nav>
  )
}

export function CategoryPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(1)

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
      category?.description ??
      `Iniciativas da categoria ${category?.name ?? ''} no catálogo institucional.`,
    image: category?.image_url,
  })

  if (categoryPending) {
    return (
      <div className="container-page py-12">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        <div className="mt-12">
          <InitiativeGridSkeleton count={6} />
        </div>
      </div>
    )
  }

  if (categoryError) {
    return (
      <div className="container-page py-16">
        <ErrorState description="Não foi possível carregar esta categoria." onRetry={() => refetchCategory()} />
      </div>
    )
  }

  if (!category) {
    return (
      <NotFoundPage
        title="Categoria não encontrada"
        description="A categoria que você procura não existe ou foi removida do catálogo."
      />
    )
  }

  const results = data?.items ?? []

  return (
    <>
      <div className="border-border bg-muted/40 border-b">
        <div className="container-page py-10 sm:py-14">
          <Breadcrumb category={category} />

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="bg-primary text-primary-foreground flex size-14 shrink-0 items-center justify-center rounded-lg">
              <CategoryIcon name={category.icon} className="size-7" />
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-3xl sm:text-4xl">{category.name}</h1>
              {category.description ? (
                <p className="text-muted-foreground max-w-2xl leading-relaxed text-pretty">
                  {category.description}
                </p>
              ) : null}
              <p className="text-muted-foreground text-sm tabular-nums">
                {data?.total ?? 0}{' '}
                {data?.total === 1 ? 'iniciativa publicada' : 'iniciativas publicadas'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page space-y-8 py-12">
        {isError ? (
          <ErrorState description={error?.message} onRetry={() => refetch()} />
        ) : isPending ? (
          <InitiativeGridSkeleton count={6} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nenhuma iniciativa nesta categoria"
            description="Ainda não há conteúdo publicado aqui. Explore as outras categorias do catálogo."
            action={
              <Button variant="outline" asChild>
                <Link to="/buscar">Explorar todas as iniciativas</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
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
