-- =============================================================================
-- Vitrine — 0010 | Campos editoriais das notícias
--
-- Aproxima a notícia do formato de um portal jornalístico. Quatro acréscimos:
--
--   kicker             o "chapéu" acima do título (ex.: "Eleições 2026")
--   cover_caption      legenda da imagem de capa
--   cover_credit       crédito da imagem de capa
--   content_updated_at quando o texto mudou DEPOIS de publicado
--
-- E uma mudança de forma: `gallery` deixa de ser `text[]` e passa a ser `jsonb`,
-- porque cada imagem agora carrega legenda e crédito junto da URL.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Colunas novas
-- -----------------------------------------------------------------------------
alter table public.news
  add column if not exists kicker             text,
  add column if not exists cover_caption      text,
  add column if not exists cover_credit       text,
  add column if not exists content_updated_at timestamptz;

comment on column public.news.kicker is
  'Chapéu: rótulo curto acima do título, no formato dos portais de notícia.';
comment on column public.news.cover_credit is
  'Crédito da foto de capa. Separado da legenda porque tem função própria: a
   legenda descreve a cena, o crédito atribui autoria — e a atribuição é
   obrigação editorial, não enfeite.';
comment on column public.news.content_updated_at is
  'Última alteração de conteúdo após a publicação. Diferente de `updated_at`,
   que qualquer gravação move — inclusive arquivar e republicar.';

-- -----------------------------------------------------------------------------
-- gallery: text[] → jsonb
--
-- Cada item passa a ser { "url": …, "caption": …, "credit": … }. Arrays
-- paralelos (`gallery` + `gallery_captions`) foram descartados: nada no banco
-- garantiria que os três ficassem do mesmo tamanho e na mesma ordem, e a
-- primeira remoção no meio da lista desalinharia legenda e foto em silêncio.
--
-- O bloco abaixo converte o que a 0009 tiver criado, preservando ordem e URLs.
-- Se a 0009 ainda não rodou, ele não faz nada e o `add column` seguinte já
-- cria a coluna no formato final — o arquivo funciona nos dois estados.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'news'
       and column_name  = 'gallery'
       and data_type    = 'ARRAY'
  ) then
    -- Marca a conversão como efeito interno. Sem isto, o UPDATE abaixo passaria
    -- pelo gatilho de workflow e pelo log de atividade: toda notícia ganharia
    -- `updated_at` de hoje e uma linha "atualizou" no painel, por uma mudança
    -- que o leitor não vê.
    perform set_config('vitrine.reindexing', 'on', true);

    -- Em dois passos porque o `using` de um ALTER COLUMN não aceita subconsulta.
    -- Primeiro a forma bruta (array de strings), depois o formato final.
    --
    -- E em três comandos separados porque o default antigo (`'{}'::text[]`) não
    -- é convertível para jsonb: ele precisa cair antes da troca de tipo.
    alter table public.news alter column gallery drop default;
    alter table public.news alter column gallery type jsonb using to_jsonb(gallery);
    alter table public.news alter column gallery set default '[]'::jsonb;

    update public.news n
       set gallery = convertido.valor
      from (
        select m.id,
               jsonb_agg(jsonb_build_object('url', foto.url) order by foto.posicao) as valor
          from public.news m,
               lateral jsonb_array_elements_text(m.gallery)
                 with ordinality as foto(url, posicao)
         where btrim(foto.url) <> ''
         group by m.id
      ) as convertido
     where n.id = convertido.id;

    perform set_config('vitrine.reindexing', 'off', true);
  end if;
end $$;

alter table public.news
  add column if not exists gallery jsonb not null default '[]'::jsonb;

comment on column public.news.gallery is
  'Imagens complementares na ordem de exibição: [{ url, caption, credit }].';

-- Objeto solto ou string no lugar do array quebraria o `.map()` da página
-- pública. O PostgREST aceita qualquer JSON válido de um cliente adulterado,
-- então a forma é garantida aqui.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'news_gallery_is_array') then
    alter table public.news
      add constraint news_gallery_is_array check (jsonb_typeof(gallery) = 'array');
  end if;

  -- `jsonb_urls_are_web` veio da 0008 e já valida a mesma forma no rodapé do
  -- site: lista de objetos com `url`. Reaproveitada em vez de duplicada.
  if not exists (select 1 from pg_constraint where conname = 'news_gallery_urls_are_web') then
    alter table public.news
      add constraint news_gallery_urls_are_web check (public.jsonb_urls_are_web(gallery));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Busca: o chapéu entra no índice
--
-- Quem procura "eleições" espera achar a notícia cujo chapéu é "Eleições 2026",
-- mesmo que o título não repita a palavra. Peso B, junto do resumo: é rótulo de
-- editoria, não manchete.
--
-- Legenda e crédito ficam de fora de propósito — nome de fotógrafo e "Foto:
-- Divulgação" empurrariam para cima notícias que não falam do assunto buscado.
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
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(n.kicker, ''))), 'B')
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(n.excerpt, ''))), 'B')
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(n.content, ''))), 'C')
  from public.news n
  where n.id = p_news;
$$;

-- O gatilho precisa passar a escutar `kicker`, senão editar só o chapéu não
-- reindexaria a linha.
drop trigger if exists news_search on public.news;
create trigger news_search
  after insert or update of name, kicker, excerpt, content on public.news
  for each row execute function public.trg_news_search();

-- Reindexa o acervo existente uma vez, para as notícias já gravadas passarem a
-- responder pelo chapéu sem esperar uma edição.
select public.refresh_news_search(array(select id from public.news));

-- -----------------------------------------------------------------------------
-- content_updated_at
--
-- A lógica entra em `enforce_news_workflow()`, que já é o gatilho BEFORE da
-- tabela e já carimba `updated_at`, `updated_by` e `published_at`. Um segundo
-- gatilho só para isto significaria mais uma ordem de execução para lembrar.
--
-- Só conta depois de publicada: antes disso toda gravação é redação, e exibir
-- "atualizado" para o leitor sobre algo que ele nunca leu não diz nada. Mudança
-- apenas de status também não conta — arquivar não é corrigir o texto.
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

    -- Correção depois de publicada: é o que o leitor vê como "Atualizado em".
    if old.status = 'published'
       and (
            new.name          is distinct from old.name
         or new.kicker        is distinct from old.kicker
         or new.excerpt       is distinct from old.excerpt
         or new.content       is distinct from old.content
         or new.cover_image   is distinct from old.cover_image
         or new.cover_caption is distinct from old.cover_caption
         or new.cover_credit  is distinct from old.cover_credit
         or new.gallery       is distinct from old.gallery
       ) then
      new.content_updated_at := now();
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
