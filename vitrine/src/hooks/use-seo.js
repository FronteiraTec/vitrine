import { useEffect, useMemo } from 'react'
import { useSiteSettings, useSiteSettingsQuery } from '@/hooks/use-queries'
import { DEFAULT_ROBOTS, metaTagList, resolveSite } from '@/lib/seo'

/**
 * Hooks de SEO da vitrine pública.
 *
 * O que estes hooks escrevem no `<head>` é calculado pelas MESMAS funções de
 * `src/lib/seo.js` que `server/src/seo/article.js` usa no servidor. Os dois lados
 * chegam ao mesmo resultado por construção, e não por disciplina de quem
 * mantém — servir descrição diferente para robô e para pessoa é justamente o
 * que caracteriza cloaking.
 *
 * Tudo que estes hooks criam é marcado com `data-seo`. É o que permite REMOVER
 * a tag quando ela deixa de valer: a implementação anterior só sabia criar e
 * sobrescrever, então ir de uma notícia com capa para outra sem capa mantinha o
 * `og:image` da anterior, e o link compartilhado saía com a foto errada.
 * As tags estáticas do `index.html` e as injetadas pela função também carregam
 * o atributo, então a limpeza alcança as três origens.
 */

const MANAGED = '[data-seo]'

/** Identidade do veículo: ambiente + o que o administrador configurou. */
export function useSite() {
  const settings = useSiteSettings()
  const { data: raw } = useSiteSettingsQuery()

  return useMemo(
    () =>
      resolveSite({
        // Logotipo do dado estruturado lê a coluna CRUA, e não o valor já
        // resolvido: `resolveSiteSettings` recua para o logo empacotado pelo
        // Vite, cujo nome tem hash de build e só existe depois de compilar. A
        // API não tem como saber esse nome, e as duas versões do
        // JSON-LD passariam a discordar no campo `publisher.logo`. Sem
        // logotipo cadastrado, o campo simplesmente não é declarado — nos dois
        // lados.
        logo: raw?.logo_url || undefined,
        // Sem `VITE_SITE_URL` a canônica cai na origem atual. Não é ideal para
        // produção — e o README pede a variável —, mas é melhor do que apontar
        // para `exemplo.com` em ambiente de pré-visualização.
        url:
          import.meta.env.VITE_SITE_URL ||
          (typeof window !== 'undefined' ? window.location.origin : undefined),
        name: settings.brandName,
        description: settings.footerDescription,
      }),
    [settings, raw],
  )
}

/**
 * Os metadados completos a partir do que a página informou.
 *
 * Quem já traz `canonical` é saída de um construtor de `src/lib/seo.js`
 * (`buildNewsMeta`, `buildNewsListMeta`) e vai como está — é o mesmo objeto
 * que o servidor escreve. As demais páginas informam só o que muda e o resto
 * é completado aqui.
 *
 * `path` é preferido a `url`: a canônica precisa ser o endereço de produção, e
 * não o da pré-visualização ou o que veio com parâmetros de campanha colados.
 */
function completeMeta(options, site) {
  if (options.canonical) return options

  const {
    title,
    description,
    image,
    imageAlt,
    path,
    url,
    type = 'website',
    robots = DEFAULT_ROBOTS,
    publishedTime,
    modifiedTime,
    author,
    section,
  } = options

  const canonical =
    url ??
    (path
      ? `${site.url}${path.startsWith('/') ? path : `/${path}`}`
      : typeof window !== 'undefined'
        ? `${site.url}${window.location.pathname}`
        : site.url)

  return {
    title,
    fullTitle: title ? `${title} · ${site.name}` : site.name,
    description: description || site.description,
    canonical,
    robots,
    type,
    image: image || null,
    imageAlt: imageAlt || null,
    siteName: site.name,
    locale: site.locale,
    publishedTime: publishedTime || null,
    modifiedTime: modifiedTime || null,
    author: author || null,
    section: section || null,
  }
}

/**
 * Metadados da página: título, descrição, canônica, Open Graph, Twitter Card
 * e `hreflang`.
 *
 * `null` deixa o `<head>` como está. É o que a página de notícia passa
 * enquanto carrega: o `<head>` que veio do servidor já é o certo, e trocá-lo
 * por um provisório — como era feito — apagava a canônica e o dado estruturado
 * justamente se a consulta do navegador falhasse.
 *
 * A dependência do efeito é o objeto serializado: os construtores montam
 * objetos novos a cada renderização, e comparar por identidade reescreveria o
 * `<head>` o tempo todo.
 */
export function useDocumentMeta(options) {
  const site = useSite()
  const key = options ? JSON.stringify(completeMeta(options, site)) : ''

  useEffect(() => {
    if (!key) return
    const meta = JSON.parse(key)

    document.title = meta.fullTitle

    const head = document.head
    for (const node of head.querySelectorAll(
      `meta${MANAGED}, link[rel="canonical"]${MANAGED}, link[rel="alternate"][hreflang]${MANAGED}`,
    )) {
      node.remove()
    }

    for (const [attribute, name, value] of metaTagList(meta)) {
      const node = document.createElement('meta')
      node.setAttribute(attribute, name)
      node.setAttribute('content', value)
      node.setAttribute('data-seo', '')
      head.appendChild(node)
    }

    const canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    canonical.setAttribute('href', meta.canonical)
    canonical.setAttribute('data-seo', '')
    head.appendChild(canonical)

    for (const alternate of meta.alternates ?? []) {
      const link = document.createElement('link')
      link.setAttribute('rel', 'alternate')
      link.setAttribute('hreflang', alternate.hreflang)
      link.setAttribute('href', alternate.href)
      link.setAttribute('data-seo', '')
      head.appendChild(link)
    }
  }, [key])
}

/**
 * Blocos JSON-LD da página. Aceita um objeto ou uma lista.
 *
 * `undefined` deixa os blocos como estão — mesmo papel do `null` em
 * `useDocumentMeta`, para a notícia que ainda carrega. `null` e lista vazia
 * LIMPAM: é o que uma página sem dado estruturado (ou uma notícia inexistente)
 * precisa.
 *
 * A dependência do efeito é o JSON serializado, e não o objeto: as páginas
 * montam o dado estruturado em linha, o que gera identidade nova a cada
 * renderização e faria o efeito derrubar e recriar os `<script>` sem parar.
 */
export function useStructuredData(data) {
  /*
   * A chave do efeito é a LISTA serializada, e não os blocos unidos por um
   * separador. `JSON.stringify` de um array de strings codifica a fronteira
   * entre os itens sem depender de nenhum caractere ser raro o bastante para
   * não aparecer dentro do JSON.
   */
  const key = useMemo(() => {
    if (data === undefined) return null
    const blocks = (Array.isArray(data) ? data : [data]).filter(Boolean)
    return JSON.stringify(blocks.map((block) => JSON.stringify(block)))
  }, [data])

  useEffect(() => {
    if (key === null) return undefined

    const head = document.head
    for (const node of head.querySelectorAll(`script[type="application/ld+json"]${MANAGED}`)) {
      node.remove()
    }

    const nodes = JSON.parse(key).map((json) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-seo', '')
      script.textContent = json
      head.appendChild(script)
      return script
    })

    return () => {
      for (const node of nodes) node.remove()
    }
  }, [key])
}
