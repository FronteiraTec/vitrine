import { Accessibility, Contrast, Hand, Keyboard, Type, Volume2, Waves } from 'lucide-react'
import { useDocumentMeta } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'

/**
 * Declaração de acessibilidade.
 *
 * Duas regras guiaram o texto:
 *
 * 1. Descreve o que ESTÁ implementado, não o que se pretende. Uma declaração
 *    que promete conformidade total é pior que nenhuma: ela desautoriza o
 *    relato de quem encontrar barreira.
 *
 * 2. Declara as limitações conhecidas. O VLibras é tradução automática e não
 *    substitui intérprete humano; a síntese de fala depende das vozes do
 *    sistema. Omitir isso venderia como equivalente algo que não é.
 */

/** Recursos na ordem da página. Os textos ficam em `accessibility.resources.<chave>`. */
const RESOURCES = [
  { icon: Type, key: 'fontSize' },
  { icon: Contrast, key: 'contrast' },
  { icon: Volume2, key: 'speech' },
  { icon: Hand, key: 'libras' },
  { icon: Waves, key: 'motion' },
  { icon: Keyboard, key: 'keyboard' },
]

const LIMITATIONS = ['libras', 'speech', 'alt', 'vlibrasFocus']

export function AccessibilityPage() {
  const { t, rich } = useLocale()

  useDocumentMeta({
    title: t('accessibility.metaTitle'),
    description: t('accessibility.metaDescription'),
    path: '/acessibilidade',
  })

  return (
    <>
      <div className="border bg-body-tertiary border-bottom">
        <div className="container py-5 py-sm-5">
          <p className="text-primary mb-2 d-inline-flex align-items-center gap-2 fs-8 fw-semibold text-uppercase">
            <Accessibility className="icon" aria-hidden="true" />
            {t('accessibility.eyebrow')}
          </p>
          <h1 className="fw-bold mw-3xl fs-3 lh-sm text-balance fs-sm-2">
            {t('accessibility.title')}
          </h1>
          <p className="text-body-secondary mt-3 mw-2xl lh-base text-pretty">
            {rich('accessibility.intro', { strong: (text) => <strong>{text}</strong> })}
          </p>
        </div>
      </div>

      <div className="container space-y-5 py-5">
        <section aria-labelledby="recursos" className="space-y-5">
          <h2 id="recursos" className="fw-bold fs-4 fs-sm-3">
            {t('accessibility.resourcesTitle')}
          </h2>

          <ul className="d-grid gap-4 grid-cols-sm-2">
            {RESOURCES.map(({ icon: Icon, key }) => (
              <li key={key} className="card p-3">
                <h3 className="d-flex align-items-center gap-2 fs-6 fw-semibold">
                  <Icon className="text-primary icon-lg flex-shrink-0" aria-hidden="true" />
                  {t(`accessibility.resources.${key}.title`)}
                </h3>
                <p className="text-body-secondary mt-2 fs-7 lh-base text-pretty">
                  {t(`accessibility.resources.${key}.body`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="limitacoes" className="mw-3xl space-y-3">
          <h2 id="limitacoes" className="fw-bold fs-4 fs-sm-3">
            {t('accessibility.limitationsTitle')}
          </h2>

          <div className="text-body-secondary space-y-3 lh-base text-pretty">
            {LIMITATIONS.map((key) => (
              <p key={key}>
                <strong className="text-body">
                  {t(`accessibility.limitations.${key}.title`)}
                </strong>{' '}
                {t(`accessibility.limitations.${key}.body`)}
              </p>
            ))}
          </div>
        </section>

        <section aria-labelledby="relatar" className="mw-3xl space-y-3">
          <h2 id="relatar" className="fw-bold fs-4 fs-sm-3">
            {t('accessibility.reportTitle')}
          </h2>
          <p className="text-body-secondary lh-base text-pretty">
            {rich('accessibility.report', {
              link: (text) => (
                <a href="/contato" className="text-primary text-decoration-underline">
                  {text}
                </a>
              ),
            })}
          </p>
        </section>
      </div>
    </>
  )
}
