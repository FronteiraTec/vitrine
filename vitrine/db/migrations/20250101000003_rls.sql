-- =============================================================================
-- Vitrine — 0003 | Row Level Security
--
-- Princípio: o anônimo enxerga exclusivamente iniciativas `published` e os
-- registros filhos dessas iniciativas. Nada mais. A autorização de escrita é
-- derivada do papel em `public.profiles`, nunca de um valor enviado pelo
-- cliente.
-- =============================================================================

alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.tags               enable row level security;
alter table public.people             enable row level security;
alter table public.initiatives        enable row level security;
alter table public.initiative_tags    enable row level security;
alter table public.initiative_people  enable row level security;
alter table public.initiative_links   enable row level security;
alter table public.initiative_reviews enable row level security;
alter table public.activity_log       enable row level security;

-- Privilégios de tabela. O RLS acima é quem realmente filtra as linhas;
-- estes grants apenas abrem o verbo para os papéis do PostgREST.
grant usage on schema public to anon, authenticated;

grant select on public.categories, public.tags, public.people,
                public.initiatives, public.initiative_tags,
                public.initiative_people, public.initiative_links
  to anon, authenticated;

grant select on public.profiles, public.initiative_reviews, public.activity_log
  to authenticated;

grant insert, update, delete on
  public.categories, public.tags, public.people, public.initiatives,
  public.initiative_tags, public.initiative_people, public.initiative_links,
  public.initiative_reviews, public.profiles
  to authenticated;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- O usuário edita o próprio perfil; o trigger `guard_profile_changes` impede
-- que ele altere o próprio papel ou reative a si mesmo.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin() and id <> auth.uid());

-- -----------------------------------------------------------------------------
-- categories — leitura pública, escrita apenas administrativa
-- -----------------------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to anon, authenticated using (true);

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert to authenticated with check (public.is_admin());

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
  for delete to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- tags — qualquer membro da equipe cria ao escrever uma iniciativa
-- -----------------------------------------------------------------------------
drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags
  for select to anon, authenticated using (true);

drop policy if exists tags_insert on public.tags;
create policy tags_insert on public.tags
  for insert to authenticated with check (public.is_staff());

drop policy if exists tags_update on public.tags;
create policy tags_update on public.tags
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists tags_delete on public.tags;
create policy tags_delete on public.tags
  for delete to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- people — aparecem nas páginas públicas das iniciativas
-- -----------------------------------------------------------------------------
drop policy if exists people_select on public.people;
create policy people_select on public.people
  for select to anon, authenticated using (true);

drop policy if exists people_insert on public.people;
create policy people_insert on public.people
  for insert to authenticated with check (public.is_staff());

drop policy if exists people_update on public.people;
create policy people_update on public.people
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists people_delete on public.people;
create policy people_delete on public.people
  for delete to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- initiatives
--
-- leitura  : público → apenas `published`; equipe → tudo
-- criação  : equipe ativa, sempre como autor (garantido pelo trigger)
-- edição   : autor do registro, revisor ou administrador
-- exclusão : administrador
--
-- Publicar/rejeitar/arquivar não é controlado aqui e sim pelo trigger
-- `enforce_initiative_workflow`, que valida a transição de estado e o papel.
-- -----------------------------------------------------------------------------
drop policy if exists initiatives_select_public on public.initiatives;
create policy initiatives_select_public on public.initiatives
  for select to anon
  using (status = 'published');

drop policy if exists initiatives_select_staff on public.initiatives;
create policy initiatives_select_staff on public.initiatives
  for select to authenticated
  using (status = 'published' or public.is_staff());

drop policy if exists initiatives_insert on public.initiatives;
create policy initiatives_insert on public.initiatives
  for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());

drop policy if exists initiatives_update on public.initiatives;
create policy initiatives_update on public.initiatives
  for update to authenticated
  using (public.is_staff() and (created_by = auth.uid() or public.can_review()))
  with check (public.is_staff() and (created_by = auth.uid() or public.can_review()));

drop policy if exists initiatives_delete on public.initiatives;
create policy initiatives_delete on public.initiatives
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Tabelas filhas — herdam a visibilidade e a permissão de edição do pai
-- -----------------------------------------------------------------------------
drop policy if exists initiative_tags_select on public.initiative_tags;
create policy initiative_tags_select on public.initiative_tags
  for select to anon, authenticated
  using (public.initiative_is_visible(initiative_id));

drop policy if exists initiative_tags_write on public.initiative_tags;
create policy initiative_tags_write on public.initiative_tags
  for all to authenticated
  using (public.can_edit_initiative(initiative_id))
  with check (public.can_edit_initiative(initiative_id));

drop policy if exists initiative_people_select on public.initiative_people;
create policy initiative_people_select on public.initiative_people
  for select to anon, authenticated
  using (public.initiative_is_visible(initiative_id));

drop policy if exists initiative_people_write on public.initiative_people;
create policy initiative_people_write on public.initiative_people
  for all to authenticated
  using (public.can_edit_initiative(initiative_id))
  with check (public.can_edit_initiative(initiative_id));

drop policy if exists initiative_links_select on public.initiative_links;
create policy initiative_links_select on public.initiative_links
  for select to anon, authenticated
  using (public.initiative_is_visible(initiative_id));

drop policy if exists initiative_links_write on public.initiative_links;
create policy initiative_links_write on public.initiative_links
  for all to authenticated
  using (public.can_edit_initiative(initiative_id))
  with check (public.can_edit_initiative(initiative_id));

-- -----------------------------------------------------------------------------
-- initiative_reviews — histórico interno, nunca exposto ao público
-- -----------------------------------------------------------------------------
drop policy if exists initiative_reviews_select on public.initiative_reviews;
create policy initiative_reviews_select on public.initiative_reviews
  for select to authenticated
  using (public.is_staff());

drop policy if exists initiative_reviews_insert on public.initiative_reviews;
create policy initiative_reviews_insert on public.initiative_reviews
  for insert to authenticated
  with check (public.can_review() and reviewer_id = auth.uid());

-- -----------------------------------------------------------------------------
-- activity_log — somente leitura para a equipe; a escrita é feita pelos
-- triggers SECURITY DEFINER, então não existe policy de INSERT.
-- -----------------------------------------------------------------------------
drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log
  for select to authenticated
  using (public.is_staff());
