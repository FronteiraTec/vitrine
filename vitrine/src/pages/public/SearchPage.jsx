import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchX, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { InitiativeGridSkeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InitiativeGrid } from '@/components/initiatives/InitiativeCard'
import { FilterPanel } from '@/components/initiatives/FilterPanel'
import {
  useAreas,
  useCategoriesWithCounts,
  useInitiativeSearch,
  useTags,
} from '@/hooks/use-queries'
import { useDebouncedValue, useDocumentMeta } from '@/hooks/use-utils'
import { PAGE_SIZE, SORT_OPTIONS } from '@/lib/constants'
import { Search } from 'lucide-react'

const FILTER_KEYS = { categories: 'categoria', areas: 'area', tags: 'tag' }

/**
 * Estado da busca vive na URL: o resultado é compartilhável, sobrevive ao
 * recarregar a página e o botão "voltar" do navegador funciona como esperado.
 */
function useSearchState() {
  const [params, setParams] = useSearchParams()

  const state = useMemo(
    () => ({
      q: params.get('q') ?? '',
      categories: params.getAll(FILTER_KEYS.categories),
      areas: params.getAll(FILTER_KEYS.areas),
      tags: params.getAll(FILTER_KEYS.tags),
      sort: params.get('ordem') ?? 'recent',
      page: Math.max(1, Number(params.get('pagina') ?? 1) || 1),
    }),
    [params],
  )

  const update = useCallback(
    (changes, { resetPage = true } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)

          for (const [key, value] of Object.entries(changes)) {
            if (key === 'q') {
              value ? next.set('q', value) : next.delete('q')
            } else if (key === 'sort') {
              value && value !== 'recent' ? next.set('ordem', value) : next.delete('ordem')
            } else if (key === 'page') {
              value > 1 ? next.set('pagina', String(value)) : next.delete('pagina')
            } else if (FILTER_KEYS[key]) {
              next.delete(FILTER_KEYS[key])
              for (const item of value) next.append(FILTER_KEYS[key], item)
            }
          }

          if (resetPage && !('page' in changes)) next.delete('pagina')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return [state, update]
}

function ActiveFilterChips({ chips, onRemove, onClear }) {
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium">Filtros ativos:</span>
      {chips.map((chip) => (
        <button
          key={`${chip.group}-${chip.value}`}
          type="button"
          onClick={() => onRemove(chip.group, chip.value)}
          className="bg-accent text-accent-foreground ring-brand/20 hover:bg-brand hover:text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors"
        >
          {chip.label}
          <X className="size-3" aria-hidden="true" />
          <span className="sr-only">Remover filtro</span>
        </button>
      ))}
      <Button variant="subtle" size="sm" onClick={onClear}>
        Limpar
      </Button>
    </div>
  )
}

export function SearchPage() {
  const [state, update] = useSearchState()
  const [term, setTerm] = useState(state.q)
  const debouncedTerm = useDebouncedValue(term, 350)

  /*
   * Quando a URL muda por fora do campo (botão voltar, chip removido, link com
   * `?q=`), o campo precisa acompanhar. Ajustar o estado durante a renderização
   * é o padrão recomendado pelo React para isso — um efeito causaria um segundo
   * render e um piscar do valor antigo.
   */
  const [syncedQuery, setSyncedQuery] = useState(state.q)
  if (state.q !== syncedQuery) {
    setSyncedQuery(state.q)
    setTerm(state.q)
  }

  useDocumentMeta({
    title: state.q ? `Busca: ${state.q}` : 'Explorar iniciativas',
    description:
      'Pesquise projetos, laboratórios, grupos de pesquisa e programas por nome, área, categoria ou tema.',
  })

  const { data: categories = [], isPending: categoriesLoading } = useCategoriesWithCounts()
  const { data: areas = [] } = useAreas()
  const { data: tags = [] } = useTags()

  // Propaga o termo já debounced para a URL, que é a fonte de verdade da busca.
  useEffect(() => {
    if (debouncedTerm !== state.q) update({ q: debouncedTerm })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm])

  const filters = useMemo(
    () => ({
      q: state.q,
      categoryIds: state.categories,
      areas: state.areas,
      tagIds: state.tags,
      sort: state.sort,
      page: state.page,
      pageSize: PAGE_SIZE,
    }),
    [state],
  )

  const { data, isPending, isFetching, isError, error, refetch } = useInitiativeSearch(filters)

  const selected = {
    categories: state.categories,
    areas: state.areas,
    tags: state.tags,
  }

  const toggle = useCallback(
    (group, value) => {
      const current = selected[group]
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
      update({ [group]: next })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, update],
  )

  const clearFilters = useCallback(
    () => update({ categories: [], areas: [], tags: [] }),
    [update],
  )

  const chips = useMemo(() => {
    const categoryLabels = new Map(categories.map((item) => [item.id, item.name]))
    const tagLabels = new Map(tags.map((item) => [item.id, item.name]))
    return [
      ...state.categories.map((id) => ({
        group: 'categories',
        value: id,
        label: categoryLabels.get(id) ?? 'Categoria',
      })),
      ...state.areas.map((name) => ({ group: 'areas', value: name, label: name })),
      ...state.tags.map((id) => ({
        group: 'tags',
        value: id,
        label: tagLabels.get(id) ?? 'Tag',
      })),
    ]
  }, [state, categories, tags])

  const activeFilterCount = chips.length
  const showSkeleton = isPending
  const results = data?.items ?? []

  const panel = (idPrefix) => (
    <FilterPanel
      idPrefix={idPrefix}
      categories={categories}
      areas={areas}
      tags={tags}
      selected={selected}
      onToggle={toggle}
      onClear={clearFilters}
      loading={categoriesLoading}
    />
  )

  return (
    <>
      <div className="border-border bg-muted/40 border-b">
        <div className="container-page py-10 sm:py-14">
          <h1 className="font-display text-3xl sm:text-4xl">Explorar iniciativas</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
            Pesquise por nome, descrição, tema, área de atuação, responsável ou localização.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor="busca" className="sr-only">
                Pesquisar iniciativas
              </label>
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                id="busca"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Pesquisar iniciativas…"
                className="h-12 pl-11"
              />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="lg" className="lg:hidden">
                  <SlidersHorizontal aria-hidden="true" />
                  Filtros
                  {activeFilterCount > 0 ? (
                    <Badge size="sm" variant="brand" className="ml-0.5 tabular-nums">
                      {activeFilterCount}
                    </Badge>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" title="Filtros" className="lg:hidden">
                <div className="p-5">{panel('mobile')}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="container-page py-10">
        <div className="flex gap-10">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24">{panel('desktop')}</div>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-sm" aria-live="polite" aria-atomic="true">
                {showSkeleton ? (
                  'Buscando iniciativas…'
                ) : (
                  <>
                    <strong className="text-foreground font-semibold tabular-nums">
                      {data?.total ?? 0}
                    </strong>{' '}
                    {data?.total === 1 ? 'iniciativa encontrada' : 'iniciativas encontradas'}
                    {state.q ? (
                      <>
                        {' '}
                        para <strong className="text-foreground">“{state.q}”</strong>
                      </>
                    ) : null}
                  </>
                )}
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor="ordenacao" className="text-muted-foreground shrink-0 text-sm">
                  Ordenar
                </label>
                <Select value={state.sort} onValueChange={(value) => update({ sort: value })}>
                  <SelectTrigger id="ordenacao" size="sm" className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ActiveFilterChips chips={chips} onRemove={toggle} onClear={clearFilters} />

            {isError ? (
              <ErrorState description={error?.message} onRetry={() => refetch()} />
            ) : showSkeleton ? (
              <InitiativeGridSkeleton count={6} />
            ) : results.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Nenhuma iniciativa encontrada"
                description={
                  activeFilterCount > 0 || state.q
                    ? 'Tente remover alguns filtros ou usar termos mais amplos na busca.'
                    : 'Ainda não há iniciativas publicadas no catálogo.'
                }
                action={
                  activeFilterCount > 0 || state.q ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTerm('')
                        update({ q: '', categories: [], areas: [], tags: [] })
                      }}
                    >
                      Limpar busca e filtros
                    </Button>
                  ) : null
                }
              />
            ) : (
              <>
                {/* Opacidade sutil enquanto a próxima página carrega, sem remover o conteúdo */}
                <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
                  <InitiativeGrid initiatives={results} />
                </div>

                <Pagination
                  page={data.page}
                  pageCount={data.pageCount}
                  onPageChange={(page) => {
                    update({ page }, { resetPage: false })
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="pt-4"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
