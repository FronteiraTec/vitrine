-- =============================================================================
-- Vitrine — 0005 | Identidade do site (cabeçalho e rodapé)
--
-- Uma única linha guarda a marca, as cores e os textos do cabeçalho e do
-- rodapé. Leitura é pública — a vitrine precisa dela para pintar a primeira
-- tela; escrita é exclusiva do administrador.
--
-- Toda cor é opcional: `null` significa "usar o token do design system". Assim
-- o tema padrão continua sendo a fonte da verdade e a personalização é um
-- override consciente, não uma cópia da paleta inteira no banco.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- site_settings — singleton garantido pelo próprio schema
--
-- `id boolean primary key check (id)` só admite o valor `true`: a chave
-- primária impede a segunda linha. Some a isso a ausência de grant de INSERT e
-- DELETE (ver abaixo) e a tabela se torna estruturalmente incapaz de ter
-- número de linhas diferente de um — sem trigger e sem convenção a respeitar.
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id boolean primary key default true,
  constraint site_settings_singleton check (id),

  -- Marca — compartilhada entre cabeçalho, rodapé e painel
  brand_name          text not null default 'Vitrine',
  brand_tagline       text,
  logo_url            text,

  -- Cabeçalho
  header_bg           text,
  header_fg           text,
  header_border       text,
  header_sticky       boolean not null default true,
  header_show_search  boolean not null default true,
  header_nav          jsonb   not null default '[]'::jsonb,

  -- Rodapé
  footer_bg               text,
  footer_fg               text,
  footer_description      text,
  footer_partners_label   text,
  footer_partners         jsonb   not null default '[]'::jsonb,
  footer_social           jsonb   not null default '[]'::jsonb,
  footer_show_categories  boolean not null default true,
  footer_contact_email    text,
  footer_contact_phone    text,
  footer_address          text,
  footer_copyright        text,
  footer_note             text,

  -- Cores globais (sobrescrevem tokens do design system)
  primary_color       text,
  brand_color         text,

  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);

comment on table public.site_settings is
  'Identidade visual e textual do cabeçalho e do rodapé. Sempre uma única linha.';
comment on column public.site_settings.header_nav is
  'Links do menu principal: [{"label": "...", "to": "/..."}]. Vazio = usa a navegação padrão do código.';
comment on column public.site_settings.footer_partners is
  'Logos de apoio no rodapé: [{"name": "...", "logo_url": "...", "url": "..."}].';
comment on column public.site_settings.footer_social is
  'Redes sociais: [{"type": "instagram|linkedin|youtube|github|facebook|website|other", "url": "..."}].';

-- -----------------------------------------------------------------------------
-- Validação de cor no banco
--
-- O formulário já valida, mas o PostgREST aceita qualquer string vinda de um
-- cliente adulterado — e uma cor inválida vaza direto para o `style` da página.
-- A regra fica aqui, junto do dado, como o resto das regras do projeto.
-- -----------------------------------------------------------------------------
create or replace function public.is_hex_color(value text)
returns boolean
language sql
immutable
as $$
  select value is null or value ~ '^#[0-9a-fA-F]{6}$';
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'site_settings_colors_are_hex'
  ) then
    alter table public.site_settings
      add constraint site_settings_colors_are_hex check (
        public.is_hex_color(header_bg)
        and public.is_hex_color(header_fg)
        and public.is_hex_color(header_border)
        and public.is_hex_color(footer_bg)
        and public.is_hex_color(footer_fg)
        and public.is_hex_color(primary_color)
        and public.is_hex_color(brand_color)
      );
  end if;
end $$;

-- As listas precisam ser arrays JSON: um objeto solto quebraria o `.map()` na
-- renderização do rodapé.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'site_settings_lists_are_arrays'
  ) then
    alter table public.site_settings
      add constraint site_settings_lists_are_arrays check (
        jsonb_typeof(header_nav) = 'array'
        and jsonb_typeof(footer_partners) = 'array'
        and jsonb_typeof(footer_social) = 'array'
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- A linha única. `on conflict do nothing` mantém a migration idempotente sem
-- sobrescrever a personalização de quem já rodou o projeto.
-- -----------------------------------------------------------------------------
insert into public.site_settings (id) values (true)
on conflict (id) do nothing;

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

/*
 * Autoria da última alteração.
 *
 * Carimbada por trigger e não enviada pelo cliente: um `updated_by` vindo do
 * formulário seria só uma sugestão, já que o PostgREST aceita qualquer valor
 * no corpo. `auth.uid()` é null em sessão privilegiada (SQL Editor, migração),
 * e nesse caso o campo é preservado em vez de apagado.
 */
create or replace function public.stamp_site_settings_author()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  return new;
end;
$$;

drop trigger if exists site_settings_author on public.site_settings;
create trigger site_settings_author before update on public.site_settings
  for each row execute function public.stamp_site_settings_author();

-- -----------------------------------------------------------------------------
-- RLS — leitura para todos, escrita só de administrador
--
-- Não há grant de INSERT nem DELETE: o cliente só consegue atualizar a linha
-- que já existe. É o que sustenta o singleton descrito no topo do arquivo.
-- -----------------------------------------------------------------------------
alter table public.site_settings enable row level security;

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings
  for select to anon, authenticated
  using (true);

drop policy if exists site_settings_update on public.site_settings;
create policy site_settings_update on public.site_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Storage — bucket próprio para logo e marcas de apoio
--
-- Separado de `category-images` porque a política de retenção é outra: estes
-- arquivos são a identidade do site, trocados raramente e por administrador.
-- Aceita SVG, formato natural de logotipo.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('site-assets', 'site-assets', true, 2097152,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists site_assets_read on storage.objects;
create policy site_assets_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'site-assets');

drop policy if exists site_assets_write on storage.objects;
create policy site_assets_write on storage.objects
  for all to authenticated
  using (bucket_id = 'site-assets' and public.is_admin())
  with check (bucket_id = 'site-assets' and public.is_admin());
