import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Lock } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentMeta } from '@/hooks/use-seo'
import { api } from '@/lib/api'
import { PRIVATE_ROBOTS } from '@/lib/seo'

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
      try {
        const data = await api.get('/auth/setup')
        return Boolean(data?.hasAdmin)
      } catch {
        return true
      }
    },
    staleTime: 60 * 1000,
    retry: false,
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
 * A trava definitiva não é esta: a API recusa o cadastro assim que existe um
 * administrador ativo, e a migration 0007 ainda faz toda conta que não seja a
 * primeira nascer inativa. Aqui é só a porta da frente.
 *
 * A conta criada já entra logada, e a guarda de visitante (`GuestRoute`) leva
 * direto ao painel.
 */
export function SignUpPage() {
  const { signUp } = useAuth()
  const { data: hasAdmin, isPending: checkingAdmin } = useHasAdmin()
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta({ title: 'Criar acesso', robots: PRIVATE_ROBOTS })

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
    } catch (submitError) {
      setError(submitError.message)
      setSubmitting(false)
    }
  }

  if (checkingAdmin) {
    return (
      <AuthShell title="Criar acesso">
        <Skeleton className="h-fx-64" />
      </AuthShell>
    )
  }

  if (hasAdmin) {
    return (
      <AuthShell
        title="Cadastro fechado"
        description="Esta instalação não aceita autocadastro."
      >
        <div className="border bg-body-secondary text-body-secondary d-flex align-items-start gap-2 rounded-2 p-3 fs-7">
          <Lock className="mt-1 icon flex-shrink-0" aria-hidden="true" />
          <p className="text-pretty">
            As contas de acesso são criadas por um administrador da plataforma. Se você deve ter
            acesso ao painel, peça a liberação à coordenação responsável.
          </p>
        </div>
        <Button asChild size="lg" className="w-100">
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
        <p className="text-body-secondary fs-7">
          Já tem conta?{' '}
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

        <Button type="submit" size="lg" className="w-100" loading={submitting}>
          Criar conta e entrar
        </Button>
      </form>
    </AuthShell>
  )
}
