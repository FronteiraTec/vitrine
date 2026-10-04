import { useState } from 'react'
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/admin/PageHeader'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Avatar } from '@/components/ui/avatar'
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
import { usePeople } from '@/hooks/use-queries'
import { useDebouncedValue } from '@/hooks/use-utils'
import { useAuth } from '@/contexts/AuthContext'
import { createPerson, deletePerson, updatePerson } from '@/services/taxonomy'
import { BUCKETS } from '@/lib/constants'

const EMPTY = { name: '', role: '', email: '', photo_url: null }

function PersonForm({ person, onOpenChange, onSaved }) {
  const isEditing = Boolean(person)
  const [values, setValues] = useState(() =>
    person
      ? {
          name: person.name ?? '',
          role: person.role ?? '',
          email: person.email ?? '',
          photo_url: person.photo_url ?? null,
        }
      : EMPTY,
  )
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function update(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!values.name.trim()) {
      setError('Informe o nome.')
      return
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      setError('Informe um e-mail válido.')
      return
    }

    const payload = {
      name: values.name.trim(),
      role: values.role.trim() || null,
      email: values.email.trim() || null,
      photo_url: values.photo_url,
    }

    setSaving(true)
    try {
      if (isEditing) await updatePerson(person.id, payload)
      else await createPerson(payload)
      toast.success(isEditing ? 'Pessoa atualizada.' : 'Pessoa cadastrada.')
      onSaved()
      onOpenChange(false)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar pessoa' : 'Cadastrar pessoa'}</DialogTitle>
        <DialogDescription>
          Pessoas aparecem como responsáveis nas páginas públicas das iniciativas.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-3">
        {error ? (
          <p role="alert" className="text-danger fs-7 fw-medium">
            {error}
          </p>
        ) : null}

        <Field id="p-name" label="Nome" required>
          {(props) => (
            <Input {...props} value={values.name} onChange={update('name')} required autoFocus />
          )}
        </Field>

        <div className="d-grid gap-3 grid-cols-sm-2">
          <Field id="p-role" label="Cargo ou titulação">
            {(props) => (
              <Input
                {...props}
                value={values.role}
                onChange={update('role')}
                placeholder="Ex.: Coordenadora"
              />
            )}
          </Field>

          <Field id="p-email" label="E-mail">
            {(props) => (
              <Input {...props} type="email" value={values.email} onChange={update('email')} />
            )}
          </Field>
        </div>

        <ImageUploader
          value={values.photo_url}
          onChange={(url) => setValues((current) => ({ ...current, photo_url: url }))}
          bucket={BUCKETS.INITIATIVES}
          folder="pessoas"
          label="Foto (opcional)"
          ratio="ratio-1x1"
          className="max-w-fx-48"
        />
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {isEditing ? 'Salvar' : 'Cadastrar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** A `key` remonta o formulário a cada pessoa — sem espelhar props em estado. */
function PersonDialog({ open, onOpenChange, person, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <PersonForm
          key={person?.id ?? 'nova'}
          person={person}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  )
}

export function PeopleAdminPage() {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 350)
  const { data, isPending, isError, error, refetch } = usePeople(debounced)
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()

  const [editing, setEditing] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['people'] })
    queryClient.invalidateQueries({ queryKey: ['initiatives'] })
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await deletePerson(toDelete.id)
      toast.success('Pessoa excluída.')
      invalidate()
      setToDelete(null)
    } catch (deleteError) {
      toast.error(deleteError.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Pessoas"
        description="Cadastro compartilhado de responsáveis. A mesma pessoa pode aparecer em várias iniciativas."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus aria-hidden="true" />
            Nova pessoa
          </Button>
        }
      />

      <div className="position-relative mb-3 mw-md">
        <label htmlFor="busca-pessoas" className="visually-hidden">
          Buscar pessoas
        </label>
        <Search
          className="text-body-secondary pe-none position-absolute top-50 start-0 icon translate-middle-y"
          aria-hidden="true"
        />
        <Input
          id="busca-pessoas"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar pelo nome…"
          className="ps-5"
        />
      </div>

      {isError ? (
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="d-grid gap-2 grid-cols-sm-2 grid-cols-lg-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-fx-20" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Nenhuma pessoa encontrada' : 'Nenhuma pessoa cadastrada'}
          description={
            search
              ? 'Tente outro termo de busca.'
              : 'Cadastre as pessoas responsáveis pelas iniciativas do catálogo.'
          }
          className="bg-body"
        />
      ) : (
        <ul className="d-grid gap-2 grid-cols-sm-2 grid-cols-lg-3">
          {data.map((person) => (
            <li
              key={person.id}
              className="border bg-body d-flex align-items-center gap-2 rounded-3 p-3"
            >
              <Avatar src={person.photo_url} name={person.name} size="md" />
              <div className="min-w-0 flex-grow-1">
                <p className="text-truncate fw-medium">{person.name}</p>
                {person.role ? (
                  <p className="text-body-secondary text-truncate fs-7">{person.role}</p>
                ) : null}
                {person.email ? (
                  <p className="text-body-secondary text-truncate fs-8">{person.email}</p>
                ) : null}
              </div>
              <div className="d-flex flex-shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditing(person)
                    setDialogOpen(true)
                  }}
                  aria-label={`Editar ${person.name}`}
                >
                  <Pencil />
                </Button>
                {isAdmin ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setToDelete(person)}
                    aria-label={`Excluir ${person.name}`}
                    className="text-body-secondary"
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <PersonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        person={editing}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Excluir pessoa"
        description={`“${toDelete?.name}” será removida do cadastro e desvinculada de todas as iniciativas em que aparece.`}
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  )
}
