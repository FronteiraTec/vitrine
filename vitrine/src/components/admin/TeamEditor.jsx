import { useState } from 'react'
import { GripVertical, Plus, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { useCreatePerson, usePeople } from '@/hooks/use-queries'
import { useDebouncedValue } from '@/hooks/use-utils'

function NewPersonDialog({ open, onOpenChange, onCreated }) {
  const createPerson = useCreatePerson()
  const [values, setValues] = useState({ name: '', role: '', email: '' })

  function update(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!values.name.trim()) return
    try {
      const person = await createPerson.mutateAsync({
        name: values.name.trim(),
        role: values.role.trim() || null,
        email: values.email.trim() || null,
      })
      toast.success('Pessoa cadastrada.')
      onCreated(person)
      setValues({ name: '', role: '', email: '' })
      onOpenChange(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Cadastrar pessoa</DialogTitle>
            <DialogDescription>
              Pessoas ficam disponíveis para todas as iniciativas do catálogo.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <Field id="person-name" label="Nome" required>
              {(props) => (
                <Input {...props} value={values.name} onChange={update('name')} required autoFocus />
              )}
            </Field>
            <Field id="person-role" label="Cargo ou titulação" hint="Ex.: Coordenadora, Pesquisador">
              {(props) => <Input {...props} value={values.role} onChange={update('role')} />}
            </Field>
            <Field id="person-email" label="E-mail">
              {(props) => (
                <Input {...props} type="email" value={values.email} onChange={update('email')} />
              )}
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createPerson.isPending}>
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Lista ordenada de responsáveis. A ordem é o que aparece na página pública,
 * então cada linha pode subir ou descer.
 */
export function TeamEditor({ value = [], onChange }) {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const { data: people = [], isPending } = usePeople(debounced)
  const [creating, setCreating] = useState(false)

  const chosenIds = new Set(value.map((member) => member.person_id))
  const available = people.filter((person) => !chosenIds.has(person.id))

  function addPerson(person) {
    onChange([...value, { person_id: person.id, role: person.role ?? '', person }])
  }

  function updateRole(personId, role) {
    onChange(value.map((member) => (member.person_id === personId ? { ...member, role } : member)))
  }

  function remove(personId) {
    onChange(value.filter((member) => member.person_id !== personId))
  }

  function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Responsáveis ({value.length})</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
            <UserPlus aria-hidden="true" />
            Nova pessoa
          </Button>
        </div>

        {value.length === 0 ? (
          <EmptyState
            compact
            title="Nenhum responsável adicionado"
            description="Escolha abaixo quem coordena ou participa desta iniciativa."
          />
        ) : (
          <ul className="space-y-2">
            {value.map((member, index) => (
              <li
                key={member.person_id}
                className="border-border bg-card flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="text-muted-foreground flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="hover:text-foreground text-xs leading-none disabled:opacity-30"
                    aria-label="Mover para cima"
                  >
                    ▲
                  </button>
                  <GripVertical className="my-0.5 size-3.5" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                    className="hover:text-foreground text-xs leading-none disabled:opacity-30"
                    aria-label="Mover para baixo"
                  >
                    ▼
                  </button>
                </div>

                <Avatar src={member.person?.photo_url} name={member.person?.name} size="sm" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.person?.name}</p>
                  <label className="sr-only" htmlFor={`role-${member.person_id}`}>
                    Papel de {member.person?.name} nesta iniciativa
                  </label>
                  <Input
                    id={`role-${member.person_id}`}
                    value={member.role ?? ''}
                    onChange={(event) => updateRole(member.person_id, event.target.value)}
                    placeholder="Papel nesta iniciativa"
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(member.person_id)}
                  aria-label={`Remover ${member.person?.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-border space-y-3 border-t pt-5">
        <Field id="person-search" label="Adicionar responsável">
          {(props) => (
            <Input
              {...props}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar pessoa pelo nome…"
            />
          )}
        </Field>

        {isPending ? (
          <p className="text-muted-foreground text-sm">Carregando pessoas…</p>
        ) : available.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {search
              ? 'Nenhuma pessoa encontrada com esse nome.'
              : 'Todas as pessoas cadastradas já foram adicionadas.'}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {available.slice(0, 12).map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => addPerson(person)}
                  className="border-border hover:border-brand/40 hover:bg-muted/50 flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors"
                >
                  <Avatar src={person.photo_url} name={person.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{person.name}</span>
                    {person.role ? (
                      <span className="text-muted-foreground block truncate text-xs">
                        {person.role}
                      </span>
                    ) : null}
                  </span>
                  <Plus className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NewPersonDialog open={creating} onOpenChange={setCreating} onCreated={addPerson} />
    </div>
  )
}

/** Editor dos links relacionados exibidos na página pública. */
export function LinksEditor({ value = [], onChange }) {
  const LINK_TYPES = [
    { value: 'website', label: 'Website' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'github', label: 'GitHub' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'other', label: 'Outro' },
  ]

  function add() {
    onChange([...value, { label: '', url: '', type: 'website', key: crypto.randomUUID() }])
  }

  function update(index, patch) {
    onChange(value.map((link, i) => (i === index ? { ...link, ...patch } : link)))
  }

  function remove(index) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <EmptyState
          compact
          title="Nenhum link cadastrado"
          description="Adicione o site oficial, perfis em redes sociais ou repositórios."
        />
      ) : (
        <ul className="space-y-3">
          {value.map((link, index) => (
            <li
              key={link.id ?? link.key ?? index}
              className="border-border bg-card grid gap-3 rounded-lg border p-3 sm:grid-cols-[10rem_1fr_1fr_auto]"
            >
              <div>
                <label className="sr-only" htmlFor={`link-type-${index}`}>
                  Tipo do link
                </label>
                <Select value={link.type} onValueChange={(type) => update(index, { type })}>
                  <SelectTrigger id={`link-type-${index}`} size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="sr-only" htmlFor={`link-label-${index}`}>
                  Rótulo do link
                </label>
                <Input
                  id={`link-label-${index}`}
                  value={link.label}
                  onChange={(event) => update(index, { label: event.target.value })}
                  placeholder="Rótulo (ex.: Site oficial)"
                  className="h-8 text-[0.8125rem]"
                />
              </div>

              <div>
                <label className="sr-only" htmlFor={`link-url-${index}`}>
                  Endereço do link
                </label>
                <Input
                  id={`link-url-${index}`}
                  type="url"
                  value={link.url}
                  onChange={(event) => update(index, { url: event.target.value })}
                  placeholder="https://…"
                  className="h-8 text-[0.8125rem]"
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(index)}
                aria-label="Remover link"
                className="text-muted-foreground hover:text-destructive justify-self-end"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus aria-hidden="true" />
        Adicionar link
      </Button>
    </div>
  )
}
