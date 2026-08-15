# Vitrine Institucional

Catálogo público das iniciativas de uma instituição — projetos, laboratórios,
grupos de pesquisa, empresas juniores, startups, programas de extensão — com
área administrativa e fluxo de revisão editorial.

O visitante encontra conteúdo por busca textual, categoria, área de atuação e
tema. A equipe cadastra pelo painel, envia para revisão e publica.

> Projeto de demonstração. Todo o conteúdo do seed é fictício e a identidade
> visual é própria — nada foi derivado de portais institucionais existentes.

---

## Sumário

1. [Stack](#1-stack)
2. [Requisitos](#2-requisitos)
3. [Instalação](#3-instalação)
4. [Configurar o Supabase](#4-configurar-o-supabase)
5. [Migrations](#5-migrations)
6. [Seed](#6-seed)
7. [Variáveis de ambiente](#7-variáveis-de-ambiente)
8. [Executar localmente](#8-executar-localmente)
9. [Deploy](#9-deploy)
10. [Row Level Security](#10-row-level-security)
11. [Estrutura do projeto](#11-estrutura-do-projeto)
12. [Decisões de arquitetura](#12-decisões-de-arquitetura)

---

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Interface | React 19 + Vite 8 (JavaScript) |
| Estilo | Tailwind CSS v4 (configuração CSS-first, sem `tailwind.config`) |
| Componentes | Radix UI + padrão shadcn/ui, escritos no próprio repositório |
| Ícones | lucide-react |
| Rotas | React Router 7 (data router) |
| Dados | TanStack Query |
| Backend | Supabase — PostgreSQL, Auth, Storage, PostgREST |
| Notificações | Sonner |

**Não existe backend próprio.** O React fala direto com o Supabase e a
autorização é feita por Row Level Security no Postgres. Um servidor Node
intermediário não traria nada que o RLS já não resolva, e traria um ponto a mais
para operar.

---

## 2. Requisitos

- **Node.js 20.19+** (recomendado 22 LTS) e npm 10+
- Uma conta gratuita no [Supabase](https://supabase.com)
- Opcional: [Supabase CLI](https://supabase.com/docs/guides/cli), para rodar o
  banco localmente

---

## 3. Instalação

```bash
git clone <url-do-repositorio>
cd vitrine
npm install
```

---

## 4. Configurar o Supabase

1. Crie um projeto novo em [supabase.com](https://supabase.com).
2. Vá em **Settings → API** e copie **Project URL** e **anon public key**.
3. Crie o arquivo de ambiente:

```bash
cp .env.example .env.local
```

4. Preencha `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

O passo a passo detalhado — incluindo configuração de e-mail para recuperação
de senha — está em [`supabase/README.md`](./supabase/README.md).

> Se rodar o app sem essas variáveis, ele não quebra: mostra a tela `/configuracao`
> com as instruções.

---

## 5. Migrations

Execute os oito arquivos de `supabase/migrations/` **em ordem**.

**Pelo painel:** SQL Editor → cole e execute um arquivo por vez.

**Pela CLI:**

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

**Localmente (Docker):**

```bash
supabase start
supabase db reset      # aplica migrations + seed
```

Os arquivos são idempotentes e podem ser reexecutados.

---

## 6. Seed

```bash
supabase db reset                       # local
# ou cole supabase/seed.sql no SQL Editor
```

Cria 8 categorias, 20 tags, 16 pessoas fictícias e 22 iniciativas espalhadas
por todos os status — incluindo itens em revisão e rejeitados, para o dashboard
e a fila de revisão ficarem populados.

> ⚠️ O seed **apaga o conteúdo existente do catálogo** antes de recriá-lo.
> Contas de usuário não são tocadas.

Depois do seed, crie o primeiro usuário em `/criar-conta` — **a primeira conta
da instalação vira administradora**.

---

## 7. Variáveis de ambiente

| Variável | Obrigatória | Uso |
|---|---|---|
| `VITE_SUPABASE_URL` | sim | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | sim | Chave anônima (pública) |
| `VITE_SITE_URL` | não | Domínio público, usado para gerar o `sitemap.xml` |

Tudo prefixado com `VITE_` vai para o bundle e é **público**. Só a chave anônima
entra aqui; ela é desenhada para isso, e o que ela pode ver é exatamente o que o
RLS permite. **A `service_role key` nunca deve aparecer no frontend.**

---

## 8. Executar localmente

```bash
npm run dev        # http://localhost:5173
npm run build      # build de produção + sitemap.xml
npm run preview    # serve o build
npm run lint       # ESLint
npm run smoke      # renderiza todas as telas e falha se alguma quebrar
```

O `npm run smoke` monta cada página com `renderToString` fora do navegador. Ele
existe porque `build` e `lint` não executam a árvore de componentes: erros que
só aparecem quando o React realmente renderiza — `asChild` com filhos demais,
componente indefinido, leitura de propriedade em `undefined` — passariam
despercebidos até alguém abrir a página. Rode depois de mexer em componentes.

Rotas principais:

```
/                            vitrine pública
/buscar                      busca com filtros
/categorias                  lista de categorias
/categoria/:slug             iniciativas de uma categoria
/iniciativa/:slug            página de detalhes
/noticias                    lista de notícias
/noticia/:slug               notícia
/sobre                       como a plataforma funciona
/entrar                      login
/admin                       dashboard
/admin/iniciativas           CRUD de iniciativas
/admin/noticias              CRUD de notícias
/admin/revisao               fila de aprovação      (revisor/admin)
/admin/categorias            CRUD de categorias     (admin)
/admin/pessoas               cadastro de pessoas
/admin/usuarios              papéis e ativação      (admin)
/admin/aparencia             cabeçalho e rodapé     (admin)
/admin/configuracoes         perfil e senha
```

---

## 9. Deploy

O build é estático — funciona nos planos gratuitos de Vercel e Cloudflare Pages.

### Vercel

1. Importe o repositório.
2. **Root Directory:** `vitrine` — a aplicação não fica na raiz do
   repositório. Sem isso o build falha logo no começo, sem achar o
   `package.json`.
3. **Framework preset:** Vite · **Build command:** `npm run build` ·
   **Output directory:** `dist`
4. Em **Settings → Environment Variables**, adicione `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` e (opcional) `VITE_SITE_URL`.
5. Deploy.

O `vercel.json` já traz o rewrite de SPA e os cabeçalhos de segurança e cache.

### Cloudflare Pages

1. **Connect to Git** → selecione o repositório.
2. **Build command:** `npm run build` · **Output directory:** `dist`
3. Adicione as mesmas variáveis de ambiente.

O `public/_redirects` cuida do fallback de SPA.

### Depois do deploy

No Supabase, em **Authentication → URL Configuration**, defina a **Site URL** e
acrescente `https://SEU-DOMINIO/redefinir-senha` às **Redirect URLs** — sem
isso o link de recuperação de senha aponta para `localhost`.

Atualize também a linha `Sitemap:` de `public/robots.txt` com o domínio real.

---

## 10. Row Level Security

RLS está ligado em **todas** as tabelas, e não foi desligado em nenhum momento
para facilitar o desenvolvimento. As policies completas estão em
[`supabase/migrations/20250101000003_rls.sql`](./supabase/migrations/20250101000003_rls.sql)
e explicadas em [`supabase/README.md`](./supabase/README.md#7-row-level-security).

Em resumo:

- **Anônimo** enxerga apenas iniciativas `published` e os registros filhos delas.
  As observações do revisor ficam em outra tabela, invisível ao público.
- **Editor** cria iniciativas e edita as próprias.
- **Revisor** publica, rejeita e arquiva.
- **Admin** tem acesso completo, incluindo categorias, usuários e exclusão.

As guardas de rota no React são **conveniência de interface**. A autorização
real está no banco: forçar a URL do painel não revela nada, porque nenhuma
consulta retorna além do que o papel permite.

---

## 11. Estrutura do projeto

```
vitrine/
├── public/                     favicon, robots.txt, _redirects
├── scripts/
│   └── generate-sitemap.mjs    sitemap a partir do conteúdo publicado
├── supabase/
│   ├── migrations/             schema, funções, RLS, storage, identidade
│   ├── seed.sql                dados de demonstração
│   └── README.md               guia do backend
├── src/
│   ├── components/
│   │   ├── ui/                 primitivas (button, dialog, select, …)
│   │   ├── layout/             PublicLayout, AdminLayout, Logo, SiteTheme
│   │   ├── initiatives/        InitiativeCard, FilterPanel, LinkIcon
│   │   ├── categories/         CategoryCard
│   │   ├── admin/              formulários, upload, workflow, gráficos
│   │   └── common/             ErrorBoundary, CategoryIcon
│   ├── pages/
│   │   ├── public/             home, busca, categoria, detalhes, sobre, 404
│   │   ├── admin/              dashboard, CRUDs, revisão, usuários, aparência
│   │   ├── auth/               login, cadastro, recuperação de senha
│   │   └── SetupPage.jsx       tela exibida sem credenciais configuradas
│   ├── services/               acesso ao Supabase, por domínio
│   ├── hooks/                  TanStack Query + utilitários (debounce, SEO)
│   ├── contexts/               AuthContext
│   ├── routes/                 ProtectedRoute, GuestRoute
│   ├── lib/                    client, constantes, utilitários
│   ├── App.jsx                 rotas
│   ├── main.jsx                providers
│   └── index.css               design system (tokens Tailwind v4)
├── vercel.json
└── .env.example
```

**Camadas:** as páginas não chamam o Supabase diretamente. Elas usam hooks
(`src/hooks/use-queries.js`), que chamam serviços (`src/services/`), que são os
únicos que conhecem o formato das consultas. Trocar uma consulta não obriga a
mexer em nenhuma tela.

---

## 12. Decisões de arquitetura

**Regras de negócio no banco, não no frontend.**
A máquina de estados do workflow, a geração de slugs únicos, o índice de busca e
o log de atividade são triggers e funções em SQL. O frontend decide o que
*mostrar*; o banco decide o que é *permitido*. Um cliente adulterado não publica
nada que não devesse.

**Busca com um índice, não com vários filtros encadeados.**
`initiatives.search_vector` reúne nome, resumo, texto, categoria, tags, pessoas,
áreas e localização em um único `tsvector` com pesos, indexado por GIN. Uma
consulta resolve tudo — sem `ilike` em cinco colunas nem N+1.

**Paginação sempre.**
Nenhuma tela carrega o catálogo inteiro. A listagem pública usa `range()` com
`count: 'exact'`, e o card busca só as colunas que exibe — o texto longo fica
para a página de detalhes.

**Estado da busca na URL.**
Filtros, ordenação e página vivem na query string. O resultado é compartilhável,
sobrevive ao recarregar e o botão "voltar" funciona.

**Painel carregado sob demanda.**
Todo o `/admin` está atrás de `React.lazy`. Quem só visita a vitrine não baixa o
código administrativo.

**Um único tema, bem executado.**
Não há modo escuro. A escolha foi investir em consistência tipográfica,
espaçamento e estados de interação num tema só, em vez de manter dois pela
metade.

**Notícias reaproveitam o workflow, não o duplicam.**
`news` usa o mesmo enum `initiative_status` e a mesma função
`allowed_transitions()` das iniciativas — a máquina de estados continua tendo
uma definição só. O que se repete é apenas a checagem de papel no gatilho, curta
e estável, mantida separada para não mexer no gatilho das iniciativas. A fila de
`/admin/revisao` mistura os dois tipos ordenados por data de envio: separá-los
em duas telas obrigaria o revisor a conferir as duas para saber se terminou.
A coluna do título chama-se `name`, e não `title`, para reaproveitar sem cópia
os gatilhos genéricos `ensure_unique_slug()` e `log_activity()`.

**A notícia segue o formato de jornal, sem editor de HTML.**
Chapéu, linha fina, assinatura, data, compartilhamento, capa com legenda e
crédito, galeria e "Atualizado em" — a estrutura de um portal. O corpo continua
sendo um `textarea`: `parseArticleBody()` reconhece `##` como intertítulo e `-`
como lista, e devolve blocos de **texto puro** que o React escapa. Um editor
rico traria HTML do usuário para dentro da página pública e, com ele, a pergunta
de como sanitizá-lo — preço alto por uma formatação que duas convenções já
resolvem. `content_updated_at` é carimbado pelo gatilho só quando o conteúdo
muda **depois** de publicado: `updated_at` se move a cada gravação, inclusive ao
arquivar, e um "Atualizado em" que aparece em toda notícia deixa de significar
alguma coisa.

**Identidade é dado, e cor em branco é herança.**
Marca, cores e textos do cabeçalho e do rodapé vivem em `site_settings`, uma
linha só — o singleton é garantido pelo schema (`id boolean primary key check
(id)`, sem grant de `insert`/`delete`), não por convenção. Cada cor é opcional:
`null` significa "usar o token do design system", então quem não personalizou
continua acompanhando mudanças no CSS em vez de carregar uma cópia congelada da
paleta. As cores escolhidas são aplicadas sobrescrevendo tokens no `:root`, o
que alcança de uma vez os utilitários com opacidade (`bg-primary/20`) e os
componentes em portal. O painel administrativo fica fora dessa personalização:
uma cor mal escolhida ali deixaria ilegível o próprio formulário de correção.

**Cores de dados validadas, não escolhidas no olho.**
A paleta de status do dashboard foi verificada para separação sob daltonismo
(protanopia/deuteranopia/tritanopia), piso de distinção em visão normal e
contraste mínimo sobre a superfície. Rascunho e arquivado são cinzas de
propósito — são estados inativos — e todo gráfico traz rótulo, contagem e
alternativa em tabela, então a cor nunca é a única portadora de informação.

### Limitações conhecidas

- **Gravação sem transação distribuída.** Salvar uma iniciativa grava o registro
  principal e depois sincroniza tags, equipe e links — o PostgREST não expõe
  transações entre requisições. Se um vínculo falhar, o registro permanece salvo
  e o erro aparece na tela, com o formulário ainda preenchido. Nada é destrutivo.
  Uma função RPC única resolveria isso, ao custo de duplicar a validação em SQL.
- **SEO client-side.** As meta tags e o JSON-LD são atualizados no cliente a cada
  rota, o que atende Google e Bing (que executam JavaScript) e o `sitemap.xml`
  gerado no build. Pré-visualização em redes sociais que não executam JS exige
  pré-renderização — o caminho seria migrar para SSG/SSR.
- **Criação de contas depende de uma Edge Function publicada.** O cadastro é
  fechado e contas nascem em `/admin/usuarios`, mas a API de administração do
  Auth exige a `service_role key` — que ignora todo o RLS e não pode estar no
  navegador. Ela vive em `supabase/functions/criar-usuario`, que precisa ser
  publicada uma vez (`supabase functions deploy criar-usuario`). Enquanto não
  for, o botão "Nova conta" falha com uma mensagem explicando o que falta; o
  resto do painel segue funcionando. A exclusão definitiva de contas continua
  sendo feita pelo painel do Supabase.
