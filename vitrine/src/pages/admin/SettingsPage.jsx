import { useState } from 'react'
import { KeyRound, LogOut } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { updateOwnProfile } from '@/services/admin'
import { BUCKETS, ROLE_META } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

function SectionTitle({ title, description }) {
  return (
    <div className="space-y-1">
      <h2 className="mb-0 fs-6 fw-semibold">{title}</h2>
      <p className="text-body-secondary mb-0 fs-7">{description}</p>
    </div>
  )
}

/**
 * Formulário de perfil. Recebe o perfil já carregado e é montado com `key`,
 * então inicializa o estado direto das props — sem efeito de sincronização.
 */
function ProfileForm({ profile, userId, refreshProfile }) {
  const [name, setName] = useState(profile.name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? null)
  const [saving, setSaving] = useState(false)

  const dirty = name !== (profile.name ?? '') || avatarUrl !== (profile.avatar_url ?? null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim()) {
      toast.error('Informe seu nome.')
      return
    }
    setSaving(true)
    try {
      await updateOwnProfile(profile.id, { name, avatar_url: avatarUrl })
      await refreshProfile()
      toast.success('Perfil atualizado.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border bg-body rounded-3">
      <div className="space-y-4 p-3 p-sm-4">
        <SectionTitle
          title="Perfil"
          description="Nome e foto exibidos para o restante da equipe no painel."
        />

        {/* Foto ao lado do nome: empilhados, a foto deixava meia coluna vazia
            à direita e empurrava o botão de salvar para baixo. */}
        <div className="d-grid gap-4 grid-media">
          <ImageUploader
            value={avatarUrl}
            onChange={setAvatarUrl}
            bucket={BUCKETS.AVATARS}
            // A policy do bucket exige que o arquivo fique na pasta do próprio usuário.
            folder={userId ?? ''}
            label="Foto de perfil"
            ratio="ratio-1x1"
            maxBytes={2 * 1024 * 1024}
            className="max-w-fx-40"
          />

          <Field id="profile-name" label="Nome" required className="mb-0">
            {(props) => (
              <Input
                {...props}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            )}
          </Field>
        </div>
      </div>

      <div className="bg-body-tertiary d-flex justify-content-end border-top rounded-bottom-3 px-3 py-3 px-sm-4">
        <Button type="submit" loading={saving} disabled={!dirty}>
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}

const MIN_PASSWORD = 8

/**
 * Troca de senha de quem está logado. Pede a senha atual: uma sessão esquecida
 * aberta num computador compartilhado não basta para tomar a conta. As outras
 * sessões da conta são encerradas no servidor; esta continua.
 */
function PasswordForm() {
  const { updatePassword } = useAuth()
  const [values, setValues] = useState({ current: '', password: '', confirmation: '' })
  const [saving, setSaving] = useState(false)

  function update(field) {
    return (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (values.password.length < MIN_PASSWORD) {
      toast.error(`A nova senha deve ter no mínimo ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (values.password !== values.confirmation) {
      toast.error('A confirmação não confere com a nova senha.')
      return
    }
    setSaving(true)
    try {
      await updatePassword(values.password, values.current)
      setValues({ current: '', password: '', confirmation: '' })
      toast.success('Senha alterada. As outras sessões da sua conta foram encerradas.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <Field id="current-password" label="Senha atual" required className="mb-0">
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="current-password"
            value={values.current}
            onChange={update('current')}
            required
          />
        )}
      </Field>
      <div className="d-grid gap-3 grid-cols-sm-2">
        <Field id="new-password" label="Nova senha" required hint={`Mínimo de ${MIN_PASSWORD} caracteres.`} className="mb-0">
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
        <Field id="confirm-password" label="Confirmar nova senha" required className="mb-0">
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="new-password"
              value={values.confirmation}
              onChange={update('confirmation')}
              required
            />
          )}
        </Field>
      </div>
      <Button type="submit" variant="outline" loading={saving} disabled={!values.current || !values.password}>
        <KeyRound aria-hidden="true" />
        Alterar senha
      </Button>
    </form>
  )
}

export function SettingsPage() {
  const { profile, user, role, refreshProfile, signOut } = useAuth()

  return (
    <>
      <PageHeader title="Configurações" description="Seus dados de acesso e preferências de conta." />

      {/* Duas colunas a partir de `xl`: perfil de um lado, conta e segurança do
          outro. Numa coluna só de 42rem, metade da tela ficava vazia. */}
      <div className="d-grid align-items-start gap-4 grid-cols-1 grid-cols-xl-2">
        {profile ? (
          <ProfileForm
            key={profile.id}
            profile={profile}
            userId={user?.id}
            refreshProfile={refreshProfile}
          />
        ) : (
          <Skeleton className="h-fx-96" />
        )}

        <div className="space-y-4">
          <section className="border bg-body space-y-4 rounded-3 p-3 p-sm-4">
            <SectionTitle title="Conta" description="Dados de acesso definidos na autenticação." />

            <dl className="d-grid mb-0 column-gap-4 row-gap-3 grid-cols-sm-2">
              <div>
                <dt className="text-body-secondary fs-8 tracking-wide text-uppercase">E-mail</dt>
                <dd className="mt-1 mb-0 fs-7 text-break">{profile?.email}</dd>
              </div>
              <div>
                <dt className="text-body-secondary fs-8 tracking-wide text-uppercase">Papel</dt>
                <dd className="mt-1 mb-0">
                  <Badge variant="brand">{ROLE_META[role]?.label ?? '—'}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-body-secondary fs-8 tracking-wide text-uppercase">
                  Conta criada em
                </dt>
                <dd className="mt-1 mb-0 fs-7">{formatDate(profile?.created_at)}</dd>
              </div>
              <div>
                <dt className="text-body-secondary fs-8 tracking-wide text-uppercase">Situação</dt>
                <dd className="mt-1 mb-0 fs-7">{profile?.is_active ? 'Ativa' : 'Inativa'}</dd>
              </div>
            </dl>

            <p className="text-body-secondary mb-0 border-top pt-3 fs-8 text-pretty">
              O papel só pode ser alterado por um administrador, na tela de Usuários.
            </p>
          </section>

          <section className="border bg-body space-y-4 rounded-3 p-3 p-sm-4">
            <SectionTitle
              title="Segurança"
              description="Trocar a senha encerra as sessões da sua conta em outros dispositivos."
            />

            <PasswordForm />

            <div className="border-top pt-3">
              <Button variant="ghost" onClick={() => signOut()}>
                <LogOut aria-hidden="true" />
                Encerrar sessão
              </Button>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
