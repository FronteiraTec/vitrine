import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  Contact,
  ExternalLink,
  FileText,
  ImageIcon,
  MapPin,
  Rocket,
  Save,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusActions } from '@/components/admin/StatusActions'
import { TagInput } from '@/components/admin/TagInput'
import { TeamEditor, LinksEditor } from '@/components/admin/TeamEditor'
import { ImageUploader, GalleryUploader } from '@/components/admin/ImageUploader'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories, useInitiative, useReviewHistory, useSaveInitiative } from '@/hooks/use-queries'
import { resolveTagIds } from '@/services/taxonomy'
import { useAuth } from '@/contexts/AuthContext'
import { AREAS, BUCKETS, STATUS, STATUS_META } from '@/lib/constants'
import { formatDate, formatTime } from '@/lib/utils'

const EMPTY_FORM = {
  name: '',
  category_id: '',
  short_description: '',
  description: '',
  cover_image: null,
  gallery: [],
  areas: [],
  location: '',
  campus: '',
  city: '',
  state: '',
  email: '',
  phone: '',
  website: '',
}

const TABS = [
  { value: 'basico', label: 'Informações básicas', icon: FileText },
  { value: 'imagens', label: 'Imagens', icon: ImageIcon },
  { value: 'pessoas', label: 'Pessoas', icon: Users },
  { value: 'contatos', label: 'Contatos e links', icon: Contact },
  { value: 'local', label: 'Localização', icon: MapPin },
  { value: 'publicacao', label: 'Publicação', icon: Rocket },
]

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Informe o nome da iniciativa.'
  else if (form.name.trim().length < 3) errors.name = 'O nome precisa ter ao menos 3 caracteres.'
  if (!form.category_id) errors.category_id = 'Escolha uma categoria.'
  if (form.short_description && form.short_description.length > 280) {
    errors.short_description = 'O resumo deve ter no máximo 280 caracteres.'
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Informe um e-mail válido.'
  }
  if (form.website && !/^https?:\/\/.+/i.test(form.website)) {
    errors.website = 'A URL deve começar com http:// ou https://'
  }
  if (form.state && form.state.length > 2) errors.state = 'Use a sigla com 2 letras (ex.: RS).'
  return errors
}

function ReviewHistory({ initiativeId }) {
  const { data, isPending } = useReviewHistory(initiativeId)

  if (isPending) return <Skeleton className="h-fx-24" />
  if (!data?.length) {
    return (
      <p className="text-body-secondary fs-7">
        Nenhuma mudança de status registrada ainda.
      </p>
    )
  }

  return (
    <ol className="space-y-2">
      {data.map((entry) => (
        <li key={entry.id} className="border d-flex gap-2 border-start border-2 ps-3">
          <div className="space-y-1">
            <p className="d-flex flex-wrap align-items-center gap-1 fs-7">
              <span className="text-body-secondary">
                {STATUS_META[entry.from_status]?.label ?? '—'}
              </span>
              <span className="text-body-secondary" aria-hidden="true">
                →
              </span>
              <StatusBadge status={entry.to_status} size="sm" />
            </p>
            <p className="text-body-secondary fs-8">
              {entry.reviewer?.name ?? 'Sistema'} · {formatDate(entry.created_at)} às{' '}
              {formatTime(entry.created_at)}
            </p>
            {entry.notes ? (
              <p className="bg-body-secondary mt-1 rounded-2 p-2 fs-7 text-pretty">{entry.notes}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function InitiativeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const { profile, canReview } = useAuth()

  const { data: categories = [] } = useCategories()
  const { data: initiative, isPending, isError, error, refetch } = useInitiative(id)
  const saveInitiative = useSaveInitiative()

  const [tab, setTab] = useState('basico')
  const [form, setForm] = useState(EMPTY_FORM)
  const [tags, setTags] = useState([])
  const [team, setTeam] = useState([])
  const [links, setLinks] = useState([])
  const [errors, setErrors] = useState({})
  const [dirty, setDirty] = useState(false)
  const loadedFor = useRef(null)
  /*
   * O `useBlocker` lê o estado a partir do render em que foi registrado. Como
   * `setDirty(false)` e `navigate()` acontecem no mesmo tique após salvar, o
   * bloqueio dispararia com o valor antigo e barraria a própria navegação de
   * sucesso. O ref é atualizado de forma síncrona e resolve isso.
   */
  const dirtyRef = useRef(false)

  function markDirty(value) {
    dirtyRef.current = value
    setDirty(value)
  }

  // Carrega o registro no formulário uma única vez por id — sem isso, um
  // refetch em segundo plano descartaria o que o usuário está digitando.
  useEffect(() => {
    if (!isEditing || !initiative || loadedFor.current === initiative.id) return
    loadedFor.current = initiative.id
    setForm({
      name: initiative.name ?? '',
      category_id: initiative.category_id ?? '',
      short_description: initiative.short_description ?? '',
      description: initiative.description ?? '',
      cover_image: initiative.cover_image ?? null,
      gallery: initiative.gallery ?? [],
      areas: initiative.areas ?? [],
      location: initiative.location ?? '',
      campus: initiative.campus ?? '',
      city: initiative.city ?? '',
      state: initiative.state ?? '',
      email: initiative.email ?? '',
      phone: initiative.phone ?? '',
      website: initiative.website ?? '',
    })
    setTags((initiative.tags ?? []).map((tag) => tag.name))
    setTeam(
      (initiative.team ?? []).map((entry) => ({
        person_id: entry.person?.id,
        role: entry.role ?? '',
        person: entry.person,
      })),
    )
    setLinks(
      (initiative.links ?? []).map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
        type: link.type,
      })),
    )
    markDirty(false)
  }, [isEditing, initiative])

  // Avisa antes de sair com alterações não salvas.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!dirty) return undefined
    const handler = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }))
    markDirty(true)
  }

  const isOwner = !isEditing || initiative?.created_by === profile?.id
  const readOnly = isEditing && !isOwner && !canReview
  const lockedByReview = isEditing && initiative?.status === STATUS.PENDING_REVIEW && !canReview

  const errorCountByTab = useMemo(() => {
    const map = { basico: 0, contatos: 0, local: 0 }
    if (errors.name || errors.category_id || errors.short_description) map.basico += 1
    if (errors.email || errors.website) map.contatos += 1
    if (errors.state) map.local += 1
    return map
  }, [errors])

  async function handleSubmit(event) {
    event?.preventDefault()
    const validationErrors = validate(form)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Revise os campos destacados antes de salvar.')
      // Leva o usuário à primeira aba com erro.
      if (validationErrors.name || validationErrors.category_id || validationErrors.short_description) {
        setTab('basico')
      } else if (validationErrors.email || validationErrors.website) {
        setTab('contatos')
      } else if (validationErrors.state) {
        setTab('local')
      }
      return
    }

    try {
      const tagIds = await resolveTagIds(tags)
      const saved = await saveInitiative.mutateAsync({
        id,
        values: form,
        tagIds,
        team,
        links,
      })
      markDirty(false)
      toast.success(isEditing ? 'Alterações salvas.' : 'Iniciativa criada como rascunho.')
      if (!isEditing) navigate(`/admin/iniciativas/${saved.id}`, { replace: true })
    } catch (submitError) {
      toast.error(submitError.message)
    }
  }

  if (isEditing && isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-fx-9 w-fx-72" />
        <Skeleton className="h-fx-10 w-100" />
        <Skeleton className="h-fx-96 w-100" />
      </div>
    )
  }

  if (isEditing && isError) {
    return <ErrorState description={error?.message} onRetry={() => refetch()} />
  }

  if (isEditing && !initiative) {
    return (
      <ErrorState
        title="Iniciativa não encontrada"
        description="Ela pode ter sido removida ou você não tem permissão para vê-la."
      />
    )
  }

  const disabled = readOnly || lockedByReview

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        backTo="/admin/iniciativas"
        backLabel="Voltar para iniciativas"
        title={isEditing ? form.name || 'Editar iniciativa' : 'Nova iniciativa'}
        description={
          isEditing
            ? 'Alterações são salvas como conteúdo de trabalho; a publicação depende do fluxo de revisão.'
            : 'Preencha as informações básicas para criar. Você poderá completar o restante depois.'
        }
        actions={
          <>
            {isEditing && initiative.status === STATUS.PUBLISHED ? (
              <Button variant="outline" asChild>
                <Link to={`/iniciativa/${initiative.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  Ver na vitrine
                </Link>
              </Button>
            ) : null}
            <Button type="submit" loading={saveInitiative.isPending} disabled={disabled}>
              <Save aria-hidden="true" />
              {isEditing ? 'Salvar alterações' : 'Criar iniciativa'}
            </Button>
          </>
        }
      />

      {isEditing ? (
        <div className="border bg-body mb-4 d-flex flex-wrap align-items-center column-gap-3 row-gap-2 rounded-3 p-3">
          <StatusBadge status={initiative.status} />
          <p className="text-body-secondary fs-7">
            {STATUS_META[initiative.status]?.description}
          </p>
          <div className="ms-auto">
            <StatusActions record={initiative} size="sm" />
          </div>
        </div>
      ) : null}

      {disabled ? (
        <div
          role="status"
          className="badge-status-review mb-4 d-flex align-items-start gap-2 rounded-3 border p-3 fs-7"
        >
          <AlertCircle className="mt-1 icon flex-shrink-0" aria-hidden="true" />
          <p className="text-pretty">
            {lockedByReview
              ? 'Esta iniciativa está na fila de revisão e não pode ser editada até que um revisor conclua a análise.'
              : 'Você pode visualizar esta iniciativa, mas apenas quem a criou (ou um revisor) pode editá-la.'}
          </p>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} disabled={value === 'publicacao' && !isEditing}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {errorCountByTab[value] > 0 ? (
                <span className="bg-danger h-fx-1 w-fx-1.5 rounded-pill" aria-label="Contém erros" />
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <fieldset disabled={disabled} className="mt-5 mw-3xl">
          {/* Informações básicas ------------------------------------------ */}
          <TabsContent value="basico" className="space-y-4">
            <Field id="name" label="Nome da iniciativa" required error={errors.name}>
              {(props) => (
                <Input
                  {...props}
                  value={form.name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="Ex.: Laboratório de Inteligência Artificial"
                  maxLength={140}
                />
              )}
            </Field>

            <Field id="category" label="Categoria" required error={errors.category_id}>
              {() => (
                <Select
                  value={form.category_id}
                  onValueChange={(value) => update({ category_id: value })}
                >
                  <SelectTrigger
                    id="category"
                    aria-invalid={errors.category_id ? true : undefined}
                    aria-describedby={errors.category_id ? 'category-error' : undefined}
                  >
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field
              id="short_description"
              label="Descrição curta"
              error={errors.short_description}
              hint={`Aparece nos cards e nos resultados de busca. ${form.short_description.length}/280`}
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={3}
                  value={form.short_description}
                  onChange={(event) => update({ short_description: event.target.value })}
                  maxLength={280}
                  placeholder="Uma frase que explique o que a iniciativa faz."
                />
              )}
            </Field>

            <Field
              id="description"
              label="Descrição completa"
              hint="Texto exibido na página da iniciativa. Separe parágrafos com uma linha em branco."
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={12}
                  value={form.description}
                  onChange={(event) => update({ description: event.target.value })}
                  placeholder="Apresente objetivos, linhas de atuação, resultados e como participar."
                />
              )}
            </Field>

            <Field
              id="tags"
              label="Tags"
              hint="Temas livres. Tags novas são criadas automaticamente ao salvar."
            >
              {(props) => <TagInput {...props} value={tags} onChange={(next) => {
                    setTags(next)
                    markDirty(true)
                  }} />}
            </Field>

            <fieldset className="space-y-2">
              <legend className="fs-7 fw-medium">Áreas de atuação</legend>
              <p className="text-body-secondary -mt-1 fs-8">
                Usadas como filtro na busca pública.
              </p>
              <div className="d-grid grid-cols-2 gap-2 grid-cols-sm-3">
                {AREAS.map((area) => (
                  <div key={area} className="d-flex align-items-center gap-2">
                    <Checkbox
                      id={`area-${area}`}
                      checked={form.areas.includes(area)}
                      onCheckedChange={() =>
                        update({
                          areas: form.areas.includes(area)
                            ? form.areas.filter((item) => item !== area)
                            : [...form.areas, area],
                        })
                      }
                    />
                    <label htmlFor={`area-${area}`} className="fs-7">
                      {area}
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
          </TabsContent>

          {/* Imagens ------------------------------------------------------ */}
          <TabsContent value="imagens" className="space-y-5">
            <ImageUploader
              value={form.cover_image}
              onChange={(url) => update({ cover_image: url })}
              bucket={BUCKETS.INITIATIVES}
              folder="capas"
              label="Imagem de capa"
              hint="Usada nos cards, no topo da página e no compartilhamento em redes sociais. Proporção recomendada: 16:10."
            />

            <div className="border border-top pt-5">
              <GalleryUploader
                value={form.gallery}
                onChange={(gallery) => update({ gallery })}
                bucket={BUCKETS.INITIATIVES}
              />
            </div>
          </TabsContent>

          {/* Pessoas ------------------------------------------------------ */}
          <TabsContent value="pessoas">
            <TeamEditor
              value={team}
              onChange={(next) => {
                setTeam(next)
                markDirty(true)
              }}
            />
          </TabsContent>

          {/* Contatos ----------------------------------------------------- */}
          <TabsContent value="contatos" className="space-y-4">
            <div className="d-grid gap-4 grid-cols-sm-2">
              <Field id="email" label="E-mail de contato" error={errors.email}>
                {(props) => (
                  <Input
                    {...props}
                    type="email"
                    value={form.email}
                    onChange={(event) => update({ email: event.target.value })}
                    placeholder="contato@instituicao.edu.br"
                  />
                )}
              </Field>

              <Field id="phone" label="Telefone">
                {(props) => (
                  <Input
                    {...props}
                    type="tel"
                    value={form.phone}
                    onChange={(event) => update({ phone: event.target.value })}
                    placeholder="(00) 0000-0000"
                  />
                )}
              </Field>
            </div>

            <Field id="website" label="Website" error={errors.website}>
              {(props) => (
                <Input
                  {...props}
                  type="url"
                  value={form.website}
                  onChange={(event) => update({ website: event.target.value })}
                  placeholder="https://exemplo.edu.br/iniciativa"
                />
              )}
            </Field>

            <div className="border space-y-2 border-top pt-4">
              <div>
                <h3 className="fs-7 fw-medium">Links relacionados</h3>
                <p className="text-body-secondary fs-8">
                  Redes sociais, repositórios e páginas complementares.
                </p>
              </div>
              <LinksEditor
                value={links}
                onChange={(next) => {
                  setLinks(next)
                  markDirty(true)
                }}
              />
            </div>
          </TabsContent>

          {/* Localização -------------------------------------------------- */}
          <TabsContent value="local" className="space-y-4">
            <Field id="location" label="Local" hint="Prédio, sala ou referência interna.">
              {(props) => (
                <Input
                  {...props}
                  value={form.location}
                  onChange={(event) => update({ location: event.target.value })}
                  placeholder="Ex.: Bloco C, sala 214"
                />
              )}
            </Field>

            <Field id="campus" label="Campus">
              {(props) => (
                <Input
                  {...props}
                  value={form.campus}
                  onChange={(event) => update({ campus: event.target.value })}
                  placeholder="Ex.: Campus Central"
                />
              )}
            </Field>

            <div className="d-grid gap-4 d-grid grid-form">
              <Field id="city" label="Cidade">
                {(props) => (
                  <Input
                    {...props}
                    value={form.city}
                    onChange={(event) => update({ city: event.target.value })}
                  />
                )}
              </Field>

              <Field id="state" label="UF" error={errors.state}>
                {(props) => (
                  <Input
                    {...props}
                    value={form.state}
                    onChange={(event) => update({ state: event.target.value.toUpperCase() })}
                    maxLength={2}
                    placeholder="RS"
                  />
                )}
              </Field>
            </div>
          </TabsContent>

          {/* Publicação --------------------------------------------------- */}
          <TabsContent value="publicacao" className="space-y-5">
            {isEditing ? (
              <>
                <section className="border bg-body space-y-3 rounded-3 p-3">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div className="space-y-1">
                      <h3 className="fs-7 fw-medium">Situação atual</h3>
                      <p className="text-body-secondary fs-7">
                        {STATUS_META[initiative.status]?.description}
                      </p>
                    </div>
                    <StatusBadge status={initiative.status} />
                  </div>

                  <dl className="text-body-secondary d-grid gap-2 fs-7 grid-cols-sm-3">
                    <div>
                      <dt className="fs-8 tracking-wide text-uppercase">Criada em</dt>
                      <dd className="text-body">{formatDate(initiative.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="fs-8 tracking-wide text-uppercase">Última alteração</dt>
                      <dd className="text-body">{formatDate(initiative.updated_at)}</dd>
                    </div>
                    <div>
                      <dt className="fs-8 tracking-wide text-uppercase">Publicada em</dt>
                      <dd className="text-body">
                        {initiative.published_at ? formatDate(initiative.published_at) : '—'}
                      </dd>
                    </div>
                  </dl>

                  <div className="border border-top pt-3">
                    <StatusActions record={initiative} />
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="fs-7 fw-medium">Histórico de revisão</h3>
                  <ReviewHistory initiativeId={initiative.id} />
                </section>
              </>
            ) : null}
          </TabsContent>
        </fieldset>
      </Tabs>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.()
        }}
        title="Sair sem salvar?"
        description="Há alterações não salvas neste formulário. Se sair agora, elas serão perdidas."
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar editando"
        destructive
        onConfirm={() => blocker.proceed?.()}
      />
    </form>
  )
}
