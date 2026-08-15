import { MessageCircle, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSiteSettings } from '@/hooks/use-queries'

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

const MESSAGE = 'Olá! Gostaria de cadastrar uma demanda no programa Conexão INNE.'

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`

export function ConnectSection() {
  // Só o logotipo vem da configuração: "Conexão INNE" é o nome do programa, não
  // a marca do site — renomear a vitrine não deveria renomear o programa.
  const { logoUrl } = useSiteSettings()

  return (
    <section className="hero-gradient text-primary-foreground relative overflow-hidden">
      {/* Trama de pontos: dá textura ao fundo escuro sem competir com o texto. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="container-page relative py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h2 className="font-display text-3xl leading-[1.1] text-balance-title sm:text-4xl lg:text-5xl">
              Conexão INNE
            </h2>

            <p className="mt-6 max-w-xl text-base leading-relaxed opacity-85 sm:text-lg">
              O programa Conexão INNE aproxima empresas, entidades sem fins lucrativos e órgãos
              governamentais das iniciativas e pesquisadores da incubadora. Parceiros apresentam
              suas demandas e encontram soluções inovadoras ou propostas de projetos que atendam às
              suas necessidades.
            </p>

            <div className="mt-9">
              <Button
                size="lg"
                asChild
                className="bg-primary-foreground text-primary h-13 hover:bg-white/90"
              >
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Cadastrar demanda pelo WhatsApp ${WHATSAPP_DISPLAY}`}
                >
                  <PlusCircle aria-hidden="true" />
                  Cadastrar demanda
                </a>
              </Button>
            </div>

            <p className="mt-5 text-sm opacity-70 text-pretty">
              Disponível para empresas, entidades sem fins lucrativos e órgãos governamentais.
            </p>

            <p className="mt-2 inline-flex items-center gap-1.5 text-sm opacity-70">
              <MessageCircle className="size-4" aria-hidden="true" />
              Atendimento por WhatsApp — {WHATSAPP_DISPLAY}
            </p>
          </div>

          {/* Cartão de vidro com a marca, como no material do programa. Some no
              celular: empilhado, seria só um bloco alto antes da chamada. */}
          <div className="hidden lg:block">
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] p-10 backdrop-blur-sm">
              <img
                src={logoUrl}
                alt=""
                aria-hidden="true"
                className="max-h-40 w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
