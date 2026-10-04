import { api } from '@/lib/api'
import { ACCEPTED_IMAGE_TYPES, BUCKETS, MAX_IMAGE_BYTES } from '@/lib/constants'

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

/**
 * Envia uma imagem e devolve a URL pública. O servidor confere o tipo pelo
 * conteúdo do arquivo, o tamanho pelo limite do destino e a permissão pela
 * policy do banco — esta validação aqui é só para responder mais rápido.
 */
export async function uploadImage({ bucket = BUCKETS.INITIATIVES, folder = '', file }) {
  const validationError = validateImage(file, {
    maxBytes: bucket === BUCKETS.AVATARS ? 2 * 1024 * 1024 : MAX_IMAGE_BYTES,
  })
  if (validationError) throw new Error(validationError)

  const form = new FormData()
  form.append('folder', folder)
  form.append('file', file)
  return api.upload(`/arquivos/${bucket}`, form)
}

/**
 * Remove uma imagem a partir da sua URL pública. Falhas são silenciosas de
 * propósito: a limpeza do arquivo não deve impedir o usuário de salvar o
 * formulário (por exemplo, quando o arquivo já não existe mais).
 */
export async function removeImageByUrl(url, bucket = BUCKETS.INITIATIVES) {
  if (!url) return
  const marker = `/arquivos/${bucket}/`
  const index = url.indexOf(marker)
  if (index === -1) return

  const path = decodeURIComponent(url.slice(index + marker.length).split('?')[0])
  if (!path) return

  try {
    await api.delete(`/arquivos/${bucket}`, { path })
  } catch (error) {
    console.warn('Não foi possível remover a imagem:', error.message)
  }
}
