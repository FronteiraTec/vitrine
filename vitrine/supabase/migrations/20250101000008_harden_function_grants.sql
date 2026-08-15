-- =============================================================================
-- Vitrine — 0008 | Endurecimento de permissões de funções
--
-- Correção de auditoria de segurança.
--
-- O PostgreSQL concede EXECUTE a PUBLIC em toda função recém-criada, e o
-- Supabase ainda acrescenta, por `alter default privileges`, um EXECUTE direto
-- para os papéis `anon` e `authenticated`. A consequência é que TODA função
-- deste projeto nasceu chamável por qualquer visitante via
-- `POST /rest/v1/rpc/<nome>` — inclusive as `SECURITY DEFINER`, que rodam como
-- dono do banco e por definição ignoram o RLS.
--
-- É por isso que os `revoke ... from public` da migration 0002 não surtiram
-- efeito: eles removem a concessão do pseudo-papel PUBLIC, mas não a concessão
-- direta a `anon`. Verificado em produção — `is_staff()`, `is_admin()`,
-- `auth_role()` e `can_review()` continuavam respondendo ao anônimo.
--
-- Duas exposições concretas foram confirmadas antes desta correção:
--
--   rpc/build_initiative_search  → devolvia o texto indexado de QUALQUER
--                                  registro, inclusive rascunho e arquivado
--   rpc/refresh_initiative_search → aceitava escrita anônima em `initiatives`
--
-- Nada aqui altera policy, tabela ou comportamento da aplicação: apenas fecha
-- o acesso direto a funções que sempre foram de uso interno.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Por que revogar não quebra os gatilhos
--
-- Todas as funções abaixo são chamadas de dentro de funções `SECURITY DEFINER`
-- (os gatilhos de slug, busca, workflow e log). Nesse contexto a checagem de
-- permissão é feita contra o DONO da função, não contra quem originou a
-- requisição — então o gatilho continua funcionando mesmo sem o cliente ter
-- EXECUTE. O que deixa de existir é só a porta da rua.
-- -----------------------------------------------------------------------------

-- Funções de uso estritamente interno: nenhum cliente precisa chamá-las.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.build_initiative_search(uuid)',
    'public.refresh_initiative_search(uuid[])',
    'public.build_news_search(uuid)',
    'public.refresh_news_search(uuid[])',
    'public.slugify(text)',
    'public.is_reindexing()',
    'public.is_privileged_session()',
    'public.allowed_transitions(public.initiative_status)'
  ]
  loop
    -- `if exists` mantém a migration idempotente e tolerante a uma instalação
    -- que ainda não aplicou a 0006 (funções de notícia).
    if to_regprocedure(v_signature) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', v_signature);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Helpers de autorização e RPCs do painel: continuam disponíveis para quem tem
-- sessão, deixam de responder ao anônimo.
--
-- `initiative_is_visible()` NÃO entra nesta lista: ela é referenciada dentro de
-- policies aplicadas ao papel `anon`, e expressões de policy são avaliadas com
-- as permissões de quem consulta. Revogá-la quebraria a leitura pública das
-- tabelas filhas.
--
-- `installation_has_admin()` também fica: a tela de primeiro acesso é, por
-- definição, anônima.
-- -----------------------------------------------------------------------------
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.auth_role()',
    'public.is_staff()',
    'public.is_admin()',
    'public.can_review()',
    'public.can_edit_initiative(uuid)',
    'public.dashboard_stats()',
    'public.set_initiative_status(uuid, public.initiative_status, text)',
    'public.set_news_status(uuid, public.initiative_status, text)'
  ]
  loop
    if to_regprocedure(v_signature) is not null then
      execute format('revoke all on function %s from public, anon', v_signature);
      execute format('grant execute on function %s to authenticated', v_signature);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Evita que a brecha volte por descuido
--
-- Sem isto, a próxima função criada neste schema nasceria de novo executável
-- por `anon` e `authenticated`, e a correção acima teria validade de uma
-- migration. A concessão passa a ser explícita, função a função.
--
-- Só afeta objetos criados DEPOIS deste comando, e apenas os criados pelo mesmo
-- papel que o executa — por isso os `revoke` acima continuam necessários para o
-- que já existe.
--
-- `from public` NÃO é redundante com `from anon, authenticated`, e esquecê-lo
-- foi o defeito da primeira versão deste arquivo. São duas concessões
-- diferentes empilhadas:
--
--   1. o PostgreSQL concede EXECUTE ao pseudo-papel PUBLIC em toda função nova;
--   2. o Supabase acrescenta uma concessão direta a `anon` e `authenticated`.
--
-- Remover só a segunda deixa a primeira de pé, e `anon` continua alcançando a
-- função por ser membro de PUBLIC. Verificado na prática: com apenas
-- `from anon, authenticated`, uma função criada logo abaixo desta linha
-- permanecia chamável sem autenticação.
-- -----------------------------------------------------------------------------
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

-- =============================================================================
-- Validação de esquema de URL
--
-- `initiative_links.url` já exigia `^https?://` desde a 0001. As demais URLs
-- que viram `href` na vitrine — o site da iniciativa e os links do rodapé —
-- não exigiam nada.
--
-- Não é uma correção de XSS ativo: o React 19 neutraliza `href="javascript:…"`
-- por conta própria, e foi verificado que o faz. É defesa em profundidade, para
-- que a regra não dependa de um detalhe de implementação da biblioteca de
-- interface, e para uniformizar o que já valia para os links.
-- =============================================================================

create or replace function public.is_web_url(value text)
returns boolean
language sql
immutable
as $$
  select value is null
      or btrim(value) = ''
      or value ~* '^https?://';
$$;

comment on function public.is_web_url(text) is
  'URL vazia, nula ou com esquema http/https. Usada em constraints CHECK.';

/*
 * `not valid` de propósito: a checagem passa a valer para toda gravação nova,
 * sem varrer as linhas existentes. Um registro antigo fora do padrão faria a
 * migration falhar no meio, e derrubar a aplicação por causa de um link torto
 * seria pior que o problema. Para exigir também do acervo atual, depois de
 * conferir os dados:
 *
 *   alter table public.initiatives validate constraint initiatives_website_scheme;
 */
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'initiatives_website_scheme'
  ) then
    alter table public.initiatives
      add constraint initiatives_website_scheme check (public.is_web_url(website))
      not valid;
  end if;
end $$;

-- Cada `url` dentro dos arrays JSON do rodapé.
create or replace function public.jsonb_urls_are_web(p_items jsonb)
returns boolean
language sql
immutable
as $$
  select not exists (
    select 1
      from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
     where coalesce(item ->> 'url', '') <> ''
       and (item ->> 'url') !~* '^https?://'
  );
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'site_settings_urls_are_web'
  ) then
    alter table public.site_settings
      add constraint site_settings_urls_are_web check (
        public.jsonb_urls_are_web(footer_social)
        and public.jsonb_urls_are_web(footer_partners)
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Os validadores precisam de EXECUTE explícito
--
-- O `alter default privileges` acima vale para tudo que for criado depois dele
-- — inclusive as duas funções logo acima. Sem esta concessão, elas nasceriam
-- sem EXECUTE para `authenticated`, e a expressão de um CHECK é avaliada com as
-- permissões de quem grava: salvar uma iniciativa ou a identidade do site
-- passaria a falhar com "permission denied for function".
--
-- Conceder aqui não abre nada: as três recebem texto ou JSON e devolvem um
-- booleano, sem tocar em tabela alguma. São o oposto das funções revogadas no
-- topo do arquivo, que liam e escreviam dados como dono do banco.
-- -----------------------------------------------------------------------------
grant execute on function public.is_web_url(text) to anon, authenticated;
grant execute on function public.jsonb_urls_are_web(jsonb) to anon, authenticated;

do $$
begin
  if to_regprocedure('public.is_hex_color(text)') is not null then
    execute 'grant execute on function public.is_hex_color(text) to anon, authenticated';
  end if;
end $$;
