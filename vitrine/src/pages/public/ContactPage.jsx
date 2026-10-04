import { Link } from 'react-router-dom'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useSiteSettings } from '@/hooks/use-queries'
import { useDocumentMeta, useSite, useStructuredData } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'
import { absoluteUrl } from '@/lib/seo'
import { whatsappUrl } from '@/lib/site-settings'

/**
 * Contato.
 *
 * Deliberadamente SEM formulário. Um formulário exigiria endpoint de envio,
 * proteção contra robô e uma caixa de entrada que alguém acompanhe — três
 * coisas que este projeto não tem. Publicar um formulário que não entrega a
 * mensagem é pior do que publicar o e-mail direto: o leitor acha que falou com
 * a redação e não falou.
 *
 * Os canais vêm de `site_settings`, a mesma linha do rodapé e do expediente.
 */
export function ContactPage() {
  const settings = useSiteSettings()
  const site = useSite()
  const { t, rich } = useLocale()
  const strong = (text) => <strong className="text-body">{text}</strong>

  useDocumentMeta({
    title: t('contact.metaTitle'),
    description: t('contact.metaDescription', { brand: settings.brandName }),
    path: '/contato',
  })

  const whatsapp = whatsappUrl(settings.connectWhatsapp)

  const channels = [
    settings.footerContactEmail && {
      icon: Mail,
      title: t('contact.email'),
      value: settings.footerContactEmail,
      href: `mailto:${settings.footerContactEmail}`,
    },
    settings.footerContactPhone && {
      icon: Phone,
      title: t('contact.phone'),
      value: settings.footerContactPhone,
      href: `tel:${settings.footerContactPhone.replace(/[^\d+]/g, '')}`,
    },
    whatsapp && {
      icon: MessageCircle,
      title: t('contact.whatsapp'),
      value: settings.connectWhatsapp,
      href: whatsapp,
      external: true,
    },
    settings.footerAddress && {
      icon: MapPin,
      title: t('contact.address'),
      value: settings.footerAddress,
    },
  ].filter(Boolean)

  /* ContactPage do schema.org: diz ao rastreador que esta é a página de
     contato do veículo, e liga os canais à organização já declarada no
     expediente pelo mesmo `@id`. */
  useStructuredData({
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    url: absoluteUrl(site, '/contato'),
    name: t('contact.jsonLdName', { brand: settings.brandName }),
    about: { '@id': `${site.url}/#publisher` },
  })

  return (
    <>
      <div className="border bg-body-tertiary border-bottom">
        <div className="container py-5 py-sm-5">
          <p className="text-primary mb-2 fs-8 fw-semibold text-uppercase">
            {t('contact.eyebrow')}
          </p>
          <h1 className="fw-bold mw-3xl fs-3 lh-sm text-balance fs-sm-2">{t('contact.title')}</h1>
          <p className="text-body-secondary mt-3 mw-2xl lh-base text-pretty">{t('contact.intro')}</p>
        </div>
      </div>

      <div className="container mw-4xl space-y-5 py-5">
        {channels.length ? (
          <section aria-labelledby="canais" className="space-y-4">
            <h2 id="canais" className="fw-bold fs-4">
              {t('contact.channels')}
            </h2>
            <ul className="d-grid gap-3 grid-cols-sm-2">
              {channels.map(({ icon: Icon, title, value, href, external }) => (
                <li key={title} className="card p-3">
                  <h3 className="d-flex align-items-center gap-2 fs-7 fw-semibold">
                    <Icon className="text-primary icon flex-shrink-0" aria-hidden="true" />
                    {title}
                  </h3>
                  {href ? (
                    <a
                      href={href}
                      className="text-primary mt-2 d-block fs-7 text-decoration-underline"
                      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-body-secondary mt-2 fs-7">{value}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section aria-labelledby="canais" className="space-y-2">
            <h2 id="canais" className="fw-bold fs-4">
              {t('contact.channels')}
            </h2>
            {/* Os canais vivem em `site_settings`, editáveis em
                /admin/aparencia. Enquanto ninguém preencher, dizer isso é mais
                honesto do que mostrar um endereço inventado. */}
            <p className="text-body-secondary lh-base text-pretty">
              {rich('contact.noChannels', { strong: (text) => <strong>{text}</strong> })}
            </p>
          </section>
        )}

        <section aria-labelledby="o-que-enviar" className="space-y-3">
          <h2 id="o-que-enviar" className="fw-bold fs-4">
            {t('contact.include.title')}
          </h2>
          <ul className="text-body-secondary list-disc space-y-2 ps-4 lh-base">
            <li>{rich('contact.include.corrections', { strong })}</li>
            <li>{rich('contact.include.reply', { strong })}</li>
            <li>
              {rich('contact.include.accessibility', {
                strong,
                link: (text) => (
                  <Link to="/acessibilidade" className="text-primary text-decoration-underline">
                    {text}
                  </Link>
                ),
              })}
            </li>
          </ul>
        </section>
      </div>
    </>
  )
}
