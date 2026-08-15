import { useState } from 'react'
import { ChevronDown, ChevronUp, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/toast'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CategoryIcon, ICON_OPTIONS } from '@/components/common/CategoryIcon'
import {
  useCategoriesWithCounts,
  useCreateCategory,
  useDeleteCategory,
  useReorderCategories,
  useUpdateCategory,
} from '@/hooks/use-queries'
import { BUCKETS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const EMPTY = { name: '', description: '', icon: 'layers', image_url: null }

function CategoryForm({ category, onOpenChange }) {
  const isEditing = Boolean(category)
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const [values, setValues] = useState(() =>
    category
      ? {
          name: category.name ?? '',
          description: category.description ?? '',
          icon: category.icon ?? 'layers',
          image_url: category.image_url ?? null,
        }
      : EMPTY,
  )
  const [error, setError] = useState(null)

  async function submit(event) {
    event.preventDefault()
    if (!values.name.trim()) {
      setError('Informe o nome da categoria.')
      return
    }

    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      icon: values.icon,
      image_url: values.image_url,
    }

    try {
      if (isEditing) {
        await updateCategory.mutateAsync({ id: category.id, values: payload })
        toast.success('Categoria atualizada.')
      } else {
        await createCategory.mutateAsync(payload)
        toast.success('Categoria criada.')
      }
      onOpenChange(false)
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        <DialogDescription>
          Categorias organizam o catálogo e aparecem na navegação pública.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-5">
        {error ? (
          <p role="alert" className="text-destructive text-sm font-medium">
            {error}
          </p>
        ) : null}

        <Field id="cat-name" label="Nome" required>
          {(props) => (
            <Input
              {...props}
              value={values.name}
              onChange={(event) => setValues((c) => ({ ...c, name: event.target.value }))}
              maxLength={60}
              required
              autoFocus
            />
          )}
        </Field>

        <Field
          id="cat-description"
          label="Descrição"
          hint="Uma frase curta explicando o que reúne esta categoria."
        >
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              value={values.description}
              onChange={(event) => setValues((c) => ({ ...c, description: event.target.value }))}
              maxLength={240}
            />
          )}
        </Field>

        <ImageUploader
          value={values.image_url}
          onChange={(url) => setValues((c) => ({ ...c, image_url: url }))}
          bucket={BUCKETS.CATEGORIES}
          label="Imagem de capa"
          hint="Aparece no cartão da categoria, na home e na página de categorias. Também é a prévia ao compartilhar o link. Proporção 16:9."
          ratio="aspect-[16/9]"
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Ícone</legend>
          <p className="text-muted-foreground text-xs">
            Usado no menu e como reserva no cartão, quando não há imagem de capa.
          </p>
          <div className="grid grid-cols-7 gap-2 sm:grid-cols-11">
            {ICON_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValues((c) => ({ ...c, icon: value }))}
                aria-pressed={values.icon === value}
                title={label}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-md border transition-colors',
                  values.icon === value
                    ? 'border-brand bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="sr-only">{label}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" loading={createCategory.isPending || updateCategory.isPending}>
          {isEditing ? 'Salvar alterações' : 'Criar categoria'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * O conteúdo do Radix só monta quando aberto, e a `key` força uma montagem
 * nova a cada categoria — assim o formulário nasce com os valores certos, sem
 * efeito espelhando props em estado.
 */
function CategoryDialog({ open, onOpenChange, category }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <CategoryForm
          key={category?.id ?? 'nova'}
          category={category}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  )
}

export function CategoriesAdminPage() {
  const { data, isPending, isError, error, refetch } = useCategoriesWithCounts()
  const reorder = useReorderCategories()
  const deleteCategory = useDeleteCategory()

  const [editing, setEditing] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(category) {
    setEditing(category)
    setDialogOpen(true)
  }

  async function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= data.length) return
    const next = [...data]
    ;[next[index], next[target]] = [next[target], next[index]]
    try {
      await reorder.mutateAsync(next.map((category) => category.id))
    } catch (reorderError) {
      toast.error(reorderError.message)
    }
  }

  async function confirmDelete() {
    try {
      await deleteCategory.mutateAsync(toDelete.id)
      toast.success('Categoria excluída.')
      setToDelete(null)
    } catch (deleteError) {
      toast.error(deleteError.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Defina como o catálogo é organizado. A ordem aqui é a ordem exibida na vitrine."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" />
            Nova categoria
          </Button>
        }
      />

      {isError ? (
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Nenhuma categoria cadastrada"
          description="Crie ao menos uma categoria antes de cadastrar iniciativas — toda iniciativa pertence a uma."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Criar primeira categoria
            </Button>
          }
          className="bg-card"
        />
      ) : (
        <ul className={cn('space-y-3', reorder.isPending && 'opacity-70')}>
          {data.map((category, index) => (
            <li
              key={category.id}
              className="border-border bg-card flex items-center gap-4 rounded-lg border p-4"
            >
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || reorder.isPending}
                  aria-label={`Mover ${category.name} para cima`}
                  className="size-6"
                >
                  <ChevronUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => move(index, 1)}
                  disabled={index === data.length - 1 || reorder.isPending}
                  aria-label={`Mover ${category.name} para baixo`}
                  className="size-6"
                >
                  <ChevronDown />
                </Button>
              </div>

              <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
                <CategoryIcon name={category.icon} className="size-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{category.name}</p>
                <p className="text-muted-foreground truncate text-sm">
                  {category.description || <span className="italic">Sem descrição</span>}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                  /{category.slug} · {category.published_count} publicada
                  {category.published_count === 1 ? '' : 's'}
                </p>
              </div>

              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(category)}
                  aria-label={`Editar ${category.name}`}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setToDelete(category)}
                  aria-label={`Excluir ${category.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Excluir categoria"
        description={`“${toDelete?.name}” será removida. Categorias com iniciativas vinculadas não podem ser excluídas — mova-as antes.`}
        confirmLabel="Excluir"
        destructive
        loading={deleteCategory.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
