# Banco — migrations, RLS e arquivos

O banco é um PostgreSQL 17 em container (`db` no `docker-compose.yml`). Ele não
guarda só os dados: guarda as **regras**. O workflow editorial, a geração de
slugs, o índice de busca, o log de atividade e quem pode ler e escrever o quê
são gatilhos, funções e policies de Row Level Security escritos aqui. A API
(`server/`) é fina de propósito — valida a entrada, assume o papel de quem
pediu e repassa.

```
db/
├── migrations/
│   ├── 20250101000000_base.sql            papéis, auth e storage (o que o Supabase fornecia)
│   ├── 20250101000001_schema.sql          tabelas, tipos e índices
│   ├── 20250101000002_functions.sql       slugs, busca, workflow, log de atividade
│   ├── 20250101000003_rls.sql             policies de Row Level Security
│   ├── 20250101000004_storage.sql         buckets e policies de arquivos
│   ├── 20250101000005_site_settings.sql   identidade do cabeçalho e do rodapé
│   ├── 20250101000006_news.sql            notícias (mesmo workflow editorial)
│   ├── 20250101000007_closed_signup.sql   cadastro fechado
│   ├── 20250101000008_harden_function_grants.sql  permissões de funções
│   ├── 20250101000009_news_gallery.sql    galeria de imagens nas notícias
│   ├── 20250101000010_news_editorial.sql  chapéu, legendas, créditos, correção
│   ├── 20250101000011_connect_section.sql seção Conexão na home
│   ├── 20250101000012_public_authors.sql  autoria pública e alt da capa
│   ├── 20250101000013_profiles_public_columns.sql  correção: e-mail exposto em profiles
│   ├── 20250101000014_news_translations.sql        notícias em inglês e espanhol
│   └── 20251003000015_audiencia.sql       audiência de notícias e iniciativas
├── seed.sql                               dados de demonstração (⚠ apaga o catálogo)
├── seed-noticias.sql                      notícias de demonstração (não apaga nada)
├── seed-traducoes.sql                     traduções de demonstração (depois da 0014)
└── README.md
```

As migrations 0001 a 0014 foram escritas para o Supabase e **rodam sem
alteração**. Os comentários delas falam em PostgREST e em painel do Supabase:
é o histórico de cada decisão, e as regras continuam valendo do mesmo jeito.

---

## 1. Como a API usa o banco

A 0000 cria quatro papéis:

| Papel | Login | Para quê |
|---|---|---|
| `authenticator` | sim (senha `APP_DB_PASSWORD`) | A conexão da API. `NOINHERIT`: sozinho, não lê tabela nenhuma |
| `anon` | não | O visitante. A API assume este papel em toda requisição sem sessão |
| `authenticated` | não | A equipe logada. A API assume este papel com o id do usuário |
| `service_role` | não | Senha, sessão e registro de acesso. **Não** lê conteúdo nem ignora RLS |

A cada requisição, a API abre uma transação e faz:

```sql
select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub": "<id do usuário>"}', true);
```

— o mesmo contrato do PostgREST. `auth.uid()` lê esse `sub`, e as policies,
os gatilhos do workflow e o `created_by = auth.uid()` funcionam como no
Supabase. Esquecer de assumir um papel resulta em `permission denied`, nunca em
acesso irrestrito.

A 0000 também cria `auth.users` (contas, senha em bcrypt), `auth.sessions` e
`auth.password_resets` (só o hash dos tokens), e `storage.buckets` /
`storage.objects` (o registro dos arquivos, onde as policies de upload foram
escritas). O controle das migrations aplicadas fica em `app.schema_migrations`.

---

## 2. Migrations

`db/migrations/` é o changelog do banco. Cada arquivo roda **uma vez**, em
ordem, e fica registrado em `app.schema_migrations` com o checksum do
conteúdo, a duração e o commit que o aplicou. Quem executa é
`server/src/migrate.js`, no container `migrate`, que também define a senha do
`authenticator`.

```bash
docker compose run --rm migrate                                       # aplica o que falta
docker compose run --rm migrate node server/src/migrate.js --status   # aplicadas, pendentes, problemas
docker compose run --rm migrate node server/src/migrate.js --check    # só confere: 0 em dia, 10 há pendentes, 1 história quebrada
```

Em desenvolvimento, com o banco do `docker-compose.dev.yml` e o `server/.env`
preenchido: `npm run db:migrate` e `npm run db:status`.

**Tudo ou nada.** As pendentes rodam numa transação só: se a terceira de três
falha, as duas primeiras são desfeitas junto e o banco fica como estava. Uma
trava (`pg_advisory_lock`) impede duas execuções ao mesmo tempo. Antes de
aplicar qualquer coisa, o executor confere a história. Se um arquivo já
aplicado mudou, sumiu ou se uma migration nova tem data anterior à última
aplicada, **nada roda**.

No servidor, o deploy faz backup do banco antes de aplicar e só troca o app
depois que as migrations entraram ([`deploy/README.md`](../deploy/README.md#5-migrations-no-deploy)).

### Como escrever uma migration

```bash
npm run db:new -- "adiciona idioma em noticias"
#   Criada: db/migrations/20261005143000_adiciona_idioma_em_noticias.sql
npm run db:check        # as mesmas regras que a CI confere, contra a origin/main
```

O arquivo nasce com as regras num comentário. São seis, e a CI recusa o
pull request que quebra qualquer uma delas:

1. **Linear.** A data e hora (UTC) no nome definem a ordem, e uma migration
   nova vem sempre depois da última; o `db:new` garante isso. Uma migration
   com data no meio da história é recusada: o servidor já aplicou as que vêm
   depois dela.

2. **Imutável.** Depois que foi para a main, o arquivo não muda mais. O
   checksum gravado no servidor deixaria de bater, e o deploy para. Errou?
   Crie outra migration que corrige. Apagar ou renomear um arquivo também é
   recusado.

3. **Compatível com a versão anterior do app** (*expandir/contrair*). Um
   rollback volta o código, não o banco. Por isso cada migration precisa
   funcionar com o app de antes dela:
   - **expandir** (pode a qualquer hora): tabela nova, coluna anulável ou com
     `default`, índice, função nova;
   - **contrair** (remover ou renomear o que o código usa): só numa versão
     *seguinte*, quando nenhuma versão em uso depende mais daquilo.

   Renomear `title` para `headline`, por exemplo, são duas entregas:
   - **1ª:** cria `headline`, copia os dados e passa o código a usar
     `headline`;
   - **2ª**, quando a 1ª estiver estável: remove `title`.

4. **Destrutiva, declarada.** Uma migration destrutiva exige uma linha
   `-- destrutiva: <motivo>`. Contam como destrutivas:
   - `drop table`, `column`, `schema`, `type` ou `view`;
   - troca de tipo de coluna;
   - `rename`;
   - `truncate`;
   - `delete from`.

   A linha não proíbe nada. Ela obriga a decisão a aparecer na revisão. As 16
   migrations anteriores a esta regra ficam de fora dela.

5. **Permissões explícitas.** Tabela nova em `public` nasce sem grant para
   ninguém, e precisa de RLS ligado. Função nova nasce sem EXECUTE. Conceda
   explicitamente: veja a [seção 7](#permissões-de-funções--a-armadilha-do-execute).

6. **Sem transação, só quando não há outro jeito.** O
   `create index concurrently` não roda em transação: marque o arquivo com
   `-- migrate:no-transaction`. Havendo um desses entre as pendentes, cada
   arquivo vira a sua própria etapa.

Escrever de forma idempotente (`if not exists`, `create or replace`,
`drop policy if exists`) continua sendo boa prática. Mas não é isso que
impede uma migration de rodar duas vezes: quem impede é o registro em
`app.schema_migrations`.

Para abrir um `psql`:

```bash
docker compose exec db psql -U vitrine -d vitrine
```

---

## 3. Popular com dados de demonstração

```bash
docker compose run --rm migrate node server/src/migrate.js --seed
```

> ⚠️ **`seed.sql` apaga todo o conteúdo do catálogo antes de recriá-lo**
> (`truncate` em iniciativas, categorias, tags, pessoas e log de atividade).
> Contas de usuário não são afetadas. Rode apenas em ambiente de
> desenvolvimento ou em instalação nova.

O seed cria 8 categorias, 20 tags, 16 pessoas fictícias e 22 iniciativas
distribuídas por todos os status do fluxo editorial — inclusive itens em
revisão, rascunho, rejeitado e arquivado, para o dashboard e a fila de revisão
terem o que mostrar.

`seed-noticias.sql` **não usa `truncate`**: remove só os oito slugs que ele
mesmo cria. São seis notícias publicadas, uma em rascunho e uma na fila de
revisão, cobrindo o formato inteiro (chapéu, capa, galeria legendada,
intertítulos, listas, nota de correção). `seed-traducoes.sql` vem depois:
versões em inglês e espanhol de duas delas.

---

## 4. Contas de acesso

O cadastro é **fechado**: contas são criadas por um administrador, em
`/admin/usuarios`. Só a primeira conta da instalação é exceção — sem ela não
existiria administrador para criar administrador.

**A primeira conta.** `/criar-conta` só aparece enquanto não houver nenhum
administrador ativo (`installation_has_admin()`), e a API recusa o cadastro
assim que existe um — com uma trava (`pg_advisory_xact_lock`) para dois
cadastros simultâneos não virarem dois administradores. O gatilho
`handle_new_user` faz a primeira conta nascer administradora e ativa, e toda
outra criada por fora do painel nascer **inativa** (migration 0007).

**As demais** nascem em **Usuários**, numa transação só: a conta é gravada pelo
serviço e o papel é aplicado *como o administrador que pediu*, passando pelo
RLS e pelo gatilho `guard_profile_changes`. Antes, isso era uma Edge Function
com a `service_role key` do Supabase.

**Senha.** Em bcrypt, custo 10 — o formato do Supabase. Troca pela própria
pessoa em **Configurações** (pede a senha atual), por link de e-mail (com SMTP)
ou pelo administrador em **Usuários → Senha**. Toda troca encerra as sessões
abertas da conta.

**Excluir uma conta** de vez (desativar, em **Usuários**, já revoga todo o
acesso):

```sql
-- O perfil sai junto (on delete cascade). O que a pessoa criou fica, sem
-- autor (on delete set null).
--
-- CUIDADO: o gatilho guard_profile_changes, que impede ficar sem nenhum
-- administrador ativo, vale para ALTERAÇÃO de perfil, não para exclusão.
-- Por aqui o banco deixa apagar o último administrador; confira antes.
delete from auth.users where email = 'pessoa@instituicao.edu.br';
```

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
| `news_translations` | Versões da notícia em inglês e espanhol — só o texto (título, slug, chapéu, resumo, corpo, textos da capa e da galeria). Status, datas, autoria e imagens continuam em `news`, que guarda o original em português. `UNIQUE (news_id, locale)` e `UNIQUE (locale, slug)`. |
| `activity_log` | Timeline do dashboard. Escrito só por triggers `SECURITY DEFINER`. |
| `content_views` | Audiência: totais por dia × conteúdo × idioma × país/estado/cidade × canal. Só totais — nenhuma linha identifica um visitante. Escrita só por `record_content_view()` (migration 0015). |
| `auth.users` | Contas: e-mail e senha (bcrypt). A autorização NÃO mora aqui, e sim em `profiles`. |
| `auth.sessions` / `auth.password_resets` | Sessões do painel e links de senha. Só o SHA-256 do token. |
| `storage.buckets` / `storage.objects` | Limites de cada destino de upload e o registro de cada arquivo enviado. |

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
| `profiles` | lê **colunas públicas** de quem assinou notícia publicada | lê a equipe; edita o próprio | idem | + muda papel e ativação |
| `news` | lê apenas `published` | cria; edita as próprias | + publica/rejeita/arquiva | + exclui |
| `news_translations` | lê as de notícia `published`, **só as colunas públicas** | cria e edita nas próprias notícias; exclui fora do ar | + em qualquer notícia; tira do ar | idem |
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
- **A leitura pública de `profiles` (migration 0012) é restrita em duas
  dimensões, e as duas importam.** Por COLUNA, via `grant select (…)`: `anon`
  só alcança nome, slug, bio, cargo, foto e data de atualização do perfil —
  pedir `email`, `role` ou `is_active` faz o banco recusar a consulta
  inteira, em vez de devolver a coluna em branco. Por LINHA, via policy: só
  aparece quem tem alguma notícia `published`, então a equipe que nunca
  assinou nada continua invisível. Existe porque, sem isso, a assinatura da
  notícia voltava nula para quem não estava logado — ou seja, para todo
  visitante — e o campo `author` do JSON-LD saía vazio para o rastreador.

### Conferindo o RLS

No `psql` (`docker compose exec db psql -U vitrine -d vitrine`), confirme que
nenhuma tabela ficou aberta:

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
begin;
set local role anon;
select count(*) from public.initiatives;              -- só as publicadas
select count(*) from public.initiative_reviews;       -- permission denied
rollback;
```

O `npm run security` faz isso tudo, e mais, sozinho (README, seção 8).

---

### Permissões de funções — a armadilha do EXECUTE

RLS protege **linhas**. Ele não diz nada sobre quem pode **chamar uma função**.
No Supabase, toda função nascia chamável por `anon` via
`POST /rest/v1/rpc/<nome>` — numa função `SECURITY DEFINER`, que roda como dono
do banco, isso era RLS contornado.

Hoje nenhuma função fica exposta pela internet: só existem as rotas da API.
Mas os grants continuam sendo a segunda camada — se uma rota errar, o banco
ainda recusa —, e a história abaixo explica por que eles estão como estão.

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
`can_edit_news`, `initiative_is_visible` — esta última também para `anon`,
porque aparece em policies aplicadas a ele).

**O mesmo vale para tabelas.** O Supabase concedia SELECT, INSERT, UPDATE e
DELETE de toda tabela nova a `anon` e `authenticated` — foi assim que
`profiles` vazou e-mails até a 0013. O Postgres próprio não concede nada por
padrão: tabela nova nasce fechada, e cada grant é escrito na migration — por
coluna para `anon` quando nem toda coluna é pública, como a 0014 faz em
`news_translations`.

---

## 8. Arquivos (storage)

Os arquivos ficam em disco, no volume `arquivos`, e o Nginx os serve em
`/arquivos/<bucket>/<caminho>`. O banco guarda o **registro** de cada um em
`storage.objects` — e é nele que as policies das migrations 0004 a 0006
decidem quem envia para onde.

Cinco buckets:

| Bucket | Leitura | Escrita | Limite |
|---|---|---|---|
| `initiative-images` | pública | equipe ativa; remove quem enviou, revisor ou admin | 5 MB |
| `category-images` | pública | apenas admin | 5 MB |
| `avatars` | pública | cada um só na própria pasta `<uid>/…` | 2 MB |
| `site-assets` | pública | apenas admin | 2 MB |
| `news-images` | pública | equipe ativa; remove quem enviou, revisor ou admin | 5 MB |

**Como um upload passa.** A API lê o tipo do arquivo pelos primeiros bytes (não
pelo nome nem pelo cabeçalho), confere contra `allowed_mime_types` e
`file_size_limit` do bucket, monta um nome único e grava a linha em
`storage.objects` **com o papel de quem enviou**. Só se a policy aceitar o
arquivo vai para o disco — na mesma transação. Remover segue o caminho
inverso: o `delete` passa pela policy, e só a linha apagada leva o arquivo
junto.

`news-images` guarda a capa na raiz e as imagens da galeria em `galeria/` — a
mesma divisão de `initiative-images`. `site-assets` guarda o logotipo e as
marcas de apoio do rodapé, e é o único que aceita SVG além dos formatos raster
— formato natural de logotipo. O Nginx serve tudo com
`Content-Security-Policy: sandbox`: um SVG aberto direto pela URL não executa
script.

A galeria da notícia é `news.gallery`, e não uma tabela filha, pelo mesmo motivo
que a de iniciativa: lista ordenada que só existe dentro do registro, sem
consulta independente. A diferença é o tipo — `jsonb` em vez de `text[]` —
porque cada foto de notícia carrega legenda e crédito junto da URL:

```json
[{ "url": "https://…/arquivos/news-images/galeria/a.jpg", "caption": "…", "credit": "Foto: …" }]
```

Arrays paralelos (`gallery` + `gallery_captions`) foram descartados: nada
garantiria os três do mesmo tamanho, e a primeira remoção no meio da lista
desalinharia legenda e foto em silêncio. Duas constraints protegem a forma —
`news_gallery_is_array` e `news_gallery_urls_are_web`, esta última reaproveitando
`jsonb_urls_are_web()` da 0008.

As URLs gravadas são absolutas, com o domínio de `SITE_URL`. Trocar de domínio
exige trocar as URLs também — o mesmo `replace` que a ferramenta de importação
do Supabase faz (`server/src/tools/importar-supabase.js`, função
`rewriteUrls`).

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

Duas regras adicionais moram no banco em vez de só no formulário, porque um
cliente adulterado pode mandar qualquer corpo:

- `site_settings_colors_are_hex` — toda cor é `null` ou `#rrggbb`. Uma string
  arbitrária aqui vazaria direto para o `style` da página.
- `site_settings_lists_are_arrays` — `header_nav`, `footer_partners` e
  `footer_social` precisam ser arrays JSON.

Cor `null` significa "usar o token do design system", e não "sem cor": o tema
padrão em `src/styles/main.scss` segue sendo a fonte da verdade para quem não
personalizou.

---

## 10. E-mail

Só a redefinição de senha envia e-mail. Configure no `.env` da raiz:

```env
SMTP_HOST=smtp.instituicao.edu.br
SMTP_PORT=587            # 465 liga TLS direto; 587, STARTTLS
SMTP_USER=vitrine@instituicao.edu.br
SMTP_PASSWORD=…
MAIL_FROM="Vitrine <vitrine@instituicao.edu.br>"
```

O link vai com o domínio de `SITE_URL`, e sem ele o envio fica desligado: um
link montado a partir do cabeçalho `Host` da requisição poderia ser desviado
para outro domínio, levando um token válido junto. Sem SMTP, a tela de "esqueci
minha senha" avisa, e o administrador define a senha nova em **Usuários**.

---

## 11. Audiência

`content_views` (migration 0015) guarda totais por dia: uma linha por
combinação de dia, conteúdo, idioma, país, estado, cidade e canal, com
`views` e `visitors` somados a cada acesso (`on conflict … do update`).

- **Escrita:** só por `record_content_view()`, `SECURITY DEFINER`, executável só
  por `service_role`. Ela confere que o conteúdo está publicado — rascunho
  aberto por link vazado não conta — e ignora tipo desconhecido.
- **Leitura:** equipe ativa (`is_staff()`), por policy. Visitante não lê nada.
- **Sem chave estrangeira** para o conteúdo: `content_id` aponta para notícia
  OU iniciativa. Conteúdo excluído deixa a audiência que teve; o relatório o
  mostra como "excluído".
- **Fuso:** o dia é o de `ANALYTICS_TIMEZONE` (`TZ` do `.env`, padrão
  `America/Sao_Paulo`).

Consultas úteis:

```sql
-- Notícias mais lidas no mês passado
select n.name, sum(v.views) as views, sum(v.visitors) as leitores
  from content_views v join news n on n.id = v.content_id
 where v.content_type = 'news'
   and v.day >= date_trunc('month', now()) - interval '1 month'
   and v.day <  date_trunc('month', now())
 group by n.name order by views desc limit 20;

-- Acessos por estado no Brasil, no ano
select region, sum(views) from content_views
 where country = 'BR' and day >= date_trunc('year', now())
 group by region order by 2 desc;
```
