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
import { useTrackView } from '@/hooks/use-track-view'
import { useDocumentMeta, useStructuredData } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { displayUrl, safeExternalUrl, truncate } from '@/lib/utils'
import { NotFoundPage } from './NotFoundPage'

function Breadcrumb({ initiative, catalogLang }) {
  const { t } = useLocale()

  return (
    <nav aria-label={t('common.breadcrumb')} className="fs-7">
      <ol className="d-flex flex-wrap align-items-center gap-1 opacity-75">
        <li>
          <Link to="/" className="hover-underline">
            {t('common.home')}
          </Link>
        </li>
        <ChevronRight className="icon-sm flex-shrink-0" aria-hidden="true" />
        <li>
          <Link
            to={`/categoria/${initiative.category?.slug}`}
            className="hover-underline"
            lang={catalogLang}
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
    <div className="d-flex gap-2">
      <Icon className="text-body-secondary mt-1 icon flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <dt className="text-body-secondary fs-8 fw-medium tracking-wide text-uppercase">
          {label}
        </dt>
        <dd className="fs-7 text-break">{children}</dd>
      </div>
    </div>
  )
}

function ShareButton({ initiative }) {
  const { t } = useLocale()

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
      toast.success(t('initiative.shareCopied'))
    } catch {
      toast.error(t('initiative.shareFailed'))
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Share2 aria-hidden="true" />
      {t('initiative.share')}
    </Button>
  )
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="max-h-fx-96 min-h-fx-64 w-100 rounded-0" />
      <div className="container py-5">
        <div className="d-grid gap-5 grid-detail">
          <div className="space-y-3">
            <Skeleton className="h-fx-4 w-fx-32" />
            <Skeleton className="h-fx-4 w-100" />
            <Skeleton className="h-fx-4 w-100" />
            <Skeleton className="h-fx-4 w-fx-3/4" />
          </div>
          <Skeleton className="h-fx-64" />
        </div>
      </div>
    </div>
  )
}

export function InitiativeDetailPage() {
  const { slug } = useParams()
  const { t, locale, formatDate } = useLocale()
  // O conteúdo da iniciativa é cadastrado em português. Com a interface em
  // outro idioma, cada trecho de conteúdo declara o próprio `lang`; os rótulos
  // ao redor seguem o idioma da página.
  const catalogLang = locale === DEFAULT_LOCALE ? undefined : DEFAULT_LOCALE
  const { data: initiative, isPending, isError, error, refetch } = usePublishedInitiative(slug)
  const { data: related, isPending: relatedPending } = useRelatedInitiatives(
    initiative?.category_id,
    initiative?.id,
  )
  useTrackView('initiative', initiative?.id, locale)

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
      <div className="container py-5">
        <ErrorState description={error?.message} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!initiative) {
    return (
      <NotFoundPage
        title={t('initiative.notFoundTitle')}
        description={t('initiative.notFoundDescription')}
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
      <header className="bg-primary text-white position-relative">
        {initiative.cover_image ? (
          <>
            {/* O wrapper é absoluto: a altura vem do cabeçalho, não de proporção. */}
            <Image
              src={initiative.cover_image}
              alt=""
              eager
              ratio={null}
              wrapperClassName="position-absolute top-0 start-0 w-100 h-100 bg-primary"
              className="opacity-25"
            />
            <div
              className="position-absolute top-0 start-0 w-100 h-100 overlay-gradient"
              aria-hidden="true"
            />
          </>
        ) : null}

        <div className="container position-relative d-flex min-h-fx-64 flex-column justify-content-end py-5 py-sm-5">
          <Breadcrumb initiative={initiative} catalogLang={catalogLang} />

          <div className="mt-3 mw-3xl space-y-3" lang={catalogLang}>
            {initiative.category ? (
              <Link
                to={`/categoria/${initiative.category.slug}`}
                className="d-inline-flex align-items-center gap-1 rounded-pill bg-white/12 px-2 py-1 fs-8 fw-semibold text-uppercase"
              >
                <CategoryIcon name={initiative.category.icon} className="icon-sm" />
                {initiative.category.name}
              </Link>
            ) : null}

            <h1 className="fw-bold fs-3 text-balance fs-sm-1">
              {initiative.name}
            </h1>

            {initiative.short_description ? (
              <p className="mw-2xl fs-6 lh-base opacity-75 fs-sm-5">
                {initiative.short_description}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {/* Corpo ------------------------------------------------------------ */}
      <div className="container py-5 py-sm-5">
        <div className="d-grid gap-5 grid-detail gap-lg-5">
          <div className="min-w-0 space-y-5">
            {initiative.description ? (
              <section className="space-y-3">
                <SectionDivider label={t('initiative.about')} />
                <div className="space-y-3 text-pretty" lang={catalogLang}>
                  {initiative.description.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {initiative.areas?.length ? (
              <section className="space-y-3">
                <SectionDivider label={t('initiative.areas')} />
                <ul className="d-flex flex-wrap gap-2" lang={catalogLang}>
                  {initiative.areas.map((area) => (
                    <li key={area}>
                      <Badge variant="brand">{area}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {initiative.team?.length ? (
              <section className="space-y-3">
                <SectionDivider label={t('initiative.team')} />
                <ul className="d-grid gap-2 grid-cols-sm-2" lang={catalogLang}>
                  {initiative.team.map((entry) => (
                    <li
                      key={entry.person?.id}
                      className="border bg-body d-flex align-items-center gap-2 rounded-3 p-3"
                    >
                      <Avatar src={entry.person?.photo_url} name={entry.person?.name} size="md" />
                      <div className="min-w-0">
                        <p className="text-truncate fs-7 fw-medium">{entry.person?.name}</p>
                        {entry.role || entry.person?.role ? (
                          <p className="text-body-secondary text-truncate fs-8">
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
              <section className="space-y-3">
                <SectionDivider label={t('initiative.gallery')} />
                <div className="d-grid gap-2 grid-cols-sm-2">
                  {gallery.map((url) => (
                    <Image
                      key={url}
                      src={url}
                      alt={t('initiative.galleryAlt', { name: initiative.name })}
                      ratio="ratio-16x10"
                      wrapperClassName="rounded-3 border border"
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {initiative.tags?.length ? (
              <section className="space-y-3">
                <SectionDivider label={t('initiative.tags')} />
                <ul className="d-flex flex-wrap gap-2" lang={catalogLang}>
                  {initiative.tags.map((tag) => (
                    <li key={tag.id}>
                      <Link to={`/buscar?tag=${tag.id}`}>
                        <Badge variant="outline">
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
          <aside className="space-y-4 sticky-lg">
            {hasContact ? (
              <section className="card p-3">
                <h2 className="mb-3 fs-8 fw-semibold text-uppercase">
                  {t('initiative.info')}
                </h2>
                <dl className="space-y-3">
                  {location || cityState ? (
                    <InfoRow icon={MapPin} label={t('initiative.location')}>
                      {location ? <p lang={catalogLang}>{location}</p> : null}
                      {cityState ? <p className="text-body-secondary">{cityState}</p> : null}
                    </InfoRow>
                  ) : null}

                  {initiative.email ? (
                    <InfoRow icon={Mail} label={t('initiative.email')}>
                      <a
                        href={`mailto:${initiative.email}`}
                        className="text-primary hover-underline"
                      >
                        {initiative.email}
                      </a>
                    </InfoRow>
                  ) : null}

                  {initiative.phone ? (
                    <InfoRow icon={Phone} label={t('initiative.phone')}>
                      <a
                        href={`tel:${initiative.phone.replace(/[^\d+]/g, '')}`}
                        className="text-primary hover-underline"
                      >
                        {initiative.phone}
                      </a>
                    </InfoRow>
                  ) : null}

                  {website ? (
                    <InfoRow icon={Globe} label={t('initiative.website')}>
                      <a
                        href={website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary hover-underline"
                      >
                        {displayUrl(website)}
                      </a>
                    </InfoRow>
                  ) : null}

                  {initiative.published_at ? (
                    <InfoRow icon={Calendar} label={t('initiative.publishedAt')}>
                      <time dateTime={initiative.published_at}>
                        {formatDate(initiative.published_at)}
                      </time>
                    </InfoRow>
                  ) : null}
                </dl>
              </section>
            ) : null}

            {initiative.links?.length ? (
              <section className="card p-3">
                <h2 className="mb-3 fs-8 fw-semibold text-uppercase">
                  {t('initiative.links')}
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
                          className="d-flex align-items-center gap-2 rounded-2 px-2 py-2"
                        >
                          <LinkIcon type={link.type} className="text-body-secondary icon flex-shrink-0" />
                          <span className="min-w-0 flex-grow-1">
                            <span className="d-block text-truncate fs-7 fw-medium" lang={catalogLang}>
                              {link.label}
                            </span>
                            <span className="text-body-secondary d-block text-truncate fs-8">
                              {displayUrl(href)}
                            </span>
                          </span>
                          <ArrowUpRight
                            className="text-body-secondary icon flex-shrink-0"
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            <div className="d-flex flex-wrap gap-2">
              <ShareButton initiative={initiative} />
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/categoria/${initiative.category?.slug}`}>{t('initiative.viewCategory')}</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>

      {/* Relacionadas ----------------------------------------------------- */}
      {relatedPending || related?.length ? (
        <section className="bg-body-tertiary border border-top">
          <div className="container py-5">
            <div className="mb-5 d-flex flex-column gap-2 flex-sm-row align-items-sm-end justify-content-sm-between">
              <div className="space-y-1">
                <h2 className="fw-bold fs-4 fs-sm-3">{t('initiative.related')}</h2>
                <p className="text-body-secondary fs-7">
                  {t('initiative.relatedDescription', { category: initiative.category?.name ?? '' })}
                </p>
              </div>
              <Button variant="outline" asChild className="flex-shrink-0">
                <Link to={`/categoria/${initiative.category?.slug}`}>{t('common.seeAll')}</Link>
              </Button>
            </div>

            {relatedPending ? (
              <InitiativeGridSkeleton count={3} />
            ) : (
              <div className="d-grid grid-cols-1 gap-3 grid-cols-sm-2 grid-cols-lg-3">
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
