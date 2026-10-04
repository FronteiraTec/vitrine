-- =============================================================================
-- Vitrine — dados de demonstração
--
-- ⚠️  ATENÇÃO: este script APAGA todo o conteúdo do catálogo antes de recriá-lo.
--     Rode apenas em ambiente de desenvolvimento ou em uma instalação nova.
--     Contas de usuário (auth.users / public.profiles) NÃO são afetadas.
--
-- Todas as pessoas, iniciativas e contatos abaixo são fictícios. As imagens
-- vêm de um serviço de placeholder determinístico (picsum.photos), portanto
-- não há material de terceiros embutido no repositório.
-- =============================================================================

truncate table
  public.initiative_links,
  public.initiative_people,
  public.initiative_tags,
  public.initiative_reviews,
  public.initiatives,
  public.categories,
  public.tags,
  public.people,
  public.activity_log
restart identity cascade;

-- -----------------------------------------------------------------------------
-- Categorias
-- -----------------------------------------------------------------------------
insert into public.categories (name, slug, description, icon, image_url, position) values
  ('Pesquisa', 'pesquisa',
   'Grupos, laboratórios e núcleos dedicados à produção de conhecimento científico.',
   'microscope', 'https://picsum.photos/seed/vitrine-pesquisa/1200/675', 1),
  ('Tecnologia', 'tecnologia',
   'Iniciativas que desenvolvem software, hardware e soluções de engenharia aplicada.',
   'cpu', 'https://picsum.photos/seed/vitrine-tecnologia/1200/675', 2),
  ('Inovação', 'inovacao',
   'Programas de inovação aberta, transferência de tecnologia e novos modelos de atuação.',
   'lightbulb', 'https://picsum.photos/seed/vitrine-inovacao/1200/675', 3),
  ('Extensão', 'extensao',
   'Projetos que levam o conhecimento da instituição para a comunidade.',
   'users', 'https://picsum.photos/seed/vitrine-extensao/1200/675', 4),
  ('Empreendedorismo', 'empreendedorismo',
   'Empresas juniores, incubadoras e startups nascidas dentro da instituição.',
   'rocket', 'https://picsum.photos/seed/vitrine-empreendedorismo/1200/675', 5),
  ('Infraestrutura', 'infraestrutura',
   'Espaços, laboratórios multiusuário e equipamentos abertos à comunidade acadêmica.',
   'building-2', 'https://picsum.photos/seed/vitrine-infraestrutura/1200/675', 6),
  ('Sustentabilidade', 'sustentabilidade',
   'Iniciativas voltadas a meio ambiente, energia limpa e desenvolvimento sustentável.',
   'leaf', 'https://picsum.photos/seed/vitrine-sustentabilidade/1200/675', 7),
  ('Saúde', 'saude',
   'Clínicas-escola, laboratórios e programas ligados à saúde e ao bem-estar.',
   'heart-pulse', 'https://picsum.photos/seed/vitrine-saude/1200/675', 8);

-- -----------------------------------------------------------------------------
-- Tags
-- -----------------------------------------------------------------------------
insert into public.tags (name, slug) values
  ('Inteligência artificial', 'inteligencia-artificial'),
  ('Robótica', 'robotica'),
  ('Software livre', 'software-livre'),
  ('Internet das coisas', 'internet-das-coisas'),
  ('Ciência de dados', 'ciencia-de-dados'),
  ('Energia limpa', 'energia-limpa'),
  ('Meio ambiente', 'meio-ambiente'),
  ('Educação', 'educacao'),
  ('Comunidade', 'comunidade'),
  ('Startup', 'startup'),
  ('Prototipagem', 'prototipagem'),
  ('Realidade virtual', 'realidade-virtual'),
  ('Telemedicina', 'telemedicina'),
  ('Acessibilidade', 'acessibilidade'),
  ('Agronegócio', 'agronegocio'),
  ('Cidades inteligentes', 'cidades-inteligentes'),
  ('Materiais', 'materiais'),
  ('Políticas públicas', 'politicas-publicas'),
  ('Computação quântica', 'computacao-quantica'),
  ('Biomecânica', 'biomecanica');

-- -----------------------------------------------------------------------------
-- Pessoas (fictícias)
-- -----------------------------------------------------------------------------
insert into public.people (name, email, role, photo_url) values
  ('Helena Vasconcelos', 'helena.vasconcelos@exemplo.edu.br', 'Coordenadora',      'https://picsum.photos/seed/pessoa-helena/240/240'),
  ('Rafael Andrade',     'rafael.andrade@exemplo.edu.br',     'Pesquisador',       'https://picsum.photos/seed/pessoa-rafael/240/240'),
  ('Marina Okamoto',     'marina.okamoto@exemplo.edu.br',     'Professora',        'https://picsum.photos/seed/pessoa-marina/240/240'),
  ('Tiago Bezerra',      'tiago.bezerra@exemplo.edu.br',      'Coordenador',       'https://picsum.photos/seed/pessoa-tiago/240/240'),
  ('Camila Ferraz',      'camila.ferraz@exemplo.edu.br',      'Pesquisadora',      'https://picsum.photos/seed/pessoa-camila/240/240'),
  ('Bruno Sanches',      'bruno.sanches@exemplo.edu.br',      'Técnico responsável','https://picsum.photos/seed/pessoa-bruno/240/240'),
  ('Larissa Monteiro',   'larissa.monteiro@exemplo.edu.br',   'Coordenadora',      'https://picsum.photos/seed/pessoa-larissa/240/240'),
  ('Eduardo Nakamura',   'eduardo.nakamura@exemplo.edu.br',   'Professor',         'https://picsum.photos/seed/pessoa-eduardo/240/240'),
  ('Patrícia Lemos',     'patricia.lemos@exemplo.edu.br',     'Diretora de projetos','https://picsum.photos/seed/pessoa-patricia/240/240'),
  ('Gustavo Rios',       'gustavo.rios@exemplo.edu.br',       'Bolsista',          'https://picsum.photos/seed/pessoa-gustavo/240/240'),
  ('Aline Carvalho',     'aline.carvalho@exemplo.edu.br',     'Pesquisadora',      'https://picsum.photos/seed/pessoa-aline/240/240'),
  ('Otávio Prado',       'otavio.prado@exemplo.edu.br',       'Coordenador',       'https://picsum.photos/seed/pessoa-otavio/240/240'),
  ('Renata Duarte',      'renata.duarte@exemplo.edu.br',      'Professora',        'https://picsum.photos/seed/pessoa-renata/240/240'),
  ('Sérgio Nobre',       'sergio.nobre@exemplo.edu.br',       'Engenheiro',        'https://picsum.photos/seed/pessoa-sergio/240/240'),
  ('Beatriz Almeida',    'beatriz.almeida@exemplo.edu.br',    'Coordenadora',      'https://picsum.photos/seed/pessoa-beatriz/240/240'),
  ('Henrique Salles',    'henrique.salles@exemplo.edu.br',    'Pesquisador',       'https://picsum.photos/seed/pessoa-henrique/240/240');

-- -----------------------------------------------------------------------------
-- Iniciativas
-- -----------------------------------------------------------------------------
insert into public.initiatives (
  category_id, name, slug, short_description, description, cover_image, gallery,
  areas, status, location, campus, city, state, email, phone, website, published_at
)
select
  c.id, v.name, v.slug, v.short_description, v.description,
  'https://picsum.photos/seed/' || v.slug || '/1200/750',
  array[
    'https://picsum.photos/seed/' || v.slug || '-g1/1200/750',
    'https://picsum.photos/seed/' || v.slug || '-g2/1200/750'
  ],
  v.areas, v.status::public.initiative_status,
  v.location, v.campus, v.city, v.state, v.email, v.phone, v.website,
  case when v.status = 'published' then now() - (v.age_days || ' days')::interval end
from (values
  ('pesquisa', 'Laboratório de Inteligência Artificial', 'laboratorio-de-inteligencia-artificial',
   'Pesquisa aplicada em aprendizado de máquina, visão computacional e processamento de linguagem natural.',
   E'O Laboratório de Inteligência Artificial reúne pesquisadores de computação, estatística e engenharia em torno de problemas que exigem modelos capazes de aprender com dados. As linhas ativas incluem visão computacional para inspeção industrial, modelos de linguagem aplicados a documentos técnicos e métodos de aprendizado com poucos rótulos.\n\nO laboratório mantém uma infraestrutura de computação compartilhada com aceleradores gráficos, disponível para projetos de graduação e pós-graduação mediante submissão de proposta. Todo código produzido é publicado em repositórios abertos sempre que os acordos de parceria permitem.\n\nAlém da produção científica, a equipe oferece trilhas de formação em fundamentos de aprendizado de máquina e mantém um seminário quinzenal aberto ao público.',
   array['Tecnologia', 'Engenharia'], 'published', 'Bloco C, sala 214', 'Campus Central', 'Porto Alegre', 'RS',
   'lia@exemplo.edu.br', '(51) 3000-1201', 'https://exemplo.edu.br/lia', 12),

  ('tecnologia', 'Núcleo de Robótica Aplicada', 'nucleo-de-robotica-aplicada',
   'Desenvolvimento de plataformas robóticas para ambientes industriais e de resgate.',
   E'O Núcleo de Robótica Aplicada projeta, monta e valida plataformas robóticas móveis e manipuladores para cenários onde a presença humana é arriscada ou pouco produtiva. Os projetos vão de robôs de inspeção de dutos a manipuladores colaborativos para linhas de montagem.\n\nA equipe é multidisciplinar e envolve estudantes de engenharia mecânica, elétrica e de computação, organizados em células de trabalho com ciclos curtos de prototipagem. O núcleo mantém parceria com empresas da região para validação em campo.\n\nA participação de estudantes de graduação acontece por processo seletivo semestral, com trilha de formação em sistemas embarcados e ROS.',
   array['Engenharia', 'Tecnologia'], 'published', 'Pavilhão de Engenharia, galpão 3', 'Campus Central', 'Porto Alegre', 'RS',
   'robotica@exemplo.edu.br', '(51) 3000-1202', 'https://exemplo.edu.br/robotica', 25),

  ('empreendedorismo', 'Empresa Júnior de Computação', 'empresa-junior-de-computacao',
   'Consultoria em software conduzida por estudantes, com projetos reais para clientes externos.',
   E'A Empresa Júnior de Computação é uma associação sem fins lucrativos formada e gerida por estudantes do curso de Ciência da Computação. Atende clientes reais em projetos de desenvolvimento web, automação de processos e análise de dados, sempre com supervisão docente.\n\nCada projeto funciona como uma experiência completa de mercado: levantamento de requisitos, proposta comercial, execução em sprints e entrega documentada. A receita é reinvestida em capacitação e infraestrutura para os próprios membros.\n\nOs processos seletivos ocorrem duas vezes por ano e não exigem experiência prévia, apenas disponibilidade e interesse.',
   array['Tecnologia', 'Gestão'], 'published', 'Prédio da Incubadora, sala 08', 'Campus Central', 'Porto Alegre', 'RS',
   'contato@ejcomp.exemplo.edu.br', '(51) 3000-1203', 'https://ejcomp.exemplo.edu.br', 7),

  ('sustentabilidade', 'Observatório de Monitoramento Ambiental', 'observatorio-de-monitoramento-ambiental',
   'Rede de sensores e painéis abertos para acompanhamento da qualidade do ar e da água.',
   E'O Observatório opera uma rede de estações de monitoramento distribuídas pela região metropolitana, medindo material particulado, gases traço e parâmetros físico-químicos de corpos d''água. Os dados são publicados em painéis abertos e alimentam estudos de saúde ambiental.\n\nA infraestrutura foi construída com sensores de baixo custo calibrados contra estações de referência, o que permite densidade espacial muito maior do que o monitoramento convencional. Todo o firmware e os modelos de calibração são publicados sob licença livre.\n\nEscolas da rede pública participam do programa hospedando estações e usando os dados em atividades pedagógicas.',
   array['Meio ambiente', 'Tecnologia'], 'published', 'Estação de campo, área verde norte', 'Campus Norte', 'Canoas', 'RS',
   'observatorio@exemplo.edu.br', '(51) 3000-1204', 'https://exemplo.edu.br/observatorio', 40),

  ('pesquisa', 'Grupo de Pesquisa em Sistemas Distribuídos', 'grupo-de-pesquisa-em-sistemas-distribuidos',
   'Estudos em consistência, tolerância a falhas e coordenação em larga escala.',
   E'O grupo investiga os problemas fundamentais de sistemas que precisam funcionar corretamente mesmo quando parte da infraestrutura falha. As frentes atuais incluem protocolos de consenso, replicação geograficamente distribuída e verificação formal de propriedades de segurança.\n\nO trabalho combina teoria e experimentação: modelos são especificados formalmente e depois validados em clusters reais sob injeção controlada de falhas. Os resultados alimentam tanto publicações quanto bibliotecas de código aberto.\n\nO grupo recebe estudantes de mestrado e doutorado e mantém colaboração com laboratórios de outras instituições.',
   array['Tecnologia'], 'published', 'Bloco C, sala 301', 'Campus Central', 'Porto Alegre', 'RS',
   'sd@exemplo.edu.br', null, 'https://exemplo.edu.br/sistemas-distribuidos', 60),

  ('infraestrutura', 'Centro de Prototipagem Rápida', 'centro-de-prototipagem-rapida',
   'Laboratório multiusuário com impressão 3D, corte a laser e usinagem CNC.',
   E'O Centro de Prototipagem Rápida é um espaço aberto a projetos de ensino, pesquisa e extensão de qualquer área. O parque de equipamentos inclui impressoras 3D de filamento e resina, cortadora a laser, fresadora CNC de bancada e estação de eletrônica.\n\nO uso é agendado por sistema próprio e condicionado a um treinamento de segurança de quatro horas. Materiais de consumo são cobrados a preço de custo e a operação dos equipamentos mais críticos é feita pela equipe técnica.\n\nO centro também apoia disciplinas de projeto integrador e competições estudantis.',
   array['Engenharia', 'Design'], 'published', 'Térreo do Pavilhão de Engenharia', 'Campus Central', 'Porto Alegre', 'RS',
   'prototipagem@exemplo.edu.br', '(51) 3000-1206', null, 18),

  ('extensao', 'Programa de Alfabetização Digital', 'programa-de-alfabetizacao-digital',
   'Oficinas gratuitas de inclusão digital para pessoas idosas e comunidades periféricas.',
   E'O programa oferece oficinas presenciais de uso seguro da internet, serviços públicos digitais e comunicação por aplicativos, com turmas pequenas e ritmo adaptado ao público. As atividades acontecem em centros comunitários e unidades básicas de saúde parceiras.\n\nO material didático foi desenvolvido pela equipe e está disponível gratuitamente para outras instituições reproduzirem. A cada semestre são formadas cerca de dez turmas.\n\nEstudantes de licenciatura e de computação atuam como monitores, recebendo formação prévia em metodologias de ensino para pessoas adultas.',
   array['Educação', 'Ciências sociais'], 'published', 'Itinerante', 'Campus Sul', 'Viamão', 'RS',
   'inclusaodigital@exemplo.edu.br', '(51) 3000-1207', 'https://exemplo.edu.br/alfabetizacao-digital', 5),

  ('empreendedorismo', 'Incubadora de Base Tecnológica', 'incubadora-de-base-tecnologica',
   'Apoio à criação e ao amadurecimento de empresas nascidas de pesquisa acadêmica.',
   E'A incubadora acompanha empresas em estágio inicial cujo diferencial competitivo vem de conhecimento técnico desenvolvido na instituição. O apoio inclui espaço físico, mentoria de negócios, assessoria jurídica e de propriedade intelectual, além de aproximação com investidores.\n\nO processo de entrada é feito por edital, com duas chamadas anuais. As empresas permanecem por até 36 meses e passam por avaliações semestrais de metas.\n\nAtualmente a incubadora abriga empresas nas áreas de saúde digital, agricultura de precisão e materiais avançados.',
   array['Gestão', 'Tecnologia'], 'published', 'Prédio da Incubadora', 'Campus Central', 'Porto Alegre', 'RS',
   'incubadora@exemplo.edu.br', '(51) 3000-1208', 'https://incubadora.exemplo.edu.br', 33),

  ('saude', 'Laboratório de Biomecânica', 'laboratorio-de-biomecanica',
   'Análise de movimento humano aplicada a reabilitação e desempenho esportivo.',
   E'O laboratório investiga como forças e movimentos atuam sobre o corpo humano, com aplicações em reabilitação pós-cirúrgica, prevenção de lesões e desempenho esportivo. A infraestrutura inclui plataformas de força, sistema de captura de movimento e eletromiografia de superfície.\n\nOs protocolos desenvolvidos são usados tanto em pesquisa quanto em atendimentos da clínica-escola, criando um ciclo curto entre evidência e prática clínica.\n\nO espaço recebe estudantes de fisioterapia, educação física e engenharia biomédica.',
   array['Saúde', 'Engenharia'], 'published', 'Bloco da Saúde, subsolo', 'Campus Central', 'Porto Alegre', 'RS',
   'biomecanica@exemplo.edu.br', '(51) 3000-1209', null, 47),

  ('saude', 'Rede de Telemedicina Comunitária', 'rede-de-telemedicina-comunitaria',
   'Teleconsultoria entre equipes de atenção básica e especialistas da instituição.',
   E'A rede conecta unidades básicas de saúde de municípios do interior a especialistas da instituição, reduzindo deslocamentos desnecessários e encurtando o tempo até a conduta adequada. O atendimento acontece de forma assíncrona, por meio de um sistema próprio de troca de casos.\n\nAlém da teleconsultoria, o projeto oferece formação continuada às equipes locais, com discussões de caso semanais. Os indicadores de resolutividade são acompanhados publicamente.\n\nO projeto é conduzido em parceria com secretarias municipais de saúde.',
   array['Saúde', 'Tecnologia'], 'published', 'Bloco da Saúde, sala 102', 'Campus Central', 'Porto Alegre', 'RS',
   'telemedicina@exemplo.edu.br', '(51) 3000-1210', 'https://exemplo.edu.br/telemedicina', 21),

  ('inovacao', 'Hub de Inovação Aberta', 'hub-de-inovacao-aberta',
   'Ponte entre desafios de empresas e a capacidade de pesquisa da instituição.',
   E'O hub organiza a demanda de empresas por soluções técnicas e a conecta a grupos de pesquisa capazes de respondê-la. O formato padrão é o desafio de inovação aberta: a empresa descreve o problema, o hub traduz em escopo de pesquisa e conduz o processo de contratação.\n\nA equipe também apoia a proteção de propriedade intelectual e a negociação de licenciamento de tecnologias já desenvolvidas.\n\nDesde a criação, o hub intermediou dezenas de projetos e mantém uma carteira ativa de parceiros industriais.',
   array['Gestão', 'Tecnologia'], 'published', 'Prédio da Reitoria, 2º andar', 'Campus Central', 'Porto Alegre', 'RS',
   'hub@exemplo.edu.br', '(51) 3000-1211', 'https://exemplo.edu.br/hub', 15),

  ('sustentabilidade', 'Laboratório de Energias Renováveis', 'laboratorio-de-energias-renovaveis',
   'Pesquisa em geração solar, armazenamento e integração à rede elétrica.',
   E'O laboratório estuda a geração distribuída de energia a partir de fontes renováveis e os desafios de integrá-la à rede elétrica existente. As linhas incluem previsão de geração fotovoltaica, sistemas de armazenamento em baterias e microrredes.\n\nA infraestrutura conta com uma usina fotovoltaica experimental instalada na cobertura do prédio, usada como fonte de dados reais para os modelos desenvolvidos.\n\nO laboratório presta serviços de ensaio e certificação para fabricantes da região.',
   array['Engenharia', 'Meio ambiente'], 'published', 'Pavilhão de Engenharia, sala 118', 'Campus Central', 'Porto Alegre', 'RS',
   'renovaveis@exemplo.edu.br', '(51) 3000-1212', 'https://exemplo.edu.br/renovaveis', 29),

  ('inovacao', 'Grupo de Estudos em Cidades Inteligentes', 'grupo-de-estudos-em-cidades-inteligentes',
   'Pesquisa interdisciplinar sobre mobilidade, dados urbanos e governança.',
   E'O grupo estuda como tecnologia e políticas públicas se combinam na gestão urbana, com atenção especial aos riscos de exclusão que soluções mal desenhadas podem produzir. Os temas incluem mobilidade ativa, sensoriamento urbano e uso de dados abertos na tomada de decisão.\n\nO trabalho é conduzido em conjunto com prefeituras parceiras, que fornecem casos reais e recebem os resultados na forma de recomendações aplicáveis.\n\nO grupo reúne pesquisadores de arquitetura, computação, direito e ciências sociais.',
   array['Ciências sociais', 'Tecnologia'], 'published', 'Bloco A, sala 405', 'Campus Central', 'Porto Alegre', 'RS',
   'cidades@exemplo.edu.br', null, null, 52),

  ('extensao', 'Clínica-Escola de Fisioterapia', 'clinica-escola-de-fisioterapia',
   'Atendimento gratuito à comunidade com supervisão docente permanente.',
   E'A clínica-escola oferece atendimento fisioterapêutico gratuito à população, funcionando ao mesmo tempo como campo de estágio supervisionado para estudantes do curso. As especialidades cobertas incluem ortopedia, neurologia, respiratória e saúde da mulher.\n\nOs atendimentos são agendados por telefone e priorizam encaminhamentos da rede pública de saúde. Cada caso é acompanhado por um estudante sob supervisão direta de um docente.\n\nA clínica realiza milhares de atendimentos por ano e mantém um programa de grupos terapêuticos.',
   array['Saúde', 'Educação'], 'published', 'Bloco da Saúde, térreo', 'Campus Central', 'Porto Alegre', 'RS',
   'clinicafisio@exemplo.edu.br', '(51) 3000-1214', null, 9),

  ('tecnologia', 'Laboratório de Realidade Estendida', 'laboratorio-de-realidade-estendida',
   'Ambientes imersivos aplicados a treinamento, educação e reabilitação.',
   E'O laboratório desenvolve experiências de realidade virtual e aumentada com foco em cenários onde a prática real é cara, perigosa ou inviável — treinamento de procedimentos clínicos, operação de equipamentos industriais e reabilitação motora.\n\nA equipe cuida do ciclo completo: modelagem, desenvolvimento, testes com usuários e avaliação de eficácia. As avaliações seguem protocolos experimentais, e não apenas impressões subjetivas.\n\nO espaço é aberto a colaborações com outras áreas da instituição.',
   array['Tecnologia', 'Design', 'Saúde'], 'published', 'Bloco C, sala 108', 'Campus Central', 'Porto Alegre', 'RS',
   'xr@exemplo.edu.br', '(51) 3000-1215', 'https://exemplo.edu.br/xr', 3),

  ('extensao', 'Programa de Mentoria Acadêmica', 'programa-de-mentoria-academica',
   'Acompanhamento de estudantes ingressantes por veteranos e docentes.',
   E'O programa combate a evasão nos primeiros semestres conectando estudantes ingressantes a mentores veteranos e a um docente de referência. Os encontros são quinzenais e tratam tanto de conteúdo quanto de organização de estudo e adaptação à vida acadêmica.\n\nOs mentores passam por formação em escuta ativa e encaminhamento para os serviços de apoio da instituição, incluindo atendimento psicológico.\n\nOs indicadores de permanência das turmas participantes são acompanhados a cada semestre.',
   array['Educação'], 'published', 'Coordenação de Ensino, sala 12', 'Campus Central', 'Porto Alegre', 'RS',
   'mentoria@exemplo.edu.br', null, null, 66),

  ('pesquisa', 'Laboratório de Computação Quântica', 'laboratorio-de-computacao-quantica',
   'Algoritmos quânticos, simulação e formação de recursos humanos na área.',
   E'O laboratório trabalha com algoritmos quânticos aplicados a otimização combinatória e simulação de sistemas moleculares, usando simuladores locais e acesso remoto a processadores quânticos de parceiros.\n\nUma frente importante do trabalho é formativa: a equipe mantém um curso introdutório aberto e materiais em português, área ainda escassa de referências acessíveis.\n\nO grupo publica regularmente e participa de redes internacionais de pesquisa.',
   array['Tecnologia', 'Engenharia'], 'published', 'Bloco C, sala 320', 'Campus Central', 'Porto Alegre', 'RS',
   'quantica@exemplo.edu.br', null, 'https://exemplo.edu.br/quantica', 71),

  ('infraestrutura', 'Central Analítica Multiusuário', 'central-analitica-multiusuario',
   'Equipamentos de caracterização de materiais compartilhados entre grupos de pesquisa.',
   E'A Central Analítica concentra equipamentos de alto custo de caracterização física e química — microscopia eletrônica, difração de raios X, espectroscopia e cromatografia — em regime multiusuário.\n\nO modelo compartilhado viabiliza acesso a grupos que não teriam como manter esses equipamentos isoladamente, com agendamento transparente e operação por equipe técnica qualificada.\n\nA central atende também demandas externas de empresas, com tabela de preços pública.',
   array['Engenharia', 'Meio ambiente'], 'published', 'Prédio da Central Analítica', 'Campus Norte', 'Canoas', 'RS',
   'central@exemplo.edu.br', '(51) 3000-1218', null, 38),

  ('tecnologia', 'Núcleo de Ciência de Dados Aplicada', 'nucleo-de-ciencia-de-dados-aplicada',
   'Modelagem estatística e analítica para problemas de gestão pública e privada.',
   E'O núcleo aplica métodos estatísticos e de aprendizado de máquina a problemas concretos trazidos por parceiros: previsão de demanda, detecção de anomalias, avaliação de impacto de políticas e otimização de operações.\n\nA equipe defende reprodutibilidade como requisito — todo projeto entrega, além do modelo, o pipeline de dados versionado e a documentação metodológica.\n\nO núcleo está estruturando uma trilha de formação em ciência de dados aberta a servidores públicos.',
   array['Tecnologia', 'Gestão'], 'pending_review', 'Bloco C, sala 210', 'Campus Central', 'Porto Alegre', 'RS',
   'dados@exemplo.edu.br', null, null, 0),

  ('empreendedorismo', 'Startup de Agricultura de Precisão', 'startup-de-agricultura-de-precisao',
   'Sensoriamento e recomendação agronômica para pequenas e médias propriedades.',
   E'Empresa incubada que desenvolve um sistema de sensoriamento de solo e clima acoplado a recomendações agronômicas automatizadas, voltado a produtores de pequeno e médio porte que hoje ficam fora do alcance das soluções de mercado.\n\nO produto combina hardware de baixo custo, conectividade de longo alcance e um aplicativo simples, desenhado para uso em campo e com conectividade intermitente.\n\nA empresa está em fase de validação com produtores parceiros da região.',
   array['Tecnologia', 'Meio ambiente'], 'pending_review', 'Prédio da Incubadora, sala 14', 'Campus Central', 'Porto Alegre', 'RS',
   'contato@agristartup.exemplo.com.br', null, 'https://agristartup.exemplo.com.br', 0),

  ('pesquisa', 'Laboratório de Materiais Avançados', 'laboratorio-de-materiais-avancados',
   'Desenvolvimento de compósitos e revestimentos de alto desempenho.',
   E'O laboratório desenvolve e caracteriza materiais compósitos, revestimentos funcionais e ligas de alto desempenho para aplicações em transporte, energia e saúde.\n\nA infraestrutura inclui equipamentos de síntese, ensaios mecânicos e análise de superfície, com acesso complementar à Central Analítica Multiusuário.\n\nEsta página ainda está em elaboração e será complementada com as linhas de pesquisa em andamento.',
   array['Engenharia'], 'draft', 'Pavilhão de Engenharia, sala 205', 'Campus Central', 'Porto Alegre', 'RS',
   'materiais@exemplo.edu.br', null, null, 0),

  ('inovacao', 'Observatório de Políticas Públicas', 'observatorio-de-politicas-publicas',
   'Monitoramento e avaliação de políticas municipais e estaduais.',
   E'O observatório acompanha a implementação de políticas públicas selecionadas, produzindo relatórios periódicos com indicadores comparáveis entre municípios.\n\nO texto enviado ainda não descreve a metodologia de coleta nem a periodicidade das publicações, informações necessárias antes da publicação na vitrine.',
   array['Ciências sociais', 'Gestão'], 'rejected', 'Bloco A, sala 210', 'Campus Central', 'Porto Alegre', 'RS',
   'observatoriopp@exemplo.edu.br', null, null, 0),

  ('extensao', 'Centro de Memória Institucional', 'centro-de-memoria-institucional',
   'Preservação e digitalização do acervo histórico da instituição.',
   E'O Centro de Memória organizou, catalogou e digitalizou o acervo documental e fotográfico da instituição, disponibilizando parte dele em consulta pública.\n\nAs atividades do centro foram incorporadas à Biblioteca Central e esta página permanece apenas como registro histórico.',
   array['Educação', 'Ciências sociais'], 'archived', 'Biblioteca Central, 3º andar', 'Campus Central', 'Porto Alegre', 'RS',
   'memoria@exemplo.edu.br', null, null, 400)
) as v(category_slug, name, slug, short_description, description, areas, status,
       location, campus, city, state, email, phone, website, age_days)
join public.categories c on c.slug = v.category_slug;

-- -----------------------------------------------------------------------------
-- Iniciativa ↔ tags
-- -----------------------------------------------------------------------------
insert into public.initiative_tags (initiative_id, tag_id)
select i.id, t.id
from (values
  ('laboratorio-de-inteligencia-artificial', 'inteligencia-artificial'),
  ('laboratorio-de-inteligencia-artificial', 'ciencia-de-dados'),
  ('laboratorio-de-inteligencia-artificial', 'software-livre'),
  ('nucleo-de-robotica-aplicada', 'robotica'),
  ('nucleo-de-robotica-aplicada', 'prototipagem'),
  ('nucleo-de-robotica-aplicada', 'internet-das-coisas'),
  ('empresa-junior-de-computacao', 'startup'),
  ('empresa-junior-de-computacao', 'educacao'),
  ('observatorio-de-monitoramento-ambiental', 'meio-ambiente'),
  ('observatorio-de-monitoramento-ambiental', 'internet-das-coisas'),
  ('observatorio-de-monitoramento-ambiental', 'software-livre'),
  ('grupo-de-pesquisa-em-sistemas-distribuidos', 'software-livre'),
  ('centro-de-prototipagem-rapida', 'prototipagem'),
  ('centro-de-prototipagem-rapida', 'comunidade'),
  ('programa-de-alfabetizacao-digital', 'educacao'),
  ('programa-de-alfabetizacao-digital', 'comunidade'),
  ('programa-de-alfabetizacao-digital', 'acessibilidade'),
  ('incubadora-de-base-tecnologica', 'startup'),
  ('laboratorio-de-biomecanica', 'biomecanica'),
  ('laboratorio-de-biomecanica', 'acessibilidade'),
  ('rede-de-telemedicina-comunitaria', 'telemedicina'),
  ('rede-de-telemedicina-comunitaria', 'comunidade'),
  ('hub-de-inovacao-aberta', 'startup'),
  ('laboratorio-de-energias-renovaveis', 'energia-limpa'),
  ('laboratorio-de-energias-renovaveis', 'meio-ambiente'),
  ('grupo-de-estudos-em-cidades-inteligentes', 'cidades-inteligentes'),
  ('grupo-de-estudos-em-cidades-inteligentes', 'politicas-publicas'),
  ('clinica-escola-de-fisioterapia', 'comunidade'),
  ('laboratorio-de-realidade-estendida', 'realidade-virtual'),
  ('laboratorio-de-realidade-estendida', 'educacao'),
  ('programa-de-mentoria-academica', 'educacao'),
  ('laboratorio-de-computacao-quantica', 'computacao-quantica'),
  ('central-analitica-multiusuario', 'materiais'),
  ('nucleo-de-ciencia-de-dados-aplicada', 'ciencia-de-dados'),
  ('startup-de-agricultura-de-precisao', 'agronegocio'),
  ('startup-de-agricultura-de-precisao', 'internet-das-coisas'),
  ('startup-de-agricultura-de-precisao', 'startup'),
  ('laboratorio-de-materiais-avancados', 'materiais'),
  ('observatorio-de-politicas-publicas', 'politicas-publicas')
) as v(initiative_slug, tag_slug)
join public.initiatives i on i.slug = v.initiative_slug
join public.tags t on t.slug = v.tag_slug;

-- -----------------------------------------------------------------------------
-- Iniciativa ↔ pessoas
-- -----------------------------------------------------------------------------
insert into public.initiative_people (initiative_id, person_id, role, position)
select i.id, p.id, v.role, v.position
from (values
  ('laboratorio-de-inteligencia-artificial', 'Helena Vasconcelos', 'Coordenadora', 0),
  ('laboratorio-de-inteligencia-artificial', 'Rafael Andrade', 'Pesquisador sênior', 1),
  ('nucleo-de-robotica-aplicada', 'Tiago Bezerra', 'Coordenador', 0),
  ('nucleo-de-robotica-aplicada', 'Sérgio Nobre', 'Engenheiro responsável', 1),
  ('empresa-junior-de-computacao', 'Gustavo Rios', 'Presidente', 0),
  ('empresa-junior-de-computacao', 'Marina Okamoto', 'Professora orientadora', 1),
  ('observatorio-de-monitoramento-ambiental', 'Camila Ferraz', 'Coordenadora', 0),
  ('observatorio-de-monitoramento-ambiental', 'Bruno Sanches', 'Técnico de campo', 1),
  ('grupo-de-pesquisa-em-sistemas-distribuidos', 'Eduardo Nakamura', 'Líder do grupo', 0),
  ('centro-de-prototipagem-rapida', 'Bruno Sanches', 'Responsável técnico', 0),
  ('programa-de-alfabetizacao-digital', 'Larissa Monteiro', 'Coordenadora', 0),
  ('programa-de-alfabetizacao-digital', 'Aline Carvalho', 'Supervisora de oficinas', 1),
  ('incubadora-de-base-tecnologica', 'Patrícia Lemos', 'Diretora', 0),
  ('laboratorio-de-biomecanica', 'Renata Duarte', 'Coordenadora', 0),
  ('rede-de-telemedicina-comunitaria', 'Otávio Prado', 'Coordenador', 0),
  ('rede-de-telemedicina-comunitaria', 'Renata Duarte', 'Supervisora clínica', 1),
  ('hub-de-inovacao-aberta', 'Patrícia Lemos', 'Gestora de parcerias', 0),
  ('laboratorio-de-energias-renovaveis', 'Sérgio Nobre', 'Coordenador', 0),
  ('grupo-de-estudos-em-cidades-inteligentes', 'Beatriz Almeida', 'Coordenadora', 0),
  ('clinica-escola-de-fisioterapia', 'Renata Duarte', 'Coordenadora', 0),
  ('laboratorio-de-realidade-estendida', 'Marina Okamoto', 'Coordenadora', 0),
  ('laboratorio-de-realidade-estendida', 'Henrique Salles', 'Pesquisador', 1),
  ('programa-de-mentoria-academica', 'Aline Carvalho', 'Coordenadora', 0),
  ('laboratorio-de-computacao-quantica', 'Henrique Salles', 'Líder do grupo', 0),
  ('central-analitica-multiusuario', 'Bruno Sanches', 'Responsável técnico', 0),
  ('nucleo-de-ciencia-de-dados-aplicada', 'Eduardo Nakamura', 'Coordenador', 0),
  ('startup-de-agricultura-de-precisao', 'Gustavo Rios', 'Cofundador', 0),
  ('laboratorio-de-materiais-avancados', 'Camila Ferraz', 'Coordenadora', 0),
  ('observatorio-de-politicas-publicas', 'Beatriz Almeida', 'Coordenadora', 0),
  ('centro-de-memoria-institucional', 'Larissa Monteiro', 'Coordenadora', 0)
) as v(initiative_slug, person_name, role, position)
join public.initiatives i on i.slug = v.initiative_slug
join public.people p on p.name = v.person_name;

-- -----------------------------------------------------------------------------
-- Links relacionados
-- -----------------------------------------------------------------------------
insert into public.initiative_links (initiative_id, label, url, type, position)
select i.id, v.label, v.url, v.type::public.link_type, v.position
from (values
  ('laboratorio-de-inteligencia-artificial', 'Site do laboratório', 'https://exemplo.edu.br/lia', 'website', 0),
  ('laboratorio-de-inteligencia-artificial', 'Repositórios', 'https://github.com/exemplo-lia', 'github', 1),
  ('laboratorio-de-inteligencia-artificial', 'Perfil no LinkedIn', 'https://www.linkedin.com/company/exemplo-lia', 'linkedin', 2),
  ('nucleo-de-robotica-aplicada', 'Site do núcleo', 'https://exemplo.edu.br/robotica', 'website', 0),
  ('nucleo-de-robotica-aplicada', 'Bastidores no Instagram', 'https://www.instagram.com/exemplo.robotica', 'instagram', 1),
  ('empresa-junior-de-computacao', 'Site institucional', 'https://ejcomp.exemplo.edu.br', 'website', 0),
  ('empresa-junior-de-computacao', 'Instagram', 'https://www.instagram.com/exemplo.ejcomp', 'instagram', 1),
  ('empresa-junior-de-computacao', 'LinkedIn', 'https://www.linkedin.com/company/exemplo-ejcomp', 'linkedin', 2),
  ('observatorio-de-monitoramento-ambiental', 'Painel de dados abertos', 'https://exemplo.edu.br/observatorio/dados', 'website', 0),
  ('observatorio-de-monitoramento-ambiental', 'Código das estações', 'https://github.com/exemplo-observatorio', 'github', 1),
  ('centro-de-prototipagem-rapida', 'Agendamento de equipamentos', 'https://exemplo.edu.br/prototipagem/agenda', 'website', 0),
  ('programa-de-alfabetizacao-digital', 'Material didático aberto', 'https://exemplo.edu.br/alfabetizacao-digital/material', 'website', 0),
  ('programa-de-alfabetizacao-digital', 'Instagram', 'https://www.instagram.com/exemplo.inclusaodigital', 'instagram', 1),
  ('incubadora-de-base-tecnologica', 'Editais abertos', 'https://incubadora.exemplo.edu.br/editais', 'website', 0),
  ('incubadora-de-base-tecnologica', 'LinkedIn', 'https://www.linkedin.com/company/exemplo-incubadora', 'linkedin', 1),
  ('rede-de-telemedicina-comunitaria', 'Indicadores públicos', 'https://exemplo.edu.br/telemedicina/indicadores', 'website', 0),
  ('hub-de-inovacao-aberta', 'Desafios abertos', 'https://exemplo.edu.br/hub/desafios', 'website', 0),
  ('laboratorio-de-energias-renovaveis', 'Dados da usina experimental', 'https://exemplo.edu.br/renovaveis/usina', 'website', 0),
  ('laboratorio-de-realidade-estendida', 'Demonstrações em vídeo', 'https://www.youtube.com/@exemplo-xr', 'youtube', 0),
  ('laboratorio-de-computacao-quantica', 'Curso introdutório', 'https://exemplo.edu.br/quantica/curso', 'website', 0),
  ('central-analitica-multiusuario', 'Tabela de serviços', 'https://exemplo.edu.br/central/servicos', 'website', 0),
  ('startup-de-agricultura-de-precisao', 'Site do produto', 'https://agristartup.exemplo.com.br', 'website', 0)
) as v(initiative_slug, label, url, type, position)
join public.initiatives i on i.slug = v.initiative_slug;

-- -----------------------------------------------------------------------------
-- Reindexação do vetor de busca (as tags e pessoas entraram após as iniciativas)
-- -----------------------------------------------------------------------------
select public.refresh_initiative_search(array_agg(id)) from public.initiatives;

-- O log de atividade da carga inicial não interessa ao dashboard.
truncate table public.activity_log restart identity;
