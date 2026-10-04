import { useEffect } from 'react'
import { activateVLibras, setVLibrasVisible } from '@/lib/vlibras'

/**
 * Liga e desliga o VLibras conforme a preferência do leitor.
 *
 * Não pinta nada: todo o DOM do plugin vive no `<body>`, fora da árvore do
 * React — ver `src/lib/vlibras.js` para o porquê.
 */
export function VLibrasWidget({ enabled }) {
  useEffect(() => {
    setVLibrasVisible(enabled)
    if (enabled) activateVLibras()
  }, [enabled])

  return null
}
