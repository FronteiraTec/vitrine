import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function FilterGroup({ title, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = `filtro-${title.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <section className="border-border border-b pb-5 last:border-b-0 last:pb-0">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={id}
          className="text-foreground hover:text-brand flex w-full items-center justify-between gap-2 py-1 text-sm font-semibold transition-colors"
        >
          <span className="flex items-center gap-2">
            {title}
            {count > 0 ? (
              <span className="bg-brand text-primary-foreground grid size-5 place-items-center rounded-full text-[0.6875rem] font-medium tabular-nums">
                {count}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn('text-muted-foreground size-4 transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div id={id} hidden={!open} className="mt-3 space-y-2.5">
        {children}
      </div>
    </section>
  )
}

function CheckOption({ id, label, hint, checked, onChange }) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <label
        htmlFor={id}
        className="text-foreground flex flex-1 cursor-pointer items-baseline justify-between gap-2 text-sm leading-snug"
      >
        <span>{label}</span>
        {hint !== undefined ? (
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{hint}</span>
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
  const activeCount =
    selected.categories.length + selected.areas.length + selected.tags.length

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }, (_, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Filtros</h2>
        {activeCount > 0 ? (
          <Button variant="subtle" size="sm" onClick={onClear} className="-mr-2">
            Limpar tudo
          </Button>
        ) : null}
      </div>

      {categories.length ? (
        <FilterGroup title="Categoria" count={selected.categories.length}>
          {categories.map((category) => (
            <CheckOption
              key={category.id}
              id={`${idPrefix}-cat-${category.id}`}
              label={category.name}
              hint={category.published_count}
              checked={selected.categories.includes(category.id)}
              onChange={() => onToggle('categories', category.id)}
            />
          ))}
        </FilterGroup>
      ) : null}

      {areas.length ? (
        <FilterGroup title="Área" count={selected.areas.length}>
          {areas.map((area) => (
            <CheckOption
              key={area.name}
              id={`${idPrefix}-area-${area.name}`}
              label={area.name}
              hint={area.count}
              checked={selected.areas.includes(area.name)}
              onChange={() => onToggle('areas', area.name)}
            />
          ))}
        </FilterGroup>
      ) : null}

      {tags.length ? (
        <FilterGroup title="Tags" count={selected.tags.length} defaultOpen={false}>
          <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
            {tags.map((tag) => (
              <CheckOption
                key={tag.id}
                id={`${idPrefix}-tag-${tag.id}`}
                label={tag.name}
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
