import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  Phone,
  Share2,
} from 'lucide-react'
import { Image } from '@/components/ui/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { SectionDivider } from '@/components/ui/separator'
import { Skeleton, InitiativeGridSkeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { InitiativeCard } from '@/components/initiatives/InitiativeCard'
import { LinkIcon } from '@/components/initiatives/LinkIcon'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { usePublishedInitiative, useRelatedInitiatives } from '@/hooks/use-queries'
import { useDocumentMeta, useStructuredData } from '@/hooks/use-utils'
import { displayUrl, formatDate, safeExternalUrl, truncate } from '@/lib/utils'
import { NotFoundPage } from './NotFoundPage'

function Breadcrumb({ initiative }) {
  return (
    <nav aria-label="Trilha de navegação" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 opacity-80">
        <li>
          <Link to="/" className="transition-opacity hover:opacity-100 hover:underline">
            Início
          </Link>
        </li>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
        <li>
          <Link
            to={`/categoria/${initiative.category?.slug}`}
            className="transition-opacity hover:opacity-100 hover:underline"
          >
            {initiative.category?.name}
          </Link>
        </li>
      </ol>
    </nav>
  )
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">
        <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </dt>
        <dd className="text-sm break-words">{children}</dd>
      </div>
    </div>
  )
}

function ShareButton({ initiative }) {
  async function handleShare() {
    const url = window.location.href
    const shareData = {
      title: initiative.name,
      text: initiative.short_description ?? '',
      url,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (error) {
        // Cancelar o diálogo nativo não é um erro a ser reportado.
        if (error?.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado para a área de transferência.')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Share2 aria-hidden="true" />
      Compartilhar
    </Button>
  )
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-[38vh] max-h-96 min-h-64 w-full rounded-none" />
      <div className="container-page py-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  )
}

export function InitiativeDetailPage() {
  const { slug } = useParams()
  const { data: initiative, isPending, isError, error, refetch } = usePublishedInitiative(slug)
  const { data: related, isPending: relatedPending } = useRelatedInitiatives(
    initiative?.category_id,
    initiative?.id,
  )

  const description = initiative?.short_description ?? truncate(initiative?.description, 160)

  useDocumentMeta({
    title: initiative?.name,
    description,
    image: initiative?.cover_image,
    type: 'article',
  })

  const structuredData = useMemo(() => {
    if (!initiative) return null
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: initiative.name,
      description,
      url: window.location.href,
      image: initiative.cover_image ?? undefined,
      email: initiative.email ?? undefined,
      telephone: initiative.phone ?? undefined,
      address: initiative.city
        ? {
            '@type': 'PostalAddress',
            addressLocality: initiative.city,
            addressRegion: initiative.state ?? undefined,
          }
        : undefined,
      member: (initiative.team ?? []).map((entry) => ({
        '@type': 'Person',
        name: entry.person?.name,
        jobTitle: entry.role ?? entry.person?.role ?? undefined,
      })),
    }
  }, [initiative, description])

  useStructuredData(structuredData)

  if (isPending) return <DetailSkeleton />

  if (isError) {
    return (
      <div className="container-page py-20">
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!initiative) {
    return (
      <NotFoundPage
        title="Iniciativa não encontrada"
        description="Esta iniciativa não existe, ainda não foi publicada ou saiu da vitrine."
      />
    )
  }

  const website = safeExternalUrl(initiative.website)
  const location = [initiative.location, initiative.campus].filter(Boolean).join(' · ')
  const cityState = [initiative.city, initiative.state].filter(Boolean).join(' — ')
  const hasContact = Boolean(location || cityState || initiative.email || initiative.phone || website)
  const gallery = (initiative.gallery ?? []).filter(Boolean)

  return (
    <article>
      {/* Banner ---------------------------------------------------------- */}
      <header className="bg-primary text-primary-foreground relative">
        {initiative.cover_image ? (
          <>
            {/* O wrapper é absoluto: a altura vem do cabeçalho, não de proporção. */}
            <Image
              src={initiative.cover_image}
              alt=""
              eager
              ratio=""
              wrapperClassName="absolute inset-0 bg-primary"
              className="opacity-35"
            />
            <div
              className="from-primary via-primary/85 absolute inset-0 bg-linear-to-t to-transparent"
              aria-hidden="true"
            />
          </>
        ) : null}

        <div className="container-page relative flex min-h-64 flex-col justify-end py-10 sm:py-14">
          <Breadcrumb initiative={initiative} />

          <div className="mt-5 max-w-3xl space-y-4">
            {initiative.category ? (
              <Link
                to={`/categoria/${initiative.category.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold tracking-[0.06em] uppercase transition-colors hover:bg-white/20"
              >
                <CategoryIcon name={initiative.category.icon} className="size-3.5" />
                {initiative.category.name}
              </Link>
            ) : null}

            <h1 className="font-display text-3xl leading-[1.1] text-balance-title sm:text-5xl">
              {initiative.name}
            </h1>

            {initiative.short_description ? (
              <p className="max-w-2xl text-base leading-relaxed opacity-85 sm:text-lg">
                {initiative.short_description}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {/* Corpo ------------------------------------------------------------ */}
      <div className="container-page py-12 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div className="min-w-0 space-y-12">
            {initiative.description ? (
              <section className="space-y-5">
                <SectionDivider label="Sobre" />
                <div className="space-y-4 leading-[1.75] text-pretty">
                  {initiative.description.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {initiative.areas?.length ? (
              <section className="space-y-5">
                <SectionDivider label="Áreas de atuação" />
                <ul className="flex flex-wrap gap-2">
                  {initiative.areas.map((area) => (
                    <li key={area}>
                      <Badge variant="brand">{area}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {initiative.team?.length ? (
              <section className="space-y-5">
                <SectionDivider label="Equipe e responsáveis" />
                <ul className="grid gap-3 sm:grid-cols-2">
                  {initiative.team.map((entry) => (
                    <li
                      key={entry.person?.id}
                      className="border-border bg-card flex items-center gap-3 rounded-lg border p-4"
                    >
                      <Avatar src={entry.person?.photo_url} name={entry.person?.name} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{entry.person?.name}</p>
                        {entry.role || entry.person?.role ? (
                          <p className="text-muted-foreground truncate text-xs">
                            {entry.role ?? entry.person?.role}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {gallery.length ? (
              <section className="space-y-5">
                <SectionDivider label="Galeria" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {gallery.map((url) => (
                    <Image
                      key={url}
                      src={url}
                      alt={`Imagem de ${initiative.name}`}
                      ratio="aspect-[16/10]"
                      wrapperClassName="rounded-lg border border-border"
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {initiative.tags?.length ? (
              <section className="space-y-5">
                <SectionDivider label="Temas" />
                <ul className="flex flex-wrap gap-2">
                  {initiative.tags.map((tag) => (
                    <li key={tag.id}>
                      <Link to={`/buscar?tag=${tag.id}`}>
                        <Badge variant="outline" className="hover:bg-muted transition-colors">
                          {tag.name}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* Coluna lateral ------------------------------------------------ */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {hasContact ? (
              <section className="surface p-5">
                <h2 className="mb-4 text-xs font-semibold tracking-[0.12em] uppercase">
                  Informações
                </h2>
                <dl className="space-y-4">
                  {location || cityState ? (
                    <InfoRow icon={MapPin} label="Localização">
                      {location ? <p>{location}</p> : null}
                      {cityState ? <p className="text-muted-foreground">{cityState}</p> : null}
                    </InfoRow>
                  ) : null}

                  {initiative.email ? (
                    <InfoRow icon={Mail} label="E-mail">
                      <a
                        href={`mailto:${initiative.email}`}
                        className="text-brand hover:underline"
                      >
                        {initiative.email}
                      </a>
                    </InfoRow>
                  ) : null}

                  {initiative.phone ? (
                    <InfoRow icon={Phone} label="Telefone">
                      <a
                        href={`tel:${initiative.phone.replace(/[^\d+]/g, '')}`}
                        className="text-brand hover:underline"
                      >
                        {initiative.phone}
                      </a>
                    </InfoRow>
                  ) : null}

                  {website ? (
                    <InfoRow icon={Globe} label="Website">
                      <a
                        href={website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-brand hover:underline"
                      >
                        {displayUrl(website)}
                      </a>
                    </InfoRow>
                  ) : null}

                  {initiative.published_at ? (
                    <InfoRow icon={Calendar} label="Publicado em">
                      <time dateTime={initiative.published_at}>
                        {formatDate(initiative.published_at)}
                      </time>
                    </InfoRow>
                  ) : null}
                </dl>
              </section>
            ) : null}

            {initiative.links?.length ? (
              <section className="surface p-5">
                <h2 className="mb-4 text-xs font-semibold tracking-[0.12em] uppercase">
                  Links relacionados
                </h2>
                <ul className="space-y-1">
                  {initiative.links.map((link) => {
                    const href = safeExternalUrl(link.url)
                    if (!href) return null
                    return (
                      <li key={link.id}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="hover:bg-muted group flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors"
                        >
                          <LinkIcon type={link.type} className="text-muted-foreground size-4 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{link.label}</span>
                            <span className="text-muted-foreground block truncate text-xs">
                              {displayUrl(href)}
                            </span>
                          </span>
                          <ArrowUpRight
                            className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <ShareButton initiative={initiative} />
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/categoria/${initiative.category?.slug}`}>Ver categoria</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>

      {/* Relacionadas ----------------------------------------------------- */}
      {relatedPending || related?.length ? (
        <section className="bg-muted/50 border-border border-t">
          <div className="container-page py-14">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl sm:text-3xl">Iniciativas relacionadas</h2>
                <p className="text-muted-foreground text-sm">
                  Outras iniciativas em {initiative.category?.name}.
                </p>
              </div>
              <Button variant="outline" asChild className="shrink-0">
                <Link to={`/categoria/${initiative.category?.slug}`}>Ver todas</Link>
              </Button>
            </div>

            {relatedPending ? (
              <InitiativeGridSkeleton count={3} />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <InitiativeCard key={item.id} initiative={item} />
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </article>
  )
}
