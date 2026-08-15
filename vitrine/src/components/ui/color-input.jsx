import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isHexColor } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

/**
 * Campo de cor com dois controles sobre o mesmo valor: a amostra abre o
 * seletor nativo, o texto aceita o hexadecimal digitado ou colado — que é como
 * uma cor institucional costuma chegar, vinda de um manual de marca.
 *
 * `value` nulo significa "usar o token do design system". O estado é distinto
 * de uma cor escolhida: o seletor nativo exige um valor concreto, então ele
 * exibe `fallback` apenas como ponto de partida, sem que isso conte como
 * personalização até o usuário mexer.
 */
export function ColorInput({ label, hint, value, onChange, fallback = '#000000', className }) {
  const id = useId()
  // Enquanto o usuário digita, `#14` não é cor válida — mas apagar o que ele
  // escreveu a cada tecla tornaria o campo impossível de usar. O texto vive
  // aqui até virar um hex completo.
  const [draft, setDraft] = useState(null)
  const custom = isHexColor(value)
  const shown = draft ?? (custom ? value : '')

  function commit(next) {
    const trimmed = next.trim()
    if (!trimmed) {
      onChange(null)
      return
    }
    const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
    if (isHexColor(prefixed)) onChange(prefixed.toLowerCase())
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {custom ? (
          <button
            type="button"
            onClick={() => {
              setDraft(null)
              onChange(null)
            }}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Usar padrão
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <span className="border-input relative size-10 shrink-0 overflow-hidden rounded-md border shadow-subtle">
          <input
            type="color"
            value={custom ? value : fallback}
            onChange={(event) => {
              setDraft(null)
              onChange(event.target.value.toLowerCase())
            }}
            aria-label={`${label} — seletor de cor`}
            className="absolute -inset-2 size-[calc(100%+1rem)] cursor-pointer border-0 bg-transparent p-0"
          />
        </span>

        <Input
          id={id}
          value={shown}
          placeholder={custom ? undefined : 'Padrão do tema'}
          spellCheck={false}
          maxLength={7}
          onChange={(event) => {
            setDraft(event.target.value)
            commit(event.target.value)
          }}
          onBlur={() => setDraft(null)}
          className="font-mono text-sm"
        />
      </div>

      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  )
}
