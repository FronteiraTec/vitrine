import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, Minus, Move, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const MAX_ZOOM = 4
const KEY_STEP = 0.02

/**
 * Enquadramento de imagem antes do envio: a pessoa arrasta, dá zoom (controle,
 * roda do mouse ou pinça) e vê exatamente o recorte que vai para o site.
 *
 * Tudo é medido em "unidades de moldura" (1 = lado da moldura), então a
 * posição não depende do tamanho em que a moldura aparece na tela. O recorte
 * final é sempre quadrado; `shape="round"` só desenha a máscara circular,
 * igual ao avatar onde a foto será exibida.
 */
export function ImageCropper({
  open,
  src,
  fileName = 'imagem',
  shape = 'square',
  outputSize = 512,
  onCancel,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent size="sm">
        {src ? (
          <CropperForm
            key={src}
            src={src}
            fileName={fileName}
            shape={shape}
            outputSize={outputSize}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function clampOffset(offset, size, zoom) {
  // Metade do quanto a imagem sobra além da moldura em cada eixo.
  const spareX = Math.max(0, (size.width * zoom - 1) / 2)
  const spareY = Math.max(0, (size.height * zoom - 1) / 2)
  return {
    x: Math.min(spareX, Math.max(-spareX, offset.x)),
    y: Math.min(spareY, Math.max(-spareY, offset.y)),
  }
}

function CropperForm({ src, fileName, shape, outputSize, onCancel, onConfirm }) {
  const frameRef = useRef(null)
  const imageRef = useRef(null)
  const pointers = useRef(new Map())
  const gesture = useRef(null)

  // `size`: tamanho da imagem com zoom 1, já ajustada para cobrir a moldura.
  const [size, setSize] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function applyZoom(nextZoom, focus = { x: 0, y: 0 }) {
    if (!size) return
    const clamped = Math.min(MAX_ZOOM, Math.max(1, nextZoom))
    // Mantém parado o ponto sob o cursor (ou o centro) enquanto o zoom muda.
    const ratio = clamped / zoom
    setZoom(clamped)
    setOffset((current) =>
      clampOffset(
        {
          x: focus.x - (focus.x - current.x) * ratio,
          y: focus.y - (focus.y - current.y) * ratio,
        },
        size,
        clamped,
      ),
    )
  }

  function moveBy(dx, dy) {
    if (!size) return
    setOffset((current) => clampOffset({ x: current.x + dx, y: current.y + dy }, size, zoom))
  }

  function frameUnits(event) {
    const rect = frameRef.current.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
      scale: rect.width,
    }
  }

  // A roda precisa de listener não-passivo para não rolar o diálogo junto.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return undefined
    function handleWheel(event) {
      event.preventDefault()
      const point = frameUnits(event)
      applyZoom(zoom * Math.exp(-event.deltaY * 0.0015), point)
    }
    frame.addEventListener('wheel', handleWheel, { passive: false })
    return () => frame.removeEventListener('wheel', handleWheel)
  })

  function handlePointerDown(event) {
    if (!size) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    gesture.current = null
  }

  function handlePointerMove(event) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    const rect = frameRef.current.getBoundingClientRect()
    const current = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, current)

    if (pointers.current.size === 1) {
      moveBy((current.x - previous.x) / rect.width, (current.y - previous.y) / rect.height)
      return
    }

    // Pinça: a razão entre as distâncias dos dois dedos vira o zoom.
    const [a, b] = [...pointers.current.values()]
    const distance = Math.hypot(a.x - b.x, a.y - b.y)
    if (gesture.current) {
      const center = {
        x: ((a.x + b.x) / 2 - rect.left) / rect.width - 0.5,
        y: ((a.y + b.y) / 2 - rect.top) / rect.height - 0.5,
      }
      applyZoom(zoom * (distance / gesture.current), center)
    }
    gesture.current = distance
  }

  function handlePointerUp(event) {
    pointers.current.delete(event.pointerId)
    gesture.current = null
  }

  function handleKeyDown(event) {
    const actions = {
      ArrowLeft: () => moveBy(-KEY_STEP, 0),
      ArrowRight: () => moveBy(KEY_STEP, 0),
      ArrowUp: () => moveBy(0, -KEY_STEP),
      ArrowDown: () => moveBy(0, KEY_STEP),
      '+': () => applyZoom(zoom + 0.1),
      '=': () => applyZoom(zoom + 0.1),
      '-': () => applyZoom(zoom - 0.1),
    }
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  function handleLoad(event) {
    const { naturalWidth: width, naturalHeight: height } = event.currentTarget
    const cover = 1 / Math.min(width, height)
    setSize({ width: width * cover, height: height * cover, naturalWidth: width })
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  function reset() {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  async function confirm() {
    const image = imageRef.current
    if (!image || !size) return
    setSaving(true)
    setError(null)
    try {
      // Unidades de moldura → pixels da imagem original.
      const pxPerUnit = size.naturalWidth / (size.width * zoom)
      const left = 0.5 + offset.x - (size.width * zoom) / 2
      const top = 0.5 + offset.y - (size.height * zoom) / 2
      const sourceSide = pxPerUnit
      const side = Math.min(outputSize, Math.round(sourceSide))

      const canvas = document.createElement('canvas')
      canvas.width = side
      canvas.height = side
      const context = canvas.getContext('2d')
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, -left * pxPerUnit, -top * pxPerUnit, sourceSide, sourceSide, 0, 0, side, side)

      // Navegadores sem WebP no canvas devolvem PNG — também aceito no envio.
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('Falha ao gerar a imagem.'))),
          'image/webp',
          0.9,
        ),
      )
      const extension = blob.type === 'image/webp' ? 'webp' : 'png'
      const baseName = fileName.replace(/\.[^.]+$/, '') || 'imagem'
      await onConfirm(new File([blob], `${baseName}.${extension}`, { type: blob.type }))
    } catch (cropError) {
      // Imagem de outra origem sem CORS "suja" o canvas e o toBlob falha.
      setError(
        cropError.name === 'SecurityError'
          ? 'Não foi possível ajustar esta imagem. Envie o arquivo novamente.'
          : cropError.message,
      )
    } finally {
      setSaving(false)
    }
  }

  const imageStyle = size
    ? {
        width: `${size.width * zoom * 100}%`,
        height: `${size.height * zoom * 100}%`,
        left: `${(0.5 + offset.x - (size.width * zoom) / 2) * 100}%`,
        top: `${(0.5 + offset.y - (size.height * zoom) / 2) * 100}%`,
      }
    : undefined

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ajustar enquadramento</DialogTitle>
        <DialogDescription>
          Arraste para posicionar e use o zoom para aproximar. O que aparece dentro da moldura é o
          que vai para o site.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-3">
        <div
          ref={frameRef}
          role="application"
          tabIndex={0}
          aria-label="Área de enquadramento. Use as setas para mover e + ou - para o zoom."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className={cn('image-cropper', shape === 'round' && 'image-cropper-round')}
        >
          <img
            ref={imageRef}
            src={src}
            alt=""
            crossOrigin="anonymous"
            draggable={false}
            onLoad={handleLoad}
            onError={() => setError('Não foi possível carregar a imagem para ajuste.')}
            className="image-cropper-image"
            style={imageStyle}
          />
          <span className="image-cropper-mask" aria-hidden="true" />
          {!size && !error ? (
            <span className="position-absolute top-50 start-50 translate-middle text-white">
              <Loader2 className="icon spinner-border spinner-border-sm" aria-hidden="true" />
            </span>
          ) : null}
        </div>

        <div className="d-flex align-items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => applyZoom(zoom - 0.25)}
            disabled={!size || zoom <= 1}
            aria-label="Diminuir zoom"
          >
            <Minus />
          </Button>
          <label htmlFor="image-cropper-zoom" className="visually-hidden">
            Zoom
          </label>
          <input
            id="image-cropper-zoom"
            type="range"
            className="form-range flex-grow-1"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!size}
            onChange={(event) => applyZoom(Number(event.target.value))}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => applyZoom(zoom + 0.25)}
            disabled={!size || zoom >= MAX_ZOOM}
            aria-label="Aumentar zoom"
          >
            <Plus />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={reset}
            disabled={!size}
            aria-label="Restaurar enquadramento"
            className="text-body-secondary"
          >
            <RotateCcw />
          </Button>
        </div>

        {error ? (
          <p role="alert" className="text-danger d-flex align-items-start gap-1 fs-8 fw-medium">
            <AlertCircle className="mt-1 icon-sm flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : (
          <p className="text-body-secondary d-flex align-items-center gap-1 fs-8">
            <Move className="icon-sm flex-shrink-0" aria-hidden="true" />
            Arraste a imagem · roda do mouse ou pinça para zoom
          </p>
        )}
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={confirm} loading={saving} disabled={!size}>
          Usar esta imagem
        </Button>
      </DialogFooter>
    </>
  )
}
