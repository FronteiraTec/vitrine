import { MessageCircle, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSiteSettings } from '@/hooks/use-queries'
import { useLocale } from '@/contexts/LocaleContext'

/**
 * Conexão INNE — canal de entrada para parceiros externos.
 *
 * Fica separada da chamada "cadastre sua iniciativa" porque o público é outro:
 * ali fala-se com equipes de dentro da instituição, aqui com empresas, ONGs e
 * órgãos públicos que trazem uma demanda de fora.
 *
 * O contato é o WhatsApp da incubadora e não um formulário: uma demanda de
 * parceria começa como conversa, e um formulário exigiria uma tabela, uma
 * caixa de entrada no painel e alguém encarregado de responder — infraestrutura
 * que só se justifica depois que o volume aparecer.
 */

/** Só dígitos, com código do país: é o formato que o wa.me aceita. */
const WHATSAPP_NUMBER = '554920496549'
const WHATSAPP_DISPLAY = '+55 49 2049-6549'

export function ConnectSection() {
  // Só o logotipo vem da configuração: "Conexão INNE" é o nome do programa, não
  // a marca do site — renomear a vitrine não deveria renomear o programa. Pelo
  // mesmo motivo o nome não é traduzido.
  const { logoUrl } = useSiteSettings()
  const { t } = useLocale()

  // A mensagem pronta sai no idioma de quem clica: a equipe da incubadora já
  // sabe, pela primeira linha, em que língua responder.
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t('connect.message'))}`

  return (
    <section className="hero-gradient text-white">
      <div className="container py-5 py-sm-5 py-lg-5">
        <div className="d-grid align-items-center gap-5 d-grid grid-split">
          <div>
            <h2 className="fw-bold fs-3 text-balance fs-sm-2 fs-lg-1">
              Conexão INNE
            </h2>

            <p className="mt-4 mw-xl fs-6 lh-base opacity-75 fs-sm-5">
              {t('connect.description')}
            </p>

            <div className="mt-5">
              <Button
                size="lg"
                asChild
                className="bg-white text-primary h-fx-13"
              >
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={t('connect.ctaLabel', { phone: WHATSAPP_DISPLAY })}
                >
                  <PlusCircle aria-hidden="true" />
                  {t('connect.cta')}
                </a>
              </Button>
            </div>

            <p className="mt-3 fs-7 opacity-75 text-pretty">{t('connect.audience')}</p>

            <p className="mt-2 d-inline-flex align-items-center gap-1 fs-7 opacity-75">
              <MessageCircle className="icon" aria-hidden="true" />
              {t('connect.whatsapp', { phone: WHATSAPP_DISPLAY })}
            </p>
          </div>

          {/* A marca sozinha, sem moldura. Some no celular: empilhada, seria
              só um bloco alto antes da chamada. */}
          <div className="d-none align-items-center justify-content-center d-lg-flex">
            <img
              src={logoUrl}
              alt=""
              aria-hidden="true"
              className="max-h-fx-40 w-auto mw-100 object-fit-contain"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
