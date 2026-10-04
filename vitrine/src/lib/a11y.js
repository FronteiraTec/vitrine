/**
 * Preferências de acessibilidade do leitor.
 *
 * Três decisões que valem explicar:
 *
 * 1. As preferências são gravadas como ATRIBUTOS no `<html>`, não como classes
 *    nem como estado do React. O CSS resolve tudo a partir daí, então nenhum
 *    componente precisa saber que existe alto contraste — e o painel
 *    administrativo, que não monta este módulo, simplesmente não é afetado.
 *
 * 2. O vocabulário (chave do storage e nomes dos atributos) é repetido uma vez
 *    em `index.html`, num script que roda antes do bundle. É duplicação
 *    consciente: sem ela o leitor que escolheu alto contraste veria o tema
 *    claro piscar em toda navegação. Mexeu aqui, mexa lá.
 *
 * 3. Nada neste arquivo toca `window` no topo. O `npm run smoke` renderiza as
 *    páginas fora do navegador, e um `localStorage` solto quebraria o build.
 */

export const STORAGE_KEY = 'vitrine:acessibilidade'

/**
 * Escala tipográfica. Os valores multiplicam apenas os tokens de TEXTO
 * (`--text-*`), nunca espaçamentos — ver `src/index.css`. É a diferença entre
 * ampliar o texto e dar zoom na página: aqui a grade, as imagens e as áreas de
 * toque continuam do mesmo tamanho, e o layout não se reorganiza sozinho.
 *
 * 1.45 no topo dá ~200% de corpo somado ao zoom de 140% do navegador, que é a
 * folga que o critério 1.4.4 do WCAG pede sem perda de conteúdo.
 */
export const FONT_SCALES = [
  { value: 'base', label: 'Padrão', short: 'A', scale: 1 },
  { value: 'lg', label: 'Médio', short: 'A', scale: 1.125 },
  { value: 'xl', label: 'Grande', short: 'A', scale: 1.25 },
  { value: 'xxl', label: 'Muito grande', short: 'A', scale: 1.45 },
]

/** Velocidades da leitura em voz alta. */
export const SPEECH_RATES = [0.75, 1, 1.25, 1.5, 2]

export const DEFAULT_PREFERENCES = Object.freeze({
  fontScale: 'base',
  contrast: 'normal',
  motion: 'system',
  libras: false,
  speechRate: 1,
})

/* -------------------------------------------------------------------------- */
/* Leitura e gravação                                                          */
/* -------------------------------------------------------------------------- */

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/** Descarta valor fora do vocabulário em vez de deixá-lo virar atributo. */
function sanitize(raw) {
  const value = raw && typeof raw === 'object' ? raw : {}
  const fontScale = FONT_SCALES.some((item) => item.value === value.fontScale)
    ? value.fontScale
    : DEFAULT_PREFERENCES.fontScale

  return {
    fontScale,
    contrast: value.contrast === 'high' ? 'high' : 'normal',
    motion: value.motion === 'reduced' ? 'reduced' : 'system',
    libras: value.libras === true,
    speechRate: SPEECH_RATES.includes(value.speechRate)
      ? value.speechRate
      : DEFAULT_PREFERENCES.speechRate,
  }
}

export function readPreferences() {
  if (!isBrowser()) return DEFAULT_PREFERENCES
  try {
    return sanitize(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}'))
  } catch {
    // Modo privativo, storage cheio ou JSON corrompido: o padrão é uma resposta
    // perfeitamente boa, e derrubar a página por causa disso não é.
    return DEFAULT_PREFERENCES
  }
}

/**
 * Espelha as preferências no `<html>`.
 *
 * `motion: 'system'` REMOVE o atributo em vez de gravar um valor. Assim a
 * `@media (prefers-reduced-motion)` do sistema operacional volta a mandar —
 * gravar `data-motion="system"` exigiria uma regra CSS a mais para dizer a
 * mesma coisa que a ausência do atributo já diz.
 */
export function applyPreferences(preferences) {
  if (!isBrowser()) return
  const root = document.documentElement

  root.setAttribute('data-font-scale', preferences.fontScale)
  root.setAttribute('data-contrast', preferences.contrast)

  /*
   * O alto contraste liga junto o tema escuro do Bootstrap.
   *
   * Não é enfeite: `data-bs-theme="dark"` faz o próprio Bootstrap recolorir
   * cartões, formulários, tabelas, menus e bordas. Sem ele, cada componente
   * teria de ser sobrescrito à mão no SCSS — e o primeiro componente novo que
   * alguém usasse sairia branco no meio da página preta. Assim o trabalho do
   * projeto se resume a empurrar o contraste até AAA, e não a reconstruir um
   * tema escuro inteiro.
   */
  if (preferences.contrast === 'high') {
    root.setAttribute('data-bs-theme', 'dark')
  } else {
    root.removeAttribute('data-bs-theme')
  }

  if (preferences.motion === 'reduced') {
    root.setAttribute('data-motion', 'reduced')
  } else {
    root.removeAttribute('data-motion')
  }
}

/* -------------------------------------------------------------------------- */
/* Store — fonte única, consumida por `useSyncExternalStore`                    */
/* -------------------------------------------------------------------------- */

let snapshot = null
const listeners = new Set()

/**
 * `useSyncExternalStore` compara o retorno por identidade: devolver um objeto
 * novo a cada chamada geraria laço infinito de renderização. Por isso o
 * snapshot é memorizado e só trocado quando algo muda de fato.
 */
export function getPreferences() {
  if (snapshot === null) snapshot = readPreferences()
  return snapshot
}

/** Snapshot do servidor: constante, como o `useSyncExternalStore` exige. */
export function getServerPreferences() {
  return DEFAULT_PREFERENCES
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setPreferences(patch) {
  const next = sanitize({ ...getPreferences(), ...patch })
  snapshot = next

  applyPreferences(next)

  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Sem storage a escolha vale para esta sessão e só. Melhor do que
      // recusar a mudança que o leitor acabou de pedir.
    }
  }

  for (const listener of listeners) listener()
  return next
}

/** Move a escala tipográfica um degrau. `step` é +1 ou -1. */
export function stepFontScale(current, step) {
  const index = FONT_SCALES.findIndex((item) => item.value === current)
  const next = Math.min(FONT_SCALES.length - 1, Math.max(0, (index < 0 ? 0 : index) + step))
  return FONT_SCALES[next].value
}
