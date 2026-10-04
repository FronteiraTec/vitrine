import { useState } from 'react'
import { Info, KeyRound, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react'
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
import { setUserPassword } from '@/services/admin'
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

          <DialogBody className="space-y-3">
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
                <div className="d-flex gap-2">
                  <Input
                    {...props}
                    value={values.password}
                    onChange={(event) => set('password', event.target.value)}
                    minLength={MIN_PASSWORD}
                    spellCheck={false}
                    className="font-monospace"
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
              <p className="fs-7 fw-medium">Papel</p>
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
              <p className="text-body-secondary fs-8 text-pretty">
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

/**
 * Senha nova para outra conta. É o caminho de quem esqueceu a senha quando a
 * instalação não envia e-mail. As sessões abertas da pessoa são encerradas: a
 * próxima entrada já é com a senha nova.
 */
function PasswordDialog({ user, onOpenChange }) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (password.length < MIN_PASSWORD) {
      toast.error(`A senha deve ter no mínimo ${MIN_PASSWORD} caracteres.`)
      return
    }
    setSaving(true)
    try {
      await setUserPassword(user.id, password)
      toast.success(`Senha de ${user.name} redefinida. Envie a nova senha à pessoa.`)
      setPassword('')
      onOpenChange(false)
    } catch (submitError) {
      toast.error(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={(next) => {
        if (!next) setPassword('')
        onOpenChange(next)
      }}
    >
      <DialogContent size="sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Definir nova senha</DialogTitle>
            <DialogDescription>
              {user ? `Para ${user.name}. ` : ''}As sessões abertas dessa conta serão encerradas, e a
              pessoa pode trocar a senha depois, em Configurações.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <Field
              id="reset-user-password"
              label="Nova senha"
              required
              hint={`Mínimo de ${MIN_PASSWORD} caracteres. Combine com a pessoa por um canal seguro.`}
            >
              {(props) => (
                <div className="d-flex gap-2">
                  <Input
                    {...props}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={MIN_PASSWORD}
                    spellCheck={false}
                    className="font-monospace"
                    required
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPassword(generatePassword())}
                    aria-label="Gerar senha"
                  >
                    <RefreshCw />
                  </Button>
                </div>
              )}
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar senha
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
  const [resetting, setResetting] = useState(null)

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

      <div className="border bg-body-tertiary mb-4 d-flex align-items-start gap-2 rounded-3 p-3 fs-7">
        <Info className="text-body-secondary mt-1 icon flex-shrink-0" aria-hidden="true" />
        <div className="space-y-1 text-pretty">
          <p>
            <span className="fw-medium">O cadastro aberto está desativado.</span> Contas só são
            criadas aqui, por um administrador. Qualquer conta que apareça por outro caminho nasce
            inativa e sem acesso, aguardando liberação nesta tela.
          </p>
          <p className="text-body-secondary">
            Desativar um usuário revoga imediatamente todo o acesso de escrita e leitura
            administrativa, sem apagar o que ele já publicou. A exclusão definitiva de uma conta
            é feita direto no banco, pela equipe que opera o servidor (ver db/README.md).
          </p>
        </div>
      </div>

      {isError ? (
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-fx-20" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nenhum usuário" className="bg-body" />
      ) : (
        <ul className="space-y-2">
          {data.map((user) => {
            const isSelf = user.id === currentUser?.id
            return (
              <li
                key={user.id}
                className="border bg-body d-flex flex-column gap-3 rounded-3 p-3 flex-sm-row align-items-sm-center"
              >
                <Avatar src={user.avatar_url} name={user.name} size="md" />

                <div className="min-w-0 flex-grow-1">
                  <p className="d-flex align-items-center gap-2 fw-medium">
                    <span className="text-truncate">{user.name}</span>
                    {isSelf ? (
                      <Badge size="sm" variant="outline">
                        você
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-body-secondary text-truncate fs-7">{user.email}</p>
                  <p className="text-body-secondary mt-1 fs-8">
                    Desde {formatDate(user.created_at)}
                  </p>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-3">
                  <div className="w-fx-48">
                    <label htmlFor={`role-${user.id}`} className="visually-hidden">
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

                  <div className="d-flex align-items-center gap-2">
                    <Switch
                      id={`active-${user.id}`}
                      checked={user.is_active}
                      onCheckedChange={(checked) => toggleActive(user, checked)}
                      disabled={isSelf}
                    />
                    <label
                      htmlFor={`active-${user.id}`}
                      className="text-body-secondary fs-7 user-select-none"
                    >
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </label>
                  </div>

                  {isSelf ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setResetting(user)}
                      aria-label={`Definir nova senha para ${user.name}`}
                    >
                      <KeyRound aria-hidden="true" />
                      Senha
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <section className="mt-5 space-y-2">
        <h2 className="fs-7 fw-semibold">O que cada papel pode fazer</h2>
        <dl className="d-grid gap-2 grid-cols-sm-3">
          {Object.values(ROLE).map((role) => (
            <div key={role} className="border bg-body rounded-3 p-3">
              <dt className="fs-7 fw-medium">{ROLE_META[role].label}</dt>
              <dd className="text-body-secondary mt-1 fs-7 text-pretty">
                {ROLE_META[role].description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <NewUserDialog open={creating} onOpenChange={setCreating} />
      <PasswordDialog user={resetting} onOpenChange={(open) => !open && setResetting(null)} />
    </>
  )
}
