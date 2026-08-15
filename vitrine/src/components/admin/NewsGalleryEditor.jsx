import { useId, useRef, useState } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/ui/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { removeImageByUrl, uploadImage, validateImage } from '@/services/storage'
import { normalizeGallery } from '@/lib/news-content'
import { BUCKETS, MAX_IMAGE_BYTES } from '@/lib/constants'

/**
 * Galeria da notícia: imagem, legenda, crédito e ordem.
 *
 * Separado do `GalleryUploader` das iniciativas de propósito. Lá a galeria é um
 * mosaico de URLs e o formato do dado é `text[]`; aqui cada foto é um registro
 * com texto próprio (`jsonb`), e a lista precisa ser vertical para caberem os
 * dois campos ao lado da miniatura. Unificar os dois exigiria um componente que
 * alterna entre dois formatos de dado e dois desenhos — mais difícil de ler que
 * os dois separados.
 */
export function NewsGalleryEditor({ value, onChange, max = 12, disabled = false }) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const items = normalizeGallery(value)

  function update(index, patch) {
    onChange(items.map((item, position) => (position === index ? { ...item, ...patch } : item)))
  }

  /** Troca com o vizinho. Nas pontas não há vizinho, e o botão já vem desativado. */
  function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  async function handleRemove(index) {
    const removed = items[index]
    onChange(items.filter((_, position) => position !== index))
    if (removed?.url) await removeImageByUrl(removed.url, BUCKETS.NEWS)
  }

  async function handleFiles(files) {
    setError(null)
    const remaining = max - items.length
    if (remaining <= 0) {
      setError(`A galeria aceita no máximo ${max} imagens.`)
      return
    }

    setUploading(true)
    const uploaded = []
    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        const validationError = validateImage(file)
        if (validationError) {
          setError(validationError)
          continue
        }
        const { url } = await uploadImage({ bucket: BUCKETS.NEWS, folder: 'galeria', file })
        uploaded.push({ url, caption: '', credit: '' })
      }
      if (uploaded.length) onChange([...items, ...uploaded])
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Galeria</p>
          <p className="text-muted-foreground text-xs">
            Até {max} imagens no corpo da notícia · {items.length} adicionada
            {items.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          loading={uploading}
          disabled={disabled || items.length >= max}
        >
          <ImagePlus aria-hidden="true" />
          Adicionar
        </Button>
      </div>

      {items.length ? (
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.url}
              className="border-border bg-muted/30 grid gap-4 rounded-lg border p-3 sm:grid-cols-[10rem_minmax(0,1fr)]"
            >
              <Image
                src={item.url}
                alt=""
                ratio="aspect-[16/10]"
                wrapperClassName="border-border rounded-md border"
              />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${inputId}-caption-${index}`}>Legenda</Label>
                  <Input
                    id={`${inputId}-caption-${index}`}
                    value={item.caption}
                    onChange={(event) => update(index, { caption: event.target.value })}
                    placeholder="O que a foto mostra"
                    maxLength={200}
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${inputId}-credit-${index}`}>Crédito</Label>
                  <Input
                    id={`${inputId}-credit-${index}`}
                    value={item.credit}
                    onChange={(event) => update(index, { credit: event.target.value })}
                    placeholder="Quem fez a foto"
                    maxLength={120}
                    disabled={disabled}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={() => move(index, -1)}
                    disabled={disabled || index === 0}
                    aria-label={`Mover imagem ${index + 1} para cima`}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={() => move(index, 1)}
                    disabled={disabled || index === items.length - 1}
                    aria-label={`Mover imagem ${index + 1} para baixo`}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground ml-auto"
                  >
                    <Trash2 aria-hidden="true" />
                    Remover
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="border-border text-muted-foreground hover:bg-muted/60 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          {disabled ? 'Nenhuma imagem na galeria' : 'Nenhuma imagem — clique para adicionar'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {error ? (
        <p role="alert" className="text-destructive flex items-start gap-1.5 text-xs font-medium">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          JPG, PNG, WebP ou AVIF · até {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB por imagem
        </p>
      )}
    </div>
  )
}
