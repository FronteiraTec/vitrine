import { useCallback, useId, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/ui/image'
import { removeImageByUrl, uploadImage, validateImage } from '@/services/storage'
import { BUCKETS, MAX_IMAGE_BYTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

/**
 * Envio de imagem com arrastar-e-soltar, prévia local imediata e validação
 * antes da requisição.
 *
 * A prévia usa `URL.createObjectURL` para o arquivo aparecer no instante em que
 * é escolhido, sem esperar o upload terminar.
 */
export function ImageUploader({
  value,
  onChange,
  bucket = BUCKETS.INITIATIVES,
  folder = '',
  label = 'Imagem',
  hint,
  ratio = 'aspect-[16/10]',
  maxBytes = MAX_IMAGE_BYTES,
  className,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  const handleFile = useCallback(
    async (file) => {
      setError(null)
      const validationError = validateImage(file, { maxBytes })
      if (validationError) {
        setError(validationError)
        return
      }

      const localUrl = URL.createObjectURL(file)
      setPreview(localUrl)
      setUploading(true)

      try {
        const { url } = await uploadImage({ bucket, folder, file })
        // Substituir: remove o arquivo anterior para não acumular órfãos.
        if (value) await removeImageByUrl(value, bucket)
        onChange(url)
      } catch (uploadError) {
        setError(uploadError.message)
      } finally {
        setUploading(false)
        setPreview(null)
        URL.revokeObjectURL(localUrl)
      }
    },
    [bucket, folder, maxBytes, onChange, value],
  )

  async function handleRemove() {
    const current = value
    onChange(null)
    setError(null)
    if (current) await removeImageByUrl(current, bucket)
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const displayed = preview ?? value

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        {value && !uploading ? (
          <Button variant="subtle" size="sm" onClick={handleRemove} type="button" className="-mr-2">
            <Trash2 aria-hidden="true" />
            Remover
          </Button>
        ) : null}
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-border relative overflow-hidden rounded-lg border-2 border-dashed transition-colors',
          dragging && 'border-brand bg-accent',
          displayed && 'border-solid',
        )}
      >
        {displayed ? (
          <div className="group relative">
            <Image src={displayed} alt="" ratio={ratio} eager />
            {uploading ? (
              <div className="absolute inset-0 grid place-items-center bg-slate-950/50">
                <div className="flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-sm font-medium">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Enviando…
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-slate-950/0 opacity-0 transition-all group-hover:bg-slate-950/40 group-hover:opacity-100">
                <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                  <Upload aria-hidden="true" />
                  Substituir
                </Button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'hover:bg-muted/60 flex w-full flex-col items-center justify-center gap-2 px-6 py-10 text-center transition-colors',
              ratio,
            )}
          >
            <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
              <ImagePlus className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium">Arraste uma imagem ou clique para escolher</span>
            <span className="text-muted-foreground text-xs">
              JPG, PNG, WebP ou AVIF · até {Math.round(maxBytes / 1024 / 1024)} MB
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          // Permite reenviar o mesmo arquivo depois de remover.
          event.target.value = ''
        }}
      />

      {error ? (
        <p role="alert" className="text-destructive flex items-start gap-1.5 text-xs font-medium">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  )
}

/** Galeria: múltiplas imagens com remoção individual. */
export function GalleryUploader({ value = [], onChange, bucket = BUCKETS.INITIATIVES, max = 8 }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFiles(files) {
    setError(null)
    const remaining = max - value.length
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
        const { url } = await uploadImage({ bucket, folder: 'galeria', file })
        uploaded.push(url)
      }
      if (uploaded.length) onChange([...value, ...uploaded])
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(url) {
    onChange(value.filter((item) => item !== url))
    await removeImageByUrl(url, bucket)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Galeria</p>
          <p className="text-muted-foreground text-xs">
            Até {max} imagens complementares · {value.length} adicionada
            {value.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          loading={uploading}
          disabled={value.length >= max}
        >
          <ImagePlus aria-hidden="true" />
          Adicionar
        </Button>
      </div>

      {value.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((url) => (
            <li key={url} className="group relative">
              <Image
                src={url}
                alt=""
                ratio="aspect-square"
                wrapperClassName="rounded-md border border-border"
              />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="bg-card/95 text-destructive hover:bg-destructive hover:text-destructive-foreground absolute top-2 right-2 rounded-md p-1.5 opacity-0 shadow-sm transition-all group-focus-within:opacity-100 group-hover:opacity-100"
                aria-label="Remover imagem da galeria"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border-border text-muted-foreground hover:bg-muted/60 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-sm transition-colors"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          Nenhuma imagem na galeria — clique para adicionar
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
      ) : null}
    </div>
  )
}
