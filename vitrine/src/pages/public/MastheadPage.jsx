import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { useSiteSettings } from '@/hooks/use-queries'
import { useDocumentMeta, useSite, useStructuredData } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'
import { publisherJsonLd } from '@/lib/seo'

const ROLES = ['editor', 'reviewer', 'admin']

const DOCUMENTS = [
  ['/politica-editorial', 'masthead.documents.policy'],
  ['/acessibilidade', 'masthead.documents.accessibility'],
  ['/contato', 'masthead.documents.contact'],
  ['/sobre', 'masthead.documents.about'],
]

/**
 * Expediente — quem responde pelo que é publicado.
 *
 * Os dados de contato e a identidade vêm de `site_settings`, a mesma linha que
 * alimenta cabeçalho e rodapé. Escrevê-los aqui no código criaria uma segunda
 * fonte de verdade, e a primeira vez que alguém trocasse o e-mail pelo painel
 * esta página passaria a mentir sem que ninguém percebesse.
 *
 * O bloco JSON-LD declara o veículo como `NewsMediaOrganization` e aponta para
 * a política editorial. É o mesmo `@id` que cada notícia referencia no campo
 * `publisher`, então o rastreador liga as duas coisas.
 */
export function MastheadPage() {
  const settings = useSiteSettings()
  const site = useSite()
  const { t, rich } = useLocale()

  useDocumentMeta({
    title: t('masthead.metaTitle'),
    description: t('masthead.metaDescription', { brand: settings.brandName }),
    path: '/expediente',
  })

  useStructuredData({ '@context': 'https://schema.org', ...publisherJsonLd(site) })

  const contacts = [
    settings.footerContactEmail && {
      icon: Mail,
      label: settings.footerContactEmail,
      href: `mailto:${settings.footerContactEmail}`,
    },
    settings.footerContactPhone && {
      icon: Phone,
      label: settings.footerContactPhone,
      href: `tel:${settings.footerContactPhone.replace(/[^\d+]/g, '')}`,
    },
    settings.footerAddress && { icon: MapPin, label: settings.footerAddress },
  ].filter(Boolean)

  return (
    <>
      <div className="border bg-body-tertiary border-bottom">
        <div className="container py-5 py-sm-5">
          <p className="text-primary mb-2 fs-8 fw-semibold text-uppercase">
            {t('masthead.eyebrow')}
          </p>
          <h1 className="fw-bold mw-3xl fs-3 lh-sm text-balance fs-sm-2">
            {t('masthead.title', { brand: settings.brandName })}
          </h1>
          <p className="text-body-secondary mt-3 mw-2xl lh-base text-pretty">
            {settings.footerDescription}
          </p>
        </div>
      </div>

      <div className="container d-grid mw-5xl gap-5 py-5 grid-main-aside">
        <div className="space-y-5">
          <section aria-labelledby="responsabilidade" className="space-y-2">
            <h2 id="responsabilidade" className="fw-bold fs-4">
              {t('masthead.responsibility.title')}
            </h2>
            <p className="text-body-secondary lh-base text-pretty">
              {t('masthead.responsibility.p1')}
            </p>
            <p className="text-body-secondary lh-base text-pretty">
              {t('masthead.responsibility.p2')}
            </p>
          </section>

          <section aria-labelledby="papeis" className="space-y-2">
            <h2 id="papeis" className="fw-bold fs-4">
              {t('masthead.roles.title')}
            </h2>
            <dl className="list-divided">
              {ROLES.map((role) => (
                <div key={role} className="py-2">
                  <dt className="fs-7 fw-semibold">{t(`masthead.roles.${role}.name`)}</dt>
                  <dd className="text-body-secondary mt-1 fs-7 lh-base text-pretty">
                    {t(`masthead.roles.${role}.description`)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="correcoes" className="space-y-2">
            <h2 id="correcoes" className="fw-bold fs-4">
              {t('masthead.corrections.title')}
            </h2>
            <p className="text-body-secondary lh-base text-pretty">
              {t('masthead.corrections.p1')}
            </p>
            <p className="text-body-secondary lh-base text-pretty">
              {rich('masthead.corrections.p2', {
                link: (text) => (
                  <Link to="/contato" className="text-primary text-decoration-underline">
                    {text}
                  </Link>
                ),
              })}
            </p>
          </section>
        </div>

        <aside className="space-y-5">
          {contacts.length ? (
            <section aria-labelledby="contato-redacao" className="card p-3">
              <h2 id="contato-redacao" className="fs-6 fw-semibold">
                {t('masthead.contactTitle')}
              </h2>
              <ul className="mt-2 space-y-2 fs-7">
                {contacts.map(({ icon: Icon, label, href }) => (
                  <li key={label} className="d-flex align-items-start gap-2">
                    <Icon className="text-primary mt-1 icon flex-shrink-0" aria-hidden="true" />
                    {href ? (
                      <a href={href} className="hover-underline">
                        {label}
                      </a>
                    ) : (
                      <span className="text-body-secondary">{label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="documentos" className="card p-3">
            <h2 id="documentos" className="fs-6 fw-semibold">
              {t('masthead.documents.title')}
            </h2>
            <ul className="mt-2 space-y-2 fs-7">
              {DOCUMENTS.map(([to, key]) => (
                <li key={to}>
                  <Link to={to} className="text-primary text-decoration-underline">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  )
}
