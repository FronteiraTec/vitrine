import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

function FullScreenLoader({ label = 'Carregando…' }) {
  return (
    <div
      className="d-flex min-vh-100 flex-column align-items-center justify-content-center gap-2"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="text-body-secondary icon-xl spinner-border spinner-border-sm" aria-hidden="true" />
      <p className="text-body-secondary fs-7">{label}</p>
    </div>
  )
}

function AccessDenied({ title, description }) {
  const { signOut } = useAuth()
  return (
    <div className="d-flex min-vh-100 align-items-center justify-content-center p-4">
      <div className="card mw-md space-y-3 p-5 text-center">
        <div className="bg-danger-subtle text-danger mx-auto d-flex h-fx-12 w-fx-12 align-items-center justify-content-center rounded-pill">
          <ShieldAlert className="icon-xl" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h1 className="fs-5 fw-semibold">{title}</h1>
          <p className="text-body-secondary fs-7 text-pretty">{description}</p>
        </div>
        <div className="d-flex flex-column gap-2 flex-sm-row justify-content-sm-center">
          <Button variant="outline" asChild>
            <Link to="/">Ir para a vitrine</Link>
          </Button>
          <Button variant="ghost" onClick={() => signOut()}>
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Guarda das rotas administrativas.
 *
 * É apenas conveniência de interface: a autorização real está na API e no
 * RLS do Postgres. Mesmo que alguém force a rota, nenhuma consulta retorna dados
 * além do que o papel permite.
 */
export function ProtectedRoute({ requires }) {
  const { loading, isAuthenticated, isStaff, isAdmin, canReview } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader label="Verificando sua sessão…" />

  if (!isAuthenticated) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />
  }

  if (!isStaff) {
    return (
      <AccessDenied
        title="Conta sem acesso ao painel"
        description="Sua conta existe, mas ainda não foi ativada por um administrador. Solicite a liberação para acessar a área administrativa."
      />
    )
  }

  if (requires === 'admin' && !isAdmin) {
    return (
      <AccessDenied
        title="Acesso restrito a administradores"
        description="Esta área é reservada a quem gerencia categorias e usuários da plataforma."
      />
    )
  }

  if (requires === 'review' && !canReview) {
    return (
      <AccessDenied
        title="Acesso restrito a revisores"
        description="A fila de revisão é acessível a revisores e administradores."
      />
    )
  }

  return <Outlet />
}

/** Impede que quem já está autenticado volte para a tela de login. */
export function GuestRoute() {
  const { loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (isAuthenticated) {
    return <Navigate to={location.state?.from ?? '/admin'} replace />
  }
  return <Outlet />
}

export { FullScreenLoader }
