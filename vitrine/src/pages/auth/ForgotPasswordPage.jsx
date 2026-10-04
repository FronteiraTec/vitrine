import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, MailCheck, MailX } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentMeta } from '@/hooks/use-seo'
import { api } from '@/lib/api'
import { PRIVATE_ROBOTS } from '@/lib/seo'

/**
 * O servidor sabe enviar e-mail? Sem SMTP (ou sem SITE_URL, que dá o domínio
 * do link), a redefinição por e-mail não existe nesta instalação, e a tela diz
 * isso antes de a pessoa preencher qualquer coisa.
 */
function useResetByEmail() {
  return useQuery({
    queryKey: ['installation', 'reset-by-email'],
    queryFn: async () => {
      const data = await api.get('/auth/setup')
      return Boolean(data?.passwordResetByEmail)
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const { data: byEmail = true } = useResetByEmail()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta({ title: 'Recuperar senha', robots: PRIVATE_ROBOTS })

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <AuthShell title="Verifique seu e-mail" description="O link de redefinição foi enviado.">
        <div className="badge-status-published d-flex align-items-start gap-2 rounded-2 border p-3 fs-7">
          <MailCheck className="mt-1 icon flex-shrink-0" aria-hidden="true" />
          <p className="text-pretty">
            Se existir uma conta associada a <strong>{email}</strong>, o link de redefinição chegará
            em instantes. Ele vale por tempo limitado.
          </p>
        </div>
        <Button asChild variant="outline" size="lg" className="w-100">
          <Link to="/entrar">Voltar ao login</Link>
        </Button>
      </AuthShell>
    )
  }

  if (!byEmail) {
    return (
      <AuthShell title="Recuperar senha" description="O envio de e-mail não está disponível nesta instalação.">
        <div className="border bg-body-secondary text-body-secondary d-flex align-items-start gap-2 rounded-2 p-3 fs-7">
          <MailX className="mt-1 icon flex-shrink-0" aria-hidden="true" />
          <p className="text-pretty">
            Peça a um administrador da plataforma que defina uma senha nova para você, na tela de
            Usuários do painel. Depois de entrar, você pode trocá-la em Configurações.
          </p>
        </div>
        <Button asChild variant="outline" size="lg" className="w-100">
          <Link to="/entrar">Voltar ao login</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Recuperar senha"
      description="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      footer={
        <p className="text-body-secondary fs-7">
          Lembrou a senha?{' '}
          <Link to="/entrar" className="text-primary fw-medium hover-underline">
            Entrar
          </Link>
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          )}
        </Field>

        <Button type="submit" size="lg" className="w-100" loading={submitting}>
          Enviar link de redefinição
        </Button>
      </form>
    </AuthShell>
  )
}
