import { useState } from 'react'
import { Info, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Switch } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateUser, useProfiles, useUpdateProfile } from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE, ROLE_META } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

const MIN_PASSWORD = 8

/** Senha inicial forte o bastante para não virar "12345678" na pressa. */
function generatePassword() {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = crypto.getRandomValues(new Uint32Array(14))
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}

const EMPTY_USER = { name: '', email: '', password: '', role: ROLE.EDITOR }

function NewUserDialog({ open, onOpenChange }) {
  const createUser = useCreateUser()
  const [values, setValues] = useState(EMPTY_USER)

  function set(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function reset() {
    setValues(EMPTY_USER)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!values.name.trim()) return toast.error('Informe o nome.')
    if (!values.email.trim()) return toast.error('Informe o e-mail.')
    if (values.password.length < MIN_PASSWORD) {
      return toast.error(`A senha deve ter no mínimo ${MIN_PASSWORD} caracteres.`)
    }

    try {
      await createUser.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
      })
      toast.success(`Conta de ${values.name.trim()} criada. Envie a senha inicial à pessoa.`)
      reset()
      onOpenChange(false)
    } catch (submitError) {
      toast.error(submitError.message)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent size="sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova conta</DialogTitle>
            <DialogDescription>
              A conta já entra ativa e com o papel escolhido. A pessoa pode trocar a senha depois,
              em Configurações.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            <Field id="new-user-name" label="Nome completo" required>
              {(props) => (
                <Input
                  {...props}
                  value={values.name}
                  onChange={(event) => set('name', event.target.value)}
                  required
                  autoFocus
                />
              )}
            </Field>

            <Field id="new-user-email" label="E-mail" required>
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  value={values.email}
                  onChange={(event) => set('email', event.target.value)}
                  placeholder="pessoa@instituicao.edu.br"
                  required
                />
              )}
            </Field>

            <Field
              id="new-user-password"
              label="Senha inicial"
              required
              hint={`Mínimo de ${MIN_PASSWORD} caracteres. Combine com a pessoa por um canal seguro.`}
            >
              {(props) => (
                <div className="flex gap-2">
                  <Input
                    {...props}
                    value={values.password}
                    onChange={(event) => set('password', event.target.value)}
                    minLength={MIN_PASSWORD}
                    spellCheck={false}
                    className="font-mono"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => set('password', generatePassword())}
                    aria-label="Gerar senha"
                  >
                    <RefreshCw />
                  </Button>
                </div>
              )}
            </Field>

            <div className="space-y-2">
              <p className="text-sm font-medium">Papel</p>
              <Select value={values.role} onValueChange={(role) => set('role', role)}>
                <SelectTrigger aria-label="Papel da nova conta">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ROLE).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_META[role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs text-pretty">
                {ROLE_META[values.role].description}
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createUser.isPending}>
              Criar conta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UsersAdminPage() {
  const { data, isPending, isError, error, refetch } = useProfiles()
  const updateProfile = useUpdateProfile()
  const { profile: currentUser } = useAuth()
  const [creating, setCreating] = useState(false)

  async function changeRole(user, role) {
    try {
      await updateProfile.mutateAsync({ id: user.id, values: { role } })
      toast.success(`${user.name} agora é ${ROLE_META[role].label.toLowerCase()}.`)
    } catch (changeError) {
      toast.error(changeError.message)
    }
  }

  async function toggleActive(user, isActive) {
    try {
      await updateProfile.mutateAsync({ id: user.id, values: { is_active: isActive } })
      toast.success(isActive ? `${user.name} reativado.` : `${user.name} desativado.`)
    } catch (toggleError) {
      toast.error(toggleError.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Quem tem acesso ao painel e o que cada pessoa pode fazer."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus aria-hidden="true" />
            Nova conta
          </Button>
        }
      />

      <div className="border-border bg-muted/50 mb-6 flex items-start gap-3 rounded-lg border p-4 text-sm">
        <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1 text-pretty">
          <p>
            <span className="font-medium">O cadastro aberto está desativado.</span> Contas só são
            criadas aqui, por um administrador. Qualquer conta que apareça por outro caminho nasce
            inativa e sem acesso, aguardando liberação nesta tela.
          </p>
          <p className="text-muted-foreground">
            Desativar um usuário revoga imediatamente todo o acesso de escrita e leitura
            administrativa, sem apagar o que ele já publicou. A exclusão definitiva de uma conta
            continua sendo feita pelo painel do Supabase.
          </p>
        </div>
      </div>

      {isError ? (
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nenhum usuário" className="bg-card" />
      ) : (
        <ul className="space-y-3">
          {data.map((user) => {
            const isSelf = user.id === currentUser?.id
            return (
              <li
                key={user.id}
                className="border-border bg-card flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
              >
                <Avatar src={user.avatar_url} name={user.name} size="md" />

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{user.name}</span>
                    {isSelf ? (
                      <Badge size="sm" variant="outline">
                        você
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Desde {formatDate(user.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-48">
                    <label htmlFor={`role-${user.id}`} className="sr-only">
                      Papel de {user.name}
                    </label>
                    <Select
                      value={user.role}
                      onValueChange={(role) => changeRole(user, role)}
                      disabled={isSelf || !user.is_active}
                    >
                      <SelectTrigger id={`role-${user.id}`} size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ROLE).map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_META[role].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id={`active-${user.id}`}
                      checked={user.is_active}
                      onCheckedChange={(checked) => toggleActive(user, checked)}
                      disabled={isSelf}
                    />
                    <label
                      htmlFor={`active-${user.id}`}
                      className="text-muted-foreground cursor-pointer text-sm select-none"
                    >
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </label>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <section className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold">O que cada papel pode fazer</h2>
        <dl className="grid gap-3 sm:grid-cols-3">
          {Object.values(ROLE).map((role) => (
            <div key={role} className="border-border bg-card rounded-lg border p-4">
              <dt className="text-sm font-medium">{ROLE_META[role].label}</dt>
              <dd className="text-muted-foreground mt-1 text-sm text-pretty">
                {ROLE_META[role].description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <NewUserDialog open={creating} onOpenChange={setCreating} />
    </>
  )
}
