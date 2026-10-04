-- =============================================================================
-- Vitrine — 0012 | Autoria pública e texto alternativo da capa
--
-- Dois problemas, um de transparência e um de acessibilidade.
--
-- 1. AUTORIA INVISÍVEL
--
--    `profiles` só tinha `grant select` para `authenticated`, e a policy exigia
--    `id = auth.uid() or is_staff()`. Para um visitante anônimo — que é quem lê
--    o site — o vínculo `author:profiles!created_by(...)` da página de notícia
--    voltava NULO. Na prática: a assinatura "Por Fulano" nunca aparecia
--    publicamente, e o campo `author` do JSON-LD saía vazio justamente para o
--    rastreador. Autoria identificável é um dos critérios de transparência que
--    o Google observa em veículos de notícia.
--
--    A correção NÃO é abrir a tabela. É expor, para `anon`, um conjunto
--    restrito de COLUNAS (grant por coluna) e um conjunto restrito de LINHAS
--    (policy). E-mail, papel e situação continuam invisíveis ao público.
--
-- 2. TEXTO ALTERNATIVO
--
--    A capa não tinha campo de `alt`. A página usava a legenda como recuo, mas
--    legenda e alt têm funções diferentes: a legenda contextualiza para quem vê
--    a foto, o alt descreve a cena para quem não a vê.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Colunas públicas do perfil
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists slug               text,
  add column if not exists bio                text,
  add column if not exists job_title          text,
  add column if not exists is_public          boolean not null default true,
  add column if not exists profile_updated_at timestamptz;

comment on column public.profiles.slug is
  'Identificador da página pública do autor (/autor/:slug). Gerado do nome.';
comment on column public.profiles.bio is
  'Minibiografia exibida na página do autor e usada no dado estruturado Person.';
comment on column public.profiles.is_public is
  'Permite tirar alguém da vitrine de autores sem apagar a conta nem
   desassinar as notícias que a pessoa já publicou.';
comment on column public.profiles.profile_updated_at is
  'Última alteração dos dados PÚBLICOS do perfil. Diferente de `updated_at`,
   que qualquer gravação move — inclusive trocar o papel ou desativar a conta.';

-- -----------------------------------------------------------------------------
-- Slug
--
-- `ensure_unique_slug()` é a mesma função genérica de categorias, tags,
-- iniciativas e notícias: lê `new.name`, garante unicidade na própria tabela e
-- resolve colisão com sufixo numérico. `profiles` tem a coluna `name`, então
-- ela serve sem alteração — dois jornalistas homônimos viram `fulano` e
-- `fulano-2`, e nenhuma URL publicada muda depois.
-- -----------------------------------------------------------------------------
create unique index if not exists profiles_slug_key on public.profiles (slug);

drop trigger if exists profiles_slug on public.profiles;
create trigger profiles_slug
  before insert or update of name, slug on public.profiles
  for each row execute function public.ensure_unique_slug();

-- Preenche os perfis que já existem. O gatilho só dispara em gravação, e sem
-- este passo quem já estava cadastrado ficaria com `slug` nulo — ou seja, sem
-- página de autor e sem link na assinatura.
update public.profiles set slug = slug where slug is null;

-- -----------------------------------------------------------------------------
-- Carimbo do perfil público
--
-- Entra em `guard_profile_changes()`, que já é o gatilho BEFORE UPDATE da
-- tabela. Um segundo gatilho só para isto significaria mais uma ordem de
-- execução para lembrar. O resto da função é idêntico ao da 0002.
-- -----------------------------------------------------------------------------
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

  -- Só o que o leitor vê conta como atualização do perfil. Trocar o papel ou
  -- desativar a conta não é mudança editorial, e carimbar isso faria a data
  -- exibida na página do autor mentir.
  if new.name       is distinct from old.name
     or new.bio     is distinct from old.bio
     or new.job_title is distinct from old.job_title
     or new.avatar_url is distinct from old.avatar_url
     or new.slug    is distinct from old.slug then
    new.profile_updated_at := now();
  end if;

  new.id := old.id;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Leitura pública — colunas por grant, linhas por policy
--
-- O `grant` por coluna é o que impede o vazamento: mesmo que a policy deixasse
-- a linha passar, `anon` não consegue SELECIONAR `email`, `role` ou
-- `is_active`. PostgREST recusa a consulta que pedir uma coluna sem grant, em
-- vez de devolvê-la em branco.
--
-- A policy restringe as LINHAS a quem de fato assinou alguma notícia publicada.
-- `is_public` sozinho exporia todo mundo com conta — inclusive quem só revisa e
-- nunca apareceu no site. A subconsulta em `news` também passa pela RLS de
-- `news`, que para `anon` já é "somente publicadas": as duas condições se
-- somam, nunca se contradizem.
-- -----------------------------------------------------------------------------
grant select (id, name, slug, bio, job_title, avatar_url, profile_updated_at)
  on public.profiles to anon;

-- `is_public` NÃO entra no grant: a policy abaixo o consulta internamente, e
-- policy não depende de grant. Entregá-lo ao cliente só aumentaria a superfície
-- sem que nenhuma tela precisasse do valor.

-- `authenticated` já tinha grant na tabela inteira pela 0003; as colunas novas
-- entram junto, sem nada a fazer aqui.

drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
  for select to anon
  using (
    is_public
    and exists (
      select 1
        from public.news n
       where n.created_by = profiles.id
         and n.status = 'published'
    )
  );

-- A subconsulta acima roda a cada linha avaliada. Sem este índice ela viraria
-- varredura da tabela de notícias na listagem de autores.
create index if not exists news_created_by_published_idx
  on public.news (created_by)
  where status = 'published';

-- -----------------------------------------------------------------------------
-- Texto alternativo da capa
-- -----------------------------------------------------------------------------
alter table public.news
  add column if not exists cover_alt text;

comment on column public.news.cover_alt is
  'Descrição da imagem de capa para quem não a enxerga. Campo próprio, e não
   sinônimo da legenda: a legenda contextualiza a cena para quem vê a foto
   ("O prefeito durante o anúncio"), o alt descreve o que a foto mostra.
   Opcional — a página recua para a legenda quando está vazio.

   As imagens da galeria guardam o equivalente na chave `alt` de cada item do
   jsonb, que não precisa de coluna.';

-- Fora do índice de busca de propósito: texto alternativo descreve a foto, não
-- o assunto da notícia, e indexá-lo empurraria para cima resultados que não
-- falam do que foi procurado. Mesma razão pela qual legenda e crédito já
-- ficaram de fora na 0010.
