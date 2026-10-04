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
      <div className="border bg-body mb-3 d-flex flex-column gap-2 rounded-3 p-3 flex-lg-row align-items-lg-center">
        <div className="position-relative flex-grow-1">
          <label htmlFor="admin-busca" className="visually-hidden">
            Buscar iniciativas
          </label>
          <Search
            className="text-body-secondary pe-none position-absolute top-50 start-0 icon translate-middle-y"
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
            className="ps-5"
          />
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-fx-40" aria-label="Filtrar por status">
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
            <SelectTrigger className="w-fx-44" aria-label="Filtrar por categoria">
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
          <div className="border bg-body d-none overflow-hidden rounded-3 d-md-block">
            <div className="overflow-x-auto">
              <table className="table table-hover align-middle fs-7 mb-0">
                <caption className="visually-hidden">
                  Lista de iniciativas com status, categoria, autor e última alteração
                </caption>
                <thead className="bg-body-tertiary text-body-secondary">
                  <tr className="text-start">
                    <th scope="col" className="px-3 py-2 fw-medium">
                      Iniciativa
                    </th>
                    <th scope="col" className="px-3 py-2 fw-medium">
                      Categoria
                    </th>
                    <th scope="col" className="px-3 py-2 fw-medium">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2 fw-medium">
                      Autor
                    </th>
                    <th scope="col" className="px-3 py-2 fw-medium text-nowrap">
                      Alterada
                    </th>
                    <th scope="col" className="px-3 py-2">
                      <span className="visually-hidden">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className={isFetching && !isPending ? 'opacity-50' : undefined}>
                  {isPending ? (
                    <TableRowsSkeleton rows={8} cols={6} />
                  ) : (
                    items.map((initiative) => (
                      <tr
                        key={initiative.id}
                        className="border border-top"
                      >
                        <td className="px-3 py-2">
                          <div className="d-flex align-items-center gap-2">
                            <Image
                              src={initiative.cover_image}
                              alt=""
                              ratio="ratio-1x1 w-fx-10"
                              wrapperClassName="rounded-2 flex-shrink-0"
                            />
                            <Link
                              to={`/admin/iniciativas/${initiative.id}`}
                              className="line-clamp-2 mw-xs fw-medium"
                            >
                              {initiative.name}
                            </Link>
                          </div>
                        </td>
                        <td className="text-body-secondary px-3 py-2">
                          {initiative.category?.name ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={initiative.status} size="sm" />
                        </td>
                        <td className="text-body-secondary max-w-fx-32 text-truncate px-3 py-2">
                          {initiative.author?.name ?? '—'}
                        </td>
                        <td className="text-body-secondary px-3 py-2 text-nowrap">
                          {formatRelative(initiative.updated_at)}
                        </td>
                        <td className="px-3 py-2 text-end">
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
          <ul className="space-y-2 d-md-none">
            {isPending
              ? Array.from({ length: 5 }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="h-fx-24" />
                  </li>
                ))
              : items.map((initiative) => (
                  <li
                    key={initiative.id}
                    className="border bg-body d-flex gap-2 rounded-3 p-2"
                  >
                    <Image
                      src={initiative.cover_image}
                      alt=""
                      ratio="ratio-1x1 w-fx-14"
                      wrapperClassName="rounded-2 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-grow-1 space-y-1">
                      <Link
                        to={`/admin/iniciativas/${initiative.id}`}
                        className="line-clamp-2 d-block fs-7 fw-medium"
                      >
                        {initiative.name}
                      </Link>
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <StatusBadge status={initiative.status} size="sm" />
                        <span className="text-body-secondary fs-8">
                          {initiative.category?.name}
                        </span>
                      </div>
                      <p className="text-body-secondary fs-8">
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
              className="bg-body"
            />
          ) : null}

          {data && data.pageCount > 1 ? (
            <div className="mt-4 d-flex flex-column align-items-center gap-2">
              <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} />
              <p className="text-body-secondary fs-8 tabular-nums">
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
