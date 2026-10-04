import { useEffect, useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Campos de formulário.
 *
 * `.form-control` do Bootstrap já traz foco, estado desabilitado e — junto de
 * `.is-invalid` — o realce de erro. Nada disso precisa ser reescrito aqui.
 */
export function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={cn('form-control', props['aria-invalid'] && 'is-invalid', className)}
      {...props}
    />
  )
}

export function Textarea({ className, rows = 5, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cn('form-control', props['aria-invalid'] && 'is-invalid', className)}
      {...props}
    />
  )
}

function fitHeight(element) {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

/**
 * Área de texto que cresce com o conteúdo, sem barra de rolagem própria.
 *
 * Não leva `.form-control`: é a base dos campos sem moldura do editor de
 * notícia, em que o texto aparece como vai ficar na página e não dentro de uma
 * caixa. `field-sizing: content` faria o mesmo só com CSS, mas ainda não chega
 * a todos os navegadores. A altura é recalculada quando o texto muda e quando
 * a largura muda, que é quando as linhas quebram em outro ponto.
 */
export function AutosizeTextarea({ value, rows = 1, ...props }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    fitHeight(ref.current)
  }, [value])

  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined

    let width = element.offsetWidth
    const observer = new ResizeObserver(() => {
      // Mudar a altura também dispara o observador; só a largura interessa.
      if (element.offsetWidth === width) return
      width = element.offsetWidth
      fitHeight(element)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return <textarea ref={ref} rows={rows} value={value} {...props} />
}
