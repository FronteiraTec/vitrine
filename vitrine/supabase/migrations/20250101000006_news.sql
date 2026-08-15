-- =============================================================================
-- Vitrine — 0006 | Notícias
--
-- Conteúdo editorial com o mesmo ciclo de vida das iniciativas: rascunho →
-- em revisão → publicado, com rejeição, arquivamento e histórico do revisor.
--
-- O enum `initiative_status` é reaproveitado de propósito. Um segundo enum com
-- os mesmos cinco valores obrigaria a duplicar `allowed_transitions` e faria a
-- fila de revisão precisar de dois vocabulários para dizer a mesma coisa.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- news
--
-- A coluna do título chama-se `name`, e não `title`, para reaproveitar sem
-- alteração os gatilhos genéricos que já existem: `ensure_unique_slug()` lê
-- `new.name` e `log_activity()` lê `v_row.name`. Renomeá-la custaria uma cópia
-- dessas duas funções — dois lugares a mais para manter sincronizados.
-- -----------------------------------------------------------------------------
create table if not exists public.news (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  excerpt       text,
  content       text,
  cover_image   text,
  status        public.initiative_status not null default 'draft',
  search_vector tsvector,
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  constraint news_name_not_blank check (length(btrim(name)) > 0)
);

comment on table public.news is
  'Notícias e comunicados. Mesmo workflow editorial das iniciativas.';
comment on column public.news.name is
  'Título. Nomeado `name` para reaproveitar ensure_unique_slug() e log_activity().';

create index if not exists news_status_idx on public.news (status);
create index if not exists news_created_by_idx on public.news (created_by);
create index if not exists news_search_idx on public.news using gin (search_vector);
-- Índice parcial: a listagem pública sempre filtra por status = 'published'.
create index if not exists news_published_feed_idx
  on public.news (published_at desc nulls last, created_at desc)
  where status = 'published';
create index if not exists news_admin_feed_idx on public.news (updated_at desc);

-- -----------------------------------------------------------------------------
-- news_reviews — histórico do workflow, espelho de initiative_reviews.
-- Separado da tabela principal para que a observação do revisor nunca fique
-- legível publicamente, mesmo com a notícia publicada.
-- -----------------------------------------------------------------------------
create table if not exists public.news_reviews (
  id          uuid primary key default gen_random_uuid(),
  news_id     uuid not null references public.news (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  from_status public.initiative_status,
  to_status   public.initiative_status not null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists news_reviews_news_idx
  on public.news_reviews (news_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Slug — mesma função genérica usada por categorias, tags e iniciativas
-- -----------------------------------------------------------------------------
drop trigger if exists news_slug on public.news;
create trigger news_slug
  before insert or update of name, slug on public.news
  for each row execute function public.ensure_unique_slug();

-- -----------------------------------------------------------------------------
-- Índice de busca
--
-- Mais simples que o das iniciativas porque a notícia não tem categoria, tags,
-- equipe nem localização: título, resumo e corpo já cobrem o documento inteiro.
-- O texto é desacentuado antes de indexar, como no resto do projeto, para casar
-- com o `normalizeSearch` do frontend.
-- -----------------------------------------------------------------------------
create or replace function public.build_news_search(p_news uuid)
returns tsvector
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
      setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(n.name, ''))), 'A')
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(n.excerpt, ''))), 'B')
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(n.content, ''))), 'C')
  from public.news n
  where n.id = p_news;
$$;

create or replace function public.refresh_news_search(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return;
  end if;

  -- Mesma flag das iniciativas: marca a gravação como efeito interno para o
  -- workflow e o log de atividade ignorarem a reindexação.
  perform set_config('vitrine.reindexing', 'on', true);

  update public.news n
     set search_vector = public.build_news_search(n.id)
   where n.id = any (p_ids);

  perform set_config('vitrine.reindexing', 'off', true);
end;
$$;

create or replace function public.trg_news_search()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_news_search(array[new.id]);
  return null;
end;
$$;

drop trigger if exists news_search on public.news;
create trigger news_search
  after insert or update of name, excerpt, content on public.news
  for each row execute function public.trg_news_search();

-- -----------------------------------------------------------------------------
-- Workflow editorial
--
-- A tabela de transições permitidas NÃO é duplicada: `allowed_transitions()`
-- já é genérica e continua sendo a única definição da máquina de estados. O que
-- se repete aqui é só a checagem de papel e o carimbo de autoria — curto,
-- estável, e mantido separado para não mexer no gatilho das iniciativas, que
-- está em produção.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_news_workflow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_privileged boolean;
begin
  -- Reindexação interna toca apenas `search_vector`: nada a validar.
  if public.is_reindexing() then
    return new;
  end if;

  v_privileged := public.can_review() or public.is_privileged_session();

  if tg_op = 'INSERT' then
    -- O autor é sempre quem está autenticado; não é campo de formulário.
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := auth.uid();

    if new.status in ('published', 'rejected', 'archived') and not v_privileged then
      raise exception
        'Transição de status inválida: apenas revisores ou administradores publicam conteúdo.'
        using errcode = '42501';
    end if;

    if new.status = 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;

  elsif tg_op = 'UPDATE' then
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), old.updated_by);
    new.created_by := old.created_by;

    -- Conteúdo na fila fica congelado para quem não revisa.
    if old.status = 'pending_review'
       and new.status = old.status
       and not v_privileged then
      raise exception
        'Esta notícia está em revisão e não pode ser editada. Devolva-a para rascunho antes de alterar o conteúdo.'
        using errcode = '42501';
    end if;

    if new.status is distinct from old.status then
      if not (new.status = any (public.allowed_transitions(old.status))) then
        raise exception 'Transição de status inválida: % → %.', old.status, new.status
          using errcode = '42501';
      end if;

      if (new.status in ('published', 'rejected', 'archived') or old.status = 'published')
         and not v_privileged then
        raise exception
          'Transição de status inválida: apenas revisores ou administradores publicam, rejeitam, arquivam ou retiram conteúdo do ar.'
          using errcode = '42501';
      end if;

      -- published_at guarda a primeira publicação e não é reescrito depois.
      if new.status = 'published' and new.published_at is null then
        new.published_at := now();
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists news_workflow on public.news;
create trigger news_workflow
  before insert or update on public.news
  for each row execute function public.enforce_news_workflow();

-- Histórico de revisão: o gatilho é a única porta de entrada, então o registro
-- não pode ser burlado pelo cliente.
create or replace function public.log_news_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.news_reviews (news_id, reviewer_id, from_status, to_status, notes)
  values (
    new.id,
    auth.uid(),
    old.status,
    new.status,
    nullif(btrim(coalesce(current_setting('vitrine.review_notes', true), '')), '')
  );
  return null;
end;
$$;

drop trigger if exists news_review_history on public.news;
create trigger news_review_history
  after update of status on public.news
  for each row when (old.status is distinct from new.status)
  execute function public.log_news_review();

-- Única porta para mudar o status: leva junto a observação do revisor.
-- SECURITY INVOKER de propósito — RLS e o gatilho de workflow continuam valendo.
create or replace function public.set_news_status(
  p_id     uuid,
  p_status public.initiative_status,
  p_notes  text default null
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform set_config('vitrine.review_notes', coalesce(p_notes, ''), true);

  update public.news
     set status = p_status
   where id = p_id;

  if not found then
    raise exception 'Notícia não encontrada ou sem permissão de edição.'
      using errcode = '42501';
  end if;

  perform set_config('vitrine.review_notes', '', true);
end;
$$;

grant execute on function public.set_news_status(uuid, public.initiative_status, text)
  to authenticated;

-- -----------------------------------------------------------------------------
-- Log de atividade
--
-- `log_activity()` reconhecia mudança de status apenas em `initiatives`; sem
-- esta atualização, publicar uma notícia apareceria no dashboard como um
-- "atualizou" genérico, sem o de/para. O resto da função é o mesmo.
-- -----------------------------------------------------------------------------
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor   uuid := auth.uid();
  v_name    text;
  v_action  text;
  v_meta    jsonb := '{}'::jsonb;
  v_row     record;
begin
  if public.is_reindexing() then
    return null;
  end if;

  v_row := case when tg_op = 'DELETE' then old else new end;

  select p.name into v_name from public.profiles p where p.id = v_actor;

  if tg_op = 'INSERT' then
    v_action := 'created';
  elsif tg_op = 'DELETE' then
    v_action := 'deleted';
  elsif tg_table_name in ('initiatives', 'news') and old.status is distinct from new.status then
    v_action := 'status_changed';
    v_meta := jsonb_build_object('from', old.status, 'to', new.status);
  else
    v_action := 'updated';
  end if;

  insert into public.activity_log (actor_id, actor_name, action, entity_type, entity_id, entity_name, metadata)
  values (v_actor, coalesce(v_name, 'Sistema'), v_action, tg_table_name, v_row.id, v_row.name, v_meta);

  return null;
end;
$$;

drop trigger if exists news_activity on public.news;
create trigger news_activity
  after insert or update or delete on public.news
  for each row execute function public.log_activity();

-- -----------------------------------------------------------------------------
-- RLS — mesmas regras das iniciativas
--
-- leitura  : público → apenas `published`; equipe → tudo
-- criação  : equipe ativa, sempre como autor (garantido pelo gatilho)
-- edição   : autor do registro, revisor ou administrador
-- exclusão : administrador
-- -----------------------------------------------------------------------------
alter table public.news enable row level security;
alter table public.news_reviews enable row level security;

grant select on public.news to anon, authenticated;
grant select on public.news_reviews to authenticated;
grant insert, update, delete on public.news to authenticated;
grant insert on public.news_reviews to authenticated;

drop policy if exists news_select_public on public.news;
create policy news_select_public on public.news
  for select to anon
  using (status = 'published');

drop policy if exists news_select_staff on public.news;
create policy news_select_staff on public.news
  for select to authenticated
  using (status = 'published' or public.is_staff());

drop policy if exists news_insert on public.news;
create policy news_insert on public.news
  for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());

drop policy if exists news_update on public.news;
create policy news_update on public.news
  for update to authenticated
  using (public.is_staff() and (created_by = auth.uid() or public.can_review()))
  with check (public.is_staff() and (created_by = auth.uid() or public.can_review()));

drop policy if exists news_delete on public.news;
create policy news_delete on public.news
  for delete to authenticated
  using (public.is_admin());

drop policy if exists news_reviews_select on public.news_reviews;
create policy news_reviews_select on public.news_reviews
  for select to authenticated
  using (public.is_staff());

drop policy if exists news_reviews_insert on public.news_reviews;
create policy news_reviews_insert on public.news_reviews
  for insert to authenticated
  with check (public.can_review() and reviewer_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Storage — imagens de capa das notícias
-- Mesma política das imagens de iniciativa: qualquer membro ativo envia,
-- remove quem enviou, revisores e administradores.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('news-images', 'news-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists news_images_read on storage.objects;
create policy news_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'news-images');

drop policy if exists news_images_insert on storage.objects;
create policy news_images_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'news-images' and public.is_staff());

drop policy if exists news_images_update on storage.objects;
create policy news_images_update on storage.objects
  for update to authenticated
  using (bucket_id = 'news-images' and (owner = auth.uid() or public.can_review()))
  with check (bucket_id = 'news-images' and public.is_staff());

drop policy if exists news_images_delete on storage.objects;
create policy news_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'news-images' and (owner = auth.uid() or public.can_review()));
