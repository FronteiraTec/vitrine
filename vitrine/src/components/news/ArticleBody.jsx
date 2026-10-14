import { Image } from '@/components/ui/image'
import { VideoEmbed } from '@/components/news/VideoEmbed'
import { cn } from '@/lib/utils'

/**
 * Texto em blocos: corpo da notícia e descrição completa da iniciativa.
 *
 * Nada de `dangerouslySetInnerHTML`: `parseArticleBody` devolve blocos de texto
 * puro e o React escapa tudo, então uma tag colada no formulário aparece como
 * texto na página, e não como marcação executável. Vale igual para as
 * traduções, que passam pelo mesmo analisador.
 */
export function ArticleBody({ blocks }) {
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
export function ImageCaption({ caption, credit, className }) {
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
