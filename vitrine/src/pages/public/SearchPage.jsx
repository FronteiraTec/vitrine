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
import { useDebouncedValue } from '@/hooks/use-utils'
import { useDocumentMeta } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE } from '@/i18n/config'
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
  const { t, locale } = useLocale()
  if (chips.length === 0) return null
  // O rótulo do filtro é o nome da categoria, área ou tag — texto do banco.
  const catalogLang = locale === DEFAULT_LOCALE ? undefined : DEFAULT_LOCALE

  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      <span className="text-body-secondary fs-8 fw-medium">{t('search.activeFilters')}</span>
      {chips.map((chip) => (
        <button
          key={`${chip.group}-${chip.value}`}
          type="button"
          onClick={() => onRemove(chip.group, chip.value)}
          className="bg-primary-subtle text-primary-emphasis d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fs-8 fw-medium"
        >
          <span lang={catalogLang}>{chip.label}</span>
          <X className="icon-sm" aria-hidden="true" />
          <span className="visually-hidden">{t('search.removeFilter')}</span>
        </button>
      ))}
      <Button variant="subtle" size="sm" onClick={onClear}>
        {t('search.clear')}
      </Button>
    </div>
  )
}

export function SearchPage() {
  const { t } = useLocale()
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
    title: state.q ? t('search.metaTitleQuery', { query: state.q }) : t('search.metaTitle'),
    description: t('search.metaDescription'),
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
        label: categoryLabels.get(id) ?? t('search.categoryFallback'),
      })),
      ...state.areas.map((name) => ({ group: 'areas', value: name, label: name })),
      ...state.tags.map((id) => ({
        group: 'tags',
        value: id,
        label: tagLabels.get(id) ?? t('search.tagFallback'),
      })),
    ]
  }, [state, categories, tags, t])

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
      <div className="border bg-body-tertiary border-bottom">
        <div className="container py-5 py-sm-5">
          <h1 className="fw-bold fs-3 fs-sm-2">{t('search.title')}</h1>
          <p className="text-body-secondary mt-2 mw-2xl text-pretty">{t('search.description')}</p>

          <div className="mt-4 d-flex flex-column gap-2 flex-sm-row">
            <div className="position-relative flex-grow-1">
              <label htmlFor="busca" className="visually-hidden">
                {t('search.inputLabel')}
              </label>
              <Search
                className="text-body-secondary pe-none position-absolute top-50 start-0 icon translate-middle-y"
                aria-hidden="true"
              />
              <Input
                id="busca"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={t('search.placeholder')}
                className="h-fx-12 ps-5"
              />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="lg" className="d-lg-none">
                  <SlidersHorizontal aria-hidden="true" />
                  {t('search.filters')}
                  {activeFilterCount > 0 ? (
                    <Badge size="sm" variant="brand" className="ms-1 tabular-nums">
                      {activeFilterCount}
                    </Badge>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" title={t('search.filters')} className="d-lg-none">
                <div className="p-3">{panel('mobile')}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="container py-5">
        <div className="d-flex gap-5">
          <aside className="d-none w-fx-64 flex-shrink-0 d-lg-block">
            <div className="position-sticky top-0">{panel('desktop')}</div>
          </aside>

          <div className="min-w-0 flex-grow-1 space-y-4">
            <div className="d-flex flex-column gap-2 flex-sm-row align-items-sm-center justify-content-sm-between">
              <p className="text-body-secondary fs-7" aria-live="polite" aria-atomic="true">
                {showSkeleton ? (
                  t('search.searching')
                ) : (
                  <>
                    <strong className="text-body fw-semibold tabular-nums">
                      {data?.total ?? 0}
                    </strong>{' '}
                    {t('search.found', { count: data?.total ?? 0 })}
                    {state.q ? (
                      <>
                        {' '}
                        {t('search.for')} <strong className="text-body">“{state.q}”</strong>
                      </>
                    ) : null}
                  </>
                )}
              </p>

              <div className="d-flex align-items-center gap-2">
                <label htmlFor="ordenacao" className="text-body-secondary flex-shrink-0 fs-7">
                  {t('search.sortLabel')}
                </label>
                <Select value={state.sort} onValueChange={(value) => update({ sort: value })}>
                  <SelectTrigger id="ordenacao" size="sm" className="w-fx-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(`sort.${option.value}`)}
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
                title={t('search.emptyTitle')}
                description={
                  activeFilterCount > 0 || state.q
                    ? t('search.emptyFiltered')
                    : t('search.emptyCatalog')
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
                      {t('search.clearAll')}
                    </Button>
                  ) : null
                }
              />
            ) : (
              <>
                {/* Opacidade sutil enquanto a próxima página carrega, sem remover o conteúdo */}
                <div className={isFetching ? 'opacity-50' : undefined}>
                  <InitiativeGrid initiatives={results} />
                </div>

                <Pagination
                  page={data.page}
                  pageCount={data.pageCount}
                  onPageChange={(page) => {
                    update({ page }, { resetPage: false })
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="pt-3"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
