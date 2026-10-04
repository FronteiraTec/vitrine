# Vitrine Institucional

Catálogo público das iniciativas de uma instituição — projetos, laboratórios,
grupos de pesquisa, empresas juniores, startups, programas de extensão — com
área administrativa, fluxo de revisão editorial, notícias em três idiomas e
relatório de audiência.

O visitante encontra conteúdo por busca textual, categoria, área de atuação e
tema. A equipe cadastra pelo painel, envia para revisão e publica, e acompanha
quantas pessoas leram cada notícia e iniciativa, e de onde.

> Projeto de demonstração. Todo o conteúdo do seed é fictício e a identidade
> visual é própria — nada foi derivado de portais institucionais existentes.

---

## Sumário

1. [Stack](#1-stack)
2. [Requisitos](#2-requisitos)
3. [Subir com Docker](#3-subir-com-docker)
4. [Configuração (`.env`)](#4-configuração-env)
5. [Banco: migrations e dados de demonstração](#5-banco-migrations-e-dados-de-demonstração)
6. [Primeiro acesso e contas](#6-primeiro-acesso-e-contas)
7. [Desenvolvimento local](#7-desenvolvimento-local)
8. [Verificações](#8-verificações)
9. [Deploy no servidor](#9-deploy-no-servidor)
10. [Segurança e autorização](#10-segurança-e-autorização)
11. [Estrutura do projeto](#11-estrutura-do-projeto)
12. [Decisões de arquitetura](#12-decisões-de-arquitetura)
13. [SEO técnico, Google Search Console e Google News](#13-seo-técnico-google-search-console-e-google-news)
14. [Acessibilidade](#14-acessibilidade)
15. [Idiomas — português, inglês e espanhol](#15-idiomas--português-inglês-e-espanhol)
16. [Audiência](#16-audiência)
17. [Migrar do Supabase](#17-migrar-do-supabase)

---

## 1. Stack

Tudo roda em containers, orquestrado pelo `docker-compose.yml`:

| Container | Imagem | Papel |
|---|---|---|
| `db` | PostgreSQL 17 | Dados, regras de negócio (gatilhos) e autorização (RLS) |
| `migrate` | a da API | Aplica `db/migrations/` e encerra; a API só sobe depois dele |
| `api` | Node 22 + Express | Sessão, dados, uploads, páginas com `<head>` no servidor, sitemaps, RSS e audiência |
| `web` | Nginx 1.28 | Entrega o React construído e as imagens enviadas; repassa o resto à API |
| `geoipupdate` | MaxMind (opcional) | Mantém atualizada a base que estima país, estado e cidade da audiência |

| Camada | Tecnologia |
|---|---|
| Interface | React 19 + Vite 8 (JavaScript) |
| Estilo | Bootstrap 5.3 + SCSS (`src/styles/main.scss`) |
| Componentes | Radix UI (comportamento) com a aparência do Bootstrap |
| Ícones | lucide-react |
| Rotas | React Router 7 (data router) |
| Dados no cliente | TanStack Query |
| API | Node 22, Express 5, `pg`, `bcryptjs`, `multer`, `nodemailer`, `maxmind` |
| Banco | PostgreSQL 17 com Row Level Security |
| Acessibilidade | VLibras (suíte oficial) + Web Speech API |

```
                 ┌──────────────── web (Nginx) ────────────────┐
  visitante ───► │ /            → React (dist/)                 │
                 │ /arquivos/   → imagens enviadas (volume)     │
                 │ /api/, /noticia/…, /sitemap*.xml, /rss.xml ──┼──► api (Node) ──► db (Postgres)
                 └──────────────────────────────────────────────┘          │
                                                    geoipupdate ── volume ─┘ (base de localização)
```

**O banco continua sendo quem decide.** A API conecta como um papel que,
sozinho, não lê nada (`authenticator`). A cada requisição ela abre uma
transação, assume o papel de quem pediu — `anon` para o visitante,
`authenticated` com o id do usuário para a equipe — e as policies de RLS, os
gatilhos do workflow e `auth.uid()` fazem o resto, exatamente como faziam no
Supabase. As 14 migrations originais rodam sem alteração; a 0000 recria o
mínimo que o Supabase fornecia (papéis, `auth`, `storage`). Ver a
[seção 10](#10-segurança-e-autorização).

---

## 2. Requisitos

**No servidor:** Docker Engine 24+ com o plugin Compose v2 (`docker compose`),
2 GB de RAM livres e uns 2 GB de disco além do acervo de imagens. Nada mais —
Node, Postgres e Nginx vêm nas imagens.

**Para desenvolver:** Node.js 22 LTS e npm 10+, além do Docker para o banco.

---

## 3. Subir com Docker

```bash
git clone <url-do-repositorio>
cd vitrine/vitrine
cp .env.example .env          # preencha as senhas e o domínio (seção 4)
docker compose up -d --build
```

Na primeira vez: o `db` sobe, o `migrate` aplica as migrations e encerra, a
`api` sobe quando ele termina, e o `web` quando a API responde. Acompanhe com:

```bash
docker compose ps            # todos "healthy"; migrate "exited (0)"
docker compose logs -f api
```

O site fica em `http://SERVIDOR:8080` (porta de `HTTP_PORT`). Abra
`/criar-conta` para criar o primeiro administrador ([seção 6](#6-primeiro-acesso-e-contas)).

Com a base de localização da audiência (conta gratuita na MaxMind, [seção 16](#16-audiência)):

```bash
docker compose --profile geoip up -d
```

---

## 4. Configuração (`.env`)

O `docker-compose.yml` lê o `.env` da mesma pasta. O modelo comentado é o
`.env.example`.

| Variável | Obrigatória | Uso |
|---|---|---|
| `POSTGRES_PASSWORD` | sim | Senha do dono do banco. Só o `migrate` a usa |
| `APP_DB_PASSWORD` | sim | Senha do papel `authenticator`, com que a API conecta |
| `SITE_URL` | **em produção, sim** | Domínio público, sem barra no fim. Canônica, sitemaps, feed, `robots.txt`, URL das imagens enviadas e link do e-mail de senha |
| `HTTP_PORT` / `HTTP_BIND` | não | Porta e interface em que o Nginx atende (padrão `0.0.0.0:8080`) |
| `TRUSTED_PROXIES` | com proxy à frente | Faixas dos proxies confiáveis, para a API ver o IP real do visitante ([seção 9](#9-deploy-no-servidor)) |
| `REAL_IP_HEADER` | não | Cabeçalho com o IP real (padrão `X-Forwarded-For`; Cloudflare: `CF-Connecting-IP`) |
| `COOKIE_SECURE` | não | Cookie de sessão só por HTTPS. Vazio = segue o protocolo de `SITE_URL` |
| `TZ` | não | Fuso dos dias da audiência e dos logs (padrão `America/Sao_Paulo`) |
| `SMTP_*`, `MAIL_FROM` | não | E-mail de "esqueci minha senha" |
| `GEOIP_ACCOUNT_ID`, `GEOIP_LICENSE_KEY` | não | Conta MaxMind, para a localização da audiência |

**Senhas só com letras e números** — elas entram em URLs de conexão. Gere com
`openssl rand -hex 24`.

**`SITE_URL` entra no build do React** (canônica e `hreflang` no cliente) e no
`robots.txt`. Mudou o domínio? `docker compose build web && docker compose up -d`.

Sem `SITE_URL`, o site funciona com as URLs seguindo o endereço da
requisição — serve para testar, não para produção: cada domínio que apontasse
para o site geraria uma canônica diferente, e o e-mail de senha fica desligado
(um link montado a partir do cabeçalho `Host` poderia ser desviado para outro
domínio).

---

## 5. Banco: migrations e dados de demonstração

As migrations ficam em `db/migrations/` e são aplicadas pelo container
`migrate` a cada `docker compose up`, em ordem. Todas as pendentes entram
numa transação só: ou entram todas, ou nenhuma. O que já foi aplicado fica
em `app.schema_migrations`, com o checksum de cada arquivo. Rodar de novo só
aplica o que for novo.

```bash
docker compose run --rm migrate                     # aplicar à mão
docker compose run --rm migrate node server/src/migrate.js --seed   # + demonstração
```

> ⚠️ **`--seed` apaga o catálogo antes de recriá-lo** (`db/seed.sql` faz
> `truncate` em iniciativas, categorias, tags, pessoas e log de atividade).
> Contas não são afetadas. Use só em desenvolvimento ou em instalação nova.

O seed cria 8 categorias, 20 tags, 16 pessoas fictícias e 22 iniciativas em
todos os status do fluxo editorial, oito notícias (`seed-noticias.sql`) e as
versões em inglês e espanhol de duas delas (`seed-traducoes.sql`).

**Migration nova:** `npm run db:new -- "o que ela faz"`. A história é
**linear e imutável**: depois que um arquivo vai para a main, ele não muda
mais (errou? outra migration corrige), e uma migration nova vem sempre depois
da última. Cada uma precisa funcionar com a versão anterior do app, para que
o rollback seja possível. `npm run db:check` confere as regras, as mesmas que
a CI aplica. Detalhes em
[`db/README.md`](./db/README.md#como-escrever-uma-migration).

---

## 6. Primeiro acesso e contas

O cadastro é **fechado**. A única exceção é a primeira conta: com o site no
ar, abra `/criar-conta` — a tela só aparece enquanto não existe nenhum
administrador ativo, e a API recusa o cadastro assim que existe um. A conta
criada vira administradora e já entra logada.

Daí em diante, contas nascem em **Usuários** (`/admin/usuarios`), pelo
administrador, já ativas e com o papel escolhido. A senha inicial é combinada
fora da plataforma; a pessoa a troca em **Configurações** (pede a senha
atual).

**Esqueceu a senha?**

- Com SMTP configurado (`SMTP_*`, `MAIL_FROM` e `SITE_URL`), "Esqueci minha
  senha" envia um link de uso único, válido por uma hora.
- Sem SMTP, a tela avisa que o envio não está disponível, e um administrador
  define uma senha nova em **Usuários → Senha**. As sessões abertas da pessoa
  são encerradas na hora.

Desativar alguém em **Usuários** revoga todo o acesso imediatamente, sem
apagar o que a pessoa publicou. Exclusão definitiva é feita no banco
([`db/README.md`](./db/README.md#4-contas-de-acesso)).

---

## 7. Desenvolvimento local

O banco em container, a API e o React rodando na máquina, com recarga ao
salvar:

```bash
npm install
npm install --prefix server

cp .env.example .env                     # senhas de desenvolvimento
cp server/.env.example server/.env       # as MESMAS senhas, banco em localhost

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db migrate
docker compose run --rm migrate node server/src/migrate.js --seed   # opcional

npm run dev:api      # API em http://localhost:3000
npm run dev          # React em http://localhost:5173
```

O Vite repassa `/api` e `/arquivos` à API (`vite.config.js`): mesma origem,
como em produção, então o cookie de sessão e a checagem de origem funcionam
igual. As imagens enviadas em desenvolvimento ficam em `.uploads/`.

No `npm run dev` as notícias usam o `<head>` que o cliente escreve depois de
carregar; o renderizado no servidor aparece quando o site é servido pelo
Nginx (`docker compose up`).

Rotas principais:

```
/                            vitrine pública
/buscar                      busca com filtros
/categorias                  lista de categorias
/categoria/:slug             iniciativas de uma categoria
/iniciativa/:slug            página de detalhes
/noticias                    lista de notícias        (head renderizado no servidor)
/noticia/:slug               notícia                  (head renderizado no servidor)
/en/news · /es/noticias      lista em inglês/espanhol (head renderizado no servidor)
/en/news/:slug               notícia em inglês        (head renderizado no servidor)
/es/noticia/:slug            notícia em espanhol      (head renderizado no servidor)
/autor/:slug                 perfil do autor e o que ele assinou
/sobre                       como a plataforma funciona
/expediente                  quem responde pelo conteúdo
/politica-editorial          critérios de produção e correção
/contato                     canais da redação
/acessibilidade              recursos e limitações conhecidas
/entrar                      login
/admin                       dashboard
/admin/iniciativas           CRUD de iniciativas
/admin/noticias              CRUD de notícias
/admin/noticias/:id/traducoes/:locale   tradução de uma notícia (en, es)
/admin/revisao               fila de aprovação      (revisor/admin)
/admin/audiencia             acessos, origem e Excel
/admin/categorias            CRUD de categorias     (admin)
/admin/pessoas               cadastro de pessoas
/admin/usuarios              papéis, ativação e senha (admin)
/admin/atividade             log, filtros e Excel   (admin)
/admin/aparencia             cabeçalho e rodapé     (admin)
/admin/configuracoes         perfil e senha

/sitemap.xml                 índice de sitemaps        (API)
/sitemap-paginas.xml         páginas, categorias, autores
/sitemap-noticias.xml        acervo de notícias
/sitemap-google-news.xml     últimas 48 h, formato Google News
/rss.xml                     feed RSS 2.0              (API)
```

---

## 8. Verificações

```bash
npm run lint       # ESLint (React, API e scripts)
npm run build      # build de produção + robots.txt com o domínio real
npm run smoke      # renderiza todas as telas e falha se alguma quebrar
npm run css        # classes órfãs, precedência e resets (rode depois do build)
npm run seo        # metadados, JSON-LD, sitemaps e feed, contra dados simulados
npm run security   # ataca a API (e o banco) sem autenticação; falha se abrir porta
```

O `npm run smoke` monta cada página com `renderToString` fora do navegador.
Ele existe porque `build` e `lint` não executam a árvore de componentes: erros
que só aparecem quando o React realmente renderiza — `asChild` com filhos
demais, componente indefinido, leitura de propriedade em `undefined` —
passariam despercebidos até alguém abrir a página. Inclui a tela de audiência
com e sem dados.

O `npm run css` confronta cada classe do JSX com o CSS realmente compilado. No
Bootstrap uma classe inventada não dá erro — simplesmente não faz efeito.
Exige `npm run build:only` antes.

O `npm run seo` roda as páginas que a API renderiza contra dados simulados:
escape de XML e de JSON-LD, ausência de `og:title` duplicado, datas no formato
que o RSS exige, `<news:language>` de duas letras, 404 de verdade em slug
inexistente. Nenhuma dessas falhas derruba o site — elas aparecem semanas
depois, como "0 URLs descobertas" no Search Console ou link sem prévia no
WhatsApp.

O `npm run security` tem duas camadas. A primeira ataca a API de fora, como
um visitante sem sessão: área administrativa, escrita, upload, troca de senha,
pedido de outra origem, cadastro depois do primeiro administrador. A segunda,
com `ADMIN_DATABASE_URL`, entra no banco e assume os papéis que a API usa
(`anon`, `authenticator`, `service_role`) para conferir que cada um só alcança
o que deve — a defesa que sobra se um dia uma rota errar. Como o banco não tem
porta exposta, rode as duas de dentro do compose:

```bash
docker compose run --rm -e API_URL=http://web \
  -v "$PWD/scripts:/app/scripts:ro" migrate node scripts/security-check.mjs
```

Rode depois de mexer em rotas da API ou em migrations.

---

## 9. Deploy no servidor

### 9.1 HTTPS e proxy da instituição

O Nginx do projeto atende em HTTP na porta `HTTP_PORT`. O HTTPS fica a cargo
de quem está à frente — o proxy reverso da instituição, um balanceador ou o
Cloudflare. Três ajustes quando há um proxy no caminho:

1. **`SITE_URL` com `https://`** — o cookie de sessão passa a ser `Secure`.
2. **`TRUSTED_PROXIES`** com a faixa de onde o proxy chega (ex.:
   `10.0.0.0/8`). Sem isso, todo acesso parece vir do proxy: a audiência
   mostraria um país só, e o limite de tentativas de login bloquearia todo
   mundo junto. **Nunca** inclua uma faixa por onde chegam visitantes comuns:
   eles poderiam forjar o próprio IP.
3. O proxy precisa repassar `Host` e `X-Forwarded-For` (e, de preferência,
   `X-Forwarded-Proto`). Com o Cloudflare, use `REAL_IP_HEADER=CF-Connecting-IP`
   e as faixas publicadas por ele em `TRUSTED_PROXIES`.

Se o proxy roda na mesma máquina, `HTTP_BIND=127.0.0.1` deixa a porta
acessível só para ele.

### 9.2 VPS de validação — deploy automático

A versão em validação roda numa VPS compartilhada com outros sistemas e se
atualiza sozinha:

```
git push origin main  →  GitHub Actions: testes → imagens → deploy  →  https://vitrine.fronteiratec.com
```

- **Imagens testadas.** O Actions constrói as imagens uma vez e as testa com
  a stack inteira (integração e segurança). Depois as publica no `ghcr.io`
  com a tag do commit.
- **Deploy na VPS.** A VPS baixa as imagens, faz backup e aplica as
  migrations. Depois troca o app e confere a saúde; se a versão nova não fica
  saudável, volta sozinha para a anterior.
- **Isolamento.** A Vitrine não publica porta no host. Ela entra pela borda
  HTTPS (Caddy) que a VPS já tinha.

Configuração, rollback, restore, backups e problemas conhecidos estão em
[`deploy/README.md`](./deploy/README.md).

### 9.3 Outro servidor — atualizar à mão

Num servidor sem o GitHub Actions, com o `.env` preenchido:

```bash
git pull
docker compose up -d --build
```

O `migrate` aplica as migrations novas antes de a API nova subir. Os dados
ficam nos volumes `db-data` (banco), `arquivos` (imagens) e `geoip` (base de
localização), que sobrevivem a rebuild e a `docker compose down`. **Só
`docker compose down -v` apaga os volumes** — não use em produção.

#### Backup

O que precisa de backup são os dois primeiros volumes:

```bash
# Banco (formato custom, restaurável com pg_restore)
docker compose exec -T db pg_dump -U vitrine -Fc vitrine > vitrine-$(date +%F).dump

# Imagens enviadas
docker run --rm -v vitrine_arquivos:/dados:ro -v "$PWD":/backup alpine \
  tar czf /backup/arquivos-$(date +%F).tar.gz -C /dados .
```

Restaurar num servidor novo, com a stack já no ar e o banco vazio:

```bash
docker compose exec -T db pg_restore -U vitrine -d vitrine --clean --if-exists < vitrine-AAAA-MM-DD.dump
docker run --rm -v vitrine_arquivos:/dados -v "$PWD":/backup alpine \
  tar xzf /backup/arquivos-AAAA-MM-DD.tar.gz -C /dados
docker compose run --rm migrate      # redefine a senha do authenticator
```

#### Logs e saúde

```bash
docker compose ps                  # saúde de cada container
docker compose logs -f api web     # erros da API, acessos do Nginx
curl -s http://localhost:8080/api/health          # a API está viva
curl -s http://localhost:8080/api/health/ready    # banco ok e migrations em dia (503 se não)
curl -s http://localhost:8080/version.json        # o commit que está sendo servido
```

A API registra no log: falha de envio de e-mail, falha ao registrar acesso e
erro inesperado de rota (com o caminho). Sessões vencidas e links de senha
usados são apagados do banco de hora em hora.

---

## 10. Segurança e autorização

RLS está ligado em **todas** as tabelas de `public` e `storage`, e nunca foi
desligado para facilitar o desenvolvimento. As policies estão em
[`db/migrations/`](./db/migrations) e explicadas em
[`db/README.md`](./db/README.md#7-row-level-security).

Em resumo:

- **Anônimo** enxerga apenas iniciativas e notícias `published` e os registros
  filhos delas. As observações do revisor ficam em outra tabela, invisível ao
  público.
- **Anônimo também lê a autoria**, mas só um recorte: nome, slug, bio, cargo e
  foto de quem assinou notícia publicada. E-mail, papel e situação ficam de
  fora por `grant` de coluna — pedir um deles faz o banco recusar a consulta.
- **Editor** cria iniciativas e notícias e edita as próprias.
- **Revisor** publica, rejeita e arquiva.
- **Admin** tem acesso completo, incluindo categorias, usuários e exclusão.

**Como a API respeita isso.** Ela conecta como `authenticator` (NOINHERIT: não
lê tabela nenhuma sozinho) e, em cada requisição, abre uma transação com
`set_config('role', …)` e `set_config('request.jwt.claims', …)` — o mesmo
contrato do PostgREST. Um caminho de código que esquecesse de assumir um papel
receberia "permission denied", nunca acesso irrestrito. O papel
`service_role` cobre o que não pertence a usuário nenhum (conferir senha,
abrir sessão, registrar acesso) e **não** lê conteúdo.

**Sessão.** Cookie `httpOnly`, `SameSite=Lax`, `Secure` com HTTPS, com um
token aleatório de 256 bits; o banco guarda só o SHA-256 dele. Escrita só de
mesma origem (`Origin` e `Sec-Fetch-Site`). Senhas em bcrypt — o formato do
Supabase, então contas importadas entram com a senha de antes. Limite de
tentativas no Nginx (POST de `/api/auth/`) e na API (por IP e por e-mail).

**Uploads.** O tipo do arquivo é lido dos primeiros bytes, não do nome nem do
cabeçalho; o limite de tamanho e os formatos aceitos são os do bucket; e quem
pode enviar para onde é decidido pela policy de `storage.objects` — a API grava
o registro do arquivo com o papel de quem enviou, e só se o RLS aceitar o
arquivo vai para o disco. O Nginx serve `/arquivos/` com
`Content-Security-Policy: sandbox`: um SVG aberto direto pela URL não executa
script.

As guardas de rota no React são **conveniência de interface**. Forçar a URL do
painel não revela nada: a API exige sessão, e o banco, o papel.

---

## 11. Estrutura do projeto

```
vitrine/
├── docker-compose.yml          a stack: db, migrate, api, web, geoipupdate
├── docker-compose.dev.yml      desenvolvimento: só o banco, porta local
├── .env.example                configuração (copie para .env)
├── docker/web/
│   ├── Dockerfile              build do React + Nginx
│   ├── nginx.conf              rotas, cache, limites, cabeçalhos
│   ├── snippets/               repasse à API e cabeçalhos de segurança
│   └── 40-real-ip.sh           IP real atrás de proxy (TRUSTED_PROXIES)
├── server/                     API (Node)
│   ├── Dockerfile
│   └── src/
│       ├── index.js · app.js   subida, rotas, CSRF
│       ├── config.js           variáveis de ambiente
│       ├── db.js               conexão e troca de papel por requisição
│       ├── migrate.js          aplica db/migrations (migrations.js: as regras)
│       ├── health.js           /api/health e /api/health/ready
│       ├── auth/               sessão, senha, e-mail, contas
│       ├── routes/             iniciativas, notícias, catálogo, painel, arquivos
│       ├── analytics/          registro de acessos, localização, canal, relatório
│       ├── seo/                notícia, listas, sitemaps e RSS com o <head> no servidor
│       └── tools/              importar-supabase.js
├── db/
│   ├── migrations/             0000 (base) a 0015 (audiência)
│   ├── seed*.sql               dados de demonstração
│   └── README.md               guia do banco
├── deploy/                     VPS: compose do servidor, borda Caddy, scripts
│   └── README.md               guia de deploy e operação
├── public/                     favicon, robots.txt
├── scripts/                    smoke, seo, security, css, robots, api-check, migrations
└── src/
    ├── i18n/                   idiomas, rotas por idioma — cliente E servidor
    ├── components/
    │   ├── accessibility/      painel do leitor, VLibras, leitura em voz alta
    │   ├── ui/                 primitivas (button, dialog, popover, select, …)
    │   ├── layout/             PublicLayout, AdminLayout, Logo, SiteTheme, LanguageSwitcher
    │   ├── admin/              formulários, upload, workflow, gráficos, audiência
    │   └── …
    ├── pages/                  public/, admin/, auth/
    ├── services/               chamadas à API, por domínio
    ├── hooks/                  TanStack Query, SEO, audiência, preferências de acesso
    ├── lib/
    │   ├── api.js              cliente HTTP da API
    │   ├── seo.js              metadados, hreflang e JSON-LD — cliente E servidor
    │   ├── news-translations.js notícia montada num idioma — cliente E servidor
    │   ├── audience.js         registro de acessos e rótulos do relatório
    │   └── xlsx.js             planilha .xlsx sem dependência (várias abas)
    ├── contexts/               AuthContext, LocaleContext
    └── styles/main.scss
```

**Camadas:** as páginas não chamam a API diretamente. Elas usam hooks
(`src/hooks/use-queries.js`), que chamam serviços (`src/services/`), que são os
únicos que conhecem os endereços. A API devolve os dados no mesmo formato que
o PostgREST devolvia (`category`, `tags`, `author`, `translations` embutidos):
a troca de backend não mexeu em nenhuma tela.

---

## 12. Decisões de arquitetura

**Regras de negócio no banco, não no frontend nem na API.**
A máquina de estados do workflow, a geração de slugs únicos, o índice de busca e
o log de atividade são gatilhos e funções em SQL. O frontend decide o que
*mostrar*; o banco decide o que é *permitido*. A API é fina de propósito: valida
a entrada, assume o papel de quem pediu e repassa. Um cliente adulterado — ou
uma rota da API com defeito — não publica nada que não devesse.

**A API não expõe um banco genérico.** No Supabase, o PostgREST abria toda
tabela à internet, e a segurança dependia de cada `grant` estar certo (a
migration 0013 corrigiu justamente um que não estava). Aqui só existem as
rotas que o site usa, e o RLS continua atrás delas como segunda camada.

**Gravação em transação.** Salvar uma iniciativa grava o registro, as tags, a
equipe e os links numa transação só: ou tudo entra, ou nada muda. Com o
PostgREST eram quatro requisições, e uma falha no meio deixava os vínculos pela
metade.

**Busca com um índice, não com vários filtros encadeados.**
`initiatives.search_vector` reúne nome, resumo, texto, categoria, tags, pessoas,
áreas e localização em um único `tsvector` com pesos, indexado por GIN. Uma
consulta resolve tudo — sem `ilike` em cinco colunas nem N+1.

**Paginação sempre.** Nenhuma tela carrega o catálogo inteiro, e a API impõe
teto ao tamanho de página.

**Estado da busca na URL.** Filtros, ordenação e página vivem na query string
— inclusive na tela de audiência. O resultado é compartilhável, sobrevive ao
recarregar e o botão "voltar" funciona.

**Painel carregado sob demanda.** Todo o `/admin` está atrás de `React.lazy`.
Quem só visita a vitrine não baixa o código administrativo.

**Um único tema, bem executado.** Não há modo escuro. A escolha foi investir em
consistência tipográfica, espaçamento e estados de interação num tema só.

**Notícias reaproveitam o workflow, não o duplicam.** `news` usa o mesmo enum
`initiative_status` e a mesma função `allowed_transitions()` das iniciativas — a
máquina de estados tem uma definição só. A fila de `/admin/revisao` mistura os
dois tipos ordenados por data de envio. A coluna do título chama-se `name`, e
não `title`, para reaproveitar sem cópia os gatilhos genéricos
`ensure_unique_slug()` e `log_activity()`.

**A notícia segue o formato de jornal, sem editor de HTML.** Chapéu, linha fina,
assinatura, data, compartilhamento, capa com legenda e crédito, galeria e
"Atualizado em". O corpo é gravado como **texto puro**, com convenções no estilo
do markdown que `parseArticleBody()` reconhece, e devolve blocos que o React
escapa — sem marcação do usuário dentro da página pública. O vídeo nunca usa o
link digitado: só o identificador do YouTube é extraído, e o `src` do iframe é
montado sobre `youtube-nocookie.com`. No painel, o texto é escrito num editor em
blocos (`ArticleEditor`), feito sem dependência nova.

**Identidade é dado, e cor em branco é herança.** Marca, cores e textos do
cabeçalho e do rodapé vivem em `site_settings`, uma linha só — o singleton é
garantido pelo schema. Cada cor é opcional: `null` significa "usar o token do
design system".

**Cores de dados validadas, não escolhidas no olho.** A paleta de status do
dashboard foi verificada para separação sob daltonismo, piso de distinção em
visão normal e contraste mínimo. Os gráficos de audiência usam uma cor só — a
identidade de cada barra está no rótulo — e todo gráfico tem alternativa em
tabela, então a cor nunca é a única portadora de informação.

### Limitações conhecidas

- **O corpo da notícia ainda é montado no cliente.** O `<head>` é renderizado
  no servidor (seção 13) e o dado estruturado leva `articleBody`, então o texto
  chega ao rastreador na primeira leitura do HTML. Mas o que a pessoa vê
  continua dependendo do JavaScript.
- **Uma réplica da API.** O limite de tentativas de login fica em memória, o
  que basta para um processo. Com várias réplicas atrás de um balanceador, cada
  uma contaria à parte — o `limit_req` do Nginx continua valendo para todas.
- **Bloqueio temporário por e-mail.** Oito senhas erradas para o mesmo e-mail
  bloqueiam novas tentativas dele por 15 minutos — inclusive de quem é dono da
  conta. É o preço de dificultar adivinhação dirigida.
- **Audiência a partir da implantação.** A contagem começa quando este recurso
  entra no ar; não há como recuperar acessos anteriores. Ver a seção 16.

---

## 13. SEO técnico, Google Search Console e Google News

### 13.1 O problema que isto resolve

A vitrine é uma SPA. Sem nada no servidor, o HTML entregue em `/noticia/:slug` é
sempre o mesmo `index.html` genérico: título, descrição e imagem só aparecem
depois que o JavaScript roda.

Consequências concretas, nesta ordem de gravidade:

1. **WhatsApp, Facebook e X não executam JavaScript.** Todo link de notícia
   compartilhado saía sem prévia — sem título, sem foto, sem descrição. Para um
   veículo que depende de circulação em grupo de WhatsApp, isso é fatal.
2. O Googlebot executa JavaScript, mas em uma segunda passagem, com atraso de
   horas a dias. Em notícia, atraso é justamente o que não se pode pagar.
3. O sitemap era escrito no `build`. Uma matéria publicada às 9h só entraria no
   arquivo no próximo deploy — e quem publica notícia não faz deploy.

### 13.2 Como está resolvido

**Uma definição, dois consumidores.** `src/lib/seo.js` não importa nada do Vite
nem do navegador. Ele é usado pelo cliente (`src/hooks/use-seo.js`) e pela API
(`server/src/seo/`). Os dois lados chegam ao mesmo `<head>` por construção,
não por disciplina de quem mantém.

Isso é o que separa renderização legítima de **cloaking**: a resposta é idêntica
para leitor e para robô. Duas implementações divergiriam na primeira correção
feita de um lado só — e aí a diferença viraria cloaking sem ninguém ter
decidido isso.

| Rota | O que a API faz |
|---|---|
| `/noticia/:slug` · `/en/news/:slug` · `/es/noticia/:slug` | Busca a notícia **no idioma da URL** e injeta título, descrição, Open Graph, Twitter Card, canônica, `hreflang`, `<html lang>` e três blocos JSON-LD no HTML. `s-maxage` de 5 min, para um proxy ou CDN à frente, se houver. Slug inexistente — inclusive o slug português sob `/en` — devolve **404 de verdade** + `noindex` |
| `/noticias` · `/en/news` · `/es/noticias` | `<head>` da lista em cada idioma, com `hreflang` para as listas que têm conteúdo. Lista traduzida ainda vazia responde `noindex, follow` |
| `/sitemap.xml` | Índice, aponta para os três abaixo |
| `/sitemap-paginas.xml` | Páginas fixas, categorias, iniciativas e autores |
| `/sitemap-noticias.xml` | Acervo completo de notícias, **uma `<url>` por versão de idioma**, ligadas por `xhtml:link hreflang` |
| `/sitemap-google-news.xml` | Só as **últimas 48 h**, no formato `news:news`, com `<news:language>` de cada versão (`pt`, `en`, `es`) |
| `/rss.xml` · `/feed.xml` | Feed RSS 2.0, 40 itens |

Essas páginas consultam o banco **como `anon`**, o papel do visitante. É o que
garante que elas enxerguem exatamente o que um visitante enxerga: uma notícia em
rascunho não vaza para o HTML nem para o sitemap porque o RLS continua
decidindo.

O Nginx repassa à API só esses endereços; o resto é a SPA. A casca
(`index.html`) em que o `<head>` é injetado vem do próprio Nginx
(`SHELL_URL`), para ter os nomes com hash do build que está no ar.

### 13.3 Dados estruturados

Cada notícia gera três blocos JSON-LD:

- **`NewsArticle`** — `headline` (cortado em 110 caracteres, que é o limite do
  Google em Top Stories), `datePublished`, `dateModified`, `image`, `author`
  com URL própria, `articleBody`, `isAccessibleForFree` e `mainEntityOfPage`.
- **`BreadcrumbList`** — Início › Notícias › título, no idioma da versão.
- **`WebSite`** — liga a página ao veículo.

Cada versão de idioma tem o próprio `NewsArticle`, com `inLanguage`, título,
descrição e `articleBody` naquele idioma. A tradução declara
`translationOfWork` apontando o original, e o original lista as traduções em
`workTranslation` — ver a [seção 15](#15-idiomas--português-inglês-e-espanhol).

O `publisher` é **`NewsMediaOrganization`**, não `Organization` genérica: é o
tipo que o schema.org reserva para quem publica jornalismo. Ele declara
`publishingPrinciples` (aponta para `/politica-editorial`) e `masthead` (aponta
para `/expediente`).

`articleBody` entra de propósito. É o mesmo texto que a pessoa lê, e é o que
permite ao rastreador entender a matéria já na primeira leitura do HTML, sem
esperar a renderização do JavaScript.

### 13.4 robots.txt

Gerado no build por `scripts/generate-robots.mjs`, com o domínio de `SITE_URL`
(que entra no build do `web` como `VITE_SITE_URL`).

**Há um grupo `User-agent` só, e isso é deliberado.** A tentação é escrever um
bloco `User-agent: Googlebot-News` para "garantir" o acesso do rastreador de
notícias. Seria um tiro no pé: quando existe um grupo específico para um robô,
ele obedece **apenas** àquele grupo e ignora o `*` inteiro — inclusive os
`Disallow` da área administrativa. Um bloco escrito para liberar acabaria
liberando o painel junto.

E `Disallow` impede o **rastreamento**, não a indexação: uma URL bloqueada ainda
pode entrar no índice se alguém apontar um link para ela. Por isso as telas de
login e do painel também trazem `noindex` na própria página.

### 13.5 Colocar no ar e configurar o Search Console

**1. Domínio e variável.** Aponte o domínio para o servidor e defina
`SITE_URL=https://seu-dominio.com.br` (sem barra no fim) no `.env`. Reconstrua
o `web` (`docker compose up -d --build`) — a variável entra no bundle e no
`robots.txt` em tempo de build.

**2. Confirme antes de cadastrar.** Vale checar na mão, porque erro aqui custa
semanas:

```bash
curl -s https://seu-dominio.com.br/robots.txt
curl -s https://seu-dominio.com.br/sitemap.xml
curl -s https://seu-dominio.com.br/sitemap-google-news.xml
curl -s https://seu-dominio.com.br/rss.xml

# O head precisa vir preenchido no HTML BRUTO, sem executar JavaScript:
curl -s https://seu-dominio.com.br/noticia/UM-SLUG-REAL | grep -i "og:title"

# Slug inexistente precisa responder 404, e não 200:
curl -s -o /dev/null -w "%{http_code}" https://seu-dominio.com.br/noticia/nao-existe

# Numa notícia traduzida, as versões se apontam — e a página declara o idioma:
curl -s https://seu-dominio.com.br/en/news/UM-SLUG-INGLES | grep -iE 'hreflang|<html'
```

**3. Search Console.** Em
[search.google.com/search-console](https://search.google.com/search-console),
adicione a propriedade. Prefira **Domínio** (verificação por registro DNS TXT):
ela cobre `http`, `https`, `www` e subdomínios de uma vez. A alternativa
**Prefixo de URL** aceita verificação por meta tag, mas trata `www` e sem-`www`
como sites diferentes.

**4. Envie os sitemaps.** Em **Sitemaps**, envie os quatro caminhos
separadamente (`sitemap.xml`, `sitemap-paginas.xml`, `sitemap-noticias.xml` e
`sitemap-google-news.xml`). Enviar só o índice funciona, mas os relatórios ficam
agregados e fica mais difícil ver qual parte falhou.

**5. Inspeção de URL.** Cole o endereço de uma notícia em **Inspeção de URL**,
depois **Testar URL ativa** e **Ver página testada**. Confira, no HTML
renderizado, se o título, o `og:title` e o bloco `application/ld+json` estão
presentes. Se estiverem, peça **Solicitar indexação** — uma vez, para a primeira
notícia. Não use isso como rotina: o sitemap é o canal para volume.

**6. Acompanhamento.** O que olhar:

| Relatório | O que revela |
|---|---|
| **Páginas** (Indexação) | "Descoberta – não indexada" em massa costuma ser conteúdo raso ou duplicado; "Rastreada – não indexada" costuma ser qualidade |
| **Sitemaps** | Descobertas vs. enviadas. Zero descobertas significa XML inválido ou URL errada |
| **Aprimoramentos → Artigos** | Erros de dados estruturados, por campo |
| **Experiência na página** | Core Web Vitals com dados de campo (leva cerca de 28 dias para acumular) |

Dados de indexação levam de **3 a 7 dias** para aparecer. Não conclua nada nas
primeiras 48 horas.

### 13.6 Ferramentas de auditoria

| Ferramenta | Para quê |
|---|---|
| [Rich Results Test](https://search.google.com/test/rich-results) | Valida o `NewsArticle`. É o teste que renderiza JavaScript |
| [Schema Markup Validator](https://validator.schema.org/) | Valida o schema.org inteiro, além do que o Google usa |
| [PageSpeed Insights](https://pagespeed.web.dev/) | Core Web Vitals, laboratório e campo |
| Lighthouse (DevTools) | Rode em **aba anônima**; extensões distorcem a medição |
| [axe DevTools](https://www.deque.com/axe/devtools/) | Acessibilidade automatizada — pega cerca de 30% dos problemas reais |
| [Validador de feed](https://validator.w3.org/feed/) | Confere o RSS |
| `npm run seo` | Tudo o que dá para verificar sem rede, antes do deploy |

### 13.7 Google News e Discover — o que isto **não** garante

Seja direto com quem patrocina o projeto:

**A elegibilidade e a distribuição no Google News e no Discover são decididas
pelos sistemas do Google.** Nenhuma marcação garante inclusão. O que este
projeto faz é remover os obstáculos técnicos: o rastreador consegue encontrar,
ler e entender o conteúdo, e o veículo se identifica de forma verificável.

O que **de fato** pesa, e não é código:

- conteúdo original e apurado, publicado com regularidade;
- autoria identificável, com páginas de autor reais;
- expediente, política editorial e contato preenchidos com informação verdadeira;
- correções transparentes.

Para o Google News, cadastre o veículo no
[Publisher Center](https://publishercenter.google.com/). O cadastro é sobre o
veículo — não sobre marcação.

Nada neste projeto tenta manipular ranqueamento. Não há keyword stuffing, texto
oculto, página duplicada artificial nem conteúdo gerado para preencher índice.

---

## 14. Acessibilidade

O site segue a **WCAG 2.2**, mirando o nível AA e alcançando AAA no critério de
contraste quando o modo de alto contraste está ativo. A página
`/acessibilidade` é a declaração pública — inclusive das limitações.

### 14.1 Painel do leitor

Botão flutuante no canto **inferior esquerdo** de toda página pública. À
esquerda de propósito: o VLibras desenha o próprio gatilho fixo à direita, e
dois botões no mesmo canto se sobreporiam.

| Controle | Comportamento |
|---|---|
| Tamanho do texto | Quatro degraus (1x a 1,45x) |
| Alto contraste | Preto e branco com destaque amarelo |
| Reduzir animações | Desliga transições e rolagem suave |
| Libras | Liga o VLibras, carregado sob demanda |

As preferências ficam em `localStorage` e são aplicadas como **atributos no
elemento raiz** (`data-font-scale`, `data-contrast`, `data-motion`). O CSS
resolve tudo a partir daí, então nenhum componente React precisa saber que isso
existe — e o painel administrativo, que não monta o widget, não é afetado.

Um script síncrono no `index.html` aplica os atributos **antes do primeiro
paint**. Sem ele, quem escolheu alto contraste veria o tema claro piscar em toda
navegação. É a única duplicação do vocabulário de `src/lib/a11y.js`, e é
consciente: mexeu lá, mexa aqui.

### 14.2 Tamanho do texto, não zoom

O ajuste multiplica **apenas os tamanhos de texto**, derivados das variáveis do
próprio Bootstrap (`$font-size-base`, `$h1-font-size`…).
Espaçamento, grade, áreas de toque e imagens continuam do mesmo tamanho — é a
diferença entre ampliar o texto e dar zoom na página. O RFS do Bootstrap fica desligado
(`$enable-rfs: false`): com títulos fluidos (`calc(1.375rem + 1.5vw)`) não haveria
como multiplicar por um fator sem recalcular a expressão inteira.

Os tamanhos do corpo da notícia estão em `.article-body`, `.article-title` e
`.article-lead`, todos multiplicados pelo mesmo fator — o texto que mais importa
não podia ser o único fora da escala.

### 14.3 Alto contraste

Preto, branco e amarelo. Relações medidas sobre o fundo: texto **21:1**, links e
foco **17,7:1**, erro **8,2:1** — todas acima do 7:1 do nível AAA (critério
1.4.6). Links ganham sublinhado, para que a distinção não dependa só da cor
(critério 1.4.1).

O modo liga junto `data-bs-theme="dark"`, o tema escuro do próprio Bootstrap.
Não é enfeite: com ele, cartões, formulários, tabelas, menus e bordas já se
recolorem sozinhos, e o SCSS do projeto só precisa empurrar o contraste até AAA.
Sem isso, cada componente novo sairia branco no meio da página preta.

Cabeçalho e rodapé recebem cor por `style` inline, vindo de `site_settings`.
Estilo inline vence seletor, então a única forma de neutralizá-lo é
`!important` — uso contido e deliberado: é a escolha de acessibilidade do leitor
passando à frente da escolha estética do administrador.

### 14.4 Leitura em voz alta

`TextToSpeech`, no topo de cada notícia, com a Web Speech API: ouvir, pausar,
continuar, parar e cinco velocidades (0,75x a 2x).

**O texto não é raspado do DOM.** A página passa a string montada a partir do
conteúdo editorial — chapéu, título, linha fina e corpo. Ler o DOM traria menu,
"Compartilhe", rótulos de botão e a lista de outras notícias junto.

O texto é enfileirado em **trechos curtos**, e não como um enunciado só: o
Chrome interrompe a fala de vozes remotas depois de cerca de 15 segundos, e uma
notícia inteira pararia no meio sem aviso. Fatiar por frase contorna isso sem o
truque de `pause()`/`resume()` em `setInterval`, que corta palavras ao meio.

Sem suporte no navegador, o componente **explica** em vez de falhar em silêncio.

### 14.5 VLibras

Integração com a suíte oficial do Governo Federal, em `src/lib/vlibras.js`.

**Carregado sob demanda.** O plugin baixa avatar 3D e dicionário — centenas de
KB e uma conexão a mais em toda visita. Como Core Web Vitals é prioridade
declarada, ele só entra quando o leitor liga o recurso. Ligado, a preferência
fica gravada e ele volta sozinho na próxima visita.

**Fora da árvore do React.** O contêiner é criado com `createElement` e
pendurado no `body`. O plugin reescreve esses nós por conta própria; se o React
os reconciliasse, uma re-renderização qualquer apagaria o avatar no meio de uma
tradução. Desligar **esconde** o contêiner em vez de removê-lo: o VLibras não
expõe teardown, e remover deixaria ouvintes e um worker órfãos.

**Limitação conhecida, documentada em `/acessibilidade`:** o botão que o próprio
plugin desenha é uma `div`, sem foco de teclado. Por isso o painel oferece um
`button` de verdade, alcançável por Tab, que aciona o tradutor por código.

E a ressalva que não pode faltar: **tradução automática não substitui intérprete
humano.** O texto de `/acessibilidade` diz isso ao leitor, sem eufemismo.

### 14.6 Teclado, foco e leitores de tela

- Skip link "Pular para o conteúdo" no primeiro Tab.
- `:focus-visible` global com contorno de 2 px; 3 px em amarelo no alto contraste.
- Marcos de página com elementos semânticos: `header`, `nav` com rótulo, `main`,
  `article`, `aside` e `footer`.
- Controles de liga/desliga são `button` com `aria-pressed`, e não `div` com
  `role="switch"`. O seletor de velocidade é um `select` nativo. Botão e select
  nativos já trazem foco, ativação por Enter e Espaço e anúncio de estado —
  reimplementar isso com ARIA só cria oportunidade de errar.
- O estado dos controles nunca é transmitido só pela cor: há rótulo textual
  ("Ativo" ou "Inativo") junto.
- O painel usa Radix Popover, que cuida do foco ao abrir, do retorno ao gatilho,
  do `Esc` e do `aria-expanded`.

### 14.7 Imagens

Capa e galeria têm campo próprio de **texto alternativo**, separado da legenda.
Não é sinônimo: a legenda contextualiza a cena para quem vê a foto ("O prefeito
durante o anúncio"), o alt descreve o que a imagem mostra para quem não a vê.

A página recua para a legenda quando o alt está vazio, e só usa `alt=""` quando
não há nenhum dos dois. Antes, a galeria repetia o título da notícia em toda
foto: para quem usa leitor de tela, três imagens viravam três vezes a mesma
manchete, sem informação nenhuma.

**Preencher é responsabilidade humana.** O sistema oferece o campo; o alt bom
depende de quem publica.

---

## 15. Idiomas — português, inglês e espanhol

A vitrine tem interface em três idiomas, e as **notícias** podem ter versão em
inglês e em espanhol, cada uma com endereço próprio. A tradução é feita pela
equipe, no painel — não há tradução automática nem Google Tradutor.

### 15.1 O seletor

No cabeçalho, "🇧🇷 PT ▾", ao lado da busca. As bandeiras são SVG (o Windows
não desenha emoji de bandeira) e são decorativas: o nome do idioma está
escrito, e o botão se anuncia como "Idioma: Português (PT). Alterar idioma".
É um menu do Radix: Enter, Espaço e setas abrem e percorrem, `Esc` fecha e
devolve o foco, e cada opção é `menuitemradio` com `aria-checked` e o `lang`
do próprio idioma.

Escolher um idioma grava a escolha em `localStorage` (`locale = "pt-BR" | "en"
| "es"`) e:

- numa notícia, leva à **mesma notícia** no idioma escolhido; sem tradução, ao
  original em português, com um aviso;
- numa lista de notícias, leva à lista daquele idioma;
- nas demais páginas, troca a interface sem mudar o endereço.

**Qual idioma vale** (`resolveUiLocale`, em `src/i18n/config.js`):

1. painel e login: sempre português;
2. a escolha gravada;
3. sem escolha, o idioma da URL (`/en/...` é inglês) — quem chegou por um
   resultado de busca em inglês lê em inglês;
4. sem nada disso, o idioma de conteúdo lido por último na sessão, e por fim
   português.

O rastreador nunca tem escolha gravada, então para ele a página é sempre a do
idioma da URL.

### 15.2 Textos da interface

Os dicionários ficam em `src/i18n/messages/`, um arquivo por idioma, com as
mesmas chaves. São módulos `.js` e não `.json` porque a API e os scripts
também os importam, e porque aceitam comentário. O português vai no
bundle; inglês e espanhol são baixados sob demanda (~8 KB gzip cada), antes da
primeira pintura, só por quem escolheu o idioma.

Nas páginas, `useLocale()` (em `src/contexts/LocaleContext.jsx`) entrega
`t('chave', { variavel })`, plurais por `Intl.PluralRules`, datas no formato
do idioma e `rich()` para frases com link ou negrito — a frase inteira fica na
tradução, sem ser cortada em pedaços.

**O que não se traduz:** nomes próprios e marcas (UFFS, INNE, Conexão INNE,
VLibras, Libras) e o **conteúdo do banco** — iniciativas, categorias, pessoas e
os textos que o administrador escreveu no painel. Esse conteúdo aparece como foi
escrito, marcado com `lang="pt-BR"` quando a interface está em outro idioma,
para o leitor de tela trocar de voz. Os textos padrão do rodapé (quando o
painel não personalizou) e os rótulos do menu padrão são traduzidos.

O painel administrativo continua só em português.

### 15.3 Endereços

```
/noticias               /en/news               /es/noticias
/noticia/:slug          /en/news/:slug         /es/noticia/:slug
```

O português mantém os endereços que já estavam no ar. O espanhol espelha a
forma (lista no plural, notícia no singular), e o inglês usa `news` nos dois.
Cada versão tem o **próprio slug**, gerado do título traduzido no primeiro
salvamento e estável depois disso.

Só as notícias têm endereço por idioma: iniciativas e categorias só existem em
português no banco, e uma URL `/en/...` servindo texto em português seria uma
versão falsa para o buscador.

### 15.4 O modelo de dados

`news` continua sendo a notícia — identidade, status, autoria, datas, capa,
galeria e o texto original. `news_translations` (migration 0014) guarda só o que
muda de um idioma para outro:

| Coluna | |
|---|---|
| `news_id`, `locale` | a notícia e o idioma (`en` ou `es`); `UNIQUE (news_id, locale)` |
| `name`, `slug` | título e endereço; `UNIQUE (locale, slug)` |
| `kicker`, `excerpt`, `content` | chapéu, resumo e corpo — título e corpo obrigatórios |
| `cover_alt`, `cover_caption` | textos da capa |
| `gallery` | legenda e alt de cada foto da galeria, casados pela URL |

Não há `meta_title` nem `meta_description`: o SEO deriva título e descrição do
próprio título e do resumo, e isso vale por idioma. O crédito das fotos não é
traduzido (é atribuição de autoria).

A tradução **não tem workflow próprio**: é pública quando a notícia é pública
(a mesma regra da correção de texto de uma notícia publicada). Edita quem
edita a notícia — autor, revisor ou administrador —, a fila de revisão congela
as traduções como congela a notícia, e tirar do ar a tradução de uma notícia
publicada é decisão de revisor. Tudo isso é RLS e gatilho no banco; o painel
só espelha. O visitante anônimo lê só as colunas públicas (`created_by` e
`updated_by` ficam de fora do grant).

### 15.5 Recuo quando não há tradução

O princípio: **nenhuma URL de um idioma serve conteúdo de outro.**

- `/en/news/:slug` sem versão em inglês responde **404 + `noindex`**. Não há
  redirecionamento automático nem "página inglesa" com texto em português.
- Quem escolheu espanhol e abre uma notícia sem espanhol lê o **original em
  português, na URL portuguesa**, com um aviso no idioma dele ("Esta noticia
  todavía no ha sido traducida al español…"). A canônica e o `hreflang` são os
  do original — nada ali se declara espanhol.
- As listas `/en/news` e `/es/noticias` mostram **só** o que existe no idioma.
  Enquanto uma delas está vazia, a página explica e mostra as últimas no
  original, cada uma marcada "En portugués", e responde `noindex, follow`.
- Nas páginas sem endereço por idioma (home, autor), cada notícia aparece
  traduzida quando há tradução e no original quando não há, marcada.
- Legenda e alt de uma foto sem tradução usam o texto do original, com
  `lang="pt-BR"` só naquela figura.

### 15.6 hreflang

Cada versão aponta para **todas** as versões que existem, inclusive ela mesma,
com URL absoluta, mais `x-default` apontando o original em português:

```html
<link rel="alternate" hreflang="pt-BR" href="https://…/noticia/startup-do-campus-conquista-premio" />
<link rel="alternate" hreflang="en" href="https://…/en/news/campus-startup-wins-award" />
<link rel="alternate" hreflang="x-default" href="https://…/noticia/startup-do-campus-conquista-premio" />
```

Inglês e espanhol usam o idioma sem região (`en`, `es`): servem a qualquer país.
Notícia só em português não declara `hreflang` (não haveria alternativa). O
mesmo conjunto sai em três lugares: no `<head>` escrito pela API,
no `<head>` atualizado pelo cliente e no `sitemap-noticias.xml`.

### 15.7 Traduzir uma notícia

No painel, abra a notícia: a barra lateral tem **Traduções**, com o estado de
cada idioma. "Traduzir" abre a tela da tradução, com o original em português à
vista, os campos de chapéu, título, resumo e corpo (o mesmo editor em blocos) e
os textos da capa e da galeria. "Copiar o corpo do original" traz o texto com
as imagens e os vídeos no lugar, para traduzir bloco a bloco. Salvar com a
notícia publicada coloca a tradução no ar na hora.

### 15.8 Testar localmente

```bash
npm run dev
```

- `http://localhost:5173/en/news` e `/es/noticias` — as listas;
- uma notícia com tradução em `/en/news/<slug-em-inglês>`;
- o seletor no cabeçalho em qualquer página; a escolha fica em
  `localStorage.locale` (apague para voltar ao comportamento padrão);
- `db/seed-traducoes.sql` (carregado pelo `--seed`) cria traduções de
  demonstração.

O `<head>` renderizado no servidor existe quando o site é servido pelo Nginx
(`docker compose up`); no `npm run dev` o cliente escreve o mesmo `<head>`
depois de carregar.

`npm run smoke` renderiza a vitrine nos três idiomas e confere os dicionários
(mesmas chaves, variáveis e marcas); `npm run seo` confere canônica, `hreflang`,
JSON-LD, sitemaps e `robots.txt` por idioma; `npm run security` confere o RLS
das traduções.

### 15.9 Um idioma novo

1. `src/i18n/config.js`: entrada em `LOCALES` e rotas em `NEWS_PATHS`;
2. `src/i18n/messages/<código>.js` com as mesmas chaves de `pt-BR.js`, e o
   carregador em `src/i18n/store.js`;
3. migration ampliando o `check` de `news_translations.locale` e a configuração
   de busca em `enforce_news_translation_rules()`;
4. rotas das páginas renderizadas em `server/src/app.js` e em
   `docker/web/nginx.conf`, rotas no `App.jsx` e a bandeira no
   `LanguageSwitcher`.

### 15.10 Limites conhecidos

- **O corpo da notícia é montado no navegador.** O HTML bruto traz o `<head>`
  completo e o texto inteiro no `articleBody` do JSON-LD, mas os parágrafos
  visíveis só existem depois do JavaScript. O Google renderiza; rastreadores
  que não executam JavaScript leem só o `<head>`. Resolver exigiria
  renderização no servidor, o que não foi introduzido.
- **Google News:** a elegibilidade é decidida pelo Google e depende do veículo
  — ver a seção 13.7. O Publisher Center precisa listar as edições em inglês e
  espanhol se o veículo quiser ser avaliado nelas. Uma tradução feita mais de
  48 horas depois da publicação não entra no `sitemap-google-news.xml` (a data
  é a do fato), só no acervo.
- Iniciativas, categorias e textos do painel não têm tradução; o feed RSS é só
  em português.

---

## 16. Audiência

Em `/admin/audiencia`: quantas vezes cada notícia e iniciativa foi aberta, por
quantos leitores, em que dias, de que país, estado e cidade, por qual canal e
em que idioma. Toda a equipe ativa vê o relatório; o painel inicial mostra os
mais acessados da semana.

### 16.1 O que é contado

- **Visualização:** cada abertura de uma notícia ou iniciativa **publicada**.
- **Leitor único:** cada navegador uma vez por dia em cada conteúdo. Quem volta
  no dia seguinte conta de novo, e quem lê três notícias conta uma vez em cada
  — por isso o total do período é a soma dos leitores de cada dia e conteúdo,
  não o número de pessoas diferentes.
- **Não entram:** a equipe logada no painel (conferindo a publicação), robôs
  conhecidos e navegadores automatizados, conteúdo em rascunho aberto por link,
  e quem navega com JavaScript desligado.

### 16.2 Privacidade

O banco guarda **totais por dia**, nunca visitas individuais: não há IP,
identificador do leitor nem horário exato. "Chapecó, 3 de outubro, notícia X: 42
visualizações" não identifica ninguém. A localização é estimada pelo IP na API,
no momento do acesso, com uma base local — o IP não vai para serviço externo
nenhum e é descartado em seguida. O "leitor único" é decidido no próprio
navegador, com uma marca guardada nele (`localStorage`) que nunca sai dele.

### 16.3 Localização (país, estado, cidade)

A API lê uma base no formato MMDB em `/geoip/GeoLite2-City.mmdb`. Duas opções:

**MaxMind GeoLite2 (recomendada, atualiza sozinha).** Crie uma conta gratuita em
[maxmind.com](https://www.maxmind.com/en/geolite2/signup), gere uma *license
key*, preencha `GEOIP_ACCOUNT_ID` e `GEOIP_LICENSE_KEY` no `.env` e suba o
perfil:

```bash
docker compose --profile geoip up -d
```

O container `geoipupdate` baixa a base nos primeiros minutos e de novo toda
semana; a API a carrega sozinha (tenta a cada dez minutos enquanto ela não
existe) e troca de arquivo sem reiniciar.

**DB-IP Lite (sem conta).** Baixe o `dbip-city-lite-AAAA-MM.mmdb.gz` em
[db-ip.com](https://db-ip.com/db/download/ip-to-city-lite) (licença CC BY 4.0,
que pede atribuição) e copie para o volume:

```bash
gunzip dbip-city-lite-*.mmdb.gz
docker run --rm -v vitrine_geoip:/geoip -v "$PWD":/src alpine \
  cp /src/dbip-city-lite-AAAA-MM.mmdb /geoip/GeoLite2-City.mmdb
docker compose restart api
```

A atualização, aqui, é manual (mensal).

Sem base nenhuma, a audiência é contada igual, só que sem localização — a tela
avisa. **Precisão:** país é confiável; estado, bom; cidade, aproximada —
operadoras de celular costumam sair por um IP de outra cidade, e quem usa VPN
aparece no país dela. Atrás de proxy, configure `TRUSTED_PROXIES`
([seção 9.1](#91-https-e-proxy-da-instituição)), ou tudo parecerá vir de um
lugar só.

### 16.4 Canal de origem

Do `utm_source` do link, quando há, e senão do `document.referrer`: Google,
Instagram, Facebook, LinkedIn, X, YouTube, e-mail, assistentes de IA, outro
site (pelo domínio), navegação dentro do próprio site, ou **direto**.

"Direto" reúne link digitado, favorito e aplicativos que não informam de onde
vêm — o **WhatsApp**, na maioria dos celulares. Para medir uma divulgação,
compartilhe o link com o canal no endereço:

```
https://vitrine.exemplo.edu.br/noticia/edital-2026?utm_source=whatsapp
```

### 16.5 Relatório e planilha

Filtros de período (7, 30 e 90 dias, 12 meses, este mês, mês anterior, este ano
ou personalizado) e de tipo, todos na URL. Clicar num conteúdo do ranking
filtra a tela inteira por ele — de onde vieram os leitores daquela notícia. A
comparação dos indicadores é com o período anterior de mesma duração.

**Exportar Excel** gera um `.xlsx` com uma aba por recorte: Resumo, Por
conteúdo, Por dia, Países, Estados, Cidades, Origem, Idioma e Dados completos
(dia × conteúdo × lugar × canal, até 50 mil linhas).

No banco, os totais ficam em `public.content_views` (migration 0015), legível
só pela equipe ativa. Quem registra é a função `record_content_view()`,
executável só pelo papel de serviço da API.

---

## 17. Migrar do Supabase

`server/src/tools/importar-supabase.js` copia uma instalação do Supabase para o
Postgres próprio, numa transação só:

- as **contas**, com o hash da senha — todo mundo continua entrando com a
  senha que já tinha (as sessões antigas não valem);
- todo o **conteúdo** de `public` — perfis, catálogo, notícias, traduções,
  histórico de revisão, log de atividade, identidade do site;
- o registro dos **arquivos**, que depois são baixados dos buckets públicos
  para o volume `arquivos`;
- e **troca as URLs** `https://SEU-PROJETO.supabase.co/storage/v1/object/public/…`
  pelas do site novo (`SITE_URL/arquivos/…`) em toda coluna de texto, lista e
  JSON — capas, galerias, fotos no corpo das notícias, logotipos, avatares.

Os gatilhos ficam desligados durante a cópia: o dado entra exatamente como
estava, sem o workflow recarimbar datas nem gerar slug novo.

**Passo a passo**

1. Suba a stack nova **sem** os dados de demonstração (`docker compose up -d`).
   O destino precisa estar vazio; com o seed carregado, use `--substituir`.
2. No painel do Supabase, **Project Settings → Database → Connection string**,
   copie a do **Session pooler** (a conexão direta é só IPv6, e os containers
   normalmente não têm IPv6). Opcional: baixe o certificado da CA ali mesmo,
   para o TLS ser conferido (`SUPABASE_DB_CA`).
3. Rode, da pasta `vitrine/`:

```bash
docker compose run --rm \
  -v vitrine_arquivos:/data/arquivos \
  -e SUPABASE_DB_URL='postgresql://postgres.SEU-PROJETO:SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres' \
  -e SUPABASE_URL='https://SEU-PROJETO.supabase.co' \
  -e SITE_URL='https://vitrine.exemplo.edu.br' \
  -e UPLOADS_DIR=/data/arquivos \
  migrate node server/src/tools/importar-supabase.js
```

A conexão com o banco novo vem do próprio serviço `migrate` (o `.env`). No fim,
a ferramenta mostra a contagem de cada tabela na origem e no destino.
Se algum arquivo não baixar, ela lista quais. Uma falha na cópia desfaz tudo —
nada fica pela metade no banco novo.

4. Entre com a sua conta de sempre e confira; depois rode `npm run security`.
5. Aponte o domínio para o servidor novo. O projeto no Supabase pode ser
   pausado depois de alguns dias de conferência.
