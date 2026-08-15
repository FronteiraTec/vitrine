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
    <form onSubmit={handleSubmit} className="border-border bg-card rounded-lg border">
      <div className="space-y-6 p-5 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Perfil</h2>
          <p className="text-muted-foreground text-sm">
            Nome e foto exibidos para o restante da equipe no painel.
          </p>
        </div>

        <Field id="profile-name" label="Nome" required>
          {(props) => (
            <Input
              {...props}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          )}
        </Field>

        <ImageUploader
          value={avatarUrl}
          onChange={setAvatarUrl}
          bucket={BUCKETS.AVATARS}
          // A policy do bucket exige que o arquivo fique na pasta do próprio usuário.
          folder={userId ?? ''}
          label="Foto de perfil"
          ratio="aspect-square"
          maxBytes={2 * 1024 * 1024}
          className="max-w-40"
        />
      </div>

      <div className="border-border bg-muted/40 flex justify-end border-t px-5 py-4 sm:px-6">
        <Button type="submit" loading={saving} disabled={!dirty}>
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}

export function SettingsPage() {
  const { profile, user, role, refreshProfile, requestPasswordReset, signOut } = useAuth()
  const [sendingReset, setSendingReset] = useState(false)

  async function handlePasswordReset() {
    setSendingReset(true)
    try {
      await requestPasswordReset(profile.email)
      toast.success('Enviamos um link de redefinição para o seu e-mail.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSendingReset(false)
    }
  }

  return (
    <>
      <PageHeader title="Configurações" description="Seus dados de acesso e preferências de conta." />

      <div className="max-w-2xl space-y-6">
        {profile ? (
          <ProfileForm
            key={profile.id}
            profile={profile}
            userId={user?.id}
            refreshProfile={refreshProfile}
          />
        ) : (
          <Skeleton className="h-96" />
        )}

        <section className="border-border bg-card space-y-4 rounded-lg border p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Conta</h2>
            <p className="text-muted-foreground text-sm">
              Dados de acesso definidos na autenticação.
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs tracking-wide uppercase">E-mail</dt>
              <dd className="mt-0.5 text-sm break-all">{profile?.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs tracking-wide uppercase">Papel</dt>
              <dd className="mt-1">
                <Badge variant="brand">{ROLE_META[role]?.label ?? '—'}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                Conta criada em
              </dt>
              <dd className="mt-0.5 text-sm">{formatDate(profile?.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs tracking-wide uppercase">Situação</dt>
              <dd className="mt-0.5 text-sm">{profile?.is_active ? 'Ativa' : 'Inativa'}</dd>
            </div>
          </dl>

          <p className="text-muted-foreground text-xs text-pretty">
            O papel só pode ser alterado por um administrador, na tela de Usuários.
          </p>
        </section>

        <section className="border-border bg-card space-y-4 rounded-lg border p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Segurança</h2>
            <p className="text-muted-foreground text-sm">
              A troca de senha é feita por link enviado ao seu e-mail.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handlePasswordReset} loading={sendingReset}>
              <KeyRound aria-hidden="true" />
              Alterar senha
            </Button>
            <Button variant="ghost" onClick={() => signOut()}>
              <LogOut aria-hidden="true" />
              Encerrar sessão
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}
