/**
 * Upload e remoção de imagens.
 *
 * Os arquivos vão para o volume `arquivos`, que o Nginx serve em
 * `/arquivos/<bucket>/<caminho>`. A AUTORIZAÇÃO continua nas policies de
 * `storage.objects` (migrations 0004–0006): a API grava o registro do arquivo
 * com o papel de quem enviou, e só se o RLS aceitar o arquivo vai para o disco.
 *
 * O tipo do arquivo é lido dos PRIMEIROS BYTES, não do nome nem do cabeçalho
 * que o navegador mandou — ambos são escolhidos por quem envia.
 */
import { randomBytes } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { requireSession } from '../auth/sessions.js'
import { config } from '../config.js'
import { badRequest, forbidden, HttpError, notFound, publicOrigin } from '../http.js'

export const storageRouter = Router()

/** Teto do maior bucket. O limite de cada um é conferido depois, com o bucket em mãos. */
const MAX_UPLOAD = 5 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD, files: 1, fields: 4 },
})

const EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

/** Tipo real pela assinatura do arquivo. `null` quando não é imagem conhecida. */
export function sniffImage(buffer) {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (buffer.toString('ascii', 4, 8) === 'ftyp' && /^avi[fs]$/.test(buffer.toString('ascii', 8, 12))) {
    return 'image/avif'
  }
  // SVG é texto: aceita só se o documento é de fato um <svg> (com ou sem
  // prólogo XML e comentários antes).
  // `trimStart` também remove a marca de ordem de bytes (U+FEFF) do início.
  const head = buffer.toString('utf8', 0, Math.min(buffer.length, 1024)).trimStart()
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) {
    return 'image/svg+xml'
  }
  return null
}

const SEGMENT = /^[a-z0-9][a-z0-9_-]{0,63}$/i

/** Pasta pedida pelo cliente (`galeria`, ou o id do usuário nos avatares). */
function safeFolder(value) {
  const parts = String(value ?? '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length > 3 || parts.some((part) => !SEGMENT.test(part))) throw badRequest('Pasta inválida.')
  return parts.join('/')
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Caminho absoluto no volume — e a garantia de que não escapa dele. */
function diskPath(bucket, name) {
  const root = resolve(config.uploads.dir, bucket)
  const target = resolve(root, name)
  if (!target.startsWith(root + sep)) throw badRequest('Caminho inválido.')
  return target
}

function publicUrl(request, bucket, name) {
  const encoded = name.split('/').map(encodeURIComponent).join('/')
  return `${publicOrigin(request)}${config.uploads.publicPath}/${bucket}/${encoded}`
}

storageRouter.post('/arquivos/:bucket', requireSession, (request, response, next) => {
  upload.single('file')(request, response, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      next(new HttpError(413, 'Arquivo muito grande. O limite é 5 MB.', 'too_large'))
      return
    }
    next(error)
  })
}, async (request, response) => {
  const file = request.file
  if (!file) throw badRequest('Selecione um arquivo.')

  const bucketId = String(request.params.bucket)
  const folder = safeFolder(request.body?.folder)

  const result = await request.db.tx(async (client) => {
    const { rows } = await client.query(
      'select id, file_size_limit, allowed_mime_types from storage.buckets where id = $1',
      [bucketId],
    )
    const bucket = rows[0]
    if (!bucket) throw notFound('Destino de upload desconhecido.')

    const type = sniffImage(file.buffer)
    if (!type || (bucket.allowed_mime_types && !bucket.allowed_mime_types.includes(type))) {
      throw badRequest(
        bucket.allowed_mime_types?.includes('image/svg+xml')
          ? 'Formato não suportado. Use JPG, PNG, WebP, AVIF ou SVG.'
          : 'Formato não suportado. Use JPG, PNG, WebP ou AVIF.',
      )
    }
    if (bucket.file_size_limit && file.size > bucket.file_size_limit) {
      const limit = Math.round(bucket.file_size_limit / 1024 / 1024)
      throw new HttpError(413, `Arquivo muito grande. O limite é ${limit} MB.`, 'too_large')
    }

    const base = slugify(String(file.originalname ?? '').replace(/\.[^.]+$/, '')) || 'imagem'
    const unique = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`
    const name = `${folder ? `${folder}/` : ''}${base}-${unique}.${EXTENSION[type]}`

    // O registro vem ANTES do arquivo: se a policy recusar, nada chega ao disco.
    await client
      .query(
        `insert into storage.objects (bucket_id, name, metadata)
         values ($1, $2, jsonb_build_object('size', $3::bigint, 'mimetype', $4::text))`,
        [bucketId, name, file.size, type],
      )
      .catch((error) => {
        if (error?.code === '42501') throw forbidden('Você não tem permissão para enviar arquivos para este destino.')
        throw error
      })

    const target = diskPath(bucketId, name)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, file.buffer, { flag: 'wx' })

    return { url: publicUrl(request, bucketId, name), path: name, bucket: bucketId }
  })

  response.status(201).json(result)
})

/**
 * Remove um arquivo. O RLS decide (quem enviou, revisor ou administrador); sem
 * permissão, nada é apagado e a resposta é 404 — a limpeza de arquivo é
 * silenciosa no painel de propósito, e não deve impedir ninguém de salvar.
 */
storageRouter.delete('/arquivos/:bucket', requireSession, async (request, response) => {
  const bucketId = String(request.params.bucket)
  const name = String(request.body?.path ?? request.query.path ?? '')
  if (!name || name.split('/').some((part) => !part || part === '..' || part === '.')) {
    throw badRequest('Caminho inválido.')
  }
  const target = diskPath(bucketId, name)

  const removed = await request.db.tx(async (client) => {
    const { rows } = await client.query(
      'delete from storage.objects where bucket_id = $1 and name = $2 returning id',
      [bucketId, name],
    )
    if (!rows.length) return false
    await unlink(target).catch((error) => {
      if (error?.code !== 'ENOENT') throw error
    })
    return true
  })

  if (!removed) throw notFound('Arquivo não encontrado ou sem permissão para removê-lo.')
  response.status(204).end()
})

