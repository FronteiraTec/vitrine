import { Navigate } from 'react-router-dom'
import { CheckCircle2, Database, KeyRound, Terminal } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Logo } from '@/components/layout/Logo'

const STEPS = [
  {
    icon: Database,
    title: 'Crie um projeto no Supabase',
    body: 'Acesse supabase.com, crie um projeto e aguarde o provisionamento do banco.',
  },
  {
    icon: Terminal,
    title: 'Rode as migrations e o seed',
    body: 'No SQL Editor do painel, execute em ordem os arquivos de supabase/migrations/ e, se quiser dados de demonstração, supabase/seed.sql.',
  },
  {
    icon: KeyRound,
    title: 'Configure as variáveis de ambiente',
    body: 'Copie .env.example para .env.local e preencha com a URL e a chave anônima do projeto (Settings → API).',
  },
  {
    icon: CheckCircle2,
    title: 'Reinicie o servidor de desenvolvimento',
    body: 'O Vite lê as variáveis na inicialização: pare e rode npm run dev novamente.',
  },
]

/**
 * Tela exibida quando o app roda sem credenciais do Supabase.
 * Melhor do que uma página em branco: diz exatamente o que falta fazer.
 */
export function SetupPage() {
  if (isSupabaseConfigured) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <Logo to={null} />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-3xl">Falta conectar o Supabase</h1>
            <p className="text-muted-foreground mx-auto max-w-md text-pretty">
              A aplicação está rodando, mas ainda não encontrou as variáveis de ambiente do banco.
              Siga os quatro passos abaixo — leva poucos minutos.
            </p>
          </div>
        </div>

        <ol className="space-y-3">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="surface flex gap-4 p-5">
              <div className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                <Icon className="size-4.5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">
                  <span className="text-muted-foreground mr-1.5 tabular-nums">{index + 1}.</span>
                  {title}
                </h2>
                <p className="text-muted-foreground text-sm text-pretty">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="bg-primary text-primary-foreground overflow-x-auto rounded-lg p-5">
          <p className="mb-3 text-xs font-semibold tracking-[0.12em] uppercase opacity-60">
            .env.local
          </p>
          <pre className="font-mono text-sm leading-relaxed">
            <code>
              {'VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co\nVITE_SUPABASE_ANON_KEY=sua-chave-anonima'}
            </code>
          </pre>
        </div>

        <p className="text-muted-foreground text-center text-sm">
          O passo a passo completo está no <span className="text-foreground font-medium">README.md</span>{' '}
          e em <span className="text-foreground font-medium">supabase/README.md</span>.
        </p>
      </div>
    </div>
  )
}
