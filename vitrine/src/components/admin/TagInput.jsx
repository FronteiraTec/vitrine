import { useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

import { useTags } from '@/hooks/use-queries'
import { cn, normalizeSearch } from '@/lib/utils'

/**
 * Campo de tags livre com sugestões das tags já cadastradas.
 * O valor é uma lista de nomes; a conversão em ids (criando o que faltar)
 * acontece na hora de salvar, via `resolveTagIds`.
 */
export function TagInput({ value = [], onChange, id = 'tags', describedBy }) {
  const { data: allTags = [] } = useTags()
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  const suggestions = useMemo(() => {
    const term = normalizeSearch(draft)
    const chosen = new Set(value.map(normalizeSearch))
    return allTags
      .filter((tag) => !chosen.has(normalizeSearch(tag.name)))
      .filter((tag) => (term ? normalizeSearch(tag.name).includes(term) : true))
      .slice(0, 8)
  }, [allTags, draft, value])

  function add(name) {
    const clean = name.trim()
    if (!clean) return
    if (value.some((item) => normalizeSearch(item) === normalizeSearch(clean))) {
      setDraft('')
      return
    }
    onChange([...value, clean])
    setDraft('')
  }

  function remove(name) {
    onChange(value.filter((item) => item !== name))
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(draft)
    } else if (event.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1])
    }
  }

  return (
    <div className="position-relative">
      <div
        className={cn(
          'form-control',
          'd-flex min-h-fx-10 flex-wrap align-items-center gap-1 p-1',
          focused && 'border-primary',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((name) => (
          <Badge key={name} variant="brand" size="sm" className="gap-1 pe-1">
            {name}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                remove(name)
              }}
              className="rounded-pill p-1"
              aria-label={`Remover tag ${name}`}
            >
              <X className="icon-sm" />
            </button>
          </Badge>
        ))}

        <input
          ref={inputRef}
          id={id}
          aria-describedby={describedBy}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          // Atraso para o clique numa sugestão acontecer antes do fechamento.
          onBlur={() => {
            setTimeout(() => setFocused(false), 120)
          }}
          placeholder={value.length ? '' : 'Digite e pressione Enter…'}
          className="min-w-fx-32 flex-grow-1 bg-transparent px-1 py-1 fs-7"
        />
      </div>

      {focused && suggestions.length > 0 ? (
        <ul className="bg-body shadow position-absolute z-3 mt-1 max-h-fx-52 w-100 overflow-y-auto rounded-2 border p-1">
          {suggestions.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(tag.name)}
                className="w-100 rounded-1 px-2 py-2 text-start fs-7"
              >
                {tag.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
