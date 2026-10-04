import { useSyncExternalStore } from 'react'
import {
  getPreferences,
  getServerPreferences,
  setPreferences,
  stepFontScale,
  subscribe,
} from '@/lib/a11y'

/**
 * Preferências de acessibilidade, reativas em qualquer ponto da árvore.
 *
 * Store externo em vez de Context: as preferências vivem no `<html>` e no
 * `localStorage`, não no React. Um provider obrigaria a envolver a aplicação
 * só para distribuir um valor que o CSS já lê sozinho, e re-renderizaria a
 * vitrine inteira a cada clique em "A+".
 */
export function useAccessibilityPreferences() {
  const preferences = useSyncExternalStore(subscribe, getPreferences, getServerPreferences)

  return {
    preferences,
    set: setPreferences,
    increaseFont: () => setPreferences({ fontScale: stepFontScale(preferences.fontScale, 1) }),
    decreaseFont: () => setPreferences({ fontScale: stepFontScale(preferences.fontScale, -1) }),
    resetFont: () => setPreferences({ fontScale: 'base' }),
    toggleContrast: () =>
      setPreferences({ contrast: preferences.contrast === 'high' ? 'normal' : 'high' }),
    toggleMotion: () =>
      setPreferences({ motion: preferences.motion === 'reduced' ? 'system' : 'reduced' }),
  }
}
