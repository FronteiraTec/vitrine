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
import { useDocumentMeta } from '@/hooks/use-utils'

function Hero() {
  const [term, setTerm] = useState('')
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    const query = term.trim()
    navigate(query ? `/buscar?q=${encodeURIComponent(query)}` : '/buscar')
  }

  return (
    <section className="hero-gradient text-primary-foreground relative overflow-hidden">
      {/* Anéis concêntricos discretos — motivo recorrente na comunicação da INNE */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full border border-white/10 sm:-top-28 sm:-right-28 sm:size-[26rem]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full border border-white/[0.06] sm:-top-44 sm:-right-44 sm:size-[34rem]"
        aria-hidden="true"
      />

      <div className="container-page relative py-20 sm:py-28 lg:py-32">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.08em] uppercase">
            <Compass className="size-3.5" aria-hidden="true" />
            Catálogo institucional
          </p>

          <h1 className="font-display text-4xl leading-[1.08] text-balance-title sm:text-5xl lg:text-6xl">
            Conheça as iniciativas que transformam nossa instituição
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed opacity-80 sm:text-lg">
            Projetos, laboratórios, grupos de pesquisa, empresas juniores e programas de extensão
            reunidos em um catálogo público, aberto a quem quiser conhecer, colaborar ou fazer
            parte.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 max-w-xl" role="search">
            <label htmlFor="hero-search" className="sr-only">
              Pesquisar iniciativas
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="hero-search"
                  type="search"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Pesquisar por nome, área, tema…"
                  className="text-foreground focus-visible:ring-primary-foreground/40 h-13 w-full rounded-md bg-white py-3.5 pr-4 pl-11 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="bg-primary-foreground text-primary h-13 shrink-0 hover:bg-white/90"
              >
                Buscar
              </Button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              to="/buscar"
              className="inline-flex items-center gap-1.5 font-medium underline-offset-4 opacity-90 transition-opacity hover:opacity-100 hover:underline"
            >
              Explorar todas as iniciativas
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/categorias"
              className="inline-flex items-center gap-1.5 opacity-70 underline-offset-4 transition-opacity hover:opacity-100 hover:underline"
            >
              Navegar por categoria
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-2">
        {eyebrow ? (
          <p className="text-brand text-xs font-semibold tracking-[0.12em] uppercase">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-3xl leading-tight sm:text-[2rem]">{title}</h2>
        {description ? (
          <p className="text-muted-foreground leading-relaxed text-pretty">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

function CategoriesSection() {
  const { data, isPending, isError, refetch } = useCategoriesWithCounts()

  return (
    <section className="container-page py-16 sm:py-20">
      <SectionHeading
        eyebrow="Categorias"
        title="Por onde você quer começar?"
        description="Cada categoria reúne um tipo de iniciativa. Elas são definidas pela própria instituição e evoluem junto com o catálogo."
        action={
          <Button variant="outline" asChild className="shrink-0">
            <Link to="/categorias">
              Ver todas
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {isError ? (
        <ErrorState
          description="Não conseguimos carregar as categorias agora."
          onRetry={() => refetch()}
        />
      ) : isPending ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-80 w-[82%] shrink-0 sm:w-[46%] lg:w-[31.5%]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria cadastrada"
          description="Assim que a administração criar as primeiras categorias, elas aparecerão aqui."
        />
      ) : (
        /*
         * O trilho mostra o catálogo inteiro de categorias, e não os seis
         * primeiros: com rolagem lateral não há uma fileira para estourar, e
         * cortar a lista esconderia categorias sem motivo.
         */
        <Carousel label="Categorias do catálogo" autoPlay>
          {data.map((category) => (
            <CarouselItem key={category.id}>
              <CategoryCard category={category} className="h-full" />
            </CarouselItem>
          ))}
        </Carousel>
      )}
    </section>
  )
}

function FeaturedSection() {
  const { data, isPending, isError, refetch } = useFeaturedInitiatives(6)

  return (
    <section className="bg-muted/50 border-border border-y">
      <div className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="Publicadas recentemente"
          title="Iniciativas em destaque"
          description="As adições mais recentes ao catálogo, de laboratórios de pesquisa a programas que atendem a comunidade."
          action={
            <Button variant="outline" asChild className="shrink-0">
              <Link to="/buscar">
                Ver tudo
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        />

        {isError ? (
          <ErrorState
            description="Não conseguimos carregar as iniciativas agora."
            onRetry={() => refetch()}
          />
        ) : isPending ? (
          <InitiativeGridSkeleton count={6} />
        ) : data.length === 0 ? (
          <EmptyState
            title="Nenhuma iniciativa publicada ainda"
            description="O catálogo está pronto — assim que o primeiro conteúdo for publicado, ele aparece aqui."
          />
        ) : (
          <InitiativeGrid initiatives={data} />
        )}
      </div>
    </section>
  )
}

function NewsSection() {
  const { data, isPending, isError } = useLatestNews(3)

  // Diferente das outras seções, uma falha aqui não vira estado de erro na
  // tela: notícia é conteúdo complementar na home, e um bloco quebrado no meio
  // da página custaria mais do que a seção simplesmente não aparecer.
  if (isError || (!isPending && !data?.length)) return null

  return (
    <section className="container-page py-16 sm:py-20">
      <SectionHeading
        eyebrow="Notícias"
        title="Últimas novidades"
        description="Comunicados, editais e avanços das iniciativas da instituição."
        action={
          <Button variant="outline" asChild className="shrink-0">
            <Link to="/noticias">
              Ver todas
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {isPending ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-80" />
          ))}
        </div>
      ) : (
        <NewsGrid items={data} />
      )}
    </section>
  )
}

export function HomePage() {
  useDocumentMeta({
    description:
      'Catálogo público de projetos, laboratórios, grupos de pesquisa, empresas juniores e iniciativas da instituição.',
  })

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
