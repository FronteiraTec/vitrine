import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { cn } from '@/lib/utils'

// `name` identifica o grupo independentemente do idioma: derivar o id do
// título traduzido mudaria o `aria-controls` a cada troca de língua.
function FilterGroup({ name, title, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = `filtro-${name}`

  return (
    <section className="filter-section border-bottom pb-3">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={id}
          className="text-body d-flex w-100 align-items-center justify-content-between gap-2 py-1 fs-7 fw-semibold"
        >
          <span className="d-flex align-items-center gap-2">
            {title}
            {count > 0 ? (
              <span className="bg-primary text-white d-grid icon-lg place-items-center rounded-pill fw-medium tabular-nums">
                {count}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn('text-body-secondary icon', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div id={id} hidden={!open} className="mt-2 space-y-2">
        {children}
      </div>
    </section>
  )
}

function CheckOption({ id, label, hint, checked, onChange, lang }) {
  return (
    <div className="d-flex align-items-start gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} className="mt-1" />
      <label
        htmlFor={id}
        className="text-body d-flex flex-grow-1 align-items-baseline justify-content-between gap-2 fs-7 lh-sm"
      >
        <span lang={lang}>{label}</span>
        {hint !== undefined ? (
          <span className="text-body-secondary flex-shrink-0 fs-8 tabular-nums">{hint}</span>
        ) : null}
      </label>
    </div>
  )
}

/**
 * Painel de filtros da busca. É o mesmo componente no desktop (coluna fixa) e
 * no mobile (dentro do drawer) — o layout externo é quem muda.
 */
export function FilterPanel({
  categories = [],
  areas = [],
  tags = [],
  selected,
  onToggle,
  onClear,
  loading = false,
  idPrefix = 'desktop',
}) {
  const { t, locale } = useLocale()
  // Nomes de categoria, área e tag são conteúdo do banco, em português.
  const catalogLang = locale === DEFAULT_LOCALE ? undefined : DEFAULT_LOCALE
  const activeCount =
    selected.categories.length + selected.areas.length + selected.tags.length

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, groupIndex) => (
          <div key={groupIndex} className="space-y-2">
            <Skeleton className="h-fx-4 w-fx-24" />
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-fx-4 w-100" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="d-flex align-items-center justify-content-between gap-2">
        <h2 className="fs-7 fw-semibold">{t('filters.title')}</h2>
        {activeCount > 0 ? (
          <Button variant="subtle" size="sm" onClick={onClear} className="me-0">
            {t('filters.clearAll')}
          </Button>
        ) : null}
      </div>

      {categories.length ? (
        <FilterGroup name="categoria" title={t('filters.category')} count={selected.categories.length}>
          {categories.map((category) => (
            <CheckOption
              key={category.id}
              id={`${idPrefix}-cat-${category.id}`}
              label={category.name}
              lang={catalogLang}
              hint={category.published_count}
              checked={selected.categories.includes(category.id)}
              onChange={() => onToggle('categories', category.id)}
            />
          ))}
        </FilterGroup>
      ) : null}

      {areas.length ? (
        <FilterGroup name="area" title={t('filters.area')} count={selected.areas.length}>
          {areas.map((area) => (
            <CheckOption
              key={area.name}
              id={`${idPrefix}-area-${area.name}`}
              label={area.name}
              lang={catalogLang}
              hint={area.count}
              checked={selected.areas.includes(area.name)}
              onChange={() => onToggle('areas', area.name)}
            />
          ))}
        </FilterGroup>
      ) : null}

      {tags.length ? (
        <FilterGroup
          name="tags"
          title={t('filters.tags')}
          count={selected.tags.length}
          defaultOpen={false}
        >
          <div className="max-h-fx-64 space-y-2 overflow-y-auto pe-1">
            {tags.map((tag) => (
              <CheckOption
                key={tag.id}
                id={`${idPrefix}-tag-${tag.id}`}
                label={tag.name}
                lang={catalogLang}
                checked={selected.tags.includes(tag.id)}
                onChange={() => onToggle('tags', tag.id)}
              />
            ))}
          </div>
        </FilterGroup>
      ) : null}
    </div>
  )
}
