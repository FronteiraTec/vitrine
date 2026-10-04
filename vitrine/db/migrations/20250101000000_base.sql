-- =============================================================================
-- Vitrine — 0000 | Base do Postgres próprio
--
-- As migrations 0001 a 0014 foram escritas para o Supabase e continuam valendo
-- sem alteração. Elas contam com quatro coisas que o Supabase cria sozinho e um
-- Postgres cru não tem:
--
--   • os papéis `anon` e `authenticated`, em nome de quem as consultas rodam;
--   • `auth.uid()`, o usuário da requisição, lido pelas policies e gatilhos;
--   • `auth.users`, a tabela de contas que `profiles` referencia;
--   • `storage.buckets`, `storage.objects` e `storage.foldername()`, onde as
--     policies dos arquivos foram escritas.
--
-- Este arquivo recria esse mínimo. O resto da autorização continua exatamente
-- onde estava: RLS, gatilhos e funções das migrations seguintes.
--
-- COMO A API USA OS PAPÉIS
--
-- A API conecta como `authenticator`, que sozinho não lê nem escreve nada
-- (NOINHERIT). A cada requisição ela abre uma transação, assume o papel de quem
-- pediu (`anon` ou `authenticated`) e grava o id do usuário em
-- `request.jwt.claims` — o mesmo contrato do PostgREST. Assim o RLS decide o
-- que a requisição enxerga, como antes, e um esquecimento no código da API
-- resulta em "permission denied", nunca em acesso irrestrito.
--
-- `service_role` cobre o que não pertence a usuário nenhum: conferir senha,
-- abrir sessão, registrar acesso. Ele NÃO ignora o RLS (sem BYPASSRLS) e só
-- recebe grant nas tabelas desses serviços.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Papéis
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit;
  end if;
  -- A senha é definida pelo `migrate.js`, a partir de APP_DB_PASSWORD: SQL
  -- versionado não é lugar de segredo.
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit;
  end if;
end $$;

grant anon, authenticated, service_role to authenticator;

-- O schema `public` do Postgres 15+ já não concede CREATE a todos; o resto do
-- acesso a ele é concedido, objeto a objeto, pelas migrations seguintes.
revoke create on schema public from public;

-- -----------------------------------------------------------------------------
-- auth — contas, sessões e redefinição de senha
-- -----------------------------------------------------------------------------
create schema if not exists auth;

-- `anon` e `authenticated` precisam alcançar `auth.uid()`, chamada dentro das
-- policies. As tabelas do schema continuam fora do alcance deles.
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  -- bcrypt, o mesmo formato do Supabase: contas importadas entram com a senha
  -- que já tinham.
  encrypted_password  text,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  email_confirmed_at  timestamptz,
  last_sign_in_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint users_email_lowercase check (email = lower(btrim(email)))
);

create unique index if not exists users_email_key on auth.users (email);

comment on table auth.users is
  'Contas de acesso. A autorização NÃO mora aqui: o papel e a ativação são de public.profiles.';

/*
 * Sessões do painel. O navegador guarda só um token aleatório num cookie
 * httpOnly; aqui fica o hash dele. Vazar esta tabela não entrega sessão
 * nenhuma, e apagar uma linha encerra aquela sessão na hora.
 */
create table if not exists auth.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  token_hash    text not null unique,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expires_at    timestamptz not null
);

create index if not exists sessions_user_idx on auth.sessions (user_id);
create index if not exists sessions_expires_idx on auth.sessions (expires_at);

-- Links de "esqueci minha senha": também só o hash, de uso único e com prazo.
create table if not exists auth.password_resets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);

create index if not exists password_resets_user_idx on auth.password_resets (user_id);

grant select, insert, update, delete on auth.users, auth.sessions, auth.password_resets
  to service_role;

/*
 * O usuário da requisição — mesmo contrato do Supabase/PostgREST.
 *
 * Lê primeiro `request.jwt.claim.sub` e depois `request.jwt.claims`. O
 * `nullif(…, '')` não é enfeite: depois de a primeira transação definir a
 * variável com `set_config(…, true)`, o Postgres passa a devolver texto VAZIO
 * (e não null) nas transações seguintes da mesma conexão, e `''::jsonb`
 * derrubaria toda consulta anônima de uma conexão reaproveitada.
 */
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  );
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- storage — metadados dos arquivos enviados pelo painel
--
-- Os arquivos em si ficam em disco (volume `arquivos`), servidos pelo Nginx.
-- O registro aqui é o que as policies das migrations 0004, 0005 e 0006
-- consultam: a API grava a linha COM O PAPEL DE QUEM ENVIOU, e o RLS decide se
-- a pessoa pode enviar para aquele bucket. Só depois o arquivo vai para o disco.
-- -----------------------------------------------------------------------------
create schema if not exists storage;

grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id                  text primary key,
  name                text not null,
  public              boolean not null default false,
  file_size_limit     bigint,
  allowed_mime_types  text[],
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists storage.objects (
  id          uuid primary key default gen_random_uuid(),
  bucket_id   text not null references storage.buckets (id),
  name        text not null,
  owner       uuid default auth.uid(),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint objects_bucket_name_key unique (bucket_id, name)
);

alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;

grant select on storage.buckets to anon, authenticated, service_role;
grant select on storage.objects to anon;
grant select, insert, update, delete on storage.objects to authenticated;

-- Os limites dos buckets são públicos por natureza: o formulário os mostra.
drop policy if exists buckets_select on storage.buckets;
create policy buckets_select on storage.buckets
  for select to anon, authenticated, service_role
  using (true);

-- Partes da pasta de um caminho: 'a/b/c.png' → {a,b}. Igual à do Supabase.
create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select parts[1:array_length(parts, 1) - 1]
    from string_to_array(name, '/') as parts;
$$;

grant execute on function storage.foldername(text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Controle das migrations aplicadas — fora de `public`, sem grant para a API.
-- -----------------------------------------------------------------------------
create schema if not exists app;

create table if not exists app.schema_migrations (
  version     text primary key,
  applied_at  timestamptz not null default now()
);
