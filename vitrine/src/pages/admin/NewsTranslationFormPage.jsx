import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Copy, ExternalLink, Lock, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { ArticleEditor } from '@/components/admin/ArticleEditor'
import { LanguageFlag } from '@/components/layout/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { AutosizeTextarea, Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Image } from '@/components/ui/image'
import { StatusBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/toast'
import {
  useDeleteNewsTranslation,
  useNewsItem,
  useNewsTranslations,
  useSaveNewsTranslation,
} from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'
import { LOCALES, newsArticlePath, TRANSLATION_LOCALES } from '@/i18n/config'
import { STATUS } from '@/lib/constants'
import { normalizeGallery } from '@/lib/news-content'
import { formatDate, formatTime } from '@/lib/utils'

/** "para o inglês", "para o espanhol" — o painel é só em português. */
const TARGET_NAME = { en: 'inglês', es: 'espanhol' }

/** Enter num campo de uma linha só leva ao próximo — mesmo gesto do formulário da notícia. */
function focusNextOnEnter(event, nextId) {
  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
  event.preventDefault()
  const next = document.getElementById(nextId)
  ;(next?.matches('textarea, input') ? next : next?.querySelector('textarea'))?.focus()
}

/**
 * Estado inicial do formulário. Os textos das fotos da galeria são montados a
 * partir das fotos da NOTÍCIA: a tradução guarda só legenda e descrição de cada
 * uma, casadas pela URL.
 */
function initialValues(news, translation) {
  const texts = new Map(
    (Array.isArray(translation?.gallery) ? translation.gallery : []).map((item) => [item.url, item]),
  )

  return {
    kicker: translation?.kicker ?? '',
    name: translation?.name ?? '',
    excerpt: translation?.excerpt ?? '',
    content: translation?.content ?? '',
    cover_alt: translation?.cover_alt ?? '',
    cover_caption: translation?.cover_caption ?? '',
    gallery: normalizeGallery(news.gallery).map((photo) => ({
      url: photo.url,
      caption: texts.get(photo.url)?.caption ?? '',
      alt: texts.get(photo.url)?.alt ?? '',
    })),
  }
}

/**
 * O original, sempre à vista de quem traduz: o título, a linha fina e o corpo
 * em português. Fechado por padrão no celular não faria diferença — é um
 * `<details>`, que já nasce aberto aqui porque traduzir sem ver o original é o
 * erro mais provável.
 */
function OriginalPanel({ news }) {
  return (
    <details open className="border bg-body-tertiary rounded-3 p-3">
      <summary className="fs-7 fw-semibold">Original em português</summary>
      <div className="mt-3 space-y-2" lang="pt-BR">
        {news.kicker ? (
          <p className="text-primary fs-8 fw-bold text-uppercase">{news.kicker}</p>
        ) : null}
        <p className="fw-bold fs-5 lh-sm">{news.name}</p>
        {news.excerpt ? <p className="text-body-secondary fs-7">{news.excerpt}</p> : null}
        {news.content ? (
          <p className="text-body-secondary max-h-fx-64 overflow-auto fs-7 text-prewrap">
            {news.content}
          </p>
        ) : null}
      </div>
    </details>
  )
}

function TranslationForm({ news, locale, translation }) {
  const navigate = useNavigate()
  const { canReview } = useAuth()
  const save = useSaveNewsTranslation()
  const remove = useDeleteNewsTranslation()
  const isEditing = Boolean(translation)
  const target = TARGET_NAME[locale]

  const [values, setValues] = useState(() => initialValues(news, translation))
  // O editor em blocos lê o valor só ao montar: copiar o corpo do original
  // troca a chave para ele remontar com o texto novo.
  const [editorKey, setEditorKey] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Espelha a trava do banco (`enforce_news_translation_rules`): com a notícia
  // na fila, as traduções congelam para quem não revisa.
  const locked = news.status === STATUS.PENDING_REVIEW && !canReview
  const published = news.status === STATUS.PUBLISHED
  const publicPath = translation ? newsArticlePath(locale, translation.slug) : null

  function set(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function setPhoto(index, key, value) {
    setValues((current) => ({
      ...current,
      gallery: current.gallery.map((photo, position) =>
        position === index ? { ...photo, [key]: value } : photo,
      ),
    }))
  }

  function copyOriginalBody() {
    // Leva junto imagens e vídeos do corpo, com as legendas em português, para
    // o tradutor só trocar o texto — sem precisar reinserir cada mídia.
    set('content', news.content ?? '')
    setEditorKey((key) => key + 1)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!values.name.trim()) {
      toast.error(`Informe o título em ${target}.`)
      return
    }
    if (!values.content.trim()) {
      toast.error(`Escreva o texto da notícia em ${target}.`)
      return
    }

    try {
      await save.mutateAsync({ id: translation?.id, newsId: news.id, locale, values })
      toast.success(
        published
          ? 'Tradução salva. Ela já está no ar, com a notícia.'
          : 'Tradução salva. Ela vai ao ar junto com a notícia.',
      )
    } catch (error) {
      toast.error(error.message)
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(translation.id)
      toast.success('Tradução excluída.')
      navigate(`/admin/noticias/${news.id}`, { replace: true })
    } catch (error) {
      toast.error(error.message)
      setConfirmDelete(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        backTo={`/admin/noticias/${news.id}`}
        backLabel="Notícia original"
        title={isEditing ? `Tradução para o ${target}` : `Traduzir para o ${target}`}
        description={news.name}
        actions={
          <>
            {published && publicPath ? (
              <Button variant="outline" asChild>
                <Link to={publicPath} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  Ver publicada
                </Link>
              </Button>
            ) : null}
            {isEditing ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                disabled={locked}
              >
                <Trash2 aria-hidden="true" />
                Excluir
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
              Esta notícia está na fila de revisão, e as traduções dela ficam congeladas. Devolva-a
              para rascunho para voltar a editar.
            </p>
          ) : null}

          <OriginalPanel news={news} />

          {/*
            A folha leva o `lang` do idioma de destino: o corretor ortográfico
            do navegador passa a conferir em inglês ou espanhol, e não em
            português.
          */}
          <section className="border bg-body rounded-3 article-sheet" lang={locale}>
            <div className="article-column">
              <label htmlFor="translation-kicker" className="visually-hidden">
                Chapéu
              </label>
              <input
                id="translation-kicker"
                className="block-input text-primary fs-8 fw-bold text-uppercase"
                value={values.kicker}
                onChange={(event) => set('kicker', event.target.value)}
                onKeyDown={(event) => focusNextOnEnter(event, 'translation-name')}
                maxLength={60}
                placeholder={`Chapéu em ${target} (opcional)`}
                disabled={locked}
              />

              <label htmlFor="translation-name" className="visually-hidden">
                Título
              </label>
              <AutosizeTextarea
                id="translation-name"
                className="block-input article-title fw-bold mt-2"
                value={values.name}
                onChange={(event) => set('name', event.target.value.replace(/\s*\n\s*/g, ' '))}
                onKeyDown={(event) => focusNextOnEnter(event, 'translation-excerpt')}
                maxLength={160}
                placeholder={`Título em ${target}`}
                disabled={locked}
                required
                autoFocus={!isEditing}
              />

              <label htmlFor="translation-excerpt" className="visually-hidden">
                Resumo
              </label>
              <AutosizeTextarea
                id="translation-excerpt"
                className="block-input article-lead text-body-secondary mt-3"
                value={values.excerpt}
                onChange={(event) => set('excerpt', event.target.value.replace(/\s*\n\s*/g, ' '))}
                onKeyDown={(event) => focusNextOnEnter(event, 'translation-content')}
                maxLength={300}
                placeholder={`Resumo em ${target}: aparece no cartão, na prévia do link e na descrição para o buscador`}
                disabled={locked}
              />
            </div>

            <hr className="article-column my-4" />

            <div className="article-column">
              <p id="translation-content-label" className="visually-hidden">
                Texto da notícia
              </p>
              <ArticleEditor
                key={editorKey}
                id="translation-content"
                labelledBy="translation-content-label"
                describedBy="translation-content-hint"
                value={values.content}
                onChange={(content) => set('content', content)}
                disabled={locked}
              />
              <div className="mt-3 d-flex flex-wrap align-items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyOriginalBody}
                  disabled={locked || !news.content}
                >
                  <Copy aria-hidden="true" />
                  Copiar o corpo do original
                </Button>
                <p id="translation-content-hint" className="text-body-secondary fs-8 text-pretty">
                  Traz o texto em português com as imagens e os vídeos no lugar — é só traduzir
                  bloco a bloco. Substitui o que estiver escrito aqui.
                </p>
              </div>
            </div>
          </section>

          {values.gallery.length ? (
            <section className="border bg-body space-y-3 rounded-3 p-3 p-sm-4">
              <div className="space-y-1">
                <h2 className="fs-7 fw-semibold">Galeria</h2>
                <p className="text-body-secondary fs-7 text-pretty">
                  As fotos são as da notícia. Foto sem legenda nem descrição aqui usa o texto do
                  original, marcado como português para o leitor de tela.
                </p>
              </div>
              <ul className="space-y-3">
                {values.gallery.map((photo, index) => (
                  <li key={photo.url} className="d-grid gap-3 grid-cols-sm-2 align-items-start">
                    <Image src={photo.url} alt="" ratio="ratio-16x9" wrapperClassName="rounded-2" />
                    <div lang={locale}>
                      <Field id={`translation-photo-${index}-caption`} label="Legenda">
                        {(props) => (
                          <Input
                            {...props}
                            value={photo.caption}
                            onChange={(event) => setPhoto(index, 'caption', event.target.value)}
                            maxLength={200}
                            disabled={locked}
                          />
                        )}
                      </Field>
                      <Field
                        id={`translation-photo-${index}-alt`}
                        label="Texto alternativo"
                        className="mb-0"
                      >
                        {(props) => (
                          <Input
                            {...props}
                            value={photo.alt}
                            onChange={(event) => setPhoto(index, 'alt', event.target.value)}
                            maxLength={200}
                            disabled={locked}
                          />
                        )}
                      </Field>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-4">
          <section className="border bg-body space-y-3 rounded-3 p-3">
            <div className="d-flex align-items-center gap-2">
              <LanguageFlag code={LOCALES[locale].flag} />
              <h2 className="fs-7 fw-semibold">{LOCALES[locale].label}</h2>
            </div>
            <StatusBadge status={news.status} />
            <p className="text-body-secondary fs-7 text-pretty">
              A tradução não tem revisão própria: ela vai ao ar junto com a notícia e sai do ar
              junto com ela.
              {published ? ' Esta notícia está publicada — ao salvar, a tradução entra no ar na hora.' : ''}
            </p>

            <div className="space-y-1">
              <p className="fs-8 fw-semibold text-uppercase text-body-secondary">Endereço</p>
              {publicPath ? (
                <p className="fs-7 text-break">
                  <code>{publicPath}</code>
                </p>
              ) : (
                <p className="text-body-secondary fs-7 text-pretty">
                  Gerado a partir do título no primeiro salvamento. Depois disso não muda, para
                  não quebrar links já compartilhados.
                </p>
              )}
            </div>

            {translation?.updated_at ? (
              <p className="text-body-secondary fs-8">
                Atualizada em {formatDate(translation.updated_at)} às{' '}
                {formatTime(translation.updated_at)}
              </p>
            ) : null}
          </section>

          {news.cover_image ? (
            <section className="border bg-body space-y-3 rounded-3 p-3">
              <h2 className="fs-7 fw-semibold">Imagem de capa</h2>
              <Image src={news.cover_image} alt="" ratio="ratio-16x9" wrapperClassName="rounded-2" />
              <div lang={locale}>
                <Field
                  id="translation-cover-alt"
                  label="Texto alternativo da capa"
                  hint={news.cover_alt ? `Original: ${news.cover_alt}` : undefined}
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
                  id="translation-cover-caption"
                  label="Legenda da capa"
                  hint={news.cover_caption ? `Original: ${news.cover_caption}` : undefined}
                  className="mb-0"
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
              </div>
              <p className="text-body-secondary fs-8 text-pretty">
                O crédito da foto é o do original: é atribuição de autoria, não texto a traduzir.
              </p>
            </section>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title={`Excluir a tradução para o ${target}?`}
        description={
          published
            ? `O endereço ${publicPath} sai do ar e passa a responder "não encontrada". A notícia original continua publicada.`
            : 'A notícia original não é afetada.'
        }
        confirmLabel="Excluir tradução"
        onConfirm={handleDelete}
        loading={remove.isPending}
      />
    </form>
  )
}

/**
 * Tradução de uma notícia para um idioma: `/admin/noticias/:id/traducoes/:locale`.
 *
 * O idioma vem da URL e é conferido contra a lista de idiomas de tradução —
 * qualquer outro valor volta para a notícia. Quem pode editar é decidido pelo
 * RLS (autor da notícia, revisor ou administrador), não por esta tela.
 */
export function NewsTranslationFormPage() {
  const { id, locale } = useParams()
  const valid = TRANSLATION_LOCALES.includes(locale)
  const news = useNewsItem(valid ? id : null)
  const translations = useNewsTranslations(valid ? id : null)

  if (!valid) return <Navigate to={`/admin/noticias/${id}`} replace />

  if (news.isPending || translations.isPending) {
    return (
      <>
        <PageHeader title="Tradução" />
        <Skeleton />
      </>
    )
  }

  if (news.isError || translations.isError || !news.data) {
    const error = news.error ?? translations.error
    const missingMigration = /news_translations/i.test(error?.message ?? '')
    return (
      <>
        <PageHeader title="Tradução" backTo={`/admin/noticias/${id}`} backLabel="Notícia original" />
        <ErrorState
          description={
            missingMigration
              ? 'As traduções ainda não estão habilitadas neste banco. Aplique a migration 20250101000014_news_translations.sql (ver db/README.md).'
              : (error?.message ?? 'Notícia não encontrada.')
          }
          onRetry={() => {
            news.refetch()
            translations.refetch()
          }}
        />
      </>
    )
  }

  const translation = translations.data.find((row) => row.locale === locale) ?? null

  return (
    <TranslationForm
      key={`${locale}-${translation?.id ?? 'nova'}`}
      news={news.data}
      locale={locale}
      translation={translation}
    />
  )
}
