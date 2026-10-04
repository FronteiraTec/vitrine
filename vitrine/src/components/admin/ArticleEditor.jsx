import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  SquarePlay,
  Trash2,
} from 'lucide-react'
import { ImageBlock, VideoBlock } from '@/components/admin/ArticleMediaBlocks'
import { AutosizeTextarea } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { parseArticleBody, serializeArticleBody, youtubeId } from '@/lib/news-content'
import { cn, normalizeSearch } from '@/lib/utils'

/*
 * Os blocos são exatamente o que a página pública sabe desenhar
 * (`parseArticleBody`). Um tipo novo precisa nascer lá primeiro — senão seria
 * gravado como texto que a notícia publicada mostraria cru.
 */
const BLOCK_TYPES = [
  {
    type: 'paragraph',
    label: 'Texto',
    name: 'Parágrafo',
    description: 'Parágrafo de texto corrido.',
    icon: Pilcrow,
    keywords: ['paragrafo'],
  },
  {
    type: 'heading',
    label: 'Intertítulo',
    name: 'Intertítulo',
    description: 'Abre uma nova seção da notícia.',
    icon: Heading2,
    keywords: ['titulo', 'secao', 'h2'],
    shortcut: '##',
  },
  {
    type: 'subheading',
    label: 'Intertítulo menor',
    name: 'Intertítulo menor',
    description: 'Divide uma seção em partes.',
    icon: Heading3,
    keywords: ['titulo', 'subtitulo', 'h3'],
    shortcut: '###',
  },
  {
    type: 'bullet',
    label: 'Lista com marcadores',
    name: 'Item de lista',
    description: 'Itens em tópicos.',
    icon: List,
    keywords: ['topicos', 'itens'],
    shortcut: '-',
  },
  {
    type: 'numbered',
    label: 'Lista numerada',
    name: 'Item de lista numerada',
    description: 'Itens em sequência: 1, 2, 3.',
    icon: ListOrdered,
    keywords: ['numeros', 'passos', 'ordem'],
    shortcut: '1.',
  },
  {
    type: 'quote',
    label: 'Citação',
    name: 'Citação',
    description: 'Uma fala em destaque, com o autor.',
    icon: Quote,
    keywords: ['aspas', 'fala', 'declaracao'],
    shortcut: '>',
  },
  {
    type: 'divider',
    label: 'Divisor',
    name: 'Divisor',
    description: 'Linha que separa partes do texto.',
    icon: Minus,
    keywords: ['linha', 'separador'],
    shortcut: '---',
  },
  {
    type: 'image',
    label: 'Imagem',
    name: 'Imagem',
    description: 'Foto no meio do texto, com legenda e crédito.',
    icon: ImageIcon,
    keywords: ['foto', 'figura'],
  },
  {
    type: 'video',
    label: 'Vídeo do YouTube',
    name: 'Vídeo',
    description: 'Incorpora um vídeo pelo link.',
    icon: SquarePlay,
    keywords: ['youtube', 'filme'],
  },
]

const TYPE_META = Object.fromEntries(BLOCK_TYPES.map((option) => [option.type, option]))

/** Blocos em que se escreve. Os outros (divisor, imagem, vídeo) são "mídia". */
const TEXT_TYPES = new Set(['paragraph', 'heading', 'subheading', 'bullet', 'numbered', 'quote'])
const TEXT_OPTIONS = BLOCK_TYPES.filter((option) => TEXT_TYPES.has(option.type))
/** Uma linha só no formato gravado. */
const SINGLE_LINE = new Set(['heading', 'subheading', 'bullet', 'numbered'])
/** Enter num item cria o item seguinte da mesma lista. */
const LIST_TYPES = new Set(['bullet', 'numbered'])

const PLACEHOLDER = {
  paragraph: 'Escreva, ou digite “/” para escolher o tipo de bloco',
  heading: 'Intertítulo',
  subheading: 'Intertítulo menor',
  bullet: 'Item da lista',
  numbered: 'Item da lista',
  quote: 'Citação',
}

/** Atalhos digitados no começo de um parágrafo, seguidos de espaço. */
const SHORTCUT = /^(#{1,3}|[-*>"]|\d{1,3}[.)])\s/

function shortcutType(marker) {
  if (marker === '###') return 'subheading'
  if (marker.startsWith('#')) return 'heading'
  if (marker === '-' || marker === '*') return 'bullet'
  if (marker === '>' || marker === '"') return 'quote'
  return 'numbered'
}

// Tipo próprio no arrasto: soltar um bloco num campo de texto qualquer não pode
// colar nada lá, e um arrasto de texto comum não pode ser lido como bloco.
const DRAG_TYPE = 'application/x-vitrine-block'

let lastId = 0

/** `id` e `type` por último: duplicar um bloco passa o próprio bloco como campos. */
function newBlock(type = 'paragraph', fields = {}) {
  lastId += 1
  return { text: '', ...fields, id: `bloco-${lastId}`, type }
}

function fitText(type, text) {
  return SINGLE_LINE.has(type) ? text.replace(/\s*\n\s*/g, ' ') : text
}

/** Blocos de `parseArticleBody` → blocos do editor: cada item de lista vira um bloco. */
function fromParsed(parsed) {
  return parsed.flatMap((block) => {
    switch (block.type) {
      case 'list':
        return block.items.map((text) => newBlock(block.ordered ? 'numbered' : 'bullet', { text }))
      case 'heading':
        return [newBlock(block.level === 3 ? 'subheading' : 'heading', { text: block.text })]
      case 'quote':
        return [newBlock('quote', { text: block.text, cite: block.cite })]
      case 'image':
        return [newBlock('image', { url: block.url, alt: block.alt, caption: block.caption, credit: block.credit })]
      case 'video':
        return [newBlock('video', { url: block.url, caption: block.caption })]
      case 'divider':
        return [newBlock('divider')]
      default:
        return [newBlock('paragraph', { text: block.text })]
    }
  })
}

function toEditorBlocks(content) {
  const blocks = fromParsed(parseArticleBody(content))
  return blocks.length ? blocks : [newBlock()]
}

/** Blocos do editor → texto gravado. Itens vizinhos voltam a formar uma lista só. */
function toContent(blocks) {
  const grouped = []
  for (const block of blocks) {
    const last = grouped.at(-1)
    if (LIST_TYPES.has(block.type)) {
      const ordered = block.type === 'numbered'
      if (last?.type === 'list' && last.ordered === ordered) last.items.push(block.text)
      else grouped.push({ type: 'list', ordered, items: [block.text] })
    } else if (block.type === 'heading' || block.type === 'subheading') {
      grouped.push({ type: 'heading', level: block.type === 'subheading' ? 3 : 2, text: block.text })
    } else if (block.type === 'video') {
      grouped.push({ type: 'video', videoId: youtubeId(block.url), caption: block.caption })
    } else {
      grouped.push(block)
    }
  }
  return serializeArticleBody(grouped)
}

/**
 * Texto colado com várias linhas. Com linha em branco, ele já vem no formato
 * de blocos (outra notícia, um arquivo .md) e é lido como tal. Sem ela, cada
 * linha vira um bloco, que é como chega um texto copiado do Word ou de um site.
 * As convenções valem na colagem: `## ` chega como intertítulo, `- ` como item.
 */
function pastedBlocks(text) {
  const clean = text.replace(/\r\n?/g, '\n')
  return fromParsed(parseArticleBody(/\n\s*\n/.test(clean) ? clean : clean.split('\n').join('\n\n')))
}

function matchTypes(query) {
  const term = normalizeSearch(query)
  if (!term) return BLOCK_TYPES
  return BLOCK_TYPES.filter((option) =>
    [option.label, ...option.keywords].some((word) => normalizeSearch(word).includes(term)),
  )
}

function SlashMenu({ id, options, active, onPick }) {
  const activeType = options[active]?.type

  // A lista rola: o item destacado pelas setas precisa continuar à vista.
  useEffect(() => {
    if (activeType) document.getElementById(`${id}-${activeType}`)?.scrollIntoView({ block: 'nearest' })
  }, [id, activeType])

  return (
    <div id={id} role="listbox" aria-label="Tipos de bloco" className="block-slash menu-panel">
      {options.length ? (
        options.map((option, position) => {
          const Icon = option.icon
          return (
            <div
              key={option.type}
              id={`${id}-${option.type}`}
              role="option"
              aria-selected={position === active}
              data-highlighted={position === active ? '' : undefined}
              className="menu-item align-items-start"
              // Sem isto o clique tiraria o foco do bloco antes de escolher.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPick(option.type)}
            >
              <Icon className="icon mt-1 flex-shrink-0" aria-hidden="true" />
              <span className="flex-grow-1">
                <span className="d-block fw-medium">{option.label}</span>
                <span className="d-block text-body-secondary fs-8">{option.description}</span>
              </span>
              {option.shortcut ? (
                <span className="text-body-secondary mt-1 fs-8 font-monospace" aria-hidden="true">
                  {option.shortcut}
                </span>
              ) : null}
            </div>
          )
        })
      ) : (
        <p className="text-body-secondary m-0 px-3 py-2 fs-7">Nenhum tipo de bloco com esse nome.</p>
      )}
    </div>
  )
}

/**
 * Corpo da notícia escrito em blocos, no jeito do Notion: `/` abre o menu de
 * tipos, atalhos de markdown no começo da linha (`## `, `- `, `1. `, `> `,
 * `---`) mudam o tipo, Enter cria o bloco seguinte, Backspace no começo junta
 * com o anterior, e a alça ao lado de cada bloco arrasta ou abre as ações.
 *
 * O que vai para o banco continua sendo o texto puro de `parseArticleBody`: o
 * editor lê o conteúdo por ela e grava por `serializeArticleBody`, e a página
 * pública desenha os mesmos blocos. Nenhuma marcação do usuário chega a ela.
 *
 * Cada bloco de texto é um `<textarea>`, e não um `contenteditable`: colar de
 * um site ou do Word traz só texto, sem HTML para limpar, e o desfazer do
 * navegador continua funcionando dentro do bloco.
 *
 * O estado dos blocos é do editor e só é lido do `value` na montagem — reler a
 * cada tecla apagaria os blocos vazios em que a pessoa ainda vai escrever. O
 * formulário já remonta o editor quando troca de notícia.
 */
export function ArticleEditor({ id, value, onChange, disabled = false, labelledBy, describedBy }) {
  const uid = useId()
  const [blocks, setBlocks] = useState(() => toEditorBlocks(value))
  const [slash, setSlash] = useState(null)
  const [drop, setDrop] = useState(null)
  const [actionsFor, setActionsFor] = useState(null)
  const pendingFocus = useRef(null)
  const dragging = useRef(null)
  // Última versão dos blocos, para o que termina depois de um `await` (o envio
  // de uma foto): o `blocks` capturado antes dele já não tem o que foi digitado
  // enquanto o arquivo subia.
  const latest = useRef(blocks)

  const inputId = (blockId) => `${uid}-${blockId}`
  const slashOptions = slash ? matchTypes(slash.query) : []
  const slashActive = Math.min(slash?.active ?? 0, Math.max(slashOptions.length - 1, 0))

  // Foco pedido por uma ação que muda a lista: só dá para aplicá-lo depois que
  // o bloco novo existe no DOM.
  useLayoutEffect(() => {
    const request = pendingFocus.current
    if (!request) return
    pendingFocus.current = null
    focusBlock(request.id, request.caret, request.inner)
  })

  /**
   * Leva o foco a um bloco. Bloco de texto recebe o cursor na posição pedida
   * (no fim, se nenhuma); bloco de mídia recebe o foco no próprio quadro, ou,
   * com `inner`, no primeiro controle dele (o botão de envio, o campo do link).
   */
  function focusBlock(blockId, caret, inner = false) {
    const target = document.getElementById(inputId(blockId))
    if (!target) return
    const element = inner ? (target.querySelector('input:not([type="file"]), textarea, button') ?? target) : target
    element.focus()
    if (element.tagName === 'TEXTAREA' || (element.tagName === 'INPUT' && element.type === 'text')) {
      const position = caret == null ? element.value.length : Math.min(caret, element.value.length)
      element.setSelectionRange(position, position)
    }
  }

  function commit(next, focus) {
    if (focus) pendingFocus.current = focus
    latest.current = next
    setBlocks(next)
    onChange(toContent(next))
  }

  function update(blockId, patch) {
    return blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block))
  }

  /**
   * Mudança vinda de dentro de uma imagem ou vídeo. Quando a mídia chega (o
   * envio termina, o link é aceito), o botão ou campo que tinha o foco some, e
   * o foco vai para a legenda — mas só se a pessoa ainda estiver ali, e não se
   * foi escrever em outro bloco enquanto a foto subia.
   */
  function patchMedia(blockId, patch) {
    const frame = document.getElementById(inputId(blockId))
    const active = document.activeElement
    const stillHere = !active || active === document.body || frame?.contains(active)
    commit(
      latest.current.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
      'url' in patch && stillHere ? { id: blockId, inner: true } : undefined,
    )
  }

  function setType(block, type, caret) {
    commit(update(block.id, { type, text: fitText(type, block.text) }), { id: block.id, caret })
  }

  function insertParagraphAfter(blockId) {
    const current = latest.current
    const index = current.findIndex((block) => block.id === blockId)
    const created = newBlock()
    commit([...current.slice(0, index + 1), created, ...current.slice(index + 1)], {
      id: created.id,
      caret: 0,
    })
  }

  function move(blockId, direction, caret) {
    const index = blocks.findIndex((block) => block.id === blockId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= blocks.length) return
    const next = [...blocks]
    ;[next[index], next[target]] = [next[target], next[index]]
    commit(next, { id: blockId, caret })
  }

  function moveTo(blockId, targetId, position) {
    if (blockId === targetId) return
    const moving = blocks.find((block) => block.id === blockId)
    if (!moving) return
    const rest = blocks.filter((block) => block.id !== blockId)
    const at = rest.findIndex((block) => block.id === targetId) + (position === 'after' ? 1 : 0)
    commit([...rest.slice(0, at), moving, ...rest.slice(at)])
  }

  function duplicate(block, index) {
    const copy = newBlock(block.type, block)
    commit([...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)], { id: copy.id })
  }

  function remove(block, index) {
    if (blocks.length === 1) {
      const blank = newBlock()
      commit([blank], { id: blank.id })
      return
    }
    const neighbor = blocks[index - 1] ?? blocks[index + 1]
    commit(
      blocks.filter((other) => other.id !== block.id),
      { id: neighbor.id, caret: index > 0 ? undefined : 0 },
    )
  }

  /** O "+" ao lado do bloco: abre o menu de tipos num bloco novo logo abaixo. */
  function openInserter(block, index) {
    if (block.type === 'paragraph' && !block.text) {
      commit(update(block.id, { text: '/' }), { id: block.id, caret: 1 })
      setSlash({ id: block.id, start: 0, query: '', active: 0 })
      return
    }
    const created = newBlock('paragraph', { text: '/' })
    commit([...blocks.slice(0, index + 1), created, ...blocks.slice(index + 1)], {
      id: created.id,
      caret: 1,
    })
    setSlash({ id: created.id, start: 0, query: '', active: 0 })
  }

  /**
   * Escolha no menu de `/`: apaga o `/termo` digitado e troca o tipo do bloco.
   * Mídia não é texto, então não "converte" o bloco: se sobrou texto nele, a
   * mídia entra logo abaixo, como no Notion.
   */
  function applySlash(block, index, type) {
    const element = document.getElementById(inputId(block.id))
    const end = Math.max(element?.selectionStart ?? 0, slash.start + 1 + slash.query.length)
    const text = block.text.slice(0, slash.start) + block.text.slice(end)
    setSlash(null)

    if (TEXT_TYPES.has(type)) {
      commit(update(block.id, { type, text: fitText(type, text) }), {
        id: block.id,
        caret: slash.start,
      })
      return
    }

    const media = newBlock(type)
    const kept = text.trim() ? [{ ...block, text }] : []

    // Depois do divisor o texto continua numa linha nova, pronta para digitar.
    if (type === 'divider') {
      const next = blocks[index + 1]
      const reuse = next?.type === 'paragraph' && !next.text
      const after = reuse ? [] : [newBlock()]
      commit([...blocks.slice(0, index), ...kept, media, ...after, ...blocks.slice(index + 1)], {
        id: reuse ? next.id : after[0].id,
        caret: 0,
      })
      return
    }

    commit([...blocks.slice(0, index), ...kept, media, ...blocks.slice(index + 1)], {
      id: media.id,
      inner: true,
    })
  }

  function handleChange(block, index, event) {
    const element = event.target
    const caret = element.selectionStart
    const text = fitText(block.type, element.value)

    if (block.type === 'paragraph') {
      // "---" vira divisor assim que o terceiro traço é digitado.
      if (text === '---' && caret === 3) {
        const next = blocks[index + 1]
        const reuse = next?.type === 'paragraph' && !next.text
        const after = reuse ? [] : [newBlock()]
        setSlash(null)
        commit([...blocks.slice(0, index), newBlock('divider'), ...after, ...blocks.slice(index + 1)], {
          id: reuse ? next.id : after[0].id,
          caret: 0,
        })
        return
      }

      // Atalho digitado no começo: o marcador some e o bloco muda de tipo. Num
      // tipo de uma linha só, as linhas seguintes continuam como parágrafo.
      const marker = SHORTCUT.exec(text)
      if (marker && caret === marker[0].length) {
        const type = shortcutType(marker[1])
        const body = text.slice(marker[0].length)
        const [firstLine, ...others] = body.split('\n')
        const single = SINGLE_LINE.has(type)
        const rest = single && others.length ? [newBlock('paragraph', { text: others.join('\n') })] : []
        setSlash(null)
        commit(
          [
            ...blocks.slice(0, index),
            { ...block, type, text: single ? firstLine : body },
            ...rest,
            ...blocks.slice(index + 1),
          ],
          { id: block.id, caret: 0 },
        )
        return
      }

      // O que chegou de outro jeito — colado, digitado fora de ordem — e que a
      // página leria como outro bloco (um link do YouTube sozinho, "> fala")
      // vira esse bloco aqui também: o editor mostra o que vai ao ar.
      const reparsed = parseArticleBody(text)
      if (reparsed.length > 1 || (reparsed.length === 1 && reparsed[0].type !== 'paragraph')) {
        const converted = fromParsed(reparsed)
        setSlash(null)
        commit([...blocks.slice(0, index), ...converted, ...blocks.slice(index + 1)], {
          id: converted.at(-1).id,
        })
        return
      }
    }

    if (slash?.id === block.id) {
      const query = text.slice(slash.start + 1, caret)
      const stillOpen = caret > slash.start && text[slash.start] === '/' && !/\s/.test(query)
      setSlash(stillOpen ? { ...slash, query, active: 0 } : null)
    } else if (
      text.length === block.text.length + 1 &&
      text[caret - 1] === '/' &&
      (caret === 1 || /\s/.test(text[caret - 2]))
    ) {
      setSlash({ id: block.id, start: caret - 1, query: '', active: 0 })
    }

    commit(update(block.id, { text }))
  }

  function handleKeyDown(block, index, event) {
    if (event.nativeEvent.isComposing) return

    const element = event.currentTarget
    const { selectionStart: start, selectionEnd: end, value: text } = element
    const collapsed = start === end
    const modified = event.altKey || event.ctrlKey || event.metaKey

    // Com o menu de `/` aberto, setas, Enter, Tab e Esc são dele.
    if (slash?.id === block.id) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSlash(null)
        return
      }
      if (slashOptions.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        const count = slashOptions.length
        setSlash({ ...slash, active: (slashActive + step + count) % count })
        return
      }
      if (slashOptions.length && (event.key === 'Enter' || event.key === 'Tab')) {
        event.preventDefault()
        applySlash(block, index, slashOptions[slashActive].type)
        return
      }
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown')
    ) {
      event.preventDefault()
      move(block.id, event.key === 'ArrowUp' ? -1 : 1, start)
      return
    }

    if (event.key === 'Enter' && !modified) {
      // Shift+Enter quebra a linha no parágrafo e na citação. Nos tipos de uma
      // linha só ele age como Enter — e numa linha já vazia também: linha em
      // branco no meio do bloco não chega à página, então o segundo Shift+Enter
      // abre um bloco novo.
      const multiline = !SINGLE_LINE.has(block.type)
      if (event.shiftKey && multiline && start > 0 && text[start - 1] !== '\n') return
      event.preventDefault()
      setSlash(null)

      // Enter num item vazio encerra a lista; numa citação vazia, a citação.
      if ((LIST_TYPES.has(block.type) || block.type === 'quote') && !text.trim()) {
        setType(block, 'paragraph', 0)
        return
      }

      const nextType = LIST_TYPES.has(block.type) ? block.type : 'paragraph'

      // No começo de um bloco com texto, abre espaço acima e deixa o bloco
      // onde está, em vez de parti-lo em um vazio e um cheio.
      if (end === 0 && text) {
        const blank = newBlock(nextType)
        commit([...blocks.slice(0, index), blank, ...blocks.slice(index)], {
          id: block.id,
          caret: 0,
        })
        return
      }

      const created = newBlock(nextType, { text: text.slice(end).replace(/^\n+/, '') })
      commit(
        [
          ...blocks.slice(0, index),
          { ...block, text: text.slice(0, start).replace(/\n+$/, '') },
          created,
          ...blocks.slice(index + 1),
        ],
        { id: created.id, caret: 0 },
      )
      return
    }

    if (event.key === 'Backspace' && !modified && !event.shiftKey && end === 0) {
      // Primeiro o bloco volta a ser parágrafo; só o Backspace seguinte o junta
      // ao de cima. É o que evita perder a formatação com uma tecla a mais.
      if (block.type !== 'paragraph') {
        event.preventDefault()
        setType(block, 'paragraph', 0)
        return
      }

      const previous = blocks[index - 1]
      if (!previous) {
        if (!text && blocks.length > 1) {
          event.preventDefault()
          commit(blocks.slice(1), { id: blocks[1].id, caret: 0 })
        }
        return
      }

      event.preventDefault()

      // Mídia acima: o primeiro Backspace seleciona o bloco e só o segundo o
      // apaga. Uma foto não pode sumir com uma tecla dada para apagar texto.
      if (!TEXT_TYPES.has(previous.type)) {
        if (text) focusBlock(previous.id)
        else commit(blocks.filter((other) => other.id !== block.id), { id: previous.id })
        return
      }

      commit(
        [
          ...blocks.slice(0, index - 1),
          { ...previous, text: previous.text + fitText(previous.type, text) },
          ...blocks.slice(index + 1),
        ],
        { id: previous.id, caret: previous.text.length },
      )
      return
    }

    if (event.key === 'Delete' && !modified && collapsed && start === text.length) {
      const following = blocks[index + 1]
      if (!following || !TEXT_TYPES.has(following.type)) return
      event.preventDefault()
      commit(
        [
          ...blocks.slice(0, index),
          { ...block, text: text + fitText(block.type, following.text) },
          ...blocks.slice(index + 2),
        ],
        { id: block.id, caret: text.length },
      )
      return
    }

    if (modified || event.shiftKey || !collapsed) return

    if (event.key === 'ArrowLeft' && start === 0 && index > 0) {
      event.preventDefault()
      focusBlock(blocks[index - 1].id)
      return
    }

    if (event.key === 'ArrowRight' && start === text.length && index < blocks.length - 1) {
      event.preventDefault()
      focusBlock(blocks[index + 1].id, 0)
      return
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const up = event.key === 'ArrowUp'
      const target = blocks[index + (up ? -1 : 1)]
      if (!target) return
      // O textarea não informa em que linha VISUAL está o cursor. Deixa o
      // navegador mover primeiro: se o cursor ficou onde estava, ele já estava
      // na primeira (ou última) linha, e a seta passa para o bloco vizinho.
      window.setTimeout(() => {
        if (document.activeElement !== element) return
        if (element.selectionStart !== start || element.selectionEnd !== start) return
        focusBlock(target.id, up ? undefined : 0)
      })
    }
  }

  /**
   * Teclado no quadro de uma mídia selecionada. Só vale para o quadro em si:
   * Backspace dentro da legenda apaga letra, não a foto.
   */
  function handleMediaKeyDown(block, index, event) {
    if (event.target !== event.currentTarget) return

    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown')
    ) {
      event.preventDefault()
      move(block.id, event.key === 'ArrowUp' ? -1 : 1)
      return
    }

    if (event.altKey || event.ctrlKey || event.metaKey) return

    const previous = blocks[index - 1]
    const following = blocks[index + 1]

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      remove(block, index)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      insertParagraphAfter(block.id)
    } else if ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') && previous) {
      event.preventDefault()
      focusBlock(previous.id)
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowRight') && following) {
      event.preventDefault()
      focusBlock(following.id, 0)
    }
  }

  function handlePaste(block, index, event) {
    const pasted = event.clipboardData?.getData('text/plain') ?? ''
    // Uma linha só: a colagem normal do navegador já resolve, e `handleChange`
    // reconhece um link de vídeo ou um "## " colado sozinho.
    if (!pasted.includes('\n')) return
    const incoming = pastedBlocks(pasted)
    if (!incoming.length) return

    event.preventDefault()
    setSlash(null)

    const element = event.currentTarget
    const before = block.text.slice(0, element.selectionStart)
    const after = block.text.slice(element.selectionEnd)
    const [first, ...rest] = incoming

    // Colar num parágrafo vazio adota o tipo do que chegou: `## Título` colado
    // numa linha nova vira intertítulo, e não parágrafo com "##" na frente.
    // Se o primeiro bloco colado é mídia, ele entra inteiro abaixo do texto.
    const adopt = block.type === 'paragraph' && !before.trim()
    const head = !TEXT_TYPES.has(first.type)
      ? [...(before.trim() ? [{ ...block, text: before }] : []), first]
      : [{ ...block, ...(adopt ? first : {}), id: block.id, text: before + first.text }]
    const pieces = [...head, ...rest]
    const last = pieces.at(-1)

    // O texto que estava depois do cursor fecha a colagem: no último bloco, se
    // for de texto, ou num parágrafo próprio depois da mídia.
    const tail = after.trim() && !TEXT_TYPES.has(last.type) ? [newBlock('paragraph', { text: after })] : []
    const caret = TEXT_TYPES.has(last.type) ? last.text.length : undefined

    commit(
      [
        ...blocks.slice(0, index),
        ...pieces.map((piece) =>
          piece === last && TEXT_TYPES.has(piece.type)
            ? { ...piece, text: fitText(piece.type, piece.text + after) }
            : piece,
        ),
        ...tail,
        ...blocks.slice(index + 1),
      ],
      { id: last.id, caret },
    )
  }

  function handleDragStart(block, event) {
    dragging.current = block.id
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(DRAG_TYPE, block.id)
    // Arrasta a imagem do bloco inteiro, e não só da alça.
    const row = event.currentTarget.closest('.block')
    if (row) event.dataTransfer.setDragImage(row, 0, 0)
    setSlash(null)
  }

  function dropPosition(event) {
    const box = event.currentTarget.getBoundingClientRect()
    return event.clientY < box.top + box.height / 2 ? 'before' : 'after'
  }

  function handleDragOver(block, event) {
    if (!dragging.current || !event.dataTransfer.types.includes(DRAG_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const position = dropPosition(event)
    if (drop?.id !== block.id || drop.position !== position) setDrop({ id: block.id, position })
  }

  function handleDrop(block, event) {
    if (!dragging.current) return
    event.preventDefault()
    moveTo(dragging.current, block.id, dropPosition(event))
    endDrag()
  }

  function endDrag() {
    dragging.current = null
    setDrop(null)
  }

  /** Clique na área vazia abaixo do texto: continua a escrever no fim, como no Notion. */
  function handleTailClick() {
    const last = blocks.at(-1)
    if (last.type === 'paragraph' && !last.text) {
      focusBlock(last.id)
      return
    }
    const created = newBlock()
    commit([...blocks, created], { id: created.id })
  }

  const empty = blocks.length === 1 && blocks[0].type === 'paragraph' && !blocks[0].text

  // Posição de cada item numa lista numerada, recomeçando a cada lista nova.
  const numbers = blocks.reduce((acc, block, index) => {
    const previous = index > 0 && blocks[index - 1].type === 'numbered' ? acc[index - 1] : 0
    return [...acc, block.type === 'numbered' ? previous + 1 : 0]
  }, [])

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      data-empty={empty ? '' : undefined}
      data-dragging={drop ? '' : undefined}
      className="block-editor article-body"
    >
      {blocks.map((block, index) => {
        const isText = TEXT_TYPES.has(block.type)
        const slashOpen = slash?.id === block.id
        const listboxId = `${inputId(block.id)}-tipos`

        return (
          <div
            key={block.id}
            className="block"
            data-type={block.type}
            data-drop={drop?.id === block.id ? drop.position : undefined}
            onDragOver={(event) => handleDragOver(block, event)}
            onDrop={(event) => handleDrop(block, event)}
          >
            {disabled ? null : (
              // Fora da ordem de tabulação: pelo teclado, tudo o que as alças
              // fazem tem atalho — `/`, Ctrl+Shift+setas, Backspace.
              <div className="block-handles">
                <button
                  type="button"
                  tabIndex={-1}
                  className="block-handle"
                  aria-label="Inserir bloco abaixo"
                  title="Inserir bloco abaixo"
                  onClick={() => openInserter(block, index)}
                >
                  <Plus className="icon-sm" aria-hidden="true" />
                </button>

                <DropdownMenu
                  open={actionsFor === block.id}
                  onOpenChange={(open) => setActionsFor(open ? block.id : null)}
                >
                  <DropdownMenuTrigger
                    tabIndex={-1}
                    className="block-handle block-grip"
                    aria-label={`Ações do bloco: ${TYPE_META[block.type].name}`}
                    title="Arraste para mover · clique para mais ações"
                    draggable
                    onDragStart={(event) => handleDragStart(block, event)}
                    onDragEnd={endDrag}
                    // O Radix abre o menu no pointerdown, o que abriria o menu
                    // em todo começo de arrasto. Aqui ele abre só no clique.
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      if (event.detail > 0) setActionsFor(block.id)
                    }}
                  >
                    <GripVertical className="icon-sm" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    onCloseAutoFocus={(event) => {
                      // O foco volta para o bloco, e não para a alça. Se a ação
                      // já levou o foco para outro bloco, fica lá.
                      event.preventDefault()
                      if (document.activeElement?.closest?.('.block-editor')) return
                      focusBlock(block.id)
                    }}
                  >
                    {isText ? (
                      <>
                        <DropdownMenuLabel>Transformar em</DropdownMenuLabel>
                        {TEXT_OPTIONS.map((option) => (
                          <DropdownMenuCheckboxItem
                            key={option.type}
                            checked={block.type === option.type}
                            onSelect={() => setType(block, option.type)}
                          >
                            {option.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                      </>
                    ) : null}
                    <DropdownMenuItem onSelect={() => duplicate(block, index)}>
                      <Copy aria-hidden="true" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={index === 0}
                      onSelect={() => move(block.id, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                      Mover para cima
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={index === blocks.length - 1}
                      onSelect={() => move(block.id, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                      Mover para baixo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={() => remove(block, index)}>
                      <Trash2 aria-hidden="true" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {isText ? (
              <div className="block-body">
                {block.type === 'bullet' ? (
                  <span className="block-marker" aria-hidden="true">
                    •
                  </span>
                ) : null}
                {block.type === 'numbered' ? (
                  <span className="block-marker" aria-hidden="true">
                    {numbers[index]}.
                  </span>
                ) : null}
                <AutosizeTextarea
                  id={inputId(block.id)}
                  className={cn(
                    'block-input',
                    (block.type === 'heading' || block.type === 'subheading') && 'fw-bold',
                  )}
                  value={block.text}
                  placeholder={PLACEHOLDER[block.type]}
                  aria-label={TYPE_META[block.type].name}
                  aria-controls={slashOpen ? listboxId : undefined}
                  disabled={disabled}
                  onChange={(event) => handleChange(block, index, event)}
                  onKeyDown={(event) => handleKeyDown(block, index, event)}
                  onPaste={(event) => handlePaste(block, index, event)}
                  onBlur={() => {
                    if (slashOpen) setSlash(null)
                  }}
                />
                {block.type === 'quote' ? (
                  // O autor fica escondido enquanto a citação não tem foco e
                  // ele está vazio: é opcional, e o campo à vista em toda
                  // citação pesaria na folha.
                  <div className="block-cite text-body-secondary fs-7">
                    <span aria-hidden="true">—</span>
                    <input
                      className="block-input"
                      value={block.cite ?? ''}
                      placeholder="Autor da citação (opcional)"
                      aria-label="Autor da citação"
                      maxLength={120}
                      disabled={disabled}
                      onChange={(event) => commit(update(block.id, { cite: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          insertParagraphAfter(block.id)
                        } else if (event.key === 'Backspace' && !event.currentTarget.value) {
                          event.preventDefault()
                          focusBlock(block.id)
                        }
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                id={inputId(block.id)}
                tabIndex={-1}
                role="group"
                aria-label={TYPE_META[block.type].name}
                className="block-media"
                onKeyDown={(event) => handleMediaKeyDown(block, index, event)}
              >
                {block.type === 'divider' ? <hr className="my-2" /> : null}
                {block.type === 'image' ? (
                  <ImageBlock
                    block={block}
                    disabled={disabled}
                    onPatch={(patch) => patchMedia(block.id, patch)}
                    onEnter={() => insertParagraphAfter(block.id)}
                  />
                ) : null}
                {block.type === 'video' ? (
                  <VideoBlock
                    block={block}
                    disabled={disabled}
                    onPatch={(patch) => patchMedia(block.id, patch)}
                    onEnter={() => insertParagraphAfter(block.id)}
                  />
                ) : null}
              </div>
            )}

            {slashOpen ? (
              <SlashMenu
                id={listboxId}
                options={slashOptions}
                active={slashActive}
                onPick={(type) => applySlash(block, index, type)}
              />
            ) : null}
          </div>
        )
      })}

      {disabled ? null : (
        <div className="block-editor-tail" aria-hidden="true" onClick={handleTailClick} />
      )}

      {/* O menu de `/` não tira o foco do texto, então quem usa leitor de tela
          ouve por aqui qual tipo está destacado. */}
      <p className="visually-hidden" aria-live="polite">
        {slash
          ? slashOptions.length
            ? `${slashOptions[slashActive].label}, ${slashActive + 1} de ${slashOptions.length}. Enter aplica, Esc fecha.`
            : 'Nenhum tipo de bloco com esse nome.'
          : ''}
      </p>
    </div>
  )
}
