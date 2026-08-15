-- =============================================================================
-- Vitrine — 0001 | Esquema base
-- Tipos, tabelas, relacionamentos e índices.
-- =============================================================================

create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'initiative_status') then
    create type public.initiative_status as enum (
      'draft', 'pending_review', 'published', 'rejected', 'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'editor', 'reviewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'link_type') then
    create type public.link_type as enum (
      'website', 'instagram', 'linkedin', 'youtube', 'github', 'facebook', 'other'
    );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- profiles — espelho de auth.users com o papel do usuário
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null,
  role        public.user_role not null default 'editor',
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Dados de aplicação do usuário autenticado. O papel aqui é a fonte de verdade da autorização.';

-- -----------------------------------------------------------------------------
-- categories — dinâmicas, gerenciadas pelo administrador
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  icon        text,                       -- nome do ícone (lucide-react)
  image_url   text,
  position    integer not null default 0, -- ordem de exibição na vitrine
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_name_not_blank check (length(btrim(name)) > 0)
);

create unique index if not exists categories_name_key on public.categories (lower(btrim(name)));
create index if not exists categories_position_idx on public.categories (position, name);

-- -----------------------------------------------------------------------------
-- tags
-- -----------------------------------------------------------------------------
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now(),
  constraint tags_name_not_blank check (length(btrim(name)) > 0)
);

create unique index if not exists tags_name_key on public.tags (lower(btrim(name)));

-- -----------------------------------------------------------------------------
-- people — responsáveis exibidos publicamente (não são contas de acesso)
-- -----------------------------------------------------------------------------
create table if not exists public.people (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  role       text,             -- cargo/titulação, ex.: "Coordenadora"
  photo_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_name_not_blank check (length(btrim(name)) > 0)
);

create index if not exists people_name_idx on public.people using gin (name extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- initiatives — entidade central da vitrine
-- -----------------------------------------------------------------------------
create table if not exists public.initiatives (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid not null references public.categories (id) on delete restrict,
  name              text not null,
  slug              text not null unique,
  short_description text,
  description       text,
  cover_image       text,
  gallery           text[] not null default '{}',
  areas             text[] not null default '{}',
  status            public.initiative_status not null default 'draft',
  location          text,
  campus            text,
  city              text,
  state             text,
  email             text,
  phone             text,
  website           text,
  search_vector     tsvector,
  created_by        uuid references public.profiles (id) on delete set null,
  updated_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  published_at      timestamptz,
  constraint initiatives_name_not_blank check (length(btrim(name)) > 0),
  constraint initiatives_state_len check (state is null or length(state) <= 2)
);

-- Índices desenhados para as consultas reais da vitrine e do admin.
create index if not exists initiatives_status_idx on public.initiatives (status);
create index if not exists initiatives_category_idx on public.initiatives (category_id);
create index if not exists initiatives_created_by_idx on public.initiatives (created_by);
create index if not exists initiatives_search_idx on public.initiatives using gin (search_vector);
create index if not exists initiatives_areas_idx on public.initiatives using gin (areas);
-- Índice parcial: a listagem pública sempre filtra por status = 'published'.
create index if not exists initiatives_published_feed_idx
  on public.initiatives (published_at desc nulls last, created_at desc)
  where status = 'published';
create index if not exists initiatives_admin_feed_idx
  on public.initiatives (updated_at desc);

-- -----------------------------------------------------------------------------
-- Relacionamentos N:N e recursos filhos
-- -----------------------------------------------------------------------------
create table if not exists public.initiative_tags (
  initiative_id uuid not null references public.initiatives (id) on delete cascade,
  tag_id        uuid not null references public.tags (id) on delete cascade,
  primary key (initiative_id, tag_id)
);

create index if not exists initiative_tags_tag_idx on public.initiative_tags (tag_id);

create table if not exists public.initiative_people (
  initiative_id uuid not null references public.initiatives (id) on delete cascade,
  person_id     uuid not null references public.people (id) on delete cascade,
  role          text,
  position      integer not null default 0,
  primary key (initiative_id, person_id)
);

create index if not exists initiative_people_person_idx on public.initiative_people (person_id);

create table if not exists public.initiative_links (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives (id) on delete cascade,
  label         text not null,
  url           text not null,
  type          public.link_type not null default 'other',
  position      integer not null default 0,
  constraint initiative_links_url_scheme check (url ~* '^https?://')
);

create index if not exists initiative_links_initiative_idx
  on public.initiative_links (initiative_id, position);

-- -----------------------------------------------------------------------------
-- initiative_reviews — histórico do workflow editorial.
-- Fica separado de `initiatives` para que as observações do revisor nunca
-- fiquem legíveis publicamente, mesmo quando a iniciativa está publicada.
-- -----------------------------------------------------------------------------
create table if not exists public.initiative_reviews (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives (id) on delete cascade,
  reviewer_id   uuid references public.profiles (id) on delete set null,
  from_status   public.initiative_status,
  to_status     public.initiative_status not null,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists initiative_reviews_initiative_idx
  on public.initiative_reviews (initiative_id, created_at desc);

-- -----------------------------------------------------------------------------
-- activity_log — alimenta a timeline "atividade recente" do dashboard
-- -----------------------------------------------------------------------------
create table if not exists public.activity_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_name  text,
  action      text not null,     -- created | updated | status_changed | deleted
  entity_type text not null,     -- initiative | category | profile
  entity_id   uuid,
  entity_name text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
