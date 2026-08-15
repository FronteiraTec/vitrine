import { useSearchParams } from 'react-router-dom'
import { Newspaper, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { NewsGrid } from '@/components/news/NewsCard'
import { useNewsSearch } from '@/hooks/use-queries'
import { useDebouncedValue, useDocumentMeta } from '@/hooks/use-utils'

/**
 * Listagem pública de notícias.
 *
 * O estado da busca e a página vivem na query string, como no restante da
 * vitrine: o resultado é compartilhável, sobrevive ao recarregar e o botão
 * "voltar" funciona.
 */
export function NewsPage() {
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('pagina')) || 1)
  const debouncedTerm = useDebouncedValue(q)

  const { data, isPending, isError, error, refetch } = useNewsSearch({ q: debouncedTerm, page })

  useDocumentMeta({
    title: 'Notícias',
    description: 'Comunicados e novidades das iniciativas da instituição.',
  })

  function update(next, { resetPage = true } = {}) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === '' || value == null) merged.delete(key)
      else merged.set(key, String(value))
    }
    if (resetPage) merged.delete('pagina')
    setParams(merged, { replace: true })
  }

  return (
    <>
      <section className="border-border bg-muted/40 border-b">
        <div className="container-page py-12 sm:py-16">
          <p className="text-brand mb-2 text-xs font-semibold tracking-[0.12em] uppercase">
            Notícias
          </p>
          <h1 className="font-display text-3xl leading-tight text-balance-title sm:text-4xl">
            Novidades e comunicados
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed text-pretty">
            Acompanhe os avanços das iniciativas, editais, eventos e avisos da instituição.
          </p>

          <div className="relative mt-7 max-w-lg" role="search">
            <label htmlFor="news-search" className="sr-only">
              Pesquisar notícias
            </label>
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="news-search"
              type="search"
              value={q}
              onChange={(event) => update({ q: event.target.value })}
              placeholder="Pesquisar por título ou assunto…"
              className="h-11 pl-10"
            />
          </div>
        </div>
      </section>

      <div className="container-page py-12">
        {isError ? (
          <ErrorState description={error?.message} onRetry={() => refetch()} />
        ) : isPending ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-80" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={q ? 'Nenhuma notícia encontrada' : 'Nenhuma notícia publicada ainda'}
            description={
              q
                ? 'Tente outro termo ou limpe a busca para ver tudo que já foi publicado.'
                : 'Assim que a primeira notícia for publicada, ela aparece aqui.'
            }
          />
        ) : (
          <>
            <p className="text-muted-foreground mb-6 text-sm" role="status">
              {data.total} {data.total === 1 ? 'notícia encontrada' : 'notícias encontradas'}
            </p>

            <NewsGrid items={data.items} />

            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              onPageChange={(next) => {
                update({ pagina: next }, { resetPage: false })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="pt-10"
            />
          </>
        )}
      </div>
    </>
  )
}
