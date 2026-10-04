-- =============================================================================
-- Vitrine — 0015 | Audiência de notícias e iniciativas
--
-- Quantas vezes cada notícia e cada iniciativa foi aberta, por dia, idioma,
-- país, estado, cidade e canal de origem — a base da tela /admin/audiencia e
-- dos relatórios em planilha.
--
-- PRIVACIDADE
--
-- A tabela guarda TOTAIS, nunca visitas individuais: não há IP, identificador
-- de navegador, horário exato nem nada que aponte para uma pessoa. "Chapecó,
-- 3 de outubro, notícia X: 42 visualizações" não identifica ninguém. O país,
-- o estado e a cidade são estimados pelo IP na API, no momento do acesso, e o
-- IP é descartado em seguida.
--
-- "Leitores únicos" é contado no NAVEGADOR: a página só pede para somar um
-- leitor na primeira vez que abre aquele conteúdo naquele dia, e guarda a
-- marca no próprio navegador. Nada disso sai dele.
-- =============================================================================

create table if not exists public.content_views (
  day           date    not null,
  content_type  text    not null,
  content_id    uuid    not null,
  locale        text    not null default 'pt-BR',
  -- País em ISO 3166-1 (BR). Estado em ISO 3166-2 sem o país (SC) — no Brasil,
  -- sempre a sigla; fora dele, o nome quando a base de localização não traz o
  -- código. Vazio = não identificado.
  country       text    not null default '',
  region        text    not null default '',
  city          text    not null default '',
  -- Canal de origem: 'direto', 'interno', 'google', 'whatsapp'… ou o domínio
  -- do site que mandou o leitor.
  source        text    not null default '',
  views         integer not null default 0,
  visitors      integer not null default 0,
  constraint content_views_type_check check (content_type in ('news', 'initiative')),
  constraint content_views_pkey
    primary key (day, content_type, content_id, locale, country, region, city, source)
);

comment on table public.content_views is
  'Audiência agregada por dia. Só totais: nenhuma linha identifica um visitante.';
comment on column public.content_views.visitors is
  'Leitores únicos naquele dia (contados pelo navegador, sem identificador).';

-- Sem chave estrangeira para o conteúdo: `content_id` aponta para notícia OU
-- iniciativa. Conteúdo excluído deixa a audiência que teve, e o relatório o
-- mostra como "excluído" — apagar o histórico junto falsearia os totais do
-- período.
create index if not exists content_views_content_idx
  on public.content_views (content_type, content_id, day);
create index if not exists content_views_day_idx on public.content_views (day);

-- -----------------------------------------------------------------------------
-- RLS — leitura pela equipe; escrita só pela função abaixo
-- -----------------------------------------------------------------------------
alter table public.content_views enable row level security;

revoke all on public.content_views from public, anon, authenticated, service_role;
grant select on public.content_views to authenticated;

drop policy if exists content_views_select on public.content_views;
create policy content_views_select on public.content_views
  for select to authenticated
  using (public.is_staff());

/*
 * Registra uma visualização.
 *
 * SECURITY DEFINER porque precisa conferir que o conteúdo está PUBLICADO —
 * rascunho aberto por um link vazado não entra na conta — e o papel do serviço
 * não lê `news` nem `initiatives`. Só o serviço a executa: quem chama é a API,
 * depois de descartar robôs e sessões da equipe e de estimar a localização.
 *
 * Devolve `false` quando não contou (tipo desconhecido, conteúdo inexistente
 * ou fora do ar).
 */
create or replace function public.record_content_view(
  p_type     text,
  p_id       uuid,
  p_locale   text,
  p_country  text,
  p_region   text,
  p_city     text,
  p_source   text,
  p_unique   boolean,
  p_timezone text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_published boolean;
begin
  if p_type = 'news' then
    select exists (select 1 from public.news where id = p_id and status = 'published')
      into v_published;
  elsif p_type = 'initiative' then
    select exists (select 1 from public.initiatives where id = p_id and status = 'published')
      into v_published;
  else
    return false;
  end if;

  if not v_published then
    return false;
  end if;

  insert into public.content_views
    (day, content_type, content_id, locale, country, region, city, source, views, visitors)
  values (
    (now() at time zone p_timezone)::date,
    p_type,
    p_id,
    left(coalesce(p_locale, ''), 10),
    left(upper(coalesce(p_country, '')), 2),
    left(coalesce(p_region, ''), 80),
    left(coalesce(p_city, ''), 80),
    left(coalesce(p_source, ''), 100),
    1,
    case when p_unique then 1 else 0 end
  )
  on conflict on constraint content_views_pkey do update
    set views    = content_views.views + 1,
        visitors = content_views.visitors + excluded.visitors;

  return true;
end;
$$;

revoke all on function public.record_content_view(text, uuid, text, text, text, text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.record_content_view(text, uuid, text, text, text, text, text, boolean, text)
  to service_role;

-- -----------------------------------------------------------------------------
-- O que o serviço da API precisa e as migrations do Supabase não previam
-- -----------------------------------------------------------------------------

-- A tela de primeiro acesso e o cadastro inicial perguntam isto antes de haver
-- qualquer sessão.
grant execute on function public.installation_has_admin() to service_role;
