import { Link } from 'react-router-dom'
import { ClipboardCheck, FileText, Search, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDocumentMeta } from '@/hooks/use-utils'

const FLOW = [
  {
    icon: FileText,
    title: 'Cadastro',
    body: 'A equipe responsável descreve a iniciativa na área administrativa: resumo, texto completo, áreas de atuação, imagens, responsáveis e contatos.',
  },
  {
    icon: Send,
    title: 'Envio para revisão',
    body: 'Ao concluir, o conteúdo é enviado à fila de revisão. Enquanto isso permanece invisível para o público.',
  },
  {
    icon: ClipboardCheck,
    title: 'Revisão editorial',
    body: 'Um revisor confere clareza, completude e adequação. Pode aprovar ou devolver com observações para ajuste.',
  },
  {
    icon: Search,
    title: 'Publicação',
    body: 'Aprovado, o conteúdo entra na vitrine e passa a ser encontrável pela busca, pelas categorias e pelos buscadores externos.',
  },
]

export function AboutPage() {
  useDocumentMeta({
    title: 'Sobre a plataforma',
    description:
      'Como funciona a Vitrine: catálogo público de iniciativas institucionais, com workflow de revisão editorial.',
  })

  return (
    <>
      <div className="border-border bg-muted/40 border-b">
        <div className="container-page py-12 sm:py-16">
          <h1 className="font-display max-w-3xl text-3xl leading-tight text-balance-title sm:text-4xl">
            Um catálogo público para tudo o que a instituição produz
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed text-pretty">
            A Vitrine reúne, em um só endereço, as iniciativas espalhadas por departamentos,
            laboratórios e programas — de grupos de pesquisa a empresas juniores. O objetivo é
            simples: tornar visível o que já existe, para quem procura parceria, orientação,
            estágio ou apenas quer conhecer.
          </p>
        </div>
      </div>

      <div className="container-page space-y-20 py-16">
        <section className="space-y-8">
          <div className="max-w-2xl space-y-2">
            <p className="text-brand text-xs font-semibold tracking-[0.12em] uppercase">
              Como o conteúdo chega aqui
            </p>
            <h2 className="font-display text-2xl sm:text-3xl">
              Todo conteúdo passa por revisão antes de ser publicado
            </h2>
            <p className="text-muted-foreground leading-relaxed text-pretty">
              A vitrine não é um mural aberto. Existe um fluxo editorial claro, com papéis
              definidos, para que o catálogo se mantenha consistente e confiável.
            </p>
          </div>

          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="surface flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-md">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="text-muted-foreground/40 font-display text-2xl tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed text-pretty">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-display text-2xl">Quem pode publicar</h2>
            <p className="text-muted-foreground leading-relaxed text-pretty">
              O acesso à área administrativa é concedido por um administrador da plataforma. Há três
              papéis: <strong className="text-foreground">editores</strong>, que criam e mantêm o
              conteúdo das próprias iniciativas;{' '}
              <strong className="text-foreground">revisores</strong>, que aprovam ou devolvem o que
              está na fila; e <strong className="text-foreground">administradores</strong>, que
              cuidam de categorias, usuários e da configuração geral.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-2xl">Sobre este conteúdo</h2>
            <p className="text-muted-foreground leading-relaxed text-pretty">
              Esta instalação é uma demonstração. As iniciativas, pessoas, endereços e contatos
              apresentados são fictícios e existem apenas para ilustrar o funcionamento da
              plataforma. As imagens vêm de um serviço público de placeholders.
            </p>
          </div>
        </section>

        <section className="border-border bg-card flex flex-col items-start gap-6 rounded-xl border p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-2">
            <h2 className="font-display text-2xl">Comece a explorar</h2>
            <p className="text-muted-foreground text-pretty">
              Use a busca para encontrar iniciativas por tema, área ou responsável — ou navegue
              pelas categorias.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/buscar">Explorar iniciativas</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/categorias">Ver categorias</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}
