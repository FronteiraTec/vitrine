import { useSyncExternalStore } from 'react'
import { getVLibrasServerStatus, getVLibrasStatus, subscribeVLibras } from '@/lib/vlibras'

/**
 * Estado do carregamento do VLibras: 'idle' | 'loading' | 'ready' | 'error'.
 * O painel usa isso para explicar o que houve em vez de deixar um botão ligado
 * sem nada acontecer na tela.
 */
export function useVLibrasStatus() {
  return useSyncExternalStore(subscribeVLibras, getVLibrasStatus, getVLibrasServerStatus)
}
