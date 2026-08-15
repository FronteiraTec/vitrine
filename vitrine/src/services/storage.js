import { friendlyError, requireSupabase } from '@/lib/supabase'
import { ACCEPTED_IMAGE_TYPES, BUCKETS, MAX_IMAGE_BYTES } from '@/lib/constants'
import { slugify } from '@/lib/utils'

/** Valida antes de subir: evita gastar rede para receber 400 do servidor. */
export function validateImage(file, { maxBytes = MAX_IMAGE_BYTES } = {}) {
  if (!file) return 'Selecione um arquivo.'
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Formato não suportado. Use JPG, PNG, WebP ou AVIF.'
  }
  if (file.size > maxBytes) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). O limite é ${Math.round(
      maxBytes / 1024 / 1024,
    )} MB.`
  }
  return null
}

function extensionFor(file) {
  const fromName = file.name?.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  return file.type.split('/')[1] ?? 'jpg'
}

function buildPath({ folder, file }) {
  const base = slugify(file.name?.replace(/\.[^.]+$/, '') ?? 'imagem').slice(0, 40) || 'imagem'
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const name = `${base}-${unique}.${extensionFor(file)}`
  return folder ? `${folder}/${name}` : name
}

/**
 * Envia uma imagem e devolve a URL pública.
 * Os buckets são públicos para leitura (a vitrine é pública), mas a escrita
 * continua restrita por policy — ver `0004_storage.sql`.
 */
export async function uploadImage({ bucket = BUCKETS.INITIATIVES, folder = '', file }) {
  const validationError = validateImage(file, {
    maxBytes: bucket === BUCKETS.AVATARS ? 2 * 1024 * 1024 : MAX_IMAGE_BYTES,
  })
  if (validationError) throw new Error(validationError)

  const supabase = requireSupabase()
  const path = buildPath({ folder, file })

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw new Error(friendlyError(error))

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, path, bucket }
}

/**
 * Remove uma imagem a partir da sua URL pública. Falhas são silenciosas de
 * propósito: a limpeza do arquivo não deve impedir o usuário de salvar o
 * formulário (por exemplo, quando o arquivo já não existe mais).
 */
export async function removeImageByUrl(url, bucket = BUCKETS.INITIATIVES) {
  if (!url) return
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = url.indexOf(marker)
  if (index === -1) return

  const path = decodeURIComponent(url.slice(index + marker.length).split('?')[0])
  if (!path) return

  const supabase = requireSupabase()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) console.warn('Não foi possível remover a imagem do Storage:', error.message)
}
