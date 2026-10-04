import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export function Label({ className, required, children, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn('form-label d-flex align-items-center gap-1', className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  )
}

/**
 * Campo completo: rótulo, dica, mensagem de erro e o vínculo acessível
 * (`aria-describedby` / `aria-invalid`) com o controle filho.
 *
 * A mensagem de erro usa `invalid-feedback d-block`, e não só `text-danger`: é
 * a classe que o Bootstrap associa a campo inválido, e o `d-block` a torna
 * visível sem depender da validação nativa do formulário, que não é usada aqui.
 */
export function Field({ id, label, hint, error, required, className, children }) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={cn('mb-3', className)}>
      {label ? (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      ) : null}

      {typeof children === 'function'
        ? children({
            id,
            'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
            'aria-invalid': error ? true : undefined,
          })
        : children}

      {hint && !error ? (
        <div id={hintId} className="form-text">
          {hint}
        </div>
      ) : null}

      {error ? (
        <div id={errorId} className="invalid-feedback d-block fw-medium">
          {error}
        </div>
      ) : null}
    </div>
  )
}
