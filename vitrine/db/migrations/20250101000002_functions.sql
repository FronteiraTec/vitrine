-- =============================================================================
-- Vitrine — 0002 | Funções e triggers
-- Slugs únicos, índice de busca, workflow editorial e log de atividade.
-- Toda a lógica que precisa ser confiável mora aqui, não no frontend.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers de autorização
-- SECURITY DEFINER porque são usados dentro das próprias policies de RLS —
-- sem isso a leitura de `profiles` dispararia recursão infinita.
-- -----------------------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.auth_role() = 'admin', false);
$$;

-- Revisor OU administrador: quem pode aprovar, rejeitar e arquivar.
create or replace function public.can_review()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.auth_role() in ('admin', 'reviewer'), false);
$$;

/*
 * Sessão privilegiada = seed, migração, SQL Editor ou `service_role`. Serve só
 * para liberar o workflow editorial em scripts administrativos — nunca para
 * conceder leitura de dados.
 *
 * O critério é "não há usuário autenticado". Testar `current_user` NÃO funciona:
 * esta função é chamada de dentro de triggers SECURITY DEFINER, onde
 * `current_user` já é o dono da função (postgres) e não o papel da requisição —
 * o que faria todas as regras do workflow serem puladas silenciosamente.
 *
 * Uma chamada anônima da API nunca chega até aqui: o RLS não concede escrita ao
 * papel `anon` em nenhuma tabela.
 */
create or replace function public.is_privileged_session()
returns boolean
language sql
stable
as $$
  select auth.uid() is null;
$$;

create or replace function public.can_edit_initiative(p_initiative uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_staff() and exists (
    select 1
    from public.initiatives i
    where i.id = p_initiative
      and (i.created_by = auth.uid() or public.can_review())
  );
$$;

create or replace function public.initiative_is_visible(p_initiative uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.initiatives i
    where i.id = p_initiative
      and (i.status = 'published' or public.is_staff())
  );
$$;

revoke all on function public.auth_role() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.can_review() from public;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_review() to authenticated;
grant execute on function public.can_edit_initiative(uuid) to authenticated;
grant execute on function public.initiative_is_visible(uuid) to anon, authenticated;

-- O Supabase já concede isto por padrão; repetido aqui para que as migrations
-- também funcionem num Postgres cru (`supabase start`, CI, cópia local).
grant usage on schema extensions to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Slugs
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER porque depende de `extensions.unaccent`: o papel
-- `authenticated` não precisa ter acesso ao schema de extensões para conseguir
-- salvar uma iniciativa.
create or replace function public.slugify(p_value text)
returns text
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select coalesce(
    nullif(
      btrim(
        regexp_replace(
          lower(extensions.unaccent(coalesce(p_value, ''))),
          '[^a-z0-9]+', '-', 'g'
        ),
        '-'
      ),
      ''
    ),
    'item'
  );
$$;

-- Garante unicidade acrescentando sufixo numérico (-2, -3, …).
-- Roda no banco para não haver corrida entre dois editores salvando junto.
--
-- SECURITY DEFINER de propósito: a checagem precisa enxergar TODAS as linhas,
-- inclusive rascunhos de outras pessoas que o RLS esconderia. Do contrário o
-- trigger acharia o slug livre e o índice único derrubaria a gravação.
create or replace function public.ensure_unique_slug()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_base      text;
  v_candidate text;
  v_suffix    int := 1;
  v_taken     boolean;
begin
  v_base := left(public.slugify(coalesce(nullif(btrim(new.slug), ''), new.name)), 80);
  v_candidate := v_base;

  loop
    execute format(
      'select exists (select 1 from public.%I where slug = $1 and id is distinct from $2)',
      tg_table_name
    )
    into v_taken
    using v_candidate, new.id;

    exit when not v_taken;

    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix;
  end loop;

  new.slug := v_candidate;
  return new;
end;
$$;

drop trigger if exists categories_slug on public.categories;
create trigger categories_slug
  before insert or update of name, slug on public.categories
  for each row execute function public.ensure_unique_slug();

drop trigger if exists tags_slug on public.tags;
create trigger tags_slug
  before insert or update of name, slug on public.tags
  for each row execute function public.ensure_unique_slug();

drop trigger if exists initiatives_slug on public.initiatives;
create trigger initiatives_slug
  before insert or update of name, slug on public.initiatives
  for each row execute function public.ensure_unique_slug();

-- -----------------------------------------------------------------------------
-- Ordem das categorias
-- Uma categoria nova entra no fim da lista. Sem isto, o default `0` faria toda
-- categoria recém-criada aparecer à frente das existentes na vitrine.
-- -----------------------------------------------------------------------------
create or replace function public.set_category_position()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.position is null or new.position = 0 then
    select coalesce(max(position), 0) + 1 into new.position from public.categories;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_position on public.categories;
create trigger categories_position
  before insert on public.categories
  for each row execute function public.set_category_position();

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

drop trigger if exists people_touch on public.people;
create trigger people_touch before update on public.people
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Índice de busca
-- Um único tsvector reúne nome, descrições, áreas, categoria, tags, pessoas e
-- localização — assim a busca textual cobre tudo com um só índice GIN.
-- O texto é desacentuado antes da indexação; o frontend desacentua a consulta
-- da mesma forma (`normalizeSearch`), mantendo os dois lados coerentes.
-- -----------------------------------------------------------------------------
create or replace function public.build_initiative_search(p_initiative uuid)
returns tsvector
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
      setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(i.name, ''))), 'A')
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(c.name, ''))), 'B')
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(i.short_description, ''))), 'B')
   || setweight(
        to_tsvector(
          'portuguese',
          extensions.unaccent(
            coalesce((select string_agg(t.name, ' ')
                        from public.initiative_tags it
                        join public.tags t on t.id = it.tag_id
                       where it.initiative_id = i.id), '')
          )
        ), 'B')
   || setweight(
        to_tsvector(
          'portuguese',
          extensions.unaccent(coalesce(array_to_string(i.areas, ' '), ''))
        ), 'B')
   || setweight(
        to_tsvector(
          'portuguese',
          extensions.unaccent(
            coalesce((select string_agg(pe.name || ' ' || coalesce(ip.role, ''), ' ')
                        from public.initiative_people ip
                        join public.people pe on pe.id = ip.person_id
                       where ip.initiative_id = i.id), '')
          )
        ), 'C')
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(i.description, ''))), 'C')
   || setweight(
        to_tsvector(
          'portuguese',
          extensions.unaccent(
            concat_ws(' ', i.location, i.campus, i.city, i.state)
          )
        ), 'D')
  from public.initiatives i
  left join public.categories c on c.id = i.category_id
  where i.id = p_initiative;
$$;

-- Marca a transação como "efeito colateral interno". O trigger de workflow e o
-- log de atividade consultam esta flag para ignorar a reindexação — sem isso,
-- cada gravação geraria um evento "atualizou" fantasma no dashboard.
create or replace function public.is_reindexing()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('vitrine.reindexing', true), 'off') = 'on';
$$;

create or replace function public.refresh_initiative_search(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return;
  end if;

  perform set_config('vitrine.reindexing', 'on', true);

  update public.initiatives i
     set search_vector = public.build_initiative_search(i.id)
   where i.id = any (p_ids);

  perform set_config('vitrine.reindexing', 'off', true);
end;
$$;

-- A própria iniciativa: recalcula depois do INSERT/UPDATE (AFTER, para que as
-- linhas já estejam visíveis às subconsultas de tags e pessoas).
create or replace function public.trg_initiative_search()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_initiative_search(array[new.id]);
  return null;
end;
$$;

drop trigger if exists initiatives_search on public.initiatives;
create trigger initiatives_search
  after insert or update of name, short_description, description, areas,
                            location, campus, city, state, category_id
  on public.initiatives
  for each row execute function public.trg_initiative_search();

-- Tabelas filhas: mudam o documento de busca da iniciativa relacionada.
create or replace function public.trg_child_search()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_initiative_search(
    array[coalesce(new.initiative_id, old.initiative_id)]
  );
  return null;
end;
$$;

drop trigger if exists initiative_tags_search on public.initiative_tags;
create trigger initiative_tags_search
  after insert or delete on public.initiative_tags
  for each row execute function public.trg_child_search();

drop trigger if exists initiative_people_search on public.initiative_people;
create trigger initiative_people_search
  after insert or update or delete on public.initiative_people
  for each row execute function public.trg_child_search();

-- Renomear categoria/tag/pessoa reindexa as iniciativas afetadas.
create or replace function public.trg_reindex_related()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
begin
  if tg_table_name = 'categories' then
    select array_agg(id) into v_ids from public.initiatives where category_id = new.id;
  elsif tg_table_name = 'tags' then
    select array_agg(initiative_id) into v_ids from public.initiative_tags where tag_id = new.id;
  elsif tg_table_name = 'people' then
    select array_agg(initiative_id) into v_ids from public.initiative_people where person_id = new.id;
  end if;

  if v_ids is not null then
    perform public.refresh_initiative_search(v_ids);
  end if;
  return null;
end;
$$;

drop trigger if exists categories_reindex on public.categories;
create trigger categories_reindex after update of name on public.categories
  for each row when (old.name is distinct from new.name)
  execute function public.trg_reindex_related();

drop trigger if exists tags_reindex on public.tags;
create trigger tags_reindex after update of name on public.tags
  for each row when (old.name is distinct from new.name)
  execute function public.trg_reindex_related();

drop trigger if exists people_reindex on public.people;
create trigger people_reindex after update of name on public.people
  for each row when (old.name is distinct from new.name)
  execute function public.trg_reindex_related();

-- -----------------------------------------------------------------------------
-- Workflow editorial
-- A máquina de estados vive no banco: o frontend só decide quais botões mostrar.
-- -----------------------------------------------------------------------------
create or replace function public.allowed_transitions(p_from public.initiative_status)
returns public.initiative_status[]
language sql
immutable
as $$
  select case p_from
    when 'draft'          then array['pending_review', 'published', 'archived']::public.initiative_status[]
    when 'pending_review' then array['published', 'rejected', 'draft']::public.initiative_status[]
    when 'published'      then array['archived', 'draft']::public.initiative_status[]
    when 'rejected'       then array['draft']::public.initiative_status[]
    when 'archived'       then array['draft', 'published']::public.initiative_status[]
    else array[]::public.initiative_status[]
  end;
$$;

create or replace function public.enforce_initiative_workflow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_privileged boolean;
begin
  -- Reindexação interna toca apenas `search_vector`: nada a validar nem a carimbar.
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
    -- A autoria não é transferível pela API.
    new.created_by := old.created_by;

    -- Conteúdo na fila fica congelado para quem não revisa. A única ação
    -- disponível ao autor é retirar da fila (voltar para rascunho), tratada
    -- logo abaixo pelas regras de transição.
    if old.status = 'pending_review'
       and new.status = old.status
       and not v_privileged then
      raise exception
        'Esta iniciativa está em revisão e não pode ser editada. Devolva-a para rascunho antes de alterar o conteúdo.'
        using errcode = '42501';
    end if;

    if new.status is distinct from old.status then
      if not (new.status = any (public.allowed_transitions(old.status))) then
        raise exception 'Transição de status inválida: % → %.', old.status, new.status
          using errcode = '42501';
      end if;

      -- Publicar, rejeitar e arquivar são privativos de revisor/admin — assim
      -- como QUALQUER saída de `published`: tirar algo do ar é decisão
      -- editorial, não do autor.
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

drop trigger if exists initiatives_workflow on public.initiatives;
create trigger initiatives_workflow
  before insert or update on public.initiatives
  for each row execute function public.enforce_initiative_workflow();

-- Registra cada mudança de status no histórico de revisão. Como o trigger é a
-- única porta de entrada, o histórico não pode ser burlado pelo cliente.
create or replace function public.log_initiative_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.initiative_reviews (initiative_id, reviewer_id, from_status, to_status, notes)
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

drop trigger if exists initiatives_review_history on public.initiatives;
create trigger initiatives_review_history
  after update of status on public.initiatives
  for each row when (old.status is distinct from new.status)
  execute function public.log_initiative_review();

-- Única porta para mudar o status: leva junto a observação do revisor.
-- SECURITY INVOKER de propósito — RLS e o trigger de workflow continuam valendo.
create or replace function public.set_initiative_status(
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

  update public.initiatives
     set status = p_status
   where id = p_id;

  if not found then
    raise exception 'Iniciativa não encontrada ou sem permissão de edição.'
      using errcode = '42501';
  end if;

  perform set_config('vitrine.review_notes', '', true);
end;
$$;

grant execute on function public.set_initiative_status(uuid, public.initiative_status, text)
  to authenticated;

-- -----------------------------------------------------------------------------
-- Log de atividade (timeline do dashboard)
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
  elsif tg_table_name = 'initiatives' and old.status is distinct from new.status then
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

drop trigger if exists initiatives_activity on public.initiatives;
create trigger initiatives_activity
  after insert or update or delete on public.initiatives
  for each row execute function public.log_activity();

drop trigger if exists categories_activity on public.categories;
create trigger categories_activity
  after insert or delete on public.categories
  for each row execute function public.log_activity();

-- -----------------------------------------------------------------------------
-- Provisionamento de perfil no primeiro login
-- O papel NUNCA vem dos metadados do usuário (que ele mesmo controla no
-- signUp): o primeiro cadastro vira admin, os demais entram como editor.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.user_role;
begin
  select case when count(*) = 0 then 'admin' else 'editor' end::public.user_role
    into v_role
    from public.profiles;

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email,
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Um usuário não pode promover a si mesmo: só admin altera papel ou ativação.
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- Sessão privilegiada = SQL Editor, migração ou `service_role`. Sem esta
  -- exceção, um operador não conseguiria corrigir papéis direto no banco —
  -- inclusive para destravar uma instalação sem administrador.
  v_privileged boolean := public.is_admin() or public.is_privileged_session();
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not v_privileged then
    raise exception 'Apenas administradores alteram papel ou situação de um usuário.'
      using errcode = '42501';
  end if;

  -- Impede que a instalação fique sem nenhum administrador ativo.
  -- Vale inclusive para sessões privilegiadas: é uma trava de integridade,
  -- não de permissão.
  if old.role = 'admin' and old.is_active
     and (new.role <> 'admin' or not new.is_active)
     and (select count(*) from public.profiles where role = 'admin' and is_active) <= 1 then
    raise exception 'É necessário manter ao menos um administrador ativo.'
      using errcode = '42501';
  end if;

  new.id := old.id;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- -----------------------------------------------------------------------------
-- Estatísticas do dashboard em uma única chamada
-- Evita 6 round-trips só para montar os cards de métrica.
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'total',        (select count(*) from public.initiatives),
    'by_status',    (select coalesce(jsonb_object_agg(status, total), '{}'::jsonb)
                       from (select status, count(*) as total
                               from public.initiatives group by status) s),
    'categories',   (select count(*) from public.categories),
    'people',       (select count(*) from public.people),
    'by_category',  (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
                       from (select c.id, c.name, c.slug,
                                    count(i.id) as total,
                                    count(i.id) filter (where i.status = 'published') as published
                               from public.categories c
                               left join public.initiatives i on i.category_id = c.id
                              group by c.id, c.name, c.slug
                              order by count(i.id) desc, c.name) t)
  );
$$;

grant execute on function public.dashboard_stats() to authenticated;
