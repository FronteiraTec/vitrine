import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, MailCheck } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentMeta } from '@/hooks/use-utils'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta({ title: 'Recuperar senha' })

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
        <div className="border-status-published/25 bg-status-published-bg text-status-published flex items-start gap-3 rounded-md border p-4 text-sm">
          <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-pretty">
            Se existir uma conta associada a <strong>{email}</strong>, o link de redefinição chegará
            em instantes. Ele vale por tempo limitado.
          </p>
        </div>
        <Button asChild variant="outline" size="lg" className="w-full">
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
        <p className="text-muted-foreground text-sm">
          Lembrou a senha?{' '}
          <Link to="/entrar" className="text-brand font-medium hover:underline">
            Entrar
          </Link>
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Enviar link de redefinição
        </Button>
      </form>
    </AuthShell>
  )
}
