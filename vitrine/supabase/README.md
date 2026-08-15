# Supabase — banco, RLS e Storage

Tudo que o backend da Vitrine precisa está neste diretório. Não há servidor
próprio: o React fala direto com o PostgREST do Supabase, e a autorização é
feita por **Row Level Security** dentro do Postgres.

```
supabase/
├── migrations/
│   ├── 20250101000001_schema.sql      tabelas, tipos e índices
│   ├── 20250101000002_functions.sql   slugs, busca, workflow, log de atividade
│   ├── 20250101000003_rls.sql         policies de Row Level Security
│   ├── 20250101000004_storage.sql     buckets e policies de arquivos
│   ├── 20250101000005_site_settings.sql  identidade do cabeçalho e do rodapé
│   ├── 20250101000006_news.sql        notícias (mesmo workflow editorial)
│   ├── 20250101000007_closed_signup.sql  cadastro fechado
│   ├── 20250101000008_harden_function_grants.sql  permissões de funções
│   ├── 20250101000009_news_gallery.sql   galeria de imagens nas notícias
│   └── 20250101000010_news_editorial.sql chapéu, legendas, créditos, correção
├── functions/
│   └── criar-usuario/index.ts         Edge Function: admin cria contas
├── seed.sql                           dados de demonstração (⚠ apaga o catálogo)
├── seed-noticias.sql                  notícias de demonstração (não apaga nada)
└── README.md
```

---

## 1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie um projeto novo.
2. Guarde a senha do banco (usada apenas pela CLI).
3. Em **Settings → API**, copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`

> A **service_role key** nunca deve ir para o frontend nem para o repositório.
> Ela ignora todo o RLS.

---

## 2. Aplicar as migrations

### Opção A — SQL Editor (mais simples)

No painel do Supabase, abra **SQL Editor** e execute os arquivos **em ordem**,
um de cada vez:

1. `migrations/20250101000001_schema.sql`
2. `migrations/20250101000002_functions.sql`
3. `migrations/20250101000003_rls.sql`
4. `migrations/20250101000004_storage.sql`
5. `migrations/20250101000005_site_settings.sql`
6. `migrations/20250101000006_news.sql`
7. `migrations/20250101000007_closed_signup.sql`
8. `migrations/20250101000008_harden_function_grants.sql`
9. `migrations/20250101000009_news_gallery.sql`
10. `migrations/20250101000010_news_editorial.sql`

Cada arquivo é idempotente (`if not exists`, `create or replace`,
`drop policy if exists`), então pode ser reexecutado sem quebrar nada.

### Opção B — Supabase CLI

```bash
npm install -g supabase          # ou: brew install supabase/tap/supabase
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push                 # aplica migrations/ em ordem
```

Para desenvolvimento totalmente local:

```bash
supabase start                   # sobe Postgres + Studio em Docker
supabase db reset                # aplica migrations e roda o seed.sql
```

---

## 3. Popular com dados de demonstração

```bash
supabase db reset                # local: migrations + seed automaticamente
```

Ou cole o conteúdo de `seed.sql` no SQL Editor.

> ⚠️ **`seed.sql` apaga todo o conteúdo do catálogo antes de recriá-lo**
> (`truncate` em iniciativas, categorias, tags, pessoas e log de atividade).
> Contas de usuário não são afetadas. Rode apenas em ambiente de
> desenvolvimento ou em instalação nova.

O seed cria 8 categorias, 20 tags, 16 pessoas fictícias e 22 iniciativas
distribuídas por todos os status do fluxo editorial — inclusive itens em
revisão, rascunho, rejeitado e arquivado, para o dashboard e a fila de revisão
terem o que mostrar.

### Notícias

`seed-noticias.sql` é separado e **não usa `truncate`**: ele remove só os oito
slugs que ele mesmo cria, então pode ser rodado numa instalação que já tem
notícias de verdade no ar sem levá-las junto.

São seis publicadas, uma em rascunho e uma na fila de revisão, escolhidas para
cobrir o formato inteiro: com e sem chapéu, com e sem capa, galeria legendada,
intertítulos, listas e uma com nota de correção ("Atualizado em"). Precisa das
migrations 0009 e 0010 aplicadas antes.

---

## 4. Contas de acesso

O cadastro é **fechado**: contas são criadas por um administrador, em
`/admin/usuarios`. Só a primeira conta da instalação é exceção — sem ela não
existiria administrador para criar administrador.

### 4.1 A primeira conta

Com o app rodando, acesse `/criar-conta`. A tela só aparece **enquanto não
houver nenhum administrador ativo** (ela consulta `installation_has_admin()`);
depois disso, passa a informar que o cadastro é fechado e aponta para o login.

### 4.2 Desligar o cadastro aberto no Supabase

**Este passo é obrigatório e não pode ser feito por SQL.** Esconder a tela no
React não impede ninguém de chamar o endpoint de signup do GoTrue direto.

No painel: **Authentication → Providers → Email** → desmarque
**"Allow new users to sign up"**.

A migration 0007 cobre o caso de alguém esquecer: `handle_new_user` faz toda
conta que não seja a primeira nascer **inativa**, e `is_staff()` exige
`is_active`. Uma conta criada por fora do fluxo administrativo não enxerga nem
escreve nada até um admin liberá-la.

### 4.3 Publicar a Edge Function

Criar contas exige a `service_role key`, que **ignora todo o RLS** e por isso
nunca pode estar no frontend. Ela vive na Edge Function `criar-usuario`, do lado
do servidor; o navegador só consegue *pedir* a criação.

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy criar-usuario
```

Não é preciso configurar segredo algum: `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente nas Edge Functions.

> Sem este deploy, o botão **Nova conta** em `/admin/usuarios` falha com uma
> mensagem dizendo exatamente isso. O resto do painel funciona normalmente.

A função é protegida por duas checagens independentes:

1. `verify_jwt` (padrão das Edge Functions) recusa quem não tem sessão;
2. o código confirma, no banco, que quem pediu é administrador **ativo**.

A segunda não é redundante — um JWT válido prova que a pessoa está logada, não
que ela pode criar contas.

### 4.4 Depois de criada

A conta nasce ativa, com o papel escolhido e o e-mail já confirmado (quem criou
foi um administrador, então exigir confirmação só adicionaria dependência de
SMTP). A senha inicial é combinada fora da plataforma; a pessoa a troca em
**Configurações**.

Exclusão definitiva de contas continua sendo feita pelo painel do Supabase.

---

## 5. Modelo de dados

| Tabela | Papel |
|---|---|
| `profiles` | Espelho de `auth.users` com o papel (`admin` / `editor` / `reviewer`) e a flag `is_active`. **Fonte de verdade da autorização.** |
| `categories` | Categorias dinâmicas, com ícone, imagem e ordem de exibição. |
| `initiatives` | Entidade central. Guarda status, textos, contatos, localização e o `search_vector`. |
| `tags` / `initiative_tags` | Temas livres, N:N. |
| `people` / `initiative_people` | Responsáveis exibidos publicamente (não são contas de acesso), com papel e ordem por iniciativa. |
| `initiative_links` | Links relacionados (site, redes, repositórios). |
| `initiative_reviews` | Histórico do workflow. **Separado de `initiatives` de propósito**: as observações do revisor nunca ficam legíveis publicamente. |
| `news` | Notícias e comunicados. Mesmo enum de status e mesmo workflow das iniciativas. A coluna do título chama-se `name` para reaproveitar `ensure_unique_slug()` e `log_activity()`. |
| `news_reviews` | Histórico do workflow das notícias, espelho de `initiative_reviews` e pelo mesmo motivo. |
| `activity_log` | Timeline do dashboard. Escrito só por triggers `SECURITY DEFINER`. |

### Busca

`initiatives.search_vector` é um `tsvector` mantido por trigger que reúne, com
pesos diferentes: nome (A), categoria/resumo/tags/áreas (B), pessoas e texto
completo (C) e localização (D).

O texto é **desacentuado** antes de indexar; o frontend desacentua a consulta do
mesmo jeito (`normalizeSearch` em `src/lib/utils.js`), então "iniciativa
ambiental" encontra "Ambiental" com ou sem acento. O índice é um GIN sobre a
coluna, e a consulta usa `websearch_to_tsquery`, que aceita aspas e `-termo`.

Alterar uma tag, uma pessoa ou o nome de uma categoria reindexa apenas as
iniciativas afetadas.

---

## 6. Workflow editorial

```
        ┌──────────────────────────────┐
        ▼                              │
     rascunho ──► em revisão ──► publicado ──► arquivado
        ▲              │              │            │
        │              ▼              │            │
        └───────── rejeitado ◄────────┘            │
        ▲                                          │
        └──────────────────────────────────────────┘
```

**Notícias usam exatamente este fluxo.** `news` compartilha o enum
`initiative_status` e a função `allowed_transitions()`; o que muda é apenas o
trigger que aplica as regras (`enforce_news_workflow`) e a função de mudança de
status (`set_news_status`). A fila de `/admin/revisao` mostra os dois tipos
juntos, ordenados por data de envio.

A máquina de estados vive no banco, na função `allowed_transitions()` e no
trigger `enforce_initiative_workflow`:

- transições fora do mapa são recusadas com erro `42501`;
- **publicar, rejeitar e arquivar exigem papel `reviewer` ou `admin`** — e
  **qualquer saída de `published` também**, porque tirar conteúdo do ar é
  decisão editorial, não do autor. A interface esconde os botões, mas quem
  manda é o trigger;
- **conteúdo em `pending_review` fica congelado** para quem não revisa: o autor
  só pode devolver a iniciativa para rascunho, não editá-la na fila;
- `created_by` é sempre `auth.uid()` e não pode ser transferido pela API;
- `published_at` guarda a **primeira** publicação e não é reescrito.

Um editor pode editar o conteúdo de uma iniciativa já publicada que seja dele —
correções de texto entram no ar direto, sem nova revisão. Não há versionamento
de rascunho sobre conteúdo publicado neste MVP.

Mudanças de status passam pela função `set_initiative_status(id, status, notes)`,
que grava a observação do revisor no histórico na mesma transação.

---

## 7. Row Level Security

RLS está **habilitado em todas as tabelas**. Resumo das regras:

| Tabela | Anônimo | Editor | Revisor | Admin |
|---|---|---|---|---|
| `initiatives` | lê apenas `published` | lê tudo; cria; edita as próprias | + publica/rejeita/arquiva | + exclui |
| `initiative_tags` / `_people` / `_links` | lê os de iniciativas publicadas | escreve nos que pode editar | idem | idem |
| `categories` | lê | lê | lê | escreve |
| `tags` | lê | cria | cria | edita/exclui |
| `people` | lê | cria/edita | cria/edita | + exclui |
| `profiles` | — | lê a equipe; edita o próprio | idem | + muda papel e ativação |
| `initiative_reviews` | — | lê | lê e escreve | lê e escreve |
| `activity_log` | — | lê | lê | lê |

Detalhes que importam:

- Os helpers `is_staff()`, `is_admin()`, `can_review()` e `can_edit_initiative()`
  são `SECURITY DEFINER`. Sem isso, consultar `profiles` dentro de uma policy de
  `profiles` causaria recursão infinita.
- Desativar um usuário (`is_active = false`) revoga o acesso na hora: todos os
  helpers checam a flag.
- O trigger `guard_profile_changes` impede que alguém promova a si mesmo e que a
  instalação fique **sem nenhum administrador ativo**.
- Um usuário só pode inserir iniciativa com `created_by = auth.uid()`.

### Conferindo o RLS

No SQL Editor, confirme que nenhuma tabela ficou aberta:

```sql
select relname, relrowsecurity
  from pg_class
 where relnamespace = 'public'::regnamespace
   and relkind = 'r'
 order by relname;
```

Todas devem aparecer com `relrowsecurity = true`.

Para testar como visitante anônimo:

```sql
set local role anon;
select count(*) from public.initiatives;              -- só as publicadas
select count(*) from public.initiative_reviews;       -- deve dar erro/zero
reset role;
```

---

### Permissões de funções — a armadilha do EXECUTE

RLS protege **linhas**. Ele não diz nada sobre quem pode **chamar uma função**,
e no Supabase toda função nasce chamável por `anon` via
`POST /rest/v1/rpc/<nome>`. Numa função `SECURITY DEFINER`, que roda como dono
do banco, isso significa RLS contornado.

Pior: `revoke ... from public` **não resolve**. O Supabase concede EXECUTE
diretamente aos papéis `anon` e `authenticated` por `alter default privileges`,
e revogar do pseudo-papel `PUBLIC` não remove essa concessão. É preciso escrever
o papel:

```sql
revoke all on function public.minha_funcao() from public, anon, authenticated;
```

A migration 0008 corrigiu isso para as funções existentes e adicionou

```sql
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
```

para que a próxima função criada não nasça exposta. Repare no `public` da
lista: são **duas** concessões empilhadas — a do PostgreSQL ao pseudo-papel
PUBLIC e a que o Supabase acrescenta a `anon`/`authenticated`. Remover só a
segunda não adianta, porque `anon` é membro de PUBLIC e continua alcançando a
função por ali.

**Ao criar uma função nova, conceda EXECUTE explicitamente a quem precisa** — o
padrão agora é negar. Vale inclusive para funções usadas em `CHECK`: a
expressão da constraint é avaliada com as permissões de quem grava, então um
validador sem EXECUTE faria a gravação falhar com `permission denied for
function`. Por isso `is_hex_color`, `is_web_url` e `jsonb_urls_are_web` têm
concessão explícita — são puras, não tocam em tabela alguma.

Regra prática: só devem ser executáveis pelo cliente as funções desenhadas
como API (`set_initiative_status`, `set_news_status`, `dashboard_stats`,
`installation_has_admin`) e as referenciadas dentro de policies
(`is_staff`, `is_admin`, `can_review`, `auth_role`, `can_edit_initiative`,
`initiative_is_visible` — esta última também para `anon`, porque aparece em
policies aplicadas a ele).

---

## 8. Storage

Cinco buckets, criados por `20250101000004_storage.sql`,
`20250101000005_site_settings.sql` e `20250101000006_news.sql`:

| Bucket | Leitura | Escrita | Limite |
|---|---|---|---|
| `initiative-images` | pública | equipe ativa; remove quem enviou, revisor ou admin | 5 MB |
| `category-images` | pública | apenas admin | 5 MB |
| `avatars` | pública | cada um só na própria pasta `<uid>/…` | 2 MB |
| `site-assets` | pública | apenas admin | 2 MB |
| `news-images` | pública | equipe ativa; remove quem enviou, revisor ou admin | 5 MB |

`news-images` guarda a capa na raiz e as imagens da galeria em `galeria/` — a
mesma divisão de `initiative-images`.

A galeria da notícia é `news.gallery`, e não uma tabela filha, pelo mesmo motivo
que a de iniciativa: lista ordenada que só existe dentro do registro, sem
consulta independente. A diferença é o tipo — `jsonb` em vez de `text[]` —
porque cada foto de notícia carrega legenda e crédito junto da URL:

```json
[{ "url": "https://…/galeria/a.jpg", "caption": "…", "credit": "Foto: …" }]
```

Arrays paralelos (`gallery` + `gallery_captions`) foram descartados: nada
garantiria os três do mesmo tamanho, e a primeira remoção no meio da lista
desalinharia legenda e foto em silêncio. Duas constraints protegem a forma —
`news_gallery_is_array` e `news_gallery_urls_are_web`, esta última reaproveitando
`jsonb_urls_are_web()` da 0008.

A leitura é pública porque a vitrine é pública. Tamanho e MIME types são
validados **no servidor** (`file_size_limit` e `allowed_mime_types` do bucket),
não só no formulário.

`site-assets` guarda o logotipo e as marcas de apoio do rodapé, e é o único que
aceita SVG além dos formatos raster — formato natural de logotipo.

---

## 9. Identidade do site

`site_settings` guarda marca, cores e textos do cabeçalho e do rodapé, editados
em `/admin/aparencia`. Leitura é pública (a vitrine precisa dela para pintar a
primeira tela); escrita exige `is_admin()`.

A tabela é um **singleton garantido pelo schema**, não por convenção:

```sql
id boolean primary key default true,
constraint site_settings_singleton check (id)
```

A chave primária só admite o valor `true`, o que impede a segunda linha. Somado
à ausência de `grant insert` e `grant delete`, o cliente consegue apenas
atualizar a linha que a migration criou.

Duas regras adicionais moram no banco em vez de só no formulário, porque o
PostgREST aceita qualquer corpo de um cliente adulterado:

- `site_settings_colors_are_hex` — toda cor é `null` ou `#rrggbb`. Uma string
  arbitrária aqui vazaria direto para o `style` da página.
- `site_settings_lists_are_arrays` — `header_nav`, `footer_partners` e
  `footer_social` precisam ser arrays JSON.

Cor `null` significa "usar o token do design system", e não "sem cor": o tema
padrão em `src/index.css` segue sendo a fonte da verdade para quem não
personalizou.

---

## 10. Configuração de e-mail

A recuperação de senha usa o e-mail do Supabase. Em
**Authentication → URL Configuration**, defina:

- **Site URL**: a URL pública do deploy (ex.: `https://vitrine.exemplo.com`)
- **Redirect URLs**: acrescente `https://SEU-DOMINIO/redefinir-senha`

Sem isso o link do e-mail volta para `localhost`.

O servidor SMTP padrão do Supabase tem limite baixo de envios; para produção,
configure um SMTP próprio em **Project Settings → Auth → SMTP Settings**.
