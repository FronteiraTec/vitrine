import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { STATUS_META } from '@/lib/constants'

/*
 * `cva` continua aqui de propósito. Ela não tem nada de Tailwind: só compõe
 * strings de classe a partir de variantes, e faz isso igualmente bem com as do
 * Bootstrap. Trocá-la por condicionais espalhadas não ganharia nada.
 */
const badgeVariants = cva('badge rounded-pill d-inline-flex align-items-center gap-1', {
  variants: {
    variant: {
      neutral: 'text-bg-secondary',
      brand: 'text-bg-primary',
      outline: 'border text-body bg-body',
      /*
       * Variante vazia, usada pelo `StatusBadge`.
       *
       * Não é firula: `badgeVariants({ size })` sem variante cai no padrão
       * `neutral`, que é `.text-bg-secondary` — e essa classe do Bootstrap
       * declara cor E fundo com `!important`. Ela venceria a cor do status, e
       * os cinco badges do workflow sairiam todos cinza, jogando fora a paleta
       * verificada para daltonismo.
       */
      status: '',
    },
    /*
     * O tamanho muda a FONTE, não o padding.
     *
     * `.badge` do Bootstrap já tem `padding: 0.35em 0.65em` — em `em`, então ele
     * acompanha a escala tipográfica do painel de acessibilidade. Sobrescrever
     * com `px-2 py-1` (rem) congelava o espaçamento: no maior degrau, o texto
     * encostava na borda da pílula.
     */
    size: {
      sm: 'fs-8',
      md: '',
    },
  },
  defaultVariants: { variant: 'neutral', size: 'md' },
})

export function Badge({ className, variant, size, ...props }) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

/** Badge do workflow editorial, com ponto colorido e rótulo em português. */
export function StatusBadge({ status, size = 'md', showDot = true, className }) {
  const meta = STATUS_META[status]
  if (!meta) return null

  return (
    <span className={cn(badgeVariants({ variant: 'status', size }), meta.className, className)}>
      {showDot ? (
        <span
          className={cn('rounded-circle d-inline-block', meta.dot)}
          style={{ width: '0.375rem', height: '0.375rem' }}
          aria-hidden="true"
        />
      ) : null}
      {meta.label}
    </span>
  )
}

export { badgeVariants }
