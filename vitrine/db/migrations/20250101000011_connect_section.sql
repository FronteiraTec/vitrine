-- =============================================================================
-- Vitrine — 0011 | Conexão INNE editável pelo painel
--
-- A faixa "Conexão INNE" da home tinha título, texto, rótulo do botão, nota e
-- número de WhatsApp escritos no componente. Mudar o telefone de atendimento
-- ou o nome do programa exigia um commit e um deploy — trabalho de
-- desenvolvedor para uma informação que quem administra o programa conhece
-- melhor do que quem escreveu a tela.
--
-- Os campos entram em `site_settings` e não em uma tabela própria: é conteúdo
-- de uma seção única, na mesma categoria da marca e dos textos do rodapé, e o
-- singleton já garante que existe exatamente uma resposta para cada um.
--
-- Todo campo é opcional. `null` significa "usar o texto padrão do código",
-- pela mesma razão que uma cor em branco herda o token do design system: quem
-- não personalizou continua acompanhando o conteúdo padrão em vez de carregar
-- uma cópia congelada dele no banco.
-- =============================================================================

alter table public.site_settings
  add column if not exists connect_enabled     boolean not null default true,
  add column if not exists connect_title       text,
  add column if not exists connect_description text,
  add column if not exists connect_cta_label   text,
  add column if not exists connect_note        text,
  add column if not exists connect_whatsapp    text;

comment on column public.site_settings.connect_enabled is
  'Exibe a faixa do programa na home. Desligar oculta a seção inteira, sem
   apagar os textos — um programa entre edições volta ao ar com um clique.';
comment on column public.site_settings.connect_title is
  'Nome do programa, no título da faixa. Vazio = "Conexão INNE".';
comment on column public.site_settings.connect_cta_label is
  'Rótulo do botão que abre o WhatsApp. Vazio = "Cadastrar demanda".';
comment on column public.site_settings.connect_note is
  'Linha de ressalva sob o botão — para quem o programa está aberto.';
comment on column public.site_settings.connect_whatsapp is
  'Telefone de atendimento como deve ser lido na tela (ex.: "+55 49 2049-6549").
   O link do wa.me é montado no cliente a partir dos dígitos deste mesmo valor:
   guardar as duas formas abriria espaço para elas discordarem, e o número
   exibido é o que o visitante confere antes de clicar.';
