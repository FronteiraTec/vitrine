import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, History, Languages, Lock } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { ArticleEditor } from '@/components/admin/ArticleEditor'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { NewsGalleryEditor } from '@/components/admin/NewsGalleryEditor'
import { StatusActions } from '@/components/admin/StatusActions'
import { LanguageFlag } from '@/components/layout/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { AutosizeTextarea, Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import {
  useNewsItem,
  useNewsReviewHistory,
  useNewsTranslations,
  useSaveNews,
} from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'
import { LOCALES, TRANSLATION_LOCALES } from '@/i18n/config'
import { BUCKETS, STATUS, STATUS_META } from '@/lib/constants'
import { normalizeGallery } from '@/lib/news-content'
import { formatDate, formatTime } from '@/lib/utils'

const EMPTY = {
  name: '',
  kicker: '',
  excerpt: '',
  content: '',
  cover_image: null,
  cover_alt: '',
  cover_caption: '',
  cover_credit: '',
  gallery: [],
}

/** Enter num campo de uma linha só leva ao próximo, como do título ao corpo no Notion. */
function focusNextOnEnter(event, nextId) {
  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
  event.preventDefault()
  const next = document.getElementById(nextId)
  // O corpo é um grupo de blocos; o foco vai para o primeiro deles.
  ;(next?.matches('textarea, input') ? next : next?.querySelector('textarea'))?.focus()
}

function ReviewHistory({ newsId }) {
  const { data } = useNewsReviewHistory(newsId)
  if (!data?.length) return null

  return (
    <section className="border bg-body rounded-3 p-3">
      <h2 className="mb-3 d-flex align-items-center gap-2 fs-7 fw-semibold">
        <History className="icon" aria-hidden="true" />
        Histórico de revisão
      </h2>
      <ol className="space-y-3">
        {data.map((entry) => (
          <li key={entry.id} className="border border-start border-2 ps-3 fs-7">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="text-body-secondary">
                {STATUS_META[entry.from_status]?.label ?? '—'}
              </span>
              <span className="text-body-secondary" aria-hidden="true">
                →
              </span>
              <StatusBadge status={entry.to_status} size="sm" />
            </div>
            <p className="text-body-secondary mt-1 fs-8">
              {entry.reviewer?.name ?? 'Sistema'} · {formatDate(entry.created_at)} às{' '}
              {formatTime(entry.created_at)}
            </p>
            {entry.notes ? (
              <p className="bg-body-secondary mt-2 rounded-2 p-2 fs-7 text-pretty">{entry.notes}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * As versões em outros idiomas. Cada uma é editada na própria tela
 * (`NewsTranslationFormPage`) e vai ao ar junto com a notícia — daqui só se vê
 * o que existe e se chega até ela.
 *
 * Com a migration 0014 pendente, a consulta falha e o painel diz isso em vez
 * de sumir: quem opera precisa saber que falta um passo.
 */
function TranslationsPanel({ newsId }) {
  const { data, isPending, isError, error } = useNewsTranslations(newsId)
  const missingMigration = isError && /news_translations/i.test(error?.message ?? '')

  return (
    <section className="border bg-body space-y-3 rounded-3 p-3">
      <div className="space-y-1">
        <h2 className="d-flex align-items-center gap-2 fs-7 fw-semibold">
          <Languages className="icon" aria-hidden="true" />
          Traduções
        </h2>
        <p className="text-body-secondary fs-7 text-pretty">
          Cada tradução tem endereço próprio e é publicada junto com esta notícia.
        </p>
      </div>

      {isError ? (
        <p className="text-danger fs-8 text-pretty">
          {missingMigration
            ? 'Aplique a migration 20250101000014_news_translations.sql para habilitar as traduções.'
            : error?.message}
        </p>
      ) : isPending ? (
        <Skeleton className="h-fx-12 w-100" />
      ) : (
        <ul className="space-y-2">
          {TRANSLATION_LOCALES.map((code) => {
            const translation = data.find((row) => row.locale === code)
            return (
              <li key={code} className="d-flex align-items-center justify-content-between gap-2">
                <span className="d-flex align-items-center gap-2 fs-7">
                  <LanguageFlag code={LOCALES[code].flag} />
                  <span>
                    <span className="d-block fw-medium" lang={code}>
                      {LOCALES[code].label}
                    </span>
                    <span className="text-body-secondary d-block fs-8">
                      {translation
                        ? `Atualizada em ${formatDate(translation.updated_at)}`
                        : 'Ainda não traduzida'}
                    </span>
                  </span>
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/noticias/${newsId}/traducoes/${code}`}>
                    {translation ? 'Editar' : 'Traduzir'}
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
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
          cover_alt: item.cover_alt ?? '',
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

      <div className="d-grid gap-4 grid-detail align-items-xl-start">
        <div className="space-y-4">
          {locked ? (
            <p className="border bg-body-secondary text-body-secondary d-flex align-items-start gap-2 rounded-3 p-3 fs-7 text-pretty">
              <Lock className="mt-1 icon flex-shrink-0" aria-hidden="true" />
              Esta notícia está na fila de revisão e não pode ser editada. Devolva-a para rascunho
              para voltar a alterar o conteúdo.
            </p>
          ) : null}

          {/*
            A notícia é escrita numa folha com a coluna e a tipografia da página
            pública: chapéu, título, linha fina e corpo aparecem como vão ficar.
            Os campos não têm moldura nem rótulo visível — como no Notion, o
            texto de exemplo diz o que vai em cada lugar. Os rótulos e as dicas
            continuam no DOM para o leitor de tela.
          */}
          <section className="border bg-body rounded-3 article-sheet">
            <div className="article-column">
              <label htmlFor="news-kicker" className="visually-hidden">
                Chapéu
              </label>
              <p id="news-kicker-hint" className="visually-hidden">
                Rótulo curto acima do título, como a editoria de um jornal. Opcional.
              </p>
              <input
                id="news-kicker"
                aria-describedby="news-kicker-hint"
                className="block-input text-primary fs-8 fw-bold text-uppercase"
                value={values.kicker}
                onChange={(event) => set('kicker', event.target.value)}
                onKeyDown={(event) => focusNextOnEnter(event, 'news-name')}
                maxLength={60}
                placeholder="Chapéu — ex.: Pesquisa"
                disabled={locked}
              />

              <label htmlFor="news-name" className="visually-hidden">
                Título
              </label>
              <AutosizeTextarea
                id="news-name"
                className="block-input article-title fw-bold mt-2"
                value={values.name}
                // O título é uma linha só; o Enter passa para o resumo.
                onChange={(event) => set('name', event.target.value.replace(/\s*\n\s*/g, ' '))}
                onKeyDown={(event) => focusNextOnEnter(event, 'news-excerpt')}
                maxLength={160}
                placeholder="Título da notícia"
                disabled={locked}
                required
                autoFocus={!isEditing}
              />

              <label htmlFor="news-excerpt" className="visually-hidden">
                Resumo
              </label>
              <AutosizeTextarea
                id="news-excerpt"
                className="block-input article-lead text-body-secondary mt-3"
                value={values.excerpt}
                onChange={(event) => set('excerpt', event.target.value.replace(/\s*\n\s*/g, ' '))}
                onKeyDown={(event) => focusNextOnEnter(event, 'news-content')}
                maxLength={300}
                placeholder="Resumo: uma ou duas frases que aparecem no cartão da listagem e na prévia do link"
                disabled={locked}
              />
            </div>

            <hr className="article-column my-4" />

            <div className="article-column">
              <p id="news-content-label" className="visually-hidden">
                Texto da notícia
              </p>
              <ArticleEditor
                id="news-content"
                labelledBy="news-content-label"
                describedBy="news-content-hint"
                value={values.content}
                onChange={(content) => set('content', content)}
                disabled={locked}
              />
              <p id="news-content-hint" className="text-body-secondary mt-3 fs-8 text-pretty">
                Digite <kbd>/</kbd> para ver os blocos: intertítulos, listas, citação,
                divisor, imagem e vídeo do YouTube. No começo da linha, <kbd>##</kbd>,{' '}
                <kbd>-</kbd>, <kbd>1.</kbd> e <kbd>&gt;</kbd> seguidos de espaço viram
                intertítulo, lista, lista numerada e citação, e <kbd>---</kbd> vira divisor.
                Colar um link do YouTube numa linha vazia já incorpora o vídeo.{' '}
                <kbd>Shift</kbd>+<kbd>Enter</kbd> quebra a linha, e{' '}
                <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> move o bloco — ou
                arraste pela alça ao lado dele.
              </p>
            </div>
          </section>

          {/*
            A galeria fica na coluna larga, e não na barra lateral junto da
            capa: cada item tem miniatura mais dois campos de texto ao lado, o
            que não cabe nos 20rem da lateral.
          */}
          <section className="border bg-body rounded-3 p-3 p-sm-4">
            <NewsGalleryEditor
              value={values.gallery}
              onChange={(gallery) => set('gallery', gallery)}
              disabled={locked}
            />
          </section>
        </div>

        <div className="space-y-4">
          {isEditing ? (
            <section className="border bg-body space-y-3 rounded-3 p-3">
              <div className="space-y-1">
                <h2 className="fs-7 fw-semibold">Situação</h2>
                <p className="text-body-secondary fs-7">
                  {STATUS_META[item.status]?.description}
                </p>
              </div>
              <StatusBadge status={item.status} />
              <StatusActions record={item} kind="news" size="sm" />
            </section>
          ) : null}

          <section className="border bg-body space-y-3 rounded-3 p-3">
            <ImageUploader
              value={values.cover_image}
              onChange={(url) => set('cover_image', url)}
              bucket={BUCKETS.NEWS}
              label="Imagem de capa"
              hint="Aparece no cartão e no topo da notícia. Proporção 16:9."
              ratio="ratio-16x9"
            />

            {/*
              Legenda e crédito continuam visíveis mesmo sem capa escolhida: a
              foto costuma chegar depois do texto, e escondê-los faria o campo
              sumir justo de quem já sabe o que vai escrever ali.
            */}
            {/*
              Texto alternativo antes da legenda porque é o campo que decide se
              a foto existe ou não para quem usa leitor de tela. Deixá-lo por
              último o transformaria no primeiro a ser esquecido.
            */}
            <Field
              id="news-cover-alt"
              label="Texto alternativo da capa"
              hint="Descreve a foto para quem não a enxerga. Não repita a legenda: ela contextualiza a cena, o texto alternativo diz o que aparece na imagem."
            >
              {(props) => (
                <Input
                  {...props}
                  value={values.cover_alt}
                  onChange={(event) => set('cover_alt', event.target.value)}
                  maxLength={200}
                  disabled={locked}
                />
              )}
            </Field>

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

          {isEditing ? <TranslationsPanel newsId={item.id} /> : null}

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
        <Skeleton />
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
