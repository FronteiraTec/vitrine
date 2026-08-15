import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/** Atrasa a propagação de um valor — usado nos campos de busca. */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

/**
 * Media query reativa. `useSyncExternalStore` lê o valor durante a renderização
 * e reassina quando a consulta muda, sem estado espelhado em efeito.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener('change', onChange)
      return () => mediaQuery.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * Metadados da página: title, description e Open Graph.
 * Como a aplicação é SPA, as tags são atualizadas no cliente a cada rota — o
 * suficiente para navegadores e para os crawlers que executam JavaScript.
 * Para pré-renderização completa, ver a seção de SEO no README.
 */
export function useDocumentMeta({ title, description, image, url, type = 'website' } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} · Vitrine` : 'Vitrine — Catálogo de iniciativas institucionais'
    document.title = fullTitle

    const canonical = url ?? window.location.href
    const tags = [
      ['name', 'description', description],
      ['property', 'og:title', fullTitle],
      ['property', 'og:description', description],
      ['property', 'og:type', type],
      ['property', 'og:url', canonical],
      ['property', 'og:image', image],
      ['name', 'twitter:title', fullTitle],
      ['name', 'twitter:description', description],
      ['name', 'twitter:image', image],
    ]

    for (const [attribute, key, value] of tags) {
      if (!value) continue
      let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, key)
        document.head.appendChild(element)
      }
      element.setAttribute('content', value)
    }

    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', canonical)
  }, [title, description, image, url, type])
}

/**
 * Injeta (e remove) um bloco JSON-LD. Dá aos buscadores a descrição
 * estruturada da iniciativa, além das meta tags.
 */
export function useStructuredData(data) {
  useEffect(() => {
    if (!data) return undefined
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(data)
    document.head.appendChild(script)
    return () => script.remove()
  }, [data])
}
