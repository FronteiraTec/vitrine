/**
 * Senhas em bcrypt, custo 10 — o mesmo formato do Supabase. Contas importadas
 * de lá entram com o hash como está e continuam entrando com a senha antiga.
 */
import bcrypt from 'bcryptjs'
import { badRequest } from '../http.js'

export const MIN_PASSWORD = 8
const COST = 10

/*
 * Hash de uma senha qualquer, calculado uma vez. Login com e-mail inexistente
 * compara contra ele: sem isso a resposta voltaria em 1 ms em vez de ~60 ms, e
 * o tempo de resposta diria quais e-mails têm conta.
 */
const DUMMY_HASH = bcrypt.hashSync('senha-inexistente-para-equalizar-o-tempo', COST)

/** Recusa o que o bcrypt não guardaria inteiro: ele ignora o que passa de 72 bytes. */
export function validatePassword(password) {
  const value = String(password ?? '')
  if (value.length < MIN_PASSWORD) {
    throw badRequest(`A senha deve ter no mínimo ${MIN_PASSWORD} caracteres.`)
  }
  if (Buffer.byteLength(value, 'utf8') > 72) {
    throw badRequest('A senha deve ter no máximo 72 caracteres.')
  }
  return value
}

export function hashPassword(password) {
  return bcrypt.hash(password, COST)
}

/** Compara mesmo sem hash, para o tempo não denunciar contas inexistentes. */
export async function verifyPassword(password, hash) {
  const ok = await bcrypt.compare(String(password ?? ''), hash || DUMMY_HASH)
  return Boolean(hash) && ok
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function isEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && value.length <= 254
}
