import { useCallback, useId, useRef, useState } from 'react'
import { AlertCircle, Crop, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/ui/image'
import { ImageCropper } from '@/components/admin/ImageCropper'
import { removeImageByUrl, uploadImage, validateImage } from '@/services/storage'
import { BUCKETS, MAX_IMAGE_BYTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

/**
 * Envio de imagem com arrastar-e-soltar, prévia local imediata e validação
 * antes da requisição.
 *
 * A prévia usa `URL.createObjectURL` para o arquivo aparecer no instante em que
 * é escolhido, sem esperar o upload terminar.
 *
 * Com `crop`, o arquivo passa antes pelo enquadramento (`ImageCropper`) e só o
 * recorte é enviado — `{ shape: 'round' }` para fotos exibidas como avatar.
 * Como o recorte sai reduzido, o limite de tamanho do original é mais folgado.
 */
// O original só serve de fonte para o recorte, que sai bem menor.
const CROP_SOURCE_MAX_BYTES = 20 * 1024 * 1024

export function ImageUploader({
  value,
  onChange,
  bucket = BUCKETS.INITIATIVES,
  folder = '',
  label = 'Imagem',
  hint,
  ratio = 'ratio-16x10',
  maxBytes = MAX_IMAGE_BYTES,
  crop,
  className,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  // Imagem aberta no enquadramento: `{ src, name, local }`.
  const [cropping, setCropping] = useState(null)
  const round = crop?.shape === 'round'
  const sourceMaxBytes = crop ? CROP_SOURCE_MAX_BYTES : maxBytes

  const upload = useCallback(
    async (file) => {
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
    [bucket, folder, onChange, value],
  )

  function handleFile(file) {
    setError(null)
    const validationError = validateImage(file, { maxBytes: sourceMaxBytes })
    if (validationError) {
      setError(validationError)
      return
    }
    if (crop) {
      setCropping({ src: URL.createObjectURL(file), name: file.name, local: true })
      return
    }
    upload(file)
  }

  function closeCropper() {
    if (cropping?.local) URL.revokeObjectURL(cropping.src)
    setCropping(null)
  }

  async function handleCropped(file) {
    closeCropper()
    await upload(file)
  }

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
      <div className="d-flex align-items-center justify-content-between gap-2">
        <label htmlFor={inputId} className="fs-7 fw-medium">
          {label}
        </label>
        {value && !uploading ? (
          <div className="d-flex gap-1">
            {crop ? (
              <Button
                variant="subtle"
                size="sm"
                type="button"
                onClick={() => setCropping({ src: value, name: 'foto', local: false })}
              >
                <Crop aria-hidden="true" />
                Ajustar
              </Button>
            ) : null}
            <Button variant="subtle" size="sm" onClick={handleRemove} type="button" className="me-0">
              <Trash2 aria-hidden="true" />
              Remover
            </Button>
          </div>
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
          'border position-relative overflow-hidden border-2 border-dashed',
          round ? 'rounded-circle' : 'rounded-3',
          dragging && 'border-primary bg-primary-subtle',
          displayed && 'border-solid',
        )}
      >
        {displayed ? (
          <div className="position-relative">
            <Image src={displayed} alt="" ratio={ratio} eager />
            {uploading ? (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-grid place-items-center bg-slate-950/50">
                <div className="d-flex align-items-center gap-2 rounded-2 bg-white px-2 py-2 fs-7 fw-medium">
                  <Loader2 className="icon spinner-border spinner-border-sm" aria-hidden="true" />
                  Enviando…
                </div>
              </div>
            ) : (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-grid place-items-center bg-slate-950/0 opacity-0">
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
              '-tertiary d-flex w-100 flex-column align-items-center justify-content-center gap-2 px-4 py-5 text-center ',
              ratio,
            )}
          >
            <span className="bg-body-secondary text-body-secondary d-flex h-fx-10 w-fx-10 align-items-center justify-content-center rounded-pill">
              <ImagePlus className="icon-lg" aria-hidden="true" />
            </span>
            {round ? (
              <span className="fs-7 fw-medium">Escolher foto</span>
            ) : (
              <>
                <span className="fs-7 fw-medium">Arraste uma imagem ou clique para escolher</span>
                <span className="text-body-secondary fs-8">
                  JPG, PNG, WebP ou AVIF · até {Math.round(sourceMaxBytes / 1024 / 1024)} MB
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          // Permite reenviar o mesmo arquivo depois de remover.
          event.target.value = ''
        }}
      />

      {error ? (
        <p role="alert" className="text-danger d-flex align-items-start gap-1 fs-8 fw-medium">
          <AlertCircle className="mt-1 icon-sm flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-body-secondary fs-8">{hint}</p>
      ) : null}

      {crop ? (
        <ImageCropper
          open={Boolean(cropping)}
          src={cropping?.src}
          fileName={cropping?.name}
          shape={crop.shape}
          outputSize={crop.size}
          onCancel={closeCropper}
          onConfirm={handleCropped}
        />
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
    <div className="space-y-2">
      <div className="d-flex align-items-center justify-content-between gap-2">
        <div>
          <p className="fs-7 fw-medium">Galeria</p>
          <p className="text-body-secondary fs-8">
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
        <ul className="d-grid grid-cols-2 gap-2 grid-cols-sm-3 grid-cols-lg-4">
          {value.map((url) => (
            <li key={url} className="position-relative">
              <Image
                src={url}
                alt=""
                ratio="ratio-1x1"
                wrapperClassName="rounded-2 border border"
              />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="bg-body text-danger position-absolute top-0 end-0 rounded-2 p-1 opacity-0 shadow-sm"
                aria-label="Remover imagem da galeria"
              >
                <Trash2 className="icon-sm" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border text-body-secondary d-flex w-100 align-items-center justify-content-center gap-2 rounded-3 border-2 border-dashed px-4 py-5 fs-7"
        >
          <ImagePlus className="icon" aria-hidden="true" />
          Nenhuma imagem na galeria — clique para adicionar
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="visually-hidden"
        onChange={(event) => {
          if (event.target.files?.length) handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {error ? (
        <p role="alert" className="text-danger d-flex align-items-start gap-1 fs-8 fw-medium">
          <AlertCircle className="mt-1 icon-sm flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
