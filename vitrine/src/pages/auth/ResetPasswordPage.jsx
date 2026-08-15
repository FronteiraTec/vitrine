import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentMeta } from '@/hooks/use-utils'
import { toast } from '@/components/ui/toast'

const MIN_PASSWORD = 8

/**
 * Destino do link enviado por e-mail. O Supabase detecta o token na URL
 * (`detectSessionInUrl`) e cria uma sessão temporária — por isso aqui basta
 * chamar `updateUser`.
 */
export function ResetPasswordPage() {
  const { updatePassword, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta({ title: 'Definir nova senha' })

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
      await updatePassword(password)
      toast.success('Senha atualizada com sucesso.')
      navigate('/admin', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const linkExpired = !loading && !isAuthenticated

  return (
    <AuthShell
      title="Definir nova senha"
      description="Escolha uma senha que você ainda não use em outros serviços."
    >
      {linkExpired ? (
        <div
          role="alert"
          className="border-destructive/25 bg-destructive/5 text-destructive space-y-3 rounded-md border p-4 text-sm"
        >
          <p className="text-pretty">
            Este link de redefinição é inválido ou já expirou. Solicite um novo para continuar.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/recuperar-senha')}>
            Solicitar novo link
          </Button>
        </div>
      ) : (
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

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
