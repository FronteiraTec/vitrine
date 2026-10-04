/**
 * O `index.html` construído pelo Vite — a casca em que as páginas de notícia
 * recebem o `<head>` escrito no servidor.
 *
 * No docker-compose ele mora no container do Nginx, e a API o busca por HTTP
 * (`SHELL_URL=http://web/index.html`): os nomes em `assets/` levam o hash do
 * build, então a casca precisa vir do build que está NO AR, não de uma cópia.
 * Em desenvolvimento, sem `SHELL_URL`, lê `dist/index.html` do disco.
 *
 * Cache de cinco minutos: curto o bastante para um deploy novo aparecer
 * rápido, longo o bastante para não pedir o arquivo a cada visita.
 */
import { readFile } from 'node:fs/promises'
import { config } from '../config.js'

const TTL_MS = 5 * 60 * 1000

let cache = null
let cachedAt = 0
let override

/** Para o `npm run seo`: fixa a casca (ou `null`, para simular a falta dela). */
export function setShellForTests(html) {
  override = html
}

export async function loadShell() {
  if (override !== undefined) return override

  const now = Date.now()
  if (cache && now - cachedAt < TTL_MS) return cache

  if (config.shellUrl) {
    try {
      const response = await fetch(config.shellUrl, { signal: AbortSignal.timeout(5000) })
      if (response.ok) {
        cache = await response.text()
        cachedAt = now
        return cache
      }
    } catch (error) {
      console.error('[seo] não foi possível buscar a casca em', config.shellUrl, '-', error.message)
    }
  }

  try {
    cache = await readFile(config.shellFile, 'utf8')
    cachedAt = now
    return cache
  } catch {
    // Sem casca a página não monta; quem chama responde 503. Mantém a última
    // casca boa, se houver, em vez de esquecê-la.
    return cache
  }
}
