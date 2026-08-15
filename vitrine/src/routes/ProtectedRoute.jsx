import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

function FullScreenLoader({ label = 'Carregando…' }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden="true" />
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  )
}

function AccessDenied({ title, description }) {
  const { signOut } = useAuth()
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="surface max-w-md space-y-4 p-8 text-center">
        <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm text-pretty">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
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
 * É apenas conveniência de interface: a autorização real está no RLS do
 * Postgres. Mesmo que alguém force a rota, nenhuma consulta retorna dados
 * além do que o papel permite.
 */
export function ProtectedRoute({ requires }) {
  const { configured, loading, isAuthenticated, isStaff, isAdmin, canReview } = useAuth()
  const location = useLocation()

  if (!configured) return <Navigate to="/configuracao" replace />
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
  const { configured, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!configured) return <Navigate to="/configuracao" replace />
  if (loading) return <FullScreenLoader />
  if (isAuthenticated) {
    return <Navigate to={location.state?.from ?? '/admin'} replace />
  }
  return <Outlet />
}

export { FullScreenLoader }
