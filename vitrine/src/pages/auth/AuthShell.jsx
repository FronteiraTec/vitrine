import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

/**
 * Moldura das telas de autenticação: painel institucional à esquerda,
 * formulário à direita. Em telas pequenas o painel sai de cena.
 */
export function AuthShell({ title, description, children, footer }) {
  return (
    <div className="d-grid min-vh-100 grid-cols-lg-2">
      <aside className="bg-primary text-white position-relative d-none flex-column justify-content-between p-5 d-lg-flex">
        <Logo to="/" inverted className="text-white" />

        <div className="mw-md space-y-3">
          <p className="fw-bold fs-2 text-balance">
            Cada iniciativa da instituição, reunida em um só catálogo.
          </p>
          <p className="fs-7 lh-base opacity-75">
            A área administrativa é onde as equipes cadastram projetos, laboratórios e programas,
            enviam para revisão e publicam na vitrine pública.
          </p>
        </div>

        <p className="fs-8 opacity-50">© {new Date().getFullYear()} Vitrine Institucional</p>

        <div
          className="pe-none position-absolute top-0 bottom-0 end-0 vr bg-white opacity-25"
          aria-hidden="true"
        />
      </aside>

      <main className="d-flex flex-column justify-content-center px-3 py-5 px-sm-5">
        <div className="mx-auto w-100 mw-sm space-y-5">
          <div className="space-y-4">
            <div className="d-lg-none">
              <Logo to="/" />
            </div>
            <div className="space-y-2">
              <h1 className="fw-bold fs-3">{title}</h1>
              {description ? (
                <p className="text-body-secondary fs-7 text-pretty">{description}</p>
              ) : null}
            </div>
          </div>

          {children}

          <div className="space-y-3">
            {footer}
            <Link
              to="/"
              className="text-body-secondary d-inline-flex align-items-center gap-1 fs-7"
            >
              <ArrowLeft className="icon" aria-hidden="true" />
              Voltar para a vitrine
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
