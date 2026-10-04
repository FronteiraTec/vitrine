/**
 * Limite de tentativas em memória, por janela fixa.
 *
 * Basta porque a API roda em UM processo. Se um dia houver réplicas atrás de
 * um balanceador, cada uma teria a sua contagem — aí o lugar disto é o Redis,
 * ou o `limit_req` do Nginx, que já protege as rotas de login como primeira
 * barreira (ver docker/web/nginx.conf).
 */
export function createLimiter({ windowMs, max }) {
  const hits = new Map()

  // Limpeza periódica: sem ela, cada IP que passou uma vez ficaria no mapa.
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key)
  }, windowMs)
  timer.unref()

  return {
    /** Conta uma tentativa. Devolve `false` quando a chave passou do limite. */
    hit(key) {
      const now = Date.now()
      const entry = hits.get(key)
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs })
        return true
      }
      entry.count += 1
      return entry.count <= max
    },
    /** Já está bloqueada? Não conta tentativa. */
    blocked(key) {
      const entry = hits.get(key)
      return Boolean(entry && entry.resetAt > Date.now() && entry.count >= max)
    },
    reset(key) {
      hits.delete(key)
    },
  }
}
