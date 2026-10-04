import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Compass, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton, InitiativeGridSkeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { Carousel, CarouselItem } from '@/components/ui/carousel'
import { InitiativeGrid } from '@/components/initiatives/InitiativeCard'
import { CategoryCard } from '@/components/categories/CategoryCard'
import { NewsGrid } from '@/components/news/NewsCard'
import { ConnectSection } from '@/components/home/ConnectSection'
import {
  useCategoriesWithCounts,
  useFeaturedInitiatives,
  useLatestNews,
} from '@/hooks/use-queries'
import { useDocumentMeta } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'
import { newsListPath } from '@/i18n/config'

function Hero() {
  const [term, setTerm] = useState('')
  const navigate = useNavigate()
  const { t } = useLocale()

  function handleSubmit(event) {
    event.preventDefault()
    const query = term.trim()
    navigate(query ? `/buscar?q=${encodeURIComponent(query)}` : '/buscar')
  }

  return (
    <section className="hero-gradient text-white position-relative overflow-hidden">
      {/* Anéis concêntricos discretos — motivo recorrente na comunicação da INNE */}
      <div
        className="pe-none hero-blob hero-blob-1"
        aria-hidden="true"
      />
      <div
        className="pe-none hero-blob hero-blob-2"
        aria-hidden="true"
      />

      <div className="container position-relative py-5">
        <div className="mw-3xl hero-reveal">
          <p className="mb-3 d-inline-flex align-items-center gap-2 rounded-pill bg-white opacity-25 px-2 py-1 fs-8 fw-medium text-uppercase">
            <Compass className="icon-sm" aria-hidden="true" />
            {t('home.hero.eyebrow')}
          </p>

          <h1 className="fw-bold fs-2 text-balance fs-sm-1">{t('home.hero.title')}</h1>

          <p className="mt-4 mw-xl fs-6 lh-base opacity-75 fs-sm-5">
            {t('home.hero.description')}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 mw-xl" role="search">
            <label htmlFor="hero-search" className="visually-hidden">
              {t('home.hero.searchLabel')}
            </label>
            <div className="d-flex flex-column gap-2 flex-sm-row">
              <div className="position-relative flex-grow-1">
                <Search
                  className="pe-none position-absolute top-50 start-0 icon translate-middle-y text-body-secondary"
                  aria-hidden="true"
                />
                <input
                  id="hero-search"
                  type="search"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder={t('home.hero.searchPlaceholder')}
                  className="text-body h-fx-13 w-100 rounded-2 bg-white py-2 pe-3 ps-5 fs-7 shadow-sm"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="bg-white text-primary h-fx-13 flex-shrink-0"
              >
                {t('home.hero.searchButton')}
              </Button>
            </div>
          </form>

          <div className="mt-4 d-flex flex-wrap align-items-center column-gap-3 row-gap-2 fs-7">
            <Link
              to="/buscar"
              className="d-inline-flex align-items-center gap-1 fw-medium opacity-100 hover-underline"
            >
              {t('common.exploreAll')}
              <ArrowRight className="icon" aria-hidden="true" />
            </Link>
            <Link
              to="/categorias"
              className="d-inline-flex align-items-center gap-1 opacity-75 hover-underline"
            >
              {t('home.hero.browseCategories')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 d-flex flex-column gap-3 flex-sm-row align-items-sm-end justify-content-sm-between">
      <div className="mw-2xl space-y-2">
        {eyebrow ? (
          <p className="text-primary fs-8 fw-semibold text-uppercase">{eyebrow}</p>
        ) : null}
        <h2 className="fw-bold fs-3 lh-sm fs-sm-3">{title}</h2>
        {description ? (
          <p className="text-body-secondary lh-base text-pretty">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

function CategoriesSection() {
  const { data, isPending, isError, refetch } = useCategoriesWithCounts()
  const { t } = useLocale()

  return (
    <section className="container py-5 py-sm-5">
      <SectionHeading
        eyebrow={t('home.categories.eyebrow')}
        title={t('home.categories.title')}
        description={t('home.categories.description')}
        action={
          <Button variant="outline" asChild className="flex-shrink-0">
            <Link to="/categorias">
              {t('common.seeAll')}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {isError ? (
        <ErrorState description={t('home.categories.error')} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="d-flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-fx-80 carousel-slide" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title={t('categories.emptyTitle')}
          description={t('categories.emptyDescription')}
        />
      ) : (
        /*
         * O trilho mostra o catálogo inteiro de categorias, e não os seis
         * primeiros: com rolagem lateral não há uma fileira para estourar, e
         * cortar a lista esconderia categorias sem motivo.
         */
        <Carousel label={t('home.categories.carouselLabel')} autoPlay>
          {data.map((category) => (
            <CarouselItem key={category.id}>
              <CategoryCard category={category} className="h-100" />
            </CarouselItem>
          ))}
        </Carousel>
      )}
    </section>
  )
}

function FeaturedSection() {
  const { data, isPending, isError, refetch } = useFeaturedInitiatives(6)
  const { t } = useLocale()

  return (
    <section className="bg-body-tertiary border border-top border-bottom">
      <div className="container py-5 py-sm-5">
        <SectionHeading
          eyebrow={t('home.featured.eyebrow')}
          title={t('home.featured.title')}
          description={t('home.featured.description')}
          action={
            <Button variant="outline" asChild className="flex-shrink-0">
              <Link to="/buscar">
                {t('common.seeEverything')}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        />

        {isError ? (
          <ErrorState description={t('home.featured.error')} onRetry={() => refetch()} />
        ) : isPending ? (
          <InitiativeGridSkeleton count={6} />
        ) : data.length === 0 ? (
          <EmptyState
            title={t('home.featured.emptyTitle')}
            description={t('home.featured.emptyDescription')}
          />
        ) : (
          <InitiativeGrid initiatives={data} />
        )}
      </div>
    </section>
  )
}

function NewsSection() {
  const { t, locale } = useLocale()
  // A home não tem endereço por idioma: cada notícia vem traduzida quando há
  // tradução no idioma do leitor, e no original quando não há.
  const { data, isPending, isError } = useLatestNews(3, { locale })

  // Diferente das outras seções, uma falha aqui não vira estado de erro na
  // tela: notícia é conteúdo complementar na home, e um bloco quebrado no meio
  // da página custaria mais do que a seção simplesmente não aparecer.
  if (isError || (!isPending && !data?.length)) return null

  return (
    <section className="container py-5 py-sm-5">
      <SectionHeading
        eyebrow={t('home.news.eyebrow')}
        title={t('home.news.title')}
        description={t('home.news.description')}
        action={
          <Button variant="outline" asChild className="flex-shrink-0">
            <Link to={newsListPath(locale)}>
              {t('common.seeAll')}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {isPending ? (
        <div className="d-grid grid-cols-1 gap-3 grid-cols-sm-2 grid-cols-lg-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-fx-80" />
          ))}
        </div>
      ) : (
        <NewsGrid items={data} />
      )}
    </section>
  )
}

export function HomePage() {
  const { t } = useLocale()
  useDocumentMeta({ description: t('home.metaDescription') })

  return (
    <>
      <Hero />
      <CategoriesSection />
      <FeaturedSection />
      <ConnectSection />
      <NewsSection />
    </>
  )
}
