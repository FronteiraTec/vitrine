import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentMeta } from '@/hooks/use-seo'
import { PRIVATE_ROBOTS } from '@/lib/seo'
import { toast } from '@/components/ui/toast'

const MIN_PASSWORD = 8

/**
 * Destino do link enviado por e-mail (`/redefinir-senha?token=…`).
 *
 * O token vale uma vez e por uma hora; quem confere é o servidor, no envio. A
 * senha nova encerra todas as sessões da conta — inclusive a de quem tivesse
 * descoberto a antiga — e já abre uma sessão aqui.
 */
export function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(null)
  const [expired, setExpired] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta({ title: 'Definir nova senha', robots: PRIVATE_ROBOTS })

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD) {
      setError(`A senha deve ter no mínimo ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (password !== confirmation) {
      setError('As senhas não conferem.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token, password)
      toast.success('Senha atualizada com sucesso.')
      navigate('/admin', { replace: true })
    } catch (submitError) {
      if (submitError.code === 'invalid_token') setExpired(true)
      else setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Definir nova senha"
      description="Escolha uma senha que você ainda não use em outros serviços."
    >
      {!token || expired ? (
        <div
          role="alert"
          className="border-danger bg-danger-subtle text-danger space-y-2 rounded-2 border p-3 fs-7"
        >
          <p className="text-pretty">
            Este link de redefinição é inválido ou já expirou. Solicite um novo para continuar.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/recuperar-senha')}>
            Solicitar novo link
          </Button>
        </div>
      ) : (
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

          <Field id="password" label="Nova senha" required hint={`Mínimo de ${MIN_PASSWORD} caracteres.`}>
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={MIN_PASSWORD}
                required
                autoFocus
              />
            )}
          </Field>

          <Field id="confirmation" label="Confirmar nova senha" required>
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            )}
          </Field>

          <Button type="submit" size="lg" className="w-100" loading={submitting}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
