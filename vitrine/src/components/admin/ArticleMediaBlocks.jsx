import { useId, useRef, useState } from 'react'
import { AlertCircle, ImagePlus } from 'lucide-react'
import { Image } from '@/components/ui/image'
import { VideoEmbed } from '@/components/news/VideoEmbed'
import { uploadImage, validateImage } from '@/services/storage'
import { ACCEPTED_IMAGE_TYPES, BUCKETS, MAX_IMAGE_BYTES } from '@/lib/constants'
import { youtubeId, youtubeWatchUrl } from '@/lib/news-content'

/*
 * Blocos de imagem e vídeo do `ArticleEditor`. Ficam num arquivo à parte porque
 * têm estado próprio (envio em andamento, link em digitação) que o resto do
 * editor não precisa conhecer.
 *
 * Os campos de legenda, crédito e texto alternativo não têm moldura, como o
 * resto da folha. Enter neles não envia o formulário: abre um parágrafo logo
 * abaixo, que é o que se espera ao terminar de legendar uma foto.
 */

function FieldError({ id, children }) {
  return (
    <p id={id} role="alert" className="text-danger d-flex align-items-start gap-1 fs-8 fw-medium">
      <AlertCircle className="mt-1 icon-sm flex-shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}

function MediaField({ label, onEnter, ...props }) {
  return (
    <label className="d-block">
      <span className="visually-hidden">{label}</span>
      <input
        className="block-input fs-7"
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
          event.preventDefault()
          onEnter()
        }}
        {...props}
      />
    </label>
  )
}

/**
 * Foto no meio do texto. Sobe para o mesmo bucket da capa e da galeria, e o
 * arquivo não é apagado quando o bloco sai: a notícia salva ainda pode apontar
 * para ele até a próxima gravação, e uma foto quebrada na página publicada é
 * pior que um arquivo sobrando no storage.
 */
export function ImageBlock({ block, disabled, onPatch, onEnter }) {
  const errorId = useId()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(file) {
    if (!file) return
    const invalid = validateImage(file)
    if (invalid) {
      setError(invalid)
      return
    }

    setError(null)
    setUploading(true)
    try {
      const { url } = await uploadImage({ bucket: BUCKETS.NEWS, folder: 'corpo', file })
      onPatch({ url })
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  if (!block.url) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          className="block-upload"
          disabled={disabled || uploading}
          aria-describedby={error ? errorId : undefined}
          onClick={() => fileRef.current?.click()}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes('Files')) event.preventDefault()
          }}
          onDrop={(event) => {
            const file = event.dataTransfer.files?.[0]
            if (!file) return
            event.preventDefault()
            handleFile(file)
          }}
        >
          {uploading ? (
            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          ) : (
            <ImagePlus className="icon" aria-hidden="true" />
          )}
          {uploading ? 'Enviando imagem…' : 'Escolha uma imagem ou arraste o arquivo para cá'}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            handleFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />

        {error ? (
          <FieldError id={errorId}>{error}</FieldError>
        ) : (
          <p className="text-body-secondary fs-8">
            JPG, PNG, WebP ou AVIF · até {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB
          </p>
        )}
      </div>
    )
  }

  return (
    <figure className="m-0">
      {/* Mesmo quadro 16:9 da página publicada, para a foto aparecer cortada
          aqui do jeito que vai ao ar. */}
      <Image src={block.url} alt={block.alt} ratio="ratio-16x9" wrapperClassName="rounded-3" />
      <div className="mt-2 space-y-1">
        <MediaField
          label="Legenda"
          placeholder="Legenda: o que a foto mostra"
          value={block.caption ?? ''}
          onChange={(event) => onPatch({ caption: event.target.value })}
          onEnter={onEnter}
          maxLength={200}
          disabled={disabled}
        />
        <MediaField
          label="Crédito"
          placeholder="Crédito — ex.: Foto: Divulgação/UFFS"
          value={block.credit ?? ''}
          onChange={(event) => onPatch({ credit: event.target.value })}
          onEnter={onEnter}
          maxLength={120}
          disabled={disabled}
        />
        <MediaField
          label="Texto alternativo"
          placeholder="Texto alternativo: descreva a foto para quem não a vê"
          value={block.alt ?? ''}
          onChange={(event) => onPatch({ alt: event.target.value })}
          onEnter={onEnter}
          maxLength={200}
          disabled={disabled}
        />
      </div>
    </figure>
  )
}

/**
 * Vídeo do YouTube pelo link. Aceita o link assim que ele é colado; o Enter só
 * é preciso quando o link foi digitado, e é nele que um link errado é avisado.
 */
export function VideoBlock({ block, disabled, onPatch, onEnter }) {
  const fieldId = useId()
  const [draft, setDraft] = useState(block.url ?? '')
  const [error, setError] = useState(null)
  const videoId = youtubeId(block.url)

  function accept(value) {
    const id = youtubeId(value)
    if (!id) {
      setError(
        'Esse link não é de um vídeo do YouTube. Copie o endereço da página do vídeo ou o link de “Compartilhar”.',
      )
      return
    }
    setError(null)
    onPatch({ url: youtubeWatchUrl(id) })
  }

  if (!videoId) {
    return (
      <div className="space-y-1">
        <label htmlFor={fieldId} className="visually-hidden">
          Link do vídeo do YouTube
        </label>
        {/* `text`, e não `url`: um link pela metade dispararia a validação
            nativa e travaria o botão Salvar da notícia inteira. */}
        <input
          id={fieldId}
          type="text"
          inputMode="url"
          className="form-control"
          placeholder="Cole o link do vídeo do YouTube"
          value={draft}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-erro` : undefined}
          onChange={(event) => {
            setDraft(event.target.value)
            setError(null)
            if (youtubeId(event.target.value)) accept(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
            event.preventDefault()
            accept(draft)
          }}
        />
        {error ? <FieldError id={`${fieldId}-erro`}>{error}</FieldError> : null}
      </div>
    )
  }

  return (
    <figure className="m-0">
      <VideoEmbed videoId={videoId} title={block.caption} />
      <div className="mt-2">
        <MediaField
          label="Legenda do vídeo"
          placeholder="Legenda: sobre o que é o vídeo"
          value={block.caption ?? ''}
          onChange={(event) => onPatch({ caption: event.target.value })}
          onEnter={onEnter}
          maxLength={200}
          disabled={disabled}
        />
      </div>
    </figure>
  )
}
