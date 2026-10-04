import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Languages, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/ui/image'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { NewsCard } from '@/components/news/NewsCard'
import { ShareBar } from '@/components/news/ShareBar'
import { VideoEmbed } from '@/components/news/VideoEmbed'
import { TextToSpeech } from '@/components/accessibility/TextToSpeech'
import { buildArticleSpeech } from '@/lib/speech'
import { usePublishedNews, useRelatedNews } from '@/hooks/use-queries'
import { useTrackView } from '@/hooks/use-track-view'
import { useDocumentMeta, useSite, useStructuredData } from '@/hooks/use-seo'
import { LocaleScope, useLocale, usePageLanguages } from '@/contexts/LocaleContext'
import {
  buildNewsMeta,
  newsArticleJsonLd,
  newsBreadcrumbJsonLd,
  newsVersionPaths,
  PRIVATE_ROBOTS,
} from '@/lib/seo'
import {
  DEFAULT_LOCALE,
  LOCALES,
  newsArticlePath,
  newsListPath,
  normalizeLocale,
} from '@/i18n/config'
import {
  articleImageUrls,
  contentUpdatedAfterPublish,
  parseArticleBody,
} from '@/lib/news-content'
import { cn } from '@/lib/utils'

/**
 * Largura da coluna de leitura.
 *
 * ~44rem com corpo em 18px dá por volta de 70 caracteres por linha, que é a
 * medida em que a leitura corrida se sustenta. Título, texto, fotos e legendas
 * usam todos esta mesma coluna: no formato de jornal o alinhamento à esquerda é
 * o que amarra a página, e uma foto mais larga que o texto quebraria isso.
 */
const COLUMN = 'mx-auto w-100'

/**
 * Corpo da notícia.
 *
 * Nada de `dangerouslySetInnerHTML`: `parseArticleBody` devolve blocos de texto
 * puro e o React escapa tudo, então uma tag colada no formulário aparece como
 * texto na página, e não como marcação executável. Vale igual para as
 * traduções, que passam pelo mesmo analisador.
 */
function ArticleBody({ blocks }) {
  if (!blocks.length) return null

  return (
    <div className="article-body">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.level === 3) {
            return (
              <h3 key={index} className="fw-bold mt-4 mb-2 fs-6 lh-sm fs-sm-5">
                {block.text}
              </h3>
            )
          }

          return (
            <h2
              key={index}
              className="fw-bold mt-5 mb-2 fs-5 lh-sm fs-sm-4"
            >
              {block.text}
            </h2>
          )
        }

        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List
              key={index}
              className={cn('mt-3 space-y-2 ps-4', block.ordered ? 'list-decimal' : 'list-disc')}
            >
              {block.items.map((entry, position) => (
                <li key={position} className="text-pretty">
                  {entry}
                </li>
              ))}
            </List>
          )
        }

        if (block.type === 'quote') {
          return (
            <figure key={index} className="mt-4 border-start border-3 border-primary ps-3 ps-sm-4">
              <blockquote className="blockquote mb-0">
                <p className="m-0 text-pretty">{block.text}</p>
              </blockquote>
              {block.cite ? (
                <figcaption className="blockquote-footer mt-2 mb-0">{block.cite}</figcaption>
              ) : null}
            </figure>
          )
        }

        if (block.type === 'divider') {
          return <hr key={index} className="my-5" />
        }

        // Foto do corpo: mesmo quadro, legenda e cadeia de texto alternativo
        // das fotos da galeria.
        if (block.type === 'image') {
          return (
            <figure key={index} className="mt-4">
              <Image
                src={block.url}
                alt={block.alt || block.caption || ''}
                ratio="ratio-16x9"
                wrapperClassName="rounded-3"
              />
              <ImageCaption caption={block.caption} credit={block.credit} />
            </figure>
          )
        }

        if (block.type === 'video') {
          return (
            <figure key={index} className="mt-4">
              <VideoEmbed videoId={block.videoId} title={block.caption} />
              <ImageCaption caption={block.caption} />
            </figure>
          )
        }

        return (
          <p key={index} className="mt-3 text-pretty text-prewrap">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

/** Legenda + crédito. Some inteira quando a foto não tem nem um nem outro. */
function ImageCaption({ caption, credit, className }) {
  if (!caption && !credit) return null

  return (
    <figcaption className={cn('text-body-secondary mt-2 fs-7 lh-sm', className)}>
      {caption}
      {credit ? (
        <span className={cn('text-body-secondary opacity-75 fs-8', caption && 'ms-1')}>
          {credit}
        </span>
      ) : null}
    </figcaption>
  )
}

/**
 * As outras versões desta notícia, como links de verdade.
 *
 * O seletor do cabeçalho já leva de uma versão à outra, mas ele só existe
 * depois que o menu abre. Estes links ficam no HTML da página: o leitor vê
 * que a notícia existe em outra língua, e o rastreador segue o caminho — cada
 * um com `hreflang` e o nome do idioma escrito nele mesmo.
 */
function OtherVersions({ item }) {
  const { t } = useLocale()
  const others = item.versions.filter((version) => version.locale !== item.locale)
  if (!others.length) return null

  return (
    <nav aria-label={t('news.detail.versionsLabel')} className="text-body-secondary fs-7">
      <Languages className="me-1 icon" aria-hidden="true" />
      {t('news.detail.alsoAvailable')}:{' '}
      {others.map((version, index) => (
        <span key={version.locale}>
          {index > 0 ? <span aria-hidden="true"> · </span> : null}
          <Link
            to={newsArticlePath(version.locale, version.slug)}
            hrefLang={LOCALES[version.locale].hreflang}
            lang={version.locale}
            className="text-primary text-decoration-underline"
          >
            {LOCALES[version.locale].label}
          </Link>
        </span>
      ))}
    </nav>
  )
}

/**
 * A notícia em si. Roda dentro do `LocaleScope` do idioma da URL: rótulos,
 * datas e avisos saem nesse idioma, qualquer que seja a escolha de quem lê.
 */
function NewsArticleView({ locale, query, blocks, related, notice }) {
  const { t, formatDate, formatTime } = useLocale()
  const { data: item, isPending, isError, error, refetch } = query

  if (isPending) {
    return (
      <div className="container space-y-4 py-5">
        <Skeleton className="h-fx-6 w-fx-40" />
        <Skeleton className="h-fx-12 w-100 mw-2xl" />
        <Skeleton className="w-100" />
        <Skeleton className="h-fx-64 w-100" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container py-5">
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="container py-5">
        <EmptyState
          icon={Newspaper}
          title={t('news.detail.notFoundTitle')}
          description={t('news.detail.notFoundDescription')}
          action={
            <Button variant="outline" asChild>
              <Link to={newsListPath(locale)}>{t('news.detail.seeAll')}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const date = item.published_at ?? item.created_at
  const correctedAt = contentUpdatedAfterPublish(item)
  const gallery = item.gallery ?? []

  // O corpo é interpretado uma vez (na página, abaixo) e serve aos três
  // consumidores: o que a página pinta, o que a leitura em voz alta narra e a
  // lista de imagens do dado estruturado. Analisar mais de uma vez abriria
  // espaço para eles divergirem.
  const speech = buildArticleSpeech({
    kicker: item.kicker,
    title: item.name,
    lead: item.excerpt,
    blocks,
  })

  /* Textos de imagem que vieram do original, por falta de tradução, levam o
     `lang` do original — o leitor de tela troca de voz só naquele trecho. */
  const coverLang = item.coverTextLocale && item.coverTextLocale !== item.locale
    ? item.coverTextLocale
    : undefined

  return (
    <article className="container py-5 py-sm-5">
      {notice}

      <Link
        to={newsListPath(item.locale)}
        className="text-body-secondary mb-5 d-inline-flex align-items-center gap-1 fs-7"
      >
        <ArrowLeft className="icon" aria-hidden="true" />
        {t('news.detail.back')}
      </Link>

      {/* Cabeçalho ---------------------------------------------------------- */}
      <header className={cn(COLUMN, 'space-y-3')}>
        {item.kicker ? (
          <p className="text-primary fs-8 fw-bold text-uppercase">{item.kicker}</p>
        ) : null}

        <h1 className="fw-bold article-title text-balance">{item.name}</h1>

        {/* Linha fina: o resumo, no papel que ele já tinha, com o peso maior
            que o formato de jornal dá à abertura. */}
        {item.excerpt ? (
          <p className="text-body-secondary article-lead text-pretty">{item.excerpt}</p>
        ) : null}

        <div className="space-y-3 py-3">
          <div className="text-body-secondary d-flex flex-wrap align-items-center column-gap-3 row-gap-2 fs-7">
            {/* A assinatura vira link quando o autor tem página. `rel="author"`
                é o par em HTML do campo `author` do JSON-LD: os dois dizem a
                mesma coisa, e autoria identificável é um dos critérios de
                transparência que o Google avalia em veículos de notícia. */}
            {item.author?.name ? (
              <span className="d-inline-flex align-items-center gap-2">
                <Avatar src={item.author.avatar_url} name={item.author.name} size="sm" />
                <span>
                  {t('news.detail.by')}{' '}
                  {item.author.slug ? (
                    <Link
                      to={`/autor/${item.author.slug}`}
                      rel="author"
                      className="text-body fw-medium hover-underline"
                    >
                      {item.author.name}
                    </Link>
                  ) : (
                    <span className="text-body fw-medium">{item.author.name}</span>
                  )}
                </span>
              </span>
            ) : null}

            {date ? (
              <time dateTime={new Date(date).toISOString()}>
                {t('news.detail.publishedAt', { date: formatDate(date), time: formatTime(date) })}
              </time>
            ) : null}

            {/* Só aparece quando o texto mudou depois de publicado — ver
                `contentUpdatedAfterPublish`. Uma nota de correção que aparece
                em toda notícia deixa de significar alguma coisa. */}
            {correctedAt ? (
              <span className="d-inline-flex align-items-center gap-1">
                <span aria-hidden="true">·</span>
                <span>
                  {t('news.detail.updated')}{' '}
                  <time dateTime={new Date(correctedAt).toISOString()}>
                    {t('news.detail.publishedAt', {
                      date: formatDate(correctedAt),
                      time: formatTime(correctedAt),
                    })}
                  </time>
                </span>
              </span>
            ) : null}
          </div>

          <OtherVersions item={item} />

          <ShareBar title={item.name} />

          {/* Lê exatamente o texto editorial — chapéu, título, linha fina e
              corpo —, nunca o DOM da página. Fica aqui, e não no painel
              flutuante, porque o recurso é da notícia: no topo dela é onde
              quem quer ouvir procura. A voz é a do idioma do texto. */}
          <TextToSpeech text={speech} lang={item.locale} />
        </div>
      </header>

      {/* Capa --------------------------------------------------------------- */}
      {item.cover_image ? (
        <figure className={cn(COLUMN, 'mt-5')} lang={coverLang}>
          {/* Cadeia de recuo do texto alternativo: o campo próprio quando o
              editor preencheu, senão a legenda — que descreve a cena e é o
              melhor substituto disponível. `alt=""` só quando não há nem um
              nem outro, porque anunciar "imagem" sem conteúdo algum é pior do
              que o leitor de tela pular a figura. */}
          <Image
            src={item.cover_image}
            alt={item.cover_alt || item.cover_caption || ''}
            ratio="ratio-16x9"
            eager
            wrapperClassName="rounded-3"
          />
          <ImageCaption caption={item.cover_caption} credit={item.cover_credit} />
        </figure>
      ) : null}

      {/* Texto -------------------------------------------------------------- */}
      <div className={cn(COLUMN, 'mt-5')}>
        <ArticleBody blocks={blocks} />
      </div>

      {/* Galeria ------------------------------------------------------------ */}
      {gallery.length ? (
        <div className={cn(COLUMN, 'mt-5 space-y-5')}>
          {gallery.map((photo) => (
            <figure
              key={photo.url}
              lang={photo.textLocale && photo.textLocale !== item.locale ? photo.textLocale : undefined}
            >
              {/* Mesma cadeia da capa. O recuo anterior repetia o título da
                  notícia em toda foto: para quem usa leitor de tela, três
                  imagens viravam três vezes a mesma manchete, sem informação
                  nenhuma sobre o que cada uma mostra. */}
              <Image
                src={photo.url}
                alt={photo.alt || photo.caption || ''}
                ratio="ratio-16x9"
                wrapperClassName="rounded-3"
              />
              <ImageCaption caption={photo.caption} credit={photo.credit} />
            </figure>
          ))}
        </div>
      ) : null}

      {related?.length ? (
        <section className="border mt-5 border-top pt-5">
          <h2 className="fw-bold mb-4 fs-4">{t('news.detail.related')}</h2>
          <div className="d-grid grid-cols-1 gap-3 grid-cols-sm-2 grid-cols-lg-3">
            {related.map((other) => (
              <NewsCard key={other.id} item={other} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  )
}

/**
 * Aviso para quem escolheu um idioma diferente do da página, no idioma DE
 * QUEM LÊ. Montado aqui fora, no contexto da interface, e entregue pronto ao
 * corpo da notícia — dentro do `LocaleScope` ele sairia no idioma da notícia.
 *
 * Nunca aparece para o rastreador: sem escolha gravada, a interface é o
 * próprio idioma da página.
 */
function useLanguageNotice(item) {
  const { locale, t, rich, languageName } = useLocale()
  if (!item || item.locale === locale) return null

  const own = item.versions.find((version) => version.locale === locale)

  return (
    <p
      lang={locale}
      className="border bg-body-tertiary text-body-secondary mb-4 d-flex align-items-start gap-2 rounded-3 p-3 fs-7 text-pretty"
    >
      <Languages className="mt-1 icon flex-shrink-0" aria-hidden="true" />
      <span>
        {own
          ? rich(
              'news.detail.availableInYourLanguage',
              {
                link: (text) => (
                  <Link
                    to={newsArticlePath(locale, own.slug)}
                    hrefLang={LOCALES[locale].hreflang}
                    className="text-primary text-decoration-underline"
                  >
                    {text}
                  </Link>
                ),
              },
              { language: languageName(locale) },
            )
          : t('news.detail.notTranslated', {
              language: languageName(locale),
              current: languageName(item.locale),
            })}
      </span>
    </p>
  )
}

/**
 * Página de notícia, num dos três idiomas: `/noticia/:slug`,
 * `/en/news/:slug` ou `/es/noticia/:slug`. O slug é o do idioma — cada versão
 * tem o seu.
 */
export function NewsDetailPage({ locale: requested = DEFAULT_LOCALE }) {
  const locale = normalizeLocale(requested)
  const { slug } = useParams()
  const query = usePublishedNews(slug, locale)
  const item = query.data
  const { data: related } = useRelatedNews(item?.id, locale)
  // Audiência: a notícia conta no idioma em que foi lida.
  useTrackView('news', item?.id, item?.locale ?? locale)

  /*
   * Metadados e dado estruturado saem das MESMAS funções que `server/src/seo/article.js`
   * usa para escrever o `<head>` no servidor. Enquanto a notícia carrega (ou
   * se a consulta do navegador falhar), o `<head>` do servidor — que já é o
   * certo — fica intocado.
   */
  const site = useSite()
  const settled = !query.isPending && !query.isError
  const blocks = item ? parseArticleBody(item.content) : []
  // Capa, fotos do corpo e galeria — a ordem em que aparecem, que é a que o
  // schema.org espera em `image`.
  const images = item
    ? articleImageUrls({ cover: item.cover_image, blocks, gallery: item.gallery })
    : []

  useDocumentMeta(
    !settled
      ? null
      : item
        ? buildNewsMeta({ article: item, site })
        : { title: LOCALES[locale].seo.notFoundTitle, robots: PRIVATE_ROBOTS },
  )

  useStructuredData(
    !settled
      ? undefined
      : item
        ? [newsArticleJsonLd({ article: item, site, images }), newsBreadcrumbJsonLd({ site, article: item })]
        : null,
  )

  // O seletor de idioma leva à mesma notícia no idioma escolhido.
  usePageLanguages(
    item
      ? Object.fromEntries(newsVersionPaths(item.versions).map(({ locale: code, path }) => [code, path]))
      : null,
  )

  const notice = useLanguageNotice(item)
  const contentLocale = item?.locale ?? locale

  return (
    <div lang={contentLocale}>
      <LocaleScope locale={contentLocale}>
        <NewsArticleView
          locale={locale}
          query={query}
          blocks={blocks}
          related={related}
          notice={notice}
        />
      </LocaleScope>
    </div>
  )
}
