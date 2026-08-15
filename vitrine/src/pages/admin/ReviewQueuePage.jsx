import { Link } from 'react-router-dom'
import { ClipboardCheck, Eye, Newspaper } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusActions } from '@/components/admin/StatusActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/ui/image'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { usePendingNews, usePendingReview } from '@/hooks/use-queries'
import { formatRelative } from '@/lib/utils'

/**
 * Fila de revisão. É a mesma máquina de estados usada nos formulários, exposta
 * aqui em lote para quem revisa vários itens em sequência.
 *
 * Iniciativas e notícias dividem a fila porque dividem o workflow: separá-las
 * em duas telas obrigaria o revisor a lembrar de conferir as duas para saber se
 * terminou. Os itens vêm de consultas distintas e são intercalados por data de
 * envio — quem esperou mais aparece primeiro.
 */
const KINDS = {
  initiative: { label: 'Iniciativa', editPath: (item) => `/admin/iniciativas/${item.id}` },
  news: { label: 'Notícia', editPath: (item) => `/admin/noticias/${item.id}` },
}

export function ReviewQueuePage() {
  const initiatives = usePendingReview()
  const news = usePendingNews()

  const isPending = initiatives.isPending || news.isPending
  const isError = initiatives.isError || news.isError
  const error = initiatives.error ?? news.error

  const items = [
    ...(initiatives.data ?? []).map((item) => ({ ...item, kind: 'initiative' })),
    ...(news.data ?? []).map((item) => ({ ...item, kind: 'news' })),
  ].sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))

  function retry() {
    if (initiatives.isError) initiatives.refetch()
    if (news.isError) news.refetch()
  }

  return (
    <>
      <PageHeader
        title="Fila de revisão"
        description="Conteúdo enviado pelas equipes e aguardando aprovação. Publique ou devolva com observações."
      />

      {isError ? (
        <ErrorState description={error?.message} onRetry={retry} />
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Fila vazia"
          description="Nada aguardando revisão. Assim que uma equipe enviar conteúdo, ele aparece aqui."
          action={
            <Button variant="outline" asChild>
              <Link to="/admin/iniciativas">Ver todas as iniciativas</Link>
            </Button>
          }
          className="bg-card"
        />
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const kind = KINDS[item.kind]
            const editPath = kind.editPath(item)

            return (
              <li
                key={`${item.kind}-${item.id}`}
                className="border-border bg-card rounded-lg border p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Image
                    src={item.cover_image}
                    alt=""
                    ratio="aspect-[16/10] sm:aspect-square"
                    wrapperClassName="rounded-md shrink-0 sm:w-28"
                    fallbackIcon={item.kind === 'news' ? Newspaper : undefined}
                  />

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge size="sm" variant="outline">
                          {kind.label}
                        </Badge>
                        <h2 className="leading-snug font-semibold">
                          <Link to={editPath} className="hover:text-brand transition-colors">
                            {item.name}
                          </Link>
                        </h2>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {item.category?.name ? `${item.category.name} · ` : ''}enviada por{' '}
                        {item.author?.name ?? 'autor desconhecido'} ·{' '}
                        {formatRelative(item.updated_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={editPath}>
                          <Eye aria-hidden="true" />
                          Revisar conteúdo
                        </Link>
                      </Button>
                      <StatusActions record={item} kind={item.kind} size="sm" />
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
