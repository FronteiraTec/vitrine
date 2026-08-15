import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, History, Lock } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { NewsGalleryEditor } from '@/components/admin/NewsGalleryEditor'
import { StatusActions } from '@/components/admin/StatusActions'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { useNewsItem, useNewsReviewHistory, useSaveNews } from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'
import { BUCKETS, STATUS, STATUS_META } from '@/lib/constants'
import { normalizeGallery } from '@/lib/news-content'
import { formatDate, formatTime } from '@/lib/utils'

const EMPTY = {
  name: '',
  kicker: '',
  excerpt: '',
  content: '',
  cover_image: null,
  cover_caption: '',
  cover_credit: '',
  gallery: [],
}

function ReviewHistory({ newsId }) {
  const { data } = useNewsReviewHistory(newsId)
  if (!data?.length) return null

  return (
    <section className="border-border bg-card rounded-lg border p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <History className="size-4" aria-hidden="true" />
        Histórico de revisão
      </h2>
      <ol className="space-y-4">
        {data.map((entry) => (
          <li key={entry.id} className="border-border border-l-2 pl-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">
                {STATUS_META[entry.from_status]?.label ?? '—'}
              </span>
              <span className="text-muted-foreground" aria-hidden="true">
                →
              </span>
              <StatusBadge status={entry.to_status} size="sm" />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {entry.reviewer?.name ?? 'Sistema'} · {formatDate(entry.created_at)} às{' '}
              {formatTime(entry.created_at)}
            </p>
            {entry.notes ? (
              <p className="bg-muted mt-2 rounded-md p-3 text-sm text-pretty">{entry.notes}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Formulário montado com `key` a partir do registro carregado, então inicializa
 * o estado direto das props — mesmo padrão das outras telas do painel.
 */
function NewsForm({ item }) {
  const navigate = useNavigate()
  const { canReview } = useAuth()
  const save = useSaveNews()
  const isEditing = Boolean(item)

  const [values, setValues] = useState(() =>
    item
      ? {
          name: item.name ?? '',
          kicker: item.kicker ?? '',
          excerpt: item.excerpt ?? '',
          content: item.content ?? '',
          cover_image: item.cover_image ?? null,
          cover_caption: item.cover_caption ?? '',
          cover_credit: item.cover_credit ?? '',
          gallery: normalizeGallery(item.gallery),
        }
      : EMPTY,
  )

  // Espelha `enforce_news_workflow`: na fila, o conteúdo fica congelado para
  // quem não revisa. Bloquear aqui evita o usuário escrever e só descobrir no
  // erro do banco ao salvar.
  const locked = isEditing && item.status === STATUS.PENDING_REVIEW && !canReview

  function set(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!values.name.trim()) {
      toast.error('Informe o título da notícia.')
      return
    }

    try {
      const saved = await save.mutateAsync({ id: item?.id, values })
      toast.success(isEditing ? 'Notícia salva.' : 'Notícia criada como rascunho.')
      if (!isEditing) navigate(`/admin/noticias/${saved.id}`, { replace: true })
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        backTo="/admin/noticias"
        backLabel="Notícias"
        title={isEditing ? item.name : 'Nova notícia'}
        description={
          isEditing
            ? STATUS_META[item.status]?.description
            : 'Ela nasce como rascunho e só aparece na vitrine depois de publicada.'
        }
        actions={
          <>
            {isEditing && item.status === STATUS.PUBLISHED ? (
              <Button variant="outline" asChild>
                <Link to={`/noticia/${item.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  Ver publicada
                </Link>
              </Button>
            ) : null}
            <Button type="submit" loading={save.isPending} disabled={locked}>
              Salvar
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="space-y-6">
          {locked ? (
            <p className="border-border bg-muted text-muted-foreground flex items-start gap-2 rounded-lg border p-4 text-sm text-pretty">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Esta notícia está na fila de revisão e não pode ser editada. Devolva-a para rascunho
              para voltar a alterar o conteúdo.
            </p>
          ) : null}

          <section className="border-border bg-card space-y-6 rounded-lg border p-5 sm:p-6">
            <Field
              id="news-kicker"
              label="Chapéu"
              hint="Rótulo curto acima do título, como a editoria de um jornal: “Eleições 2026”, “Pesquisa”, “Extensão”. Opcional."
            >
              {(props) => (
                <Input
                  {...props}
                  value={values.kicker}
                  onChange={(event) => set('kicker', event.target.value)}
                  maxLength={60}
                  placeholder="Ex.: Pesquisa"
                  disabled={locked}
                />
              )}
            </Field>

            <Field id="news-name" label="Título" required>
              {(props) => (
                <Input
                  {...props}
                  value={values.name}
                  onChange={(event) => set('name', event.target.value)}
                  maxLength={160}
                  disabled={locked}
                  required
                  autoFocus={!isEditing}
                />
              )}
            </Field>

            <Field
              id="news-excerpt"
              label="Resumo"
              hint="Uma ou duas frases. Aparece no cartão da listagem e na prévia ao compartilhar o link."
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={3}
                  value={values.excerpt}
                  onChange={(event) => set('excerpt', event.target.value)}
                  maxLength={300}
                  disabled={locked}
                />
              )}
            </Field>

            <Field
              id="news-content"
              label="Texto"
              hint="Separe os parágrafos com uma linha em branco. Uma linha começando com ## vira intertítulo, e linhas começando com - viram lista."
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={16}
                  value={values.content}
                  onChange={(event) => set('content', event.target.value)}
                  disabled={locked}
                />
              )}
            </Field>
          </section>

          {/*
            A galeria fica na coluna larga, e não na barra lateral junto da
            capa: cada item tem miniatura mais dois campos de texto ao lado, o
            que não cabe nos 20rem da lateral.
          */}
          <section className="border-border bg-card rounded-lg border p-5 sm:p-6">
            <NewsGalleryEditor
              value={values.gallery}
              onChange={(gallery) => set('gallery', gallery)}
              disabled={locked}
            />
          </section>
        </div>

        <div className="space-y-6">
          {isEditing ? (
            <section className="border-border bg-card space-y-4 rounded-lg border p-5">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Situação</h2>
                <p className="text-muted-foreground text-sm">
                  {STATUS_META[item.status]?.description}
                </p>
              </div>
              <StatusBadge status={item.status} />
              <StatusActions record={item} kind="news" size="sm" />
            </section>
          ) : null}

          <section className="border-border bg-card space-y-4 rounded-lg border p-5">
            <ImageUploader
              value={values.cover_image}
              onChange={(url) => set('cover_image', url)}
              bucket={BUCKETS.NEWS}
              label="Imagem de capa"
              hint="Aparece no cartão e no topo da notícia. Proporção 16:9."
              ratio="aspect-[16/9]"
            />

            {/*
              Legenda e crédito continuam visíveis mesmo sem capa escolhida: a
              foto costuma chegar depois do texto, e escondê-los faria o campo
              sumir justo de quem já sabe o que vai escrever ali.
            */}
            <Field
              id="news-cover-caption"
              label="Legenda da capa"
              hint="Descreve a cena. Aparece logo abaixo da foto."
            >
              {(props) => (
                <Input
                  {...props}
                  value={values.cover_caption}
                  onChange={(event) => set('cover_caption', event.target.value)}
                  maxLength={200}
                  disabled={locked}
                />
              )}
            </Field>

            <Field
              id="news-cover-credit"
              label="Crédito da capa"
              hint="Quem fez a foto. Ex.: “Foto: Divulgação/UFFS”."
            >
              {(props) => (
                <Input
                  {...props}
                  value={values.cover_credit}
                  onChange={(event) => set('cover_credit', event.target.value)}
                  maxLength={120}
                  disabled={locked}
                />
              )}
            </Field>
          </section>

          {isEditing ? <ReviewHistory newsId={item.id} /> : null}
        </div>
      </div>
    </form>
  )
}

export function NewsFormPage() {
  const { id } = useParams()
  const { data, isPending, isError, error, refetch } = useNewsItem(id)

  if (id && isPending) {
    return (
      <>
        <PageHeader title="Notícia" />
        <Skeleton className="h-[36rem]" />
      </>
    )
  }

  if (id && isError) {
    return (
      <>
        <PageHeader title="Notícia" backTo="/admin/noticias" backLabel="Notícias" />
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      </>
    )
  }

  return <NewsForm key={data?.id ?? 'nova'} item={data ?? null} />
}
