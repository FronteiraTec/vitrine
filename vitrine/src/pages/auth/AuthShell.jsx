import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

/**
 * Moldura das telas de autenticação: painel institucional à esquerda,
 * formulário à direita. Em telas pequenas o painel sai de cena.
 */
export function AuthShell({ title, description, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="bg-primary text-primary-foreground relative hidden flex-col justify-between p-12 lg:flex">
        <Logo to="/" inverted className="text-primary-foreground" />

        <div className="max-w-md space-y-5">
          <p className="font-display text-4xl leading-[1.15] text-balance-title">
            Cada iniciativa da instituição, reunida em um só catálogo.
          </p>
          <p className="text-sm leading-relaxed opacity-70">
            A área administrativa é onde as equipes cadastram projetos, laboratórios e programas,
            enviam para revisão e publicam na vitrine pública.
          </p>
        </div>

        <p className="text-xs opacity-50">© {new Date().getFullYear()} Vitrine Institucional</p>

        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/10"
          aria-hidden="true"
        />
      </aside>

      <main className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <div className="space-y-6">
            <div className="lg:hidden">
              <Logo to="/" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl">{title}</h1>
              {description ? (
                <p className="text-muted-foreground text-sm text-pretty">{description}</p>
              ) : null}
            </div>
          </div>

          {children}

          <div className="space-y-4">
            {footer}
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar para a vitrine
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
