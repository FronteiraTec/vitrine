import { useState } from 'react'
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toast'
import { useChangeNewsStatus, useChangeStatus } from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'
import { STATUS, STATUS_META, STATUS_TRANSITIONS } from '@/lib/constants'

/**
 * Substantivo de cada tipo de conteúdo. "Iniciativa" e "notícia" são ambos
 * femininos, então as mensagens concordam sem precisar de uma variante por
 * gênero — vale conferir isto antes de acrescentar um terceiro tipo.
 */
const NOUNS = {
  initiative: { capitalized: 'Iniciativa', lower: 'iniciativa' },
  news: { capitalized: 'Notícia', lower: 'notícia' },
}

/** Metadados de apresentação de cada transição possível. */
function actionMeta({ capitalized, lower }) {
  return {
    [STATUS.PENDING_REVIEW]: {
      label: 'Enviar para revisão',
      icon: Send,
      variant: 'primary',
      needsNotes: false,
      successMessage: `${capitalized} enviada para revisão.`,
      confirmTitle: 'Enviar para revisão',
      confirmBody: `A ${lower} entra na fila e não poderá ser editada até que um revisor conclua a análise.`,
    },
    [STATUS.PUBLISHED]: {
      label: 'Publicar',
      icon: CheckCircle2,
      variant: 'primary',
      needsNotes: false,
      successMessage: `${capitalized} publicada.`,
      confirmTitle: `Publicar ${lower}`,
      confirmBody: 'O conteúdo passa a ser visível publicamente e indexável por buscadores.',
    },
    [STATUS.REJECTED]: {
      label: 'Rejeitar',
      icon: XCircle,
      variant: 'destructive',
      needsNotes: true,
      successMessage: `${capitalized} devolvida com observações.`,
      confirmTitle: `Rejeitar ${lower}`,
      confirmBody:
        'Descreva o que precisa ser ajustado. A observação fica registrada no histórico e orienta quem for corrigir.',
    },
    [STATUS.ARCHIVED]: {
      label: 'Arquivar',
      icon: Archive,
      variant: 'outline',
      needsNotes: false,
      successMessage: `${capitalized} arquivada.`,
      confirmTitle: `Arquivar ${lower}`,
      confirmBody: 'Sai da vitrine pública, mas continua acessível no painel e no histórico.',
    },
    [STATUS.DRAFT]: {
      label: 'Voltar para rascunho',
      icon: RotateCcw,
      variant: 'outline',
      needsNotes: false,
      successMessage: `${capitalized} voltou para rascunho.`,
      confirmTitle: 'Voltar para rascunho',
      confirmBody: 'O conteúdo sai da vitrine (se estiver publicado) e volta a ser editável.',
    },
  }
}

/**
 * Ações do workflow editorial.
 *
 * As transições exibidas vêm de `STATUS_TRANSITIONS`, espelho da máquina de
 * estados aplicada no banco. Mesmo que a interface erre, o trigger
 * `enforce_initiative_workflow` recusa a transição inválida.
 */
export function StatusActions({ record, kind = 'initiative', onDone, size = 'md' }) {
  const { canReview } = useAuth()

  /*
   * Os dois hooks são chamados sempre, e não condicionalmente pelo `kind`:
   * hook em condicional quebra a ordem entre renders. São apenas `useMutation`,
   * que não dispara nada até `mutateAsync` — o custo de manter o não usado é
   * nulo.
   */
  const changeInitiative = useChangeStatus()
  const changeNews = useChangeNewsStatus()
  const changeStatus = kind === 'news' ? changeNews : changeInitiative

  const [pendingStatus, setPendingStatus] = useState(null)
  const [notes, setNotes] = useState('')

  const ACTION_META = actionMeta(NOUNS[kind] ?? NOUNS.initiative)

  const allowed = (STATUS_TRANSITIONS[record.status] ?? []).filter((status) => {
    // Espelha os gatilhos `enforce_*_workflow`: publicar, rejeitar e arquivar
    // são privativos de revisores e admins — e qualquer saída de "publicado"
    // também, porque tirar conteúdo do ar é decisão editorial.
    if ([STATUS.PUBLISHED, STATUS.REJECTED, STATUS.ARCHIVED].includes(status)) return canReview
    if (record.status === STATUS.PUBLISHED) return canReview
    return true
  })

  if (allowed.length === 0) return null

  const meta = pendingStatus ? ACTION_META[pendingStatus] : null

  async function confirm() {
    if (meta?.needsNotes && notes.trim().length < 5) return

    try {
      await changeStatus.mutateAsync({
        id: record.id,
        status: pendingStatus,
        notes: notes.trim() || null,
      })
      toast.success(meta.successMessage)
      setPendingStatus(null)
      setNotes('')
      onDone?.(pendingStatus)
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Ação principal em destaque; as demais ficam no menu.
  const [primary, ...rest] = allowed
  const primaryMeta = ACTION_META[primary]
  const PrimaryIcon = primaryMeta.icon

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size={size}
          variant={primaryMeta.variant}
          onClick={() => setPendingStatus(primary)}
        >
          <PrimaryIcon aria-hidden="true" />
          {primaryMeta.label}
        </Button>

        {rest.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={size === 'sm' ? 'icon-sm' : 'icon'} variant="outline" aria-label="Mais ações de status">
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Alterar status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {rest.map((status) => {
                const item = ACTION_META[status]
                const Icon = item.icon
                return (
                  <DropdownMenuItem
                    key={status}
                    destructive={status === STATUS.REJECTED}
                    onSelect={() => setPendingStatus(status)}
                  >
                    <Icon />
                    {item.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <Dialog
        open={Boolean(pendingStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatus(null)
            setNotes('')
          }
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{meta?.confirmTitle}</DialogTitle>
            <DialogDescription>{meta?.confirmBody}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="bg-muted flex items-center gap-2 rounded-md p-3 text-sm">
              <span className="text-muted-foreground">{STATUS_META[record.status]?.label}</span>
              <span className="text-muted-foreground" aria-hidden="true">
                →
              </span>
              <span className="font-medium">{STATUS_META[pendingStatus]?.label}</span>
            </div>

            <Field
              id="review-notes"
              label={meta?.needsNotes ? 'Observações do revisor' : 'Observações (opcional)'}
              required={meta?.needsNotes}
              hint="Fica registrado no histórico da iniciativa."
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={
                    meta?.needsNotes
                      ? 'Descreva o que precisa ser ajustado antes de uma nova submissão…'
                      : 'Contexto adicional sobre esta mudança…'
                  }
                />
              )}
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatus(null)}>
              Cancelar
            </Button>
            <Button
              variant={meta?.variant === 'destructive' ? 'destructive' : 'primary'}
              onClick={confirm}
              loading={changeStatus.isPending}
              disabled={meta?.needsNotes && notes.trim().length < 5}
            >
              {meta?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
