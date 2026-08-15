-- =============================================================================
-- Vitrine — 0009 | Galeria de imagens nas notícias
--
-- Até aqui a notícia tinha uma imagem só (`cover_image`). Esta migration abre
-- espaço para imagens complementares, exibidas depois do texto na página
-- pública.
--
-- A coluna é `text[]`, igual à de `initiatives` (0001), e não uma tabela filha
-- `news_images`. A galeria é uma lista ordenada de URLs que só existe dentro da
-- notícia: não é consultada isoladamente, não tem metadados próprios e não é
-- referenciada por ninguém. Uma tabela filha custaria um join na página de
-- detalhe, mais duas policies de RLS e a sincronização de ordem no salvamento —
-- sem responder a nenhuma pergunta que o array já não responda.
--
-- NOTA: a 0010 troca esta coluna para `jsonb`, porque cada foto passou a
-- carregar legenda e crédito além da URL. Quem está instalando do zero pode
-- rodar as duas em sequência normalmente — a 0010 converte o que existir.
-- =============================================================================

alter table public.news
  add column if not exists gallery text[] not null default '{}';

comment on column public.news.gallery is
  'Imagens complementares, na ordem de exibição. URLs públicas do bucket news-images.';

-- -----------------------------------------------------------------------------
-- A galeria NÃO entra em `search_vector`
--
-- `build_news_search()` continua indexando apenas título, resumo e corpo. URL
-- de arquivo não é texto que alguém procura, e indexá-la só encheria o tsvector
-- de ruído (nomes com hash, extensão, caminho do bucket). Nenhum gatilho precisa
-- mudar: `news_search` dispara em `name, excerpt, content`, e `gallery` não está
-- nessa lista.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Storage e RLS seguem valendo sem alteração
--
-- As imagens vão para o mesmo bucket `news-images` criado em 0006, com as mesmas
-- policies (envia quem é da equipe; remove quem enviou, revisor ou admin). E a
-- coluna nova é coberta pelas policies de `public.news`, que valem por linha —
-- não por coluna.
-- -----------------------------------------------------------------------------
