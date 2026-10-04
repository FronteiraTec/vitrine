import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'

/*
 * Variantes mapeadas para as classes do Bootstrap.
 *
 * `ghost` e `subtle` não existem no Bootstrap e foram escritas no SCSS do
 * projeto pela API `--bs-btn-*` dele — assim herdam foco, estado desabilitado e
 * o tema escuro do alto contraste sem nenhuma regra extra.
 *
 * `icon` também é nosso: o Bootstrap dimensiona o botão pelo texto, e sem isso
 * um botão só de ícone sairia retangular.
 */
const buttonVariants = cva('btn d-inline-flex align-items-center justify-content-center gap-2', {
  variants: {
    variant: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      outline: 'btn-outline-secondary',
      ghost: 'btn-ghost',
      subtle: 'btn-subtle',
      destructive: 'btn-danger',
      link: 'btn-link text-decoration-none',
    },
    size: {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
      icon: 'btn-icon',
      'icon-sm': 'btn-icon btn-sm',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}) {
  const classes = cn(buttonVariants({ variant, size }), className)
  const { t } = useLocale()

  /*
   * O caminho `asChild` é tratado separadamente porque o Slot do Radix exige
   * EXATAMENTE um filho. Renderizar o spinner condicionalmente aqui — mesmo
   * como `null` — já produziria dois filhos e quebraria em tempo de execução.
   * Quem usa `asChild` envolve um <Link>, que não tem estado de carregamento.
   */
  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      data-loading={loading ? '' : undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span className="visually-hidden">{t('common.loading')}</span>
        </>
      ) : null}
      {children}
    </button>
  )
}

export { buttonVariants, Loader2 }
