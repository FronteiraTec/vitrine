import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/ui/image'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { NewsCard } from '@/components/news/NewsCard'
import { ShareBar } from '@/components/news/ShareBar'
import { usePublishedNews, useRelatedNews } from '@/hooks/use-queries'
import { useDocumentMeta, useStructuredData } from '@/hooks/use-utils'
import { contentUpdatedAfterPublish, normalizeGallery, parseArticleBody } from '@/lib/news-content'
import { cn, formatDate, formatTime } from '@/lib/utils'

/**
 * Largura da coluna de leitura.
 *
 * ~44rem com corpo em 18px dá por volta de 70 caracteres por linha, que é a
 * medida em que a leitura corrida se sustenta. Título, texto, fotos e legendas
 * usam todos esta mesma coluna: no formato de jornal o alinhamento à esquerda é
 * o que amarra a página, e uma foto mais larga que o texto quebraria isso.
 */
const COLUMN = 'mx-auto w-full max-w-[44rem]'

/**
 * Corpo da notícia.
 *
 * Nada de `dangerouslySetInnerHTML`: `parseArticleBody` devolve blocos de texto
 * puro e o React escapa tudo, então uma tag colada no formulário aparece como
 * texto na página, e não como marcação executável.
 */
function ArticleBody({ content }) {
  const blocks = parseArticleBody(content)
  if (!blocks.length) return null

  return (
    <div className="text-[1.0625rem] leading-[1.8] sm:text-[1.125rem]">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h2
              key={index}
              className="font-display mt-10 mb-3 text-xl leading-snug font-bold sm:text-2xl"
            >
              {block.text}
            </h2>
          )
        }

        if (block.type === 'list') {
          return (
            <ul key={index} className="marker:text-brand mt-5 list-disc space-y-2 pl-6">
              {block.items.map((entry, position) => (
                <li key={position} className="text-pretty">
                  {entry}
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={index} className="mt-5 text-pretty whitespace-pre-line">
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
    <figcaption className={cn('text-muted-foreground mt-2 text-sm leading-snug', className)}>
      {caption}
      {credit ? (
        <span className={cn('text-muted-foreground/75 text-xs', caption && 'ml-1.5')}>
          {credit}
        </span>
      ) : null}
    </figcaption>
  )
}

export function NewsDetailPage() {
  const { slug } = useParams()
  const { data: item, isPending, isError, error, refetch } = usePublishedNews(slug)
  const { data: related } = useRelatedNews(item?.id)

  const date = item?.published_at ?? item?.created_at
  const correctedAt = contentUpdatedAfterPublish(item)
  const gallery = normalizeGallery(item?.gallery)
  // Capa primeiro, galeria depois — a ordem que o schema.org espera em `image`.
  const images = [item?.cover_image, ...gallery.map((photo) => photo.url)].filter(Boolean)

  useDocumentMeta({
    title: item?.name,
    description: item?.excerpt,
    image: item?.cover_image,
    type: 'article',
  })

  useStructuredData(
    item
      ? {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: item.name,
          description: item.excerpt ?? undefined,
          articleSection: item.kicker ?? undefined,
          image: images.length ? images.slice(0, 10) : undefined,
          datePublished: item.published_at ?? item.created_at,
          dateModified: correctedAt ?? item.updated_at,
          author: item.author?.name ? { '@type': 'Person', name: item.author.name } : undefined,
        }
      : null,
  )

  if (isPending) {
    return (
      <div className="container-page space-y-6 py-12">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-12 w-full max-w-2xl" />
        <Skeleton className="aspect-[16/9] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container-page py-16">
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Newspaper}
          title="Notícia não encontrada"
          description="Ela pode ter sido removida, arquivada ou o endereço está incorreto."
          action={
            <Button variant="outline" asChild>
              <Link to="/noticias">Ver todas as notícias</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <article className="container-page py-8 sm:py-12">
      <Link
        to="/noticias"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Notícias
      </Link>

      {/* Cabeçalho ---------------------------------------------------------- */}
      <header className={cn(COLUMN, 'space-y-4')}>
        {item.kicker ? (
          <p className="text-brand text-xs font-bold tracking-[0.12em] uppercase">{item.kicker}</p>
        ) : null}

        <h1 className="font-display text-[1.75rem] leading-[1.15] font-bold text-balance-title sm:text-[2.5rem]">
          {item.name}
        </h1>

        {/* Linha fina: o resumo, no papel que ele já tinha, com o peso maior
            que o formato de jornal dá à abertura. */}
        {item.excerpt ? (
          <p className="text-muted-foreground text-lg leading-relaxed text-pretty">
            {item.excerpt}
          </p>
        ) : null}

        <div className="border-border space-y-4 border-y py-4">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {item.author?.name ? (
              <span className="inline-flex items-center gap-2">
                <Avatar src={item.author.avatar_url} name={item.author.name} size="sm" />
                <span>
                  Por <span className="text-foreground font-medium">{item.author.name}</span>
                </span>
              </span>
            ) : null}

            {date ? (
              <time dateTime={new Date(date).toISOString()}>
                {formatDate(date)} às {formatTime(date)}
              </time>
            ) : null}

            {/* Só aparece quando o texto mudou depois de publicado — ver
                `contentUpdatedAfterPublish`. Uma nota de correção que aparece
                em toda notícia deixa de significar alguma coisa. */}
            {correctedAt ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true">·</span>
                <span>
                  Atualizado em{' '}
                  <time dateTime={new Date(correctedAt).toISOString()}>
                    {formatDate(correctedAt)} às {formatTime(correctedAt)}
                  </time>
                </span>
              </span>
            ) : null}
          </div>

          <ShareBar title={item.name} />
        </div>
      </header>

      {/* Capa --------------------------------------------------------------- */}
      {item.cover_image ? (
        <figure className={cn(COLUMN, 'mt-8')}>
          <Image src={item.cover_image} alt="" ratio="aspect-[16/9]" eager wrapperClassName="rounded-lg" />
          <ImageCaption caption={item.cover_caption} credit={item.cover_credit} />
        </figure>
      ) : null}

      {/* Texto -------------------------------------------------------------- */}
      <div className={cn(COLUMN, 'mt-8')}>
        <ArticleBody content={item.content} />
      </div>

      {/* Galeria ------------------------------------------------------------ */}
      {gallery.length ? (
        <div className={cn(COLUMN, 'mt-10 space-y-8')}>
          {gallery.map((photo) => (
            <figure key={photo.url}>
              <Image
                src={photo.url}
                alt={photo.caption || `Imagem de ${item.name}`}
                ratio="aspect-[16/9]"
                wrapperClassName="rounded-lg"
              />
              <ImageCaption caption={photo.caption} credit={photo.credit} />
            </figure>
          ))}
        </div>
      ) : null}

      {related?.length ? (
        <section className="border-border mt-16 border-t pt-10">
          <h2 className="font-display mb-6 text-2xl">Outras notícias</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other) => (
              <NewsCard key={other.id} item={other} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  )
}
