import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLink, Newspaper, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Image } from '@/components/ui/image'
import { StatusBadge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdminNews, useDeleteNews } from '@/hooks/use-queries'
import { useDebouncedValue } from '@/hooks/use-utils'
import { useAuth } from '@/contexts/AuthContext'
import { ADMIN_PAGE_SIZE, STATUS, STATUS_META, STATUS_ORDER } from '@/lib/constants'
import { formatRelative } from '@/lib/utils'

const ALL = 'all'

export function NewsAdminPage() {
  const [params, setParams] = useSearchParams()
  const { isAdmin } = useAuth()
  const [toDelete, setToDelete] = useState(null)

  const q = params.get('q') ?? ''
  const status = params.get('status') ?? ALL
  const page = Math.max(1, Number(params.get('pagina')) || 1)
  const debouncedTerm = useDebouncedValue(q)

  const { data, isPending, isError, error, refetch } = useAdminNews({
    q: debouncedTerm,
    status: status === ALL ? null : status,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  })

  const deleteNews = useDeleteNews()

  function update(next, { resetPage = true } = {}) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === '' || value == null || value === ALL) merged.delete(key)
      else merged.set(key, String(value))
    }
    if (resetPage) merged.delete('pagina')
    setParams(merged, { replace: true })
  }

  async function confirmDelete() {
    try {
      await deleteNews.mutateAsync(toDelete.id)
      toast.success('Notícia excluída.')
      setToDelete(null)
    } catch (deleteError) {
      toast.error(deleteError.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Notícias"
        description="Comunicados e novidades. Passam pelo mesmo fluxo de revisão das iniciativas."
        actions={
          <Button asChild>
            <Link to="/admin/noticias/nova">
              <Plus aria-hidden="true" />
              Nova notícia
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="news-admin-search" className="sr-only">
            Buscar notícias
          </label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="news-admin-search"
            type="search"
            value={q}
            onChange={(event) => update({ q: event.target.value })}
            placeholder="Buscar por título ou conteúdo…"
            className="pl-9"
          />
        </div>

        <Select value={status} onValueChange={(value) => update({ status: value })}>
          <SelectTrigger className="sm:w-48" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {STATUS_ORDER.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_META[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={q || status !== ALL ? 'Nenhuma notícia encontrada' : 'Nenhuma notícia ainda'}
          description={
            q || status !== ALL
              ? 'Ajuste a busca ou o filtro de status.'
              : 'Crie a primeira notícia para começar a publicar comunicados.'
          }
          action={
            <Button asChild>
              <Link to="/admin/noticias/nova">
                <Plus aria-hidden="true" />
                Nova notícia
              </Link>
            </Button>
          }
          className="bg-card"
        />
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((item) => (
              <li key={item.id} className="border-border bg-card rounded-lg border p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Image
                    src={item.cover_image}
                    alt=""
                    ratio="aspect-[16/10] sm:aspect-square"
                    wrapperClassName="rounded-md shrink-0 sm:w-20"
                    fallbackIcon={Newspaper}
                  />

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="leading-snug font-semibold">
                        <Link
                          to={`/admin/noticias/${item.id}`}
                          className="hover:text-brand transition-colors"
                        >
                          {item.name}
                        </Link>
                      </h2>
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {item.author?.name ?? 'autor desconhecido'} · atualizada{' '}
                      {formatRelative(item.updated_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {item.status === STATUS.PUBLISHED ? (
                      <Button variant="ghost" size="icon" asChild aria-label="Ver na vitrine">
                        <Link to={`/noticia/${item.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink />
                        </Link>
                      </Button>
                    ) : null}

                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/noticias/${item.id}`}>
                        <Pencil aria-hidden="true" />
                        Editar
                      </Link>
                    </Button>

                    {isAdmin ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(item)}
                        aria-label={`Excluir ${item.name}`}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={data.page}
            pageCount={data.pageCount}
            onPageChange={(next) => update({ pagina: next }, { resetPage: false })}
            className="pt-8"
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Excluir notícia"
        description={`“${toDelete?.name}” será removida definitivamente, junto com o histórico de revisão.`}
        confirmLabel="Excluir"
        destructive
        loading={deleteNews.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
