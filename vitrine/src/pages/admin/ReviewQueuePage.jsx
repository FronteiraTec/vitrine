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
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-fx-32" />
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
          className="bg-body"
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const kind = KINDS[item.kind]
            const editPath = kind.editPath(item)

            return (
              <li
                key={`${item.kind}-${item.id}`}
                className="border bg-body rounded-3 p-3 p-sm-3"
              >
                <div className="d-flex flex-column gap-3 flex-sm-row">
                  <Image
                    src={item.cover_image}
                    alt=""
                    ratio="ratio-16x10"
                    wrapperClassName="rounded-2 flex-shrink-0 w-sm-fx-28"
                    fallbackIcon={item.kind === 'news' ? Newspaper : undefined}
                  />

                  <div className="min-w-0 flex-grow-1 space-y-2">
                    <div className="space-y-1">
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <Badge size="sm" variant="outline">
                          {kind.label}
                        </Badge>
                        <h2 className="lh-sm fw-semibold">
                          <Link to={editPath}>
                            {item.name}
                          </Link>
                        </h2>
                      </div>
                      <p className="text-body-secondary fs-7">
                        {item.category?.name ? `${item.category.name} · ` : ''}enviada por{' '}
                        {item.author?.name ?? 'autor desconhecido'} ·{' '}
                        {formatRelative(item.updated_at)}
                      </p>
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-2 pt-1">
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
