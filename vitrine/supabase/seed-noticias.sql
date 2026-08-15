-- =============================================================================
-- Vitrine — notícias de demonstração
--
-- Oito notícias fictícias para visualizar o formato editorial: chapéu, linha
-- fina, capa com legenda e crédito, galeria legendada, intertítulos, listas,
-- nota de correção, e os estados de rascunho e de fila de revisão.
--
-- Diferente de `seed.sql`, este arquivo NÃO usa `truncate`: ele remove apenas
-- os slugs que ele mesmo cria. Rodar duas vezes repõe a demonstração sem
-- encostar em nenhuma notícia de verdade que já esteja no ar.
--
-- Rode no SQL Editor do Supabase, DEPOIS das migrations 0009 e 0010.
--
-- Textos, nomes e números são inventados. As imagens vêm do picsum.photos, o
-- mesmo serviço de placeholder que `seed.sql` usa — nada de material de
-- terceiros embutido no repositório, e nada gravado no bucket `news-images`.
-- =============================================================================

delete from public.news where slug in (
  'laboratorio-de-ia-abre-inscricoes-para-bolsas-de-iniciacao-cientifica',
  'projeto-de-extensao-leva-oficinas-de-robotica-a-cinco-escolas',
  'incubadora-anuncia-selecao-de-startups-para-o-segundo-semestre',
  'novo-laboratorio-multiusuario-de-microscopia-entra-em-operacao',
  'campus-recebe-mostra-de-projetos-de-conclusao-de-curso',
  'biblioteca-central-amplia-horario-durante-a-semana-de-provas',
  'rascunho-nota-sobre-o-calendario-academico',
  'programa-de-monitoria-abre-vagas-para-o-proximo-semestre'
);

do $seed$
declare
  -- Sem perfil cadastrado a notícia fica sem assinatura, e a página lida com
  -- isso: a linha do autor simplesmente não aparece.
  v_autor uuid := (select id from public.profiles limit 1);
begin

insert into public.news (
  name, kicker, slug, excerpt, content,
  cover_image, cover_caption, cover_credit, gallery,
  status, created_by, published_at, content_updated_at
) values

-- 1. Completa: capa legendada, galeria de três, intertítulos e lista ----------
(
  'Laboratório de IA abre inscrições para bolsas de iniciação científica',
  'Pesquisa',
  'laboratorio-de-ia-abre-inscricoes-para-bolsas-de-iniciacao-cientifica',
  'São 12 bolsas para estudantes de graduação, com atuação em visão computacional e processamento de linguagem natural. As inscrições vão até o dia 30.',
  'O Laboratório de Inteligência Artificial Aplicada abriu inscrições para 12 bolsas de iniciação científica com início previsto para o próximo semestre. As vagas são destinadas a estudantes de graduação de qualquer curso da instituição, desde que já tenham cursado a disciplina de Algoritmos.

As bolsas têm duração de 12 meses e podem ser renovadas uma vez, mediante avaliação de desempenho e parecer do orientador.

## Linhas de pesquisa

Os projetos estão divididos em duas frentes, cada uma com seis vagas. A escolha é feita no ato da inscrição e não pode ser alterada depois da homologação.

- Visão computacional aplicada ao monitoramento de lavouras
- Processamento de linguagem natural para documentos públicos
- Modelos de previsão de demanda para a rede municipal de saúde
- Ferramentas de acessibilidade para pessoas com baixa visão

## Como se inscrever

A inscrição é feita pelo portal do estudante, na seção de editais. É preciso anexar histórico escolar, carta de intenções de no máximo duas páginas e o aceite de um professor orientador vinculado ao laboratório.

O resultado preliminar sai no dia 8 do mês seguinte, com prazo de dois dias úteis para recurso. A lista final é publicada junto com o cronograma de início das atividades.

## Atendimento a quem tem dúvidas

O laboratório vai manter plantão de dúvidas presencial nas tardes de quarta-feira, no bloco C, e um canal de perguntas por e-mail durante todo o período de inscrição.',
  'https://picsum.photos/seed/vitrine-noticia-ia/1200/675',
  'Estudantes durante encontro semanal do grupo de visão computacional.',
  'Foto: Divulgação',
  '[
     {"url": "https://picsum.photos/seed/vitrine-noticia-ia-g1/1200/675",
      "caption": "Bancada de testes montada para os experimentos de campo.",
      "credit": "Foto: Divulgação"},
     {"url": "https://picsum.photos/seed/vitrine-noticia-ia-g2/1200/675",
      "caption": "Apresentação dos resultados parciais para a comunidade acadêmica.",
      "credit": "Foto: Divulgação"},
     {"url": "https://picsum.photos/seed/vitrine-noticia-ia-g3/1200/675",
      "caption": "Equipamento cedido em parceria com o laboratório de agronomia.",
      "credit": "Foto: Divulgação"}
   ]'::jsonb,
  'published', v_autor, now() - interval '6 hours', null
),

-- 2. Chapéu, capa e galeria curta --------------------------------------------
(
  'Projeto de extensão leva oficinas de robótica a cinco escolas',
  'Extensão',
  'projeto-de-extensao-leva-oficinas-de-robotica-a-cinco-escolas',
  'A ação atende cerca de 240 estudantes do ensino fundamental e usa kits montados com material reaproveitado pelos próprios participantes.',
  'Cinco escolas da rede municipal passam a receber oficinas quinzenais de robótica conduzidas por estudantes de engenharia e licenciatura. A previsão é atender 240 crianças até o fim do ano letivo.

Cada turma monta o próprio kit a partir de componentes recuperados de equipamentos descartados pela instituição, o que reduz o custo por aluno e serve de porta de entrada para a conversa sobre lixo eletrônico.

## Formação dos monitores

Os 18 monitores passaram por 40 horas de formação antes da primeira visita, divididas entre conteúdo técnico e prática de sala de aula. A carga horária conta como atividade complementar.

A coordenação avalia ampliar o alcance no próximo ano, condicionada à renovação do convênio com a secretaria de educação.',
  'https://picsum.photos/seed/vitrine-noticia-robotica/1200/675',
  'Oficina realizada na escola municipal do bairro Progresso.',
  'Foto: Divulgação',
  '[
     {"url": "https://picsum.photos/seed/vitrine-noticia-robotica-g1/1200/675",
      "caption": "Kit montado pelos estudantes com componentes reaproveitados.",
      "credit": "Foto: Divulgação"},
     {"url": "https://picsum.photos/seed/vitrine-noticia-robotica-g2/1200/675",
      "caption": "Monitores durante a formação preparatória.",
      "credit": "Foto: Divulgação"}
   ]'::jsonb,
  'published', v_autor, now() - interval '2 days', null
),

-- 3. Com nota de correção (content_updated_at > published_at) -----------------
(
  'Incubadora anuncia seleção de startups para o segundo semestre',
  'Inovação',
  'incubadora-anuncia-selecao-de-startups-para-o-segundo-semestre',
  'Serão oito vagas de incubação, com espaço físico, mentoria e acesso aos laboratórios. Podem se candidatar equipes com pelo menos um integrante vinculado à instituição.',
  'A incubadora abriu chamada para oito vagas de incubação no segundo semestre. O programa oferece espaço de trabalho, mentoria quinzenal e acesso aos laboratórios multiusuário pelo período de 18 meses.

Podem se candidatar equipes de dois a seis integrantes, com pelo menos um deles vinculado à instituição como estudante, servidor ou egresso dos últimos cinco anos.

## O que o programa oferece

- Estação de trabalho para toda a equipe
- Mentoria quinzenal com profissionais do mercado
- Acesso agendado aos laboratórios multiusuário
- Apoio jurídico para registro de marca e patente

## Prazos

As inscrições ficam abertas por 30 dias. A banca é composta por professores e por representantes do setor produtivo da região, e a defesa dos projetos selecionados acontece de forma presencial.',
  'https://picsum.photos/seed/vitrine-noticia-incubadora/1200/675',
  'Espaço de trabalho compartilhado usado pelas equipes incubadas.',
  'Foto: Divulgação',
  '[]'::jsonb,
  'published', v_autor, now() - interval '4 days', now() - interval '3 days'
),

-- 4. Capa com crédito, sem galeria -------------------------------------------
(
  'Novo laboratório multiusuário de microscopia entra em operação',
  'Infraestrutura',
  'novo-laboratorio-multiusuario-de-microscopia-entra-em-operacao',
  'O espaço reúne três microscópios eletrônicos e fica aberto a pesquisadores de outras instituições mediante agendamento.',
  'Entrou em operação o laboratório multiusuário de microscopia, que reúne três equipamentos adquiridos por meio de emenda parlamentar e de recursos de projeto aprovado em edital nacional.

O uso é aberto a pesquisadores de outras instituições mediante agendamento, com prioridade para projetos em andamento na própria instituição. A capacitação obrigatória tem oito horas e é oferecida uma vez por mês.

## Agendamento

O calendário fica disponível no sistema interno de reservas. Cada grupo de pesquisa tem direito a 12 horas mensais, e as horas não utilizadas não acumulam para o mês seguinte.',
  'https://picsum.photos/seed/vitrine-noticia-microscopia/1200/675',
  null,
  'Foto: Divulgação',
  '[]'::jsonb,
  'published', v_autor, now() - interval '9 days', null
),

-- 5. Sem chapéu: mostra o cartão e o topo sem o rótulo ------------------------
(
  'Campus recebe mostra de projetos de conclusão de curso',
  null,
  'campus-recebe-mostra-de-projetos-de-conclusao-de-curso',
  'A exposição reúne 64 trabalhos de nove cursos e fica aberta ao público durante três dias, no saguão do bloco A.',
  'A mostra de projetos de conclusão de curso reúne 64 trabalhos de nove cursos de graduação. A exposição fica aberta ao público das 9h às 21h, no saguão do bloco A.

Os visitantes podem votar no projeto de maior impacto para a comunidade. O resultado é anunciado no encerramento, junto com a premiação da banca avaliadora.

Não é necessário se inscrever para visitar. Escolas interessadas em levar turmas podem agendar visita guiada pela secretaria de graduação.',
  'https://picsum.photos/seed/vitrine-noticia-mostra/1200/675',
  'Edição anterior da mostra, realizada no saguão do bloco A.',
  null,
  '[]'::jsonb,
  'published', v_autor, now() - interval '15 days', null
),

-- 6. Sem capa nenhuma: exercita o fallback do cartão e o artigo sem foto ------
(
  'Biblioteca central amplia horário durante a semana de provas',
  'Serviço',
  'biblioteca-central-amplia-horario-durante-a-semana-de-provas',
  'Durante o período de avaliações, a biblioteca funciona até a meia-noite de segunda a sexta e abre aos sábados pela manhã.',
  'A biblioteca central amplia o horário de funcionamento durante a semana de provas. De segunda a sexta o atendimento vai até a meia-noite, e aos sábados das 8h às 12h.

As salas de estudo em grupo seguem com reserva pelo sistema, limitada a duas horas por equipe. O acervo de empréstimo mantém o horário normal, até as 22h.

O reforço no horário depende da escala de servidores e é reavaliado a cada semestre.',
  null, null, null, '[]'::jsonb,
  'published', v_autor, now() - interval '21 days', null
),

-- 7. Rascunho: aparece só no painel ------------------------------------------
(
  'Rascunho: nota sobre o calendário acadêmico',
  'Institucional',
  'rascunho-nota-sobre-o-calendario-academico',
  'Texto ainda em elaboração, aguardando confirmação das datas pela pró-reitoria.',
  'Conteúdo em elaboração. As datas ainda dependem de confirmação da pró-reitoria de graduação antes da publicação.',
  null, null, null, '[]'::jsonb,
  'draft', v_autor, null, null
),

-- 8. Em revisão: cai na fila de /admin/revisao --------------------------------
(
  'Programa de monitoria abre vagas para o próximo semestre',
  'Ensino',
  'programa-de-monitoria-abre-vagas-para-o-proximo-semestre',
  'São 45 vagas distribuídas entre as disciplinas de maior reprovação, com bolsa e certificado de atividade complementar.',
  'O programa de monitoria abre 45 vagas para o próximo semestre, distribuídas entre as disciplinas com maior índice de reprovação nos últimos três semestres.

Podem se candidatar estudantes que já cursaram a disciplina com aproveitamento mínimo de 80 por cento e que não tenham reprovação por frequência no histórico.

## Seleção

A seleção é feita pelo professor responsável e considera o desempenho na disciplina e a disponibilidade de horário. O resultado é divulgado antes do início das aulas.',
  'https://picsum.photos/seed/vitrine-noticia-monitoria/1200/675',
  'Atendimento de monitoria na sala de estudos do bloco B.',
  'Foto: Divulgação',
  '[]'::jsonb,
  'pending_review', v_autor, null, null
);

end
$seed$;

-- Confere o que entrou.
select status, kicker, name, published_at::date as publicada_em,
       jsonb_array_length(gallery) as fotos_na_galeria
  from public.news
 order by status, published_at desc nulls last;
