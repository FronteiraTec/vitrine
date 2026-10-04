-- =============================================================================
-- Vitrine — 0014 | Traduções das notícias (inglês e espanhol)
--
-- Cada notícia passa a poder existir em três idiomas, com URL própria em cada
-- um: /noticia/:slug (original), /en/news/:slug e /es/noticia/:slug.
--
-- O MODELO
--
-- `news` continua sendo a notícia: a identidade, o status editorial, a autoria,
-- as datas, a capa e a galeria — e o texto ORIGINAL, em português. A nova
-- `news_translations` guarda só o que muda de um idioma para outro: título,
-- slug, chapéu, resumo, corpo e as descrições das imagens.
--
-- A alternativa "normalizada" — tirar o texto de `news` e guardar até o
-- português em `news_translations` — foi descartada. Ela obrigaria a reescrever
-- o gatilho de slug, a busca, o workflow, o log de atividade, o feed, os
-- sitemaps e todas as telas que leem `news.name`, e a migrar os dados de uma
-- tabela em produção, para chegar ao mesmo lugar: o original é, e continuará
-- sendo, escrito em português. O que se evitou foi o erro oposto — duplicar a
-- notícia inteira por idioma —, que multiplicaria status, fotos e datas e
-- deixaria as versões divergirem.
--
-- VISIBILIDADE
--
-- A tradução não tem workflow próprio: ela é pública quando a notícia é
-- pública. É a mesma regra que já vale para a correção de texto de uma
-- notícia publicada (entra no ar direto, sem nova revisão). Para uma tradução
-- não ir ao ar pela metade, título e corpo são obrigatórios — não existe
-- tradução "rascunho" com a notícia publicada.
--
-- Sem `meta_title`/`meta_description`: o SEO da vitrine deriva título e
-- descrição do próprio título e do resumo (`src/lib/seo.js`), e isso passa a
-- valer por idioma. Um campo de SEO só nas traduções criaria duas regras para
-- a mesma coisa.
-- =============================================================================

create table if not exists public.news_translations (
  id                 uuid primary key default gen_random_uuid(),
  news_id            uuid not null references public.news (id) on delete cascade,
  locale             text not null,
  -- `name`, e não `title`, pelo mesmo motivo de `news.name`: é o que o gatilho
  -- genérico `ensure_unique_slug()` lê.
  name               text not null,
  slug               text not null,
  kicker             text,
  excerpt            text,
  content            text not null,
  cover_alt          text,
  cover_caption      text,
  -- Texto das fotos da galeria, casado pela URL: [{ url, caption, alt }]. As
  -- fotos em si são as de `news.gallery`.
  gallery            jsonb not null default '[]'::jsonb,
  search_vector      tsvector,
  created_by         uuid references public.profiles (id) on delete set null,
  updated_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  content_updated_at timestamptz,
  -- O original é sempre o português, em `news`. Espelha TRANSLATION_LOCALES
  -- em `src/i18n/config.js`.
  constraint news_translations_locale_check check (locale in ('en', 'es')),
  constraint news_translations_name_not_blank check (length(btrim(name)) > 0),
  constraint news_translations_content_not_blank check (length(btrim(content)) > 0),
  constraint news_translations_gallery_is_array check (jsonb_typeof(gallery) = 'array'),
  -- Uma tradução por idioma por notícia.
  constraint news_translations_news_locale_key unique (news_id, locale),
  -- A URL de cada idioma é única.
  constraint news_translations_locale_slug_key unique (locale, slug)
);

comment on table public.news_translations is
  'Versões da notícia em outros idiomas. Só o texto: status, datas, autoria e
   imagens são da notícia (`news`), que guarda o original em português.';
comment on column public.news_translations.gallery is
  'Legenda e texto alternativo das fotos de `news.gallery`, casados pela URL:
   [{ url, caption, alt }]. Foto sem entrada aqui usa o texto do original.';
comment on column public.news_translations.content_updated_at is
  'Última correção DESTA versão depois de publicada — o "Atualizado em" dela.';

-- As URLs das fotos passam pela mesma validação da galeria (0010).
do $$
begin
  if to_regprocedure('public.jsonb_urls_are_web(jsonb)') is not null
     and not exists (select 1 from pg_constraint where conname = 'news_translations_gallery_urls_are_web') then
    alter table public.news_translations
      add constraint news_translations_gallery_urls_are_web check (public.jsonb_urls_are_web(gallery));
  end if;
end $$;

-- `(news_id, locale)` e `(locale, slug)` já ganham índice pelas constraints
-- únicas: o primeiro atende "as traduções desta notícia", o segundo a página
-- `/en/news/:slug`. Falta o da busca.
create index if not exists news_translations_search_idx
  on public.news_translations using gin (search_vector);

-- -----------------------------------------------------------------------------
-- Slug — o mesmo gatilho genérico de categorias, iniciativas e notícias
--
-- Nasce do título traduzido no primeiro salvamento e não muda depois: numa
-- atualização o gatilho parte do slug que já existe. A unicidade que ele
-- garante vale para a tabela inteira (os dois idiomas), o que é mais estrito
-- que a constraint `(locale, slug)` — no máximo, um slug idêntico em inglês e
-- espanhol ganha um sufixo `-2`.
-- -----------------------------------------------------------------------------
drop trigger if exists news_translations_slug on public.news_translations;
create trigger news_translations_slug
  before insert or update of name, slug on public.news_translations
  for each row execute function public.ensure_unique_slug();

-- -----------------------------------------------------------------------------
-- Regras de gravação
--
-- • A tradução pertence a uma notícia e a um idioma para sempre.
-- • Autoria e datas são carimbadas aqui, não aceitas do cliente.
-- • Com a notícia na fila de revisão, as traduções congelam para quem não
--   revisa — a mesma trava de `enforce_news_workflow()`.
-- • `content_updated_at` marca correção DEPOIS de publicada, como na notícia.
-- • O índice de busca é montado no idioma certo: radicais em inglês não são
--   os do português. Aqui dá para calcular na própria linha (BEFORE), porque a
--   tradução não tem tabelas filhas.
--
-- Os gatilhos BEFORE disparam em ordem alfabética: `…_rules` roda antes de
-- `…_slug`, e nenhum depende do resultado do outro.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_news_translation_rules()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_status     public.initiative_status;
  v_privileged boolean;
  v_config     regconfig;
begin
  if tg_op = 'UPDATE' then
    new.news_id    := old.news_id;
    new.locale     := old.locale;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  else
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
  end if;

  select n.status into v_status from public.news n where n.id = new.news_id;
  v_privileged := public.can_review() or public.is_privileged_session();

  if v_status = 'pending_review' and not v_privileged then
    raise exception
      'Esta notícia está em revisão e suas traduções não podem ser alteradas. Devolva-a para rascunho antes de editar.'
      using errcode = '42501';
  end if;

  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.updated_at := now();

  if tg_op = 'UPDATE'
     and v_status = 'published'
     and (
          new.name          is distinct from old.name
       or new.kicker        is distinct from old.kicker
       or new.excerpt       is distinct from old.excerpt
       or new.content       is distinct from old.content
       or new.cover_alt     is distinct from old.cover_alt
       or new.cover_caption is distinct from old.cover_caption
       or new.gallery       is distinct from old.gallery
     ) then
    new.content_updated_at := now();
  elsif tg_op = 'UPDATE' then
    new.content_updated_at := old.content_updated_at;
  else
    new.content_updated_at := null;
  end if;

  v_config := case new.locale when 'en' then 'english'::regconfig else 'spanish'::regconfig end;

  new.search_vector :=
       setweight(to_tsvector(v_config, extensions.unaccent(coalesce(new.name, ''))), 'A')
    || setweight(to_tsvector(v_config, extensions.unaccent(coalesce(new.kicker, ''))), 'B')
    || setweight(to_tsvector(v_config, extensions.unaccent(coalesce(new.excerpt, ''))), 'B')
    || setweight(to_tsvector(v_config, extensions.unaccent(coalesce(new.content, ''))), 'C');

  return new;
end;
$$;

drop trigger if exists news_translations_rules on public.news_translations;
create trigger news_translations_rules
  before insert or update on public.news_translations
  for each row execute function public.enforce_news_translation_rules();

-- -----------------------------------------------------------------------------
-- Quem edita a tradução é quem edita a notícia
--
-- Espelho de `can_edit_initiative()` para notícias: equipe ativa, e autora da
-- notícia ou revisora. SECURITY DEFINER pelo mesmo motivo das outras: é usada
-- dentro de policy.
-- -----------------------------------------------------------------------------
create or replace function public.can_edit_news(p_news uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_staff() and exists (
    select 1
      from public.news n
     where n.id = p_news
       and (n.created_by = auth.uid() or public.can_review())
  );
$$;

-- O `alter default privileges` da 0008 já nasce negando; a concessão é
-- explícita e só para quem tem sessão — policy aplicada a `authenticated`.
revoke all on function public.can_edit_news(uuid) from public, anon;
grant execute on function public.can_edit_news(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
--
-- leitura  : público → só traduções de notícia publicada; equipe → tudo
-- escrita  : quem pode editar a notícia (autor, revisor, admin)
-- exclusão : idem, mas tirar do ar a versão de uma notícia publicada (ou na
--            fila) é decisão de revisor — como qualquer saída de `published`
-- -----------------------------------------------------------------------------
alter table public.news_translations enable row level security;

-- Grants explícitos, e por coluna para `anon`. O Supabase concederia a tabela
-- inteira a `anon` sozinho — foi assim que `profiles` vazou e-mails (ver
-- 0013). O visitante não precisa de `created_by`/`updated_by`.
revoke all on public.news_translations from anon, authenticated;

grant select (
  id, news_id, locale, name, slug, kicker, excerpt, content,
  cover_alt, cover_caption, gallery, search_vector,
  created_at, updated_at, content_updated_at
) on public.news_translations to anon;

grant select, insert, update, delete on public.news_translations to authenticated;

drop policy if exists news_translations_select_public on public.news_translations;
create policy news_translations_select_public on public.news_translations
  for select to anon
  using (
    exists (
      select 1 from public.news n
       where n.id = news_translations.news_id
         and n.status = 'published'
    )
  );

drop policy if exists news_translations_select_staff on public.news_translations;
create policy news_translations_select_staff on public.news_translations
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.news n
       where n.id = news_translations.news_id
         and n.status = 'published'
    )
  );

drop policy if exists news_translations_insert on public.news_translations;
create policy news_translations_insert on public.news_translations
  for insert to authenticated
  with check (public.can_edit_news(news_id));

drop policy if exists news_translations_update on public.news_translations;
create policy news_translations_update on public.news_translations
  for update to authenticated
  using (public.can_edit_news(news_id))
  with check (public.can_edit_news(news_id));

drop policy if exists news_translations_delete on public.news_translations;
create policy news_translations_delete on public.news_translations
  for delete to authenticated
  using (
    public.can_edit_news(news_id)
    and (
      public.can_review()
      or exists (
        select 1 from public.news n
         where n.id = news_translations.news_id
           and n.status in ('draft', 'rejected', 'archived')
      )
    )
  );

-- O PostgREST guarda o esquema em cache; sem isto a tabela nova pode levar
-- alguns segundos para aparecer na API.
notify pgrst, 'reload schema';
