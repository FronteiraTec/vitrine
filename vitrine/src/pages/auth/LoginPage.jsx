import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentMeta } from '@/hooks/use-seo'
import { PRIVATE_ROBOTS } from '@/lib/seo'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta({
    title: 'Entrar',
    description: 'Acesso à área administrativa da Vitrine.',
    robots: PRIVATE_ROBOTS,
  })

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate(location.state?.from ?? '/admin', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Entrar no painel"
      description="Use as credenciais fornecidas pela administração da plataforma."
      footer={
        // Sem link para /criar-conta: o cadastro é fechado, e oferecer o
        // caminho só levaria a pessoa até uma porta trancada.
        <p className="text-body-secondary fs-7 text-pretty">
          As contas de acesso são criadas por um administrador. Precisa de acesso? Fale com a
          coordenação responsável.
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {error ? (
          <div
            role="alert"
            className="border-danger bg-danger-subtle text-danger d-flex align-items-start gap-2 rounded-2 border p-2 fs-7"
          >
            <AlertCircle className="mt-1 icon flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <Field id="email" label="E-mail" required>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              placeholder="voce@instituicao.edu.br"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          )}
        </Field>

        <Field id="password" label="Senha" required>
          {(props) => (
            <div className="position-relative">
              <Input
                {...props}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="pe-5"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="text-body-secondary position-absolute top-0 bottom-0 end-0 d-flex w-fx-10 align-items-center justify-content-center rounded-end"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="icon" /> : <Eye className="icon" />}
              </button>
            </div>
          )}
        </Field>

        <div className="d-flex justify-content-end">
          <Link
            to="/recuperar-senha"
            className="text-body-secondary fs-7"
          >
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-100" loading={submitting}>
          Entrar
        </Button>
      </form>
    </AuthShell>
  )
}
