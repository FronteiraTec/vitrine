import { Link } from 'react-router-dom'
import { useSiteSettings } from '@/hooks/use-queries'
import { useDocumentMeta } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'

/**
 * Política editorial.
 *
 * O `publishingPrinciples` do dado estruturado do veículo aponta para esta
 * URL — ver `publisherJsonLd` em `src/lib/seo.js`. É a página que responde,
 * para o leitor e para o rastreador, sob que critérios o conteúdo é produzido,
 * revisado e corrigido.
 *
 * O texto — em `policy.sections` nos dicionários de `src/i18n/messages/` —
 * descreve o que o sistema realmente faz. Vale revisá-lo com quem responde
 * pela redação antes de colocar no ar, nos três idiomas: política editorial é
 * compromisso público, não texto de preenchimento.
 */

/** Seções na ordem da página; o `id` é também a âncora do sumário. */
const SECTIONS = ['producao', 'revisao', 'datas', 'correcoes', 'imagens', 'publicidade']

export function EditorialPolicyPage() {
  const settings = useSiteSettings()
  const { t, rich } = useLocale()

  useDocumentMeta({
    title: t('policy.metaTitle'),
    description: t('policy.metaDescription', { brand: settings.brandName }),
    path: '/politica-editorial',
  })

  return (
    <>
      <div className="border bg-body-tertiary border-bottom">
        <div className="container py-5 py-sm-5">
          <p className="text-primary mb-2 fs-8 fw-semibold text-uppercase">
            {t('policy.eyebrow')}
          </p>
          <h1 className="fw-bold mw-3xl fs-3 lh-sm text-balance fs-sm-2">{t('policy.title')}</h1>
          <p className="text-body-secondary mt-3 mw-2xl lh-base text-pretty">
            {rich('policy.intro', {
              link: (text) => (
                <Link to="/expediente" className="text-primary text-decoration-underline">
                  {text}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>

      <div className="container mw-3xl py-5">
        {/* Sumário: em documento normativo longo, a lista de âncoras é o que
            permite voltar a um ponto específico — inclusive por leitor de tela,
            que assim navega por cabeçalhos sem percorrer o texto inteiro. */}
        <nav aria-labelledby="sumario" className="card mb-5 p-3">
          <h2 id="sumario" className="fs-7 fw-semibold">
            {t('policy.toc')}
          </h2>
          <ol className="text-body-secondary mt-2 space-y-1 fs-7">
            {SECTIONS.map((id, index) => (
              <li key={id}>
                <a href={`#${id}`} className="hover-underline">
                  {index + 1}. {t(`policy.sections.${id}.title`)}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-5">
          {SECTIONS.map((id) => (
            <section key={id} aria-labelledby={id} className="space-y-2">
              <h2 id={id} className="fw-bold scroll-offset fs-4">
                {t(`policy.sections.${id}.title`)}
              </h2>
              {['p1', 'p2'].map((paragraph) => (
                <p key={paragraph} className="text-body-secondary lh-base text-pretty">
                  {t(`policy.sections.${id}.${paragraph}`)}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
