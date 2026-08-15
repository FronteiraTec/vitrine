import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentMeta } from '@/hooks/use-utils'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta({ title: 'Entrar', description: 'Acesso à área administrativa da Vitrine.' })

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
        <p className="text-muted-foreground text-sm text-pretty">
          As contas de acesso são criadas por um administrador. Precisa de acesso? Fale com a
          coordenação responsável.
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error ? (
          <div
            role="alert"
            className="border-destructive/25 bg-destructive/5 text-destructive flex items-start gap-2.5 rounded-md border p-3 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
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
            <div className="relative">
              <Input
                {...props}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}
        </Field>

        <div className="flex justify-end">
          <Link
            to="/recuperar-senha"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Entrar
        </Button>
      </form>
    </AuthShell>
  )
}
