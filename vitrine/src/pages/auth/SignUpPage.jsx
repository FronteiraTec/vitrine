import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentMeta } from '@/hooks/use-utils'
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'

const MIN_PASSWORD = 8

/**
 * Existe algum administrador ativo?
 *
 * A resposta vem de `installation_has_admin()`, uma função SECURITY DEFINER que
 * devolve só um booleano — o RLS de `profiles` não concede leitura ao anônimo,
 * e nem deveria. Em caso de erro assume `true`: numa dúvida, o mais seguro é
 * manter o cadastro fechado.
 */
function useHasAdmin() {
  return useQuery({
    queryKey: ['installation', 'has-admin'],
    queryFn: async () => {
      const supabase = requireSupabase()
      const { data, error } = await supabase.rpc('installation_has_admin')
      if (error) return true
      return Boolean(data)
    },
    staleTime: 60 * 1000,
    retry: false,
    enabled: isSupabaseConfigured,
  })
}

/**
 * Cadastro inicial da instalação.
 *
 * Não é uma tela de "criar conta" aberta: ela só se mostra enquanto não existe
 * nenhum administrador ativo. Esse é o único momento em que não há como a conta
 * ser criada por um admin — porque não há admin. Assim que o primeiro existe, a
 * página se fecha e passa a apontar para o login.
 *
 * A trava definitiva não é esta: quem quiser pode chamar o endpoint de signup
 * do GoTrue direto. Por isso a migration 0007 faz toda conta que não seja a
 * primeira nascer inativa, e o cadastro aberto deve ser desligado no painel do
 * Supabase. Aqui é só a porta da frente.
 */
export function SignUpPage() {
  const { signUp } = useAuth()
  const { data: hasAdmin, isPending: checkingAdmin } = useHasAdmin()
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta({ title: 'Criar acesso' })

  function update(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    if (values.password.length < MIN_PASSWORD) {
      setError(`A senha deve ter no mínimo ${MIN_PASSWORD} caracteres.`)
      return
    }

    setSubmitting(true)
    try {
      await signUp(values.email.trim(), values.password, values.name.trim())
      setDone(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingAdmin) {
    return (
      <AuthShell title="Criar acesso">
        <Skeleton className="h-64" />
      </AuthShell>
    )
  }

  if (hasAdmin) {
    return (
      <AuthShell
        title="Cadastro fechado"
        description="Esta instalação não aceita autocadastro."
      >
        <div className="border-border bg-muted text-muted-foreground flex items-start gap-3 rounded-md border p-4 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-pretty">
            As contas de acesso são criadas por um administrador da plataforma. Se você deve ter
            acesso ao painel, peça a liberação à coordenação responsável.
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link to="/entrar">Ir para o login</Link>
        </Button>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell
        title="Conta criada"
        description="Falta apenas confirmar o endereço de e-mail."
      >
        <div className="border-status-published/25 bg-status-published-bg text-status-published flex items-start gap-3 rounded-md border p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-pretty">
            Enviamos um link de confirmação para <strong>{values.email}</strong>. Depois de
            confirmar, entre normalmente — o acesso às áreas restritas depende do papel atribuído
            por um administrador.
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link to="/entrar">Ir para o login</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Configurar o primeiro acesso"
      description="Esta instalação ainda não tem administrador. A conta criada agora recebe esse papel — as demais passam a ser criadas por ela, pelo painel."
      footer={
        <p className="text-muted-foreground text-sm">
          Já tem conta?{' '}
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

        <Field id="name" label="Nome completo" required>
          {(props) => (
            <Input
              {...props}
              autoComplete="name"
              value={values.name}
              onChange={update('name')}
              required
              autoFocus
            />
          )}
        </Field>

        <Field id="email" label="E-mail institucional" required>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              placeholder="voce@instituicao.edu.br"
              value={values.email}
              onChange={update('email')}
              required
            />
          )}
        </Field>

        <Field
          id="password"
          label="Senha"
          required
          hint={`Mínimo de ${MIN_PASSWORD} caracteres.`}
        >
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={update('password')}
              minLength={MIN_PASSWORD}
              required
            />
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Criar conta
        </Button>
      </form>
    </AuthShell>
  )
}
