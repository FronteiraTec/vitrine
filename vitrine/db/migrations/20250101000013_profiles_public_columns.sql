-- =============================================================================
-- Vitrine — 0013 | Corrige a leitura pública de `profiles` (e-mail exposto)
--
-- Correção de segurança. O `npm run security` reprovava quatro verificações em
-- produção: um visitante ANÔNIMO lia `email`, `role`, `is_active` e
-- `is_public` de quem assina notícia publicada.
--
-- A 0012 queria o contrário. Ela abriu, para `anon`, um recorte de COLUNAS por
-- `grant select (id, name, slug, …)`, confiando que o grant por coluna seria o
-- limite. Não era: o Supabase concede SELECT na TABELA INTEIRA a `anon` e
-- `authenticated` por `alter default privileges` no schema `public`. Grant de
-- coluna só acrescenta; ele não restringe um grant de tabela que já existe. A
-- policy liberava as linhas de quem publicou, e o grant de tabela liberava
-- todas as colunas delas.
--
-- A correção é tirar o grant de tabela de `anon` e refazer o de coluna. A
-- ordem importa: `revoke select on table` também revoga os grants de coluna
-- (documentação do REVOKE: "the corresponding column privileges are also
-- revoked"), então o `grant` por coluna precisa vir DEPOIS.
--
-- `authenticated` não muda: a equipe logada continua lendo a tabela inteira,
-- e quem ela enxerga continua sendo decidido pela policy (0003).
--
-- Nada muda para o que a vitrine lê. As consultas públicas pedem só colunas
-- desta lista — `src/services/authors.js`, o vínculo `author:profiles!…` das
-- notícias e `api/_lib/data.js`, que deixou de pedir `updated_at` junto com
-- esta migration.
-- =============================================================================

revoke select on public.profiles from anon;

grant select (id, name, slug, bio, job_title, avatar_url, profile_updated_at)
  on public.profiles to anon;

-- A policy `profiles_select_public` (0012) referencia `is_public`, que fica
-- fora do grant. Não é problema: a expressão de uma policy é avaliada pelo
-- sistema, sem exigir privilégio de coluna de quem consulta — é justamente o
-- que permite uma policy filtrar por um dado que o usuário não pode ler.
