import { Link } from 'react-router-dom'
import { ClipboardCheck, FileText, Search, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDocumentMeta } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'

/** Etapas do fluxo editorial. Os textos ficam no dicionário, em `about.flow.<chave>`. */
const FLOW = [
  { icon: FileText, key: 'register' },
  { icon: Send, key: 'submit' },
  { icon: ClipboardCheck, key: 'review' },
  { icon: Search, key: 'publish' },
]

export function AboutPage() {
  const { t, rich } = useLocale()
  const strong = (text) => <strong className="text-body">{text}</strong>

  useDocumentMeta({
    title: t('about.metaTitle'),
    description: t('about.metaDescription'),
  })

  return (
    <>
      <div className="border bg-body-tertiary border-bottom">
        <div className="container py-5 py-sm-5">
          <h1 className="fw-bold mw-3xl fs-3 lh-sm text-balance fs-sm-2">{t('about.title')}</h1>
          <p className="text-body-secondary mt-3 mw-2xl lh-base text-pretty">{t('about.intro')}</p>
        </div>
      </div>

      <div className="container space-y-5 py-5">
        <section className="space-y-5">
          <div className="mw-2xl space-y-2">
            <p className="text-primary fs-8 fw-semibold text-uppercase">
              {t('about.flow.eyebrow')}
            </p>
            <h2 className="fw-bold fs-4 fs-sm-3">{t('about.flow.title')}</h2>
            <p className="text-body-secondary lh-base text-pretty">
              {t('about.flow.description')}
            </p>
          </div>

          <ol className="d-grid gap-3 grid-cols-sm-2 grid-cols-lg-4">
            {FLOW.map(({ icon: Icon, key }, index) => (
              <li key={key} className="card d-flex flex-column gap-2 p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <span className="bg-primary-subtle text-primary-emphasis d-flex h-fx-9 w-fx-9 align-items-center justify-content-center rounded-2">
                    <Icon className="icon" aria-hidden="true" />
                  </span>
                  <span className="text-body-secondary opacity-50 fw-bold fs-4 tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="fw-semibold">{t(`about.flow.${key}.title`)}</h3>
                <p className="text-body-secondary fs-7 lh-base text-pretty">
                  {t(`about.flow.${key}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="d-grid gap-5 grid-cols-lg-2">
          <div className="space-y-2">
            <h2 className="fw-bold fs-4">{t('about.who.title')}</h2>
            <p className="text-body-secondary lh-base text-pretty">
              {rich('about.who.body', { strong })}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="fw-bold fs-4">{t('about.content.title')}</h2>
            <p className="text-body-secondary lh-base text-pretty">{t('about.content.body')}</p>
          </div>
        </section>

        <section className="border bg-body d-flex flex-column align-items-start gap-4 rounded-4 p-5 p-sm-5 flex-lg-row align-items-lg-center justify-content-lg-between">
          <div className="mw-xl space-y-2">
            <h2 className="fw-bold fs-4">{t('about.cta.title')}</h2>
            <p className="text-body-secondary text-pretty">{t('about.cta.body')}</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/buscar">{t('about.cta.explore')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/categorias">{t('about.cta.categories')}</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}
