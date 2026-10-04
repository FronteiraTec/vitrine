import { Link, useSearchParams } from 'react-router-dom'
import { Languages, Newspaper, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { NewsGrid } from '@/components/news/NewsCard'
import { useLatestNews, useNewsLocales, useNewsSearch } from '@/hooks/use-queries'
import { useDebouncedValue } from '@/hooks/use-utils'
import { useDocumentMeta, useSite } from '@/hooks/use-seo'
import { LocaleScope, useLocale, usePageLanguages } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE, LOCALE_CODES, LOCALES, newsListPath, normalizeLocale } from '@/i18n/config'
import { buildNewsListMeta } from '@/lib/seo'

/** A lista em cada idioma — o seletor do cabeçalho troca entre elas. */
const LIST_PATHS = Object.fromEntries(LOCALE_CODES.map((code) => [code, newsListPath(code)]))

function ListSkeleton({ count = 6 }) {
  return (
    <div className="d-grid grid-cols-1 gap-3 grid-cols-sm-2 grid-cols-lg-3">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-fx-80" />
      ))}
    </div>
  )
}

/**
 * O corpo da lista, no idioma DELA (dentro de `LocaleScope`): em `/en/news`
 * os títulos, a busca e os avisos saem em inglês para qualquer leitor.
 */
function NewsListBody({ locale, q, onSearch, onPage, query, emptyTranslation, originals }) {
  const { t, rich, languageName } = useLocale()
  const { data, isPending, isError, error, refetch } = query
  const translated = locale !== DEFAULT_LOCALE

  return (
    <>
      <section className="border bg-body-tertiary border-bottom">
        <div className="container py-5 py-sm-5">
          <p className="text-primary mb-2 fs-8 fw-semibold text-uppercase">
            {t('news.list.eyebrow')}
          </p>
          <h1 className="fw-bold fs-3 lh-sm text-balance fs-sm-2">{t('news.list.title')}</h1>
          <p className="text-body-secondary mt-2 mw-2xl lh-base text-pretty">
            {t('news.list.description')}
          </p>

          {/* Numa lista traduzida, o leitor precisa saber que ela não é o
              acervo inteiro: só entra o que já existe no idioma. */}
          {translated ? (
            <p className="text-body-secondary mt-3 mw-2xl d-flex align-items-start gap-2 fs-7 text-pretty">
              <Languages className="mt-1 icon flex-shrink-0" aria-hidden="true" />
              <span>
                {rich(
                  'news.list.translatedOnly',
                  {
                    link: (text) => (
                      <Link
                        to={newsListPath(DEFAULT_LOCALE)}
                        hrefLang={LOCALES[DEFAULT_LOCALE].hreflang}
                        className="text-primary text-decoration-underline"
                      >
                        {text}
                      </Link>
                    ),
                  },
                  { language: languageName(locale) },
                )}
              </span>
            </p>
          ) : null}

          <div className="position-relative mt-4 mw-lg" role="search">
            <label htmlFor="news-search" className="visually-hidden">
              {t('news.list.searchLabel')}
            </label>
            <Search
              className="text-body-secondary pe-none position-absolute top-50 start-0 icon translate-middle-y"
              aria-hidden="true"
            />
            <Input
              id="news-search"
              type="search"
              value={q}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={t('news.list.searchPlaceholder')}
              className="h-fx-11 ps-5"
            />
          </div>
        </div>
      </section>

      <div className="container py-5">
        {isError ? (
          <ErrorState description={error?.message} onRetry={() => refetch()} />
        ) : isPending ? (
          <ListSkeleton />
        ) : data.items.length === 0 && emptyTranslation ? (
          /* Nenhuma notícia neste idioma ainda. A página não fica vazia: mostra
             as mais recentes no original, cada uma marcada como português — e
             sai do índice (`noindex`), porque o conteúdo dela não é inglês. */
          <>
            <EmptyState
              icon={Languages}
              title={t('news.list.noneInLanguageTitle', { language: languageName(locale) })}
              description={t('news.list.noneInLanguageDescription')}
            />
            {originals?.length ? (
              <section aria-labelledby="noticias-originais" className="mt-5">
                <h2 id="noticias-originais" className="fw-bold mb-4 fs-4">
                  {t('news.list.originalTitle')}
                </h2>
                <NewsGrid items={originals} />
              </section>
            ) : null}
          </>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={q ? t('news.list.emptySearchTitle') : t('news.list.emptyTitle')}
            description={
              q ? t('news.list.emptySearchDescription') : t('news.list.emptyDescription')
            }
          />
        ) : (
          <>
            <p className="text-body-secondary mb-4 fs-7" role="status">
              {t('news.list.count', { count: data.total })}
            </p>

            <NewsGrid items={data.items} />

            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              onPageChange={onPage}
              className="pt-5"
            />
          </>
        )}
      </div>
    </>
  )
}

/**
 * Listagem pública de notícias, num dos três idiomas: `/noticias`, `/en/news`
 * ou `/es/noticias`.
 *
 * O estado da busca e a página vivem na query string, como no restante da
 * vitrine: o resultado é compartilhável, sobrevive ao recarregar e o botão
 * "voltar" funciona.
 *
 * As listas traduzidas mostram SÓ o que existe no idioma. Misturar notícias em
 * português numa página declarada como inglesa é justamente o que o buscador
 * trata como versão falsa.
 */
export function NewsPage({ locale: requested = DEFAULT_LOCALE }) {
  const locale = normalizeLocale(requested)
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('pagina')) || 1)
  const debouncedTerm = useDebouncedValue(q)

  const query = useNewsSearch({ q: debouncedTerm, page, locale })
  const emptyTranslation =
    locale !== DEFAULT_LOCALE && !debouncedTerm && page === 1 && query.data?.total === 0
  const { data: originals } = useLatestNews(6, { ready: emptyTranslation })

  /*
   * `hreflang` e `noindex` dependem de quais idiomas têm notícia. Enquanto isso
   * não chega, o `<head>` que veio do servidor — que já sabe — fica como está.
   */
  const site = useSite()
  const locales = useNewsLocales()
  useDocumentMeta(
    locales.isPending
      ? null
      : buildNewsListMeta({ site, locale, available: locales.data ?? null }),
  )
  usePageLanguages(LIST_PATHS)

  function update(next, { resetPage = true } = {}) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === '' || value == null) merged.delete(key)
      else merged.set(key, String(value))
    }
    if (resetPage) merged.delete('pagina')
    setParams(merged, { replace: true })
  }

  return (
    <div lang={locale}>
      <LocaleScope locale={locale}>
        <NewsListBody
          locale={locale}
          q={q}
          onSearch={(value) => update({ q: value })}
          onPage={(next) => {
            update({ pagina: next }, { resetPage: false })
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          query={query}
          emptyTranslation={emptyTranslation}
          originals={originals}
        />
      </LocaleScope>
    </div>
  )
}
