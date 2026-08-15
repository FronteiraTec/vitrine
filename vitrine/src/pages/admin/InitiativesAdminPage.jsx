import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ExternalLink,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge'
import { Image } from '@/components/ui/image'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { TableRowsSkeleton, Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdminInitiatives, useCategories, useDeleteInitiative } from '@/hooks/use-queries'
import { useDebouncedValue } from '@/hooks/use-utils'
import { useAuth } from '@/contexts/AuthContext'
import { ADMIN_PAGE_SIZE, STATUS, STATUS_META, STATUS_ORDER } from '@/lib/constants'
import { formatRelative } from '@/lib/utils'

const ALL = '__all__'

function RowActions({ initiative, onDelete }) {
  const { isAdmin } = useAuth()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${initiative.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link to={`/admin/iniciativas/${initiative.id}`}>
            <Pencil />
            Editar
          </Link>
        </DropdownMenuItem>
        {initiative.status === STATUS.PUBLISHED ? (
          <DropdownMenuItem asChild>
            <Link to={`/iniciativa/${initiative.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink />
              Ver na vitrine
            </Link>
          </DropdownMenuItem>
        ) : null}
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => onDelete(initiative)}>
              <Trash2 />
              Excluir
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function InitiativesAdminPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL)
  const [categoryId, setCategoryId] = useState(ALL)
  const [onlyMine, setOnlyMine] = useState(false)
  const [page, setPage] = useState(1)
  const [toDelete, setToDelete] = useState(null)

  const { profile } = useAuth()
  const debouncedSearch = useDebouncedValue(search, 350)
  const { data: categories = [] } = useCategories()
  const deleteInitiative = useDeleteInitiative()

  const filters = useMemo(
    () => ({
      q: debouncedSearch,
      status: status === ALL ? null : status,
      categoryId: categoryId === ALL ? null : categoryId,
      createdBy: onlyMine ? profile?.id : null,
      page,
      pageSize: ADMIN_PAGE_SIZE,
      sort: 'recent',
    }),
    [debouncedSearch, status, categoryId, onlyMine, page, profile?.id],
  )

  const { data, isPending, isFetching, isError, error, refetch } = useAdminInitiatives(filters)
  const items = data?.items ?? []
  const hasFilters = Boolean(debouncedSearch) || status !== ALL || categoryId !== ALL || onlyMine

  function resetFilters() {
    setSearch('')
    setStatus(ALL)
    setCategoryId(ALL)
    setOnlyMine(false)
    setPage(1)
  }

  async function confirmDelete() {
    try {
      await deleteInitiative.mutateAsync(toDelete.id)
      toast.success('Iniciativa excluída.')
      setToDelete(null)
    } catch (deleteError) {
      toast.error(deleteError.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Iniciativas"
        description="Todo o catálogo, em qualquer estágio do fluxo editorial."
        actions={
          <Button asChild>
            <Link to="/admin/iniciativas/nova">
              <Plus aria-hidden="true" />
              Nova iniciativa
            </Link>
          </Button>
        }
      />

      {/* Filtros ---------------------------------------------------------- */}
      <div className="border-border bg-card mb-5 flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <label htmlFor="admin-busca" className="sr-only">
            Buscar iniciativas
          </label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="admin-busca"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nome, tema, responsável…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-40" aria-label="Filtrar por status">
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

          <Select
            value={categoryId}
            onValueChange={(value) => {
              setCategoryId(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44" aria-label="Filtrar por categoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={onlyMine ? 'primary' : 'outline'}
            onClick={() => {
              setOnlyMine((current) => !current)
              setPage(1)
            }}
            aria-pressed={onlyMine}
          >
            Minhas
          </Button>

          {hasFilters ? (
            <Button variant="subtle" onClick={resetFilters}>
              Limpar
            </Button>
          ) : null}
        </div>
      </div>

      {isError ? (
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      ) : (
        <>
          {/* Tabela (>= md) ---------------------------------------------- */}
          <div className="border-border bg-card hidden overflow-hidden rounded-lg border md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Lista de iniciativas com status, categoria, autor e última alteração
                </caption>
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr className="text-left">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Iniciativa
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Categoria
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Autor
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                      Alterada
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className={isFetching && !isPending ? 'opacity-60' : undefined}>
                  {isPending ? (
                    <TableRowsSkeleton rows={8} cols={6} />
                  ) : (
                    items.map((initiative) => (
                      <tr
                        key={initiative.id}
                        className="border-border hover:bg-muted/40 border-t transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Image
                              src={initiative.cover_image}
                              alt=""
                              ratio="size-10"
                              wrapperClassName="rounded-md shrink-0"
                            />
                            <Link
                              to={`/admin/iniciativas/${initiative.id}`}
                              className="hover:text-brand line-clamp-2 max-w-xs font-medium transition-colors"
                            >
                              {initiative.name}
                            </Link>
                          </div>
                        </td>
                        <td className="text-muted-foreground px-4 py-3">
                          {initiative.category?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={initiative.status} size="sm" />
                        </td>
                        <td className="text-muted-foreground max-w-32 truncate px-4 py-3">
                          {initiative.author?.name ?? '—'}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                          {formatRelative(initiative.updated_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <RowActions initiative={initiative} onDelete={setToDelete} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cartões (< md) ---------------------------------------------- */}
          <ul className="space-y-3 md:hidden">
            {isPending
              ? Array.from({ length: 5 }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="h-24" />
                  </li>
                ))
              : items.map((initiative) => (
                  <li
                    key={initiative.id}
                    className="border-border bg-card flex gap-3 rounded-lg border p-3"
                  >
                    <Image
                      src={initiative.cover_image}
                      alt=""
                      ratio="size-14"
                      wrapperClassName="rounded-md shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Link
                        to={`/admin/iniciativas/${initiative.id}`}
                        className="line-clamp-2 block text-sm font-medium"
                      >
                        {initiative.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={initiative.status} size="sm" />
                        <span className="text-muted-foreground text-xs">
                          {initiative.category?.name}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {formatRelative(initiative.updated_at)}
                      </p>
                    </div>
                    <RowActions initiative={initiative} onDelete={setToDelete} />
                  </li>
                ))}
          </ul>

          {!isPending && items.length === 0 ? (
            <EmptyState
              icon={hasFilters ? SearchX : Eye}
              title={hasFilters ? 'Nenhum resultado' : 'Nenhuma iniciativa cadastrada'}
              description={
                hasFilters
                  ? 'Ajuste os filtros ou limpe a busca para ver mais resultados.'
                  : 'Comece criando a primeira iniciativa do catálogo.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Limpar filtros
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/admin/iniciativas/nova">
                      <Plus aria-hidden="true" />
                      Nova iniciativa
                    </Link>
                  </Button>
                )
              }
              className="bg-card"
            />
          ) : null}

          {data && data.pageCount > 1 ? (
            <div className="mt-6 flex flex-col items-center gap-3">
              <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} />
              <p className="text-muted-foreground text-xs tabular-nums">
                {data.total} {data.total === 1 ? 'iniciativa' : 'iniciativas'} no total
              </p>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Excluir iniciativa"
        description={`“${toDelete?.name}” será removida definitivamente, junto com seus vínculos de tags, equipe e links. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir definitivamente"
        destructive
        loading={deleteInitiative.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
