/**
 * Textos da vitrine pública — português do Brasil, o idioma original.
 *
 * É o dicionário de referência: vai sempre no bundle, porque é o recuo de
 * qualquer chave que falte nos outros idiomas e é o que o rastreador lê nas
 * páginas sem idioma próprio. `en.js` e `es.js` têm exatamente as mesmas
 * chaves — o `npm run smoke` falha se um deles perder ou ganhar uma.
 *
 * Arquivo `.js`, e não `.json`, por dois motivos: comentários como este, e
 * poder ser importado sem cerimônia pelo Vite (sob demanda) e pelo Node.
 *
 * Convenções:
 *   {nome}              variável, preenchida na hora
 *   { one, other }      plural, escolhido por `Intl.PluralRules` a partir de `count`
 *   <link>…</link>      trecho que vira componente (link, negrito) — ver `rich()`
 *
 * Nomes próprios e marcas (UFFS, INNE, Conexão INNE, VLibras, Libras, WCAG)
 * não se traduzem.
 */
export default {
  languageNames: {
    'pt-BR': 'português',
    en: 'inglês',
    es: 'espanhol',
  },

  language: {
    trigger: 'Idioma: {language} ({code}). Alterar idioma',
    menu: 'Escolha o idioma',
  },

  common: {
    loading: 'Carregando',
    loadingInitiatives: 'Carregando iniciativas',
    errorTitle: 'Não foi possível carregar',
    retry: 'Tentar novamente',
    close: 'Fechar',
    seeAll: 'Ver todas',
    seeEverything: 'Ver tudo',
    breadcrumb: 'Trilha de navegação',
    home: 'Início',
    exploreAll: 'Explorar todas as iniciativas',
  },

  pagination: {
    label: 'Paginação de resultados',
    previous: 'Página anterior',
    next: 'Próxima página',
    page: 'Página {page}',
  },

  carousel: {
    pause: 'Pausar',
    resume: 'Retomar',
    autoplayTarget: 'a passagem automática das categorias',
    previous: 'Ver itens anteriores',
    next: 'Ver próximos itens',
  },

  header: {
    skipToContent: 'Pular para o conteúdo',
    mainNav: 'Navegação principal',
    openMenu: 'Abrir menu',
    menuTitle: 'Navegação',
    search: 'Buscar iniciativas',
    panel: 'Painel',
    signIn: 'Entrar',
    categories: 'Categorias',
  },

  nav: {
    home: 'Início',
    explore: 'Explorar',
    categories: 'Categorias',
    news: 'Notícias',
    about: 'Sobre',
  },

  footer: {
    navigate: 'Navegar',
    categories: 'Categorias',
    masthead: 'Expediente',
    policy: 'Política editorial',
    contact: 'Contato',
    accessibility: 'Acessibilidade',
    admin: 'Área administrativa',
  },

  // Recuo de `site_settings` quando o administrador não personalizou o campo.
  // O que ele escrever no painel aparece como escrito, no idioma em que foi
  // escrito: é conteúdo da instituição, não texto da interface.
  siteDefaults: {
    footerDescription:
      'Catálogo público das iniciativas da instituição: projetos, laboratórios, grupos de pesquisa, empresas juniores e programas de extensão reunidos em um só lugar.',
    partnersLabel: 'Uma iniciativa da',
    copyright: 'Vitrine Institucional. Projeto de demonstração.',
    note: '© 2026 FronteiraTec. Todos os direitos reservados.',
  },

  logo: {
    home: '{brand} — página inicial',
  },

  home: {
    metaDescription:
      'Catálogo público de projetos, laboratórios, grupos de pesquisa, empresas juniores e iniciativas da instituição.',
    hero: {
      eyebrow: 'Catálogo institucional',
      title: 'Conheça as iniciativas que transformam nossa instituição',
      description:
        'Projetos, laboratórios, grupos de pesquisa, empresas juniores e programas de extensão reunidos em um catálogo público, aberto a quem quiser conhecer, colaborar ou fazer parte.',
      searchLabel: 'Pesquisar iniciativas',
      searchPlaceholder: 'Pesquisar por nome, área, tema…',
      searchButton: 'Buscar',
      browseCategories: 'Navegar por categoria',
    },
    categories: {
      eyebrow: 'Categorias',
      title: 'Por onde você quer começar?',
      description:
        'Cada categoria reúne um tipo de iniciativa. Elas são definidas pela própria instituição e evoluem junto com o catálogo.',
      error: 'Não conseguimos carregar as categorias agora.',
      carouselLabel: 'Categorias do catálogo',
    },
    featured: {
      eyebrow: 'Publicadas recentemente',
      title: 'Iniciativas em destaque',
      description:
        'As adições mais recentes ao catálogo, de laboratórios de pesquisa a programas que atendem a comunidade.',
      error: 'Não conseguimos carregar as iniciativas agora.',
      emptyTitle: 'Nenhuma iniciativa publicada ainda',
      emptyDescription:
        'O catálogo está pronto — assim que o primeiro conteúdo for publicado, ele aparece aqui.',
    },
    news: {
      eyebrow: 'Notícias',
      title: 'Últimas novidades',
      description: 'Comunicados, editais e avanços das iniciativas da instituição.',
    },
  },

  connect: {
    description:
      'O programa Conexão INNE aproxima empresas, entidades sem fins lucrativos e órgãos governamentais das iniciativas e pesquisadores da incubadora. Parceiros apresentam suas demandas e encontram soluções inovadoras ou propostas de projetos que atendam às suas necessidades.',
    cta: 'Cadastrar demanda',
    ctaLabel: 'Cadastrar demanda pelo WhatsApp {phone}',
    audience: 'Disponível para empresas, entidades sem fins lucrativos e órgãos governamentais.',
    whatsapp: 'Atendimento por WhatsApp — {phone}',
    message: 'Olá! Gostaria de cadastrar uma demanda no programa Conexão INNE.',
  },

  search: {
    metaTitle: 'Explorar iniciativas',
    metaTitleQuery: 'Busca: {query}',
    metaDescription:
      'Pesquise projetos, laboratórios, grupos de pesquisa e programas por nome, área, categoria ou tema.',
    title: 'Explorar iniciativas',
    description:
      'Pesquise por nome, descrição, tema, área de atuação, responsável ou localização.',
    inputLabel: 'Pesquisar iniciativas',
    placeholder: 'Pesquisar iniciativas…',
    filters: 'Filtros',
    searching: 'Buscando iniciativas…',
    found: { one: 'iniciativa encontrada', other: 'iniciativas encontradas' },
    for: 'para',
    sortLabel: 'Ordenar',
    activeFilters: 'Filtros ativos:',
    removeFilter: 'Remover filtro',
    clear: 'Limpar',
    categoryFallback: 'Categoria',
    tagFallback: 'Tag',
    emptyTitle: 'Nenhuma iniciativa encontrada',
    emptyFiltered: 'Tente remover alguns filtros ou usar termos mais amplos na busca.',
    emptyCatalog: 'Ainda não há iniciativas publicadas no catálogo.',
    clearAll: 'Limpar busca e filtros',
  },

  sort: {
    recent: 'Mais recentes',
    oldest: 'Mais antigas',
    name_asc: 'Nome (A–Z)',
    name_desc: 'Nome (Z–A)',
  },

  filters: {
    title: 'Filtros',
    clearAll: 'Limpar tudo',
    category: 'Categoria',
    area: 'Área',
    tags: 'Tags',
  },

  categories: {
    metaDescription:
      'Navegue pelo catálogo por categoria: pesquisa, tecnologia, extensão, empreendedorismo e mais.',
    title: 'Categorias',
    description:
      'As categorias organizam o catálogo por natureza da iniciativa. Elas são definidas pela administração da plataforma e podem mudar conforme a instituição evolui.',
    emptyTitle: 'Nenhuma categoria cadastrada',
    emptyDescription:
      'Assim que a administração criar as primeiras categorias, elas aparecerão aqui.',
    cardNone: 'Nenhuma iniciativa publicada',
    cardCount: { one: '{count} iniciativa', other: '{count} iniciativas' },
  },

  category: {
    metaDescription: 'Iniciativas da categoria {name} no catálogo institucional.',
    loadError: 'Não foi possível carregar esta categoria.',
    notFoundTitle: 'Categoria não encontrada',
    notFoundDescription: 'A categoria que você procura não existe ou foi removida do catálogo.',
    published: { one: '{count} iniciativa publicada', other: '{count} iniciativas publicadas' },
    emptyTitle: 'Nenhuma iniciativa nesta categoria',
    emptyDescription:
      'Ainda não há conteúdo publicado aqui. Explore as outras categorias do catálogo.',
  },

  initiative: {
    share: 'Compartilhar',
    shareCopied: 'Link copiado para a área de transferência.',
    shareFailed: 'Não foi possível copiar o link.',
    notFoundTitle: 'Iniciativa não encontrada',
    notFoundDescription:
      'Esta iniciativa não existe, ainda não foi publicada ou saiu da vitrine.',
    about: 'Sobre',
    areas: 'Áreas de atuação',
    team: 'Equipe e responsáveis',
    gallery: 'Galeria',
    galleryAlt: 'Imagem de {name}',
    tags: 'Temas',
    info: 'Informações',
    location: 'Localização',
    email: 'E-mail',
    phone: 'Telefone',
    website: 'Website',
    publishedAt: 'Publicado em',
    links: 'Links relacionados',
    viewCategory: 'Ver categoria',
    related: 'Iniciativas relacionadas',
    relatedDescription: 'Outras iniciativas em {category}.',
  },

  news: {
    list: {
      eyebrow: 'Notícias',
      title: 'Novidades e comunicados',
      description:
        'Acompanhe os avanços das iniciativas, editais, eventos e avisos da instituição.',
      searchLabel: 'Pesquisar notícias',
      searchPlaceholder: 'Pesquisar por título ou assunto…',
      count: { one: '{count} notícia encontrada', other: '{count} notícias encontradas' },
      emptySearchTitle: 'Nenhuma notícia encontrada',
      emptySearchDescription:
        'Tente outro termo ou limpe a busca para ver tudo que já foi publicado.',
      emptyTitle: 'Nenhuma notícia publicada ainda',
      emptyDescription: 'Assim que a primeira notícia for publicada, ela aparece aqui.',
      translatedOnly:
        'Esta lista reúne as notícias traduzidas para o {language}. <link>Ver todas as notícias em português</link>',
      noneInLanguageTitle: 'Ainda não há notícias em {language}',
      noneInLanguageDescription:
        'As notícias são publicadas primeiro em português. Enquanto as traduções não chegam, veja abaixo as mais recentes no original.',
      originalTitle: 'Últimas notícias em português',
    },
    card: {
      inLanguage: 'Em {language}',
    },
    detail: {
      back: 'Notícias',
      metaFallbackTitle: 'Notícia',
      by: 'Por',
      publishedAt: '{date} às {time}',
      updated: 'Atualizado em',
      related: 'Outras notícias',
      notFoundTitle: 'Notícia não encontrada',
      notFoundDescription: 'Ela pode ter sido removida, arquivada ou o endereço está incorreto.',
      seeAll: 'Ver todas as notícias',
      alsoAvailable: 'Também disponível em',
      versionsLabel: 'Outros idiomas desta notícia',
      // Avisos para quem escolheu um idioma diferente do da página.
      availableInYourLanguage:
        'Esta notícia está disponível em {language}. <link>Ler em {language}</link>',
      notTranslated:
        'Esta notícia ainda não foi traduzida para o {language}. Você está lendo a versão em {current}.',
    },
  },

  share: {
    group: 'Compartilhar esta notícia',
    on: 'Compartilhar no {network}',
    more: 'Mais opções de compartilhamento',
    copy: 'Copiar link da notícia',
    copied: 'Link copiado',
    copiedToast: 'Link copiado.',
    copyFailed: 'Não foi possível copiar. Use o endereço da barra do navegador.',
  },

  tts: {
    listen: 'Ouvir notícia',
    pause: 'Pausar leitura',
    resume: 'Continuar leitura',
    position: 'Posição da leitura',
    progress: '{percent}% da notícia',
    rate: 'Velocidade da leitura',
    rateLabel: 'Velocidade da leitura: ',
    rateNotice: 'Velocidade {rate}.',
    reading: 'Lendo a notícia em voz alta.',
    paused: 'Leitura pausada.',
    finished: 'Leitura concluída.',
    failedNotice: 'Não foi possível iniciar a leitura em voz alta.',
    failed: 'Não foi possível iniciar a leitura. Tente novamente.',
    unsupported:
      'A leitura em voz alta depende de um recurso de síntese de fala que este navegador não oferece. Ela funciona nas versões atuais de Chrome, Edge, Safari e Firefox.',
  },

  a11yPanel: {
    open: 'Acessibilidade: abrir painel de ajustes de leitura',
    label: 'Ajustes de acessibilidade',
    title: 'Acessibilidade',
    saved: 'As escolhas ficam gravadas neste navegador.',
    on: 'Ativo',
    off: 'Inativo',
    fontSize: 'Tamanho do texto',
    fontDecrease: 'Diminuir o tamanho do texto',
    fontIncrease: 'Aumentar o tamanho do texto',
    fontReset: 'Restaurar o tamanho padrão do texto',
    fontStatus: 'Tamanho do texto: {size}.',
    fontScales: {
      base: 'Padrão',
      lg: 'Médio',
      xl: 'Grande',
      xxl: 'Muito grande',
    },
    contrast: 'Alto contraste',
    contrastHint: 'Fundo escuro, texto claro e links sublinhados.',
    motion: 'Reduzir animações',
    motionHint: 'Transições e rolagem suave desligadas.',
    libras: 'Libras (VLibras)',
    librasLoading: 'Carregando o tradutor…',
    librasError: 'Não foi possível carregar o tradutor. Verifique a conexão e tente de novo.',
    librasOn: 'Tradução automática para Libras, pela suíte VLibras.',
    librasOff: 'Tradução automática para Libras (carrega ao ativar).',
    librasOpen: 'Abrir o tradutor de Libras',
    librasLoadingStatus: 'Carregando o tradutor de Libras.',
    librasReady: 'Tradutor de Libras pronto.',
    librasFailed: 'Falha ao carregar o tradutor de Libras.',
    footer: 'A leitura em voz alta fica no início de cada notícia. <link>Recursos e limitações</link>.',
  },

  author: {
    metaFallbackTitle: 'Autor',
    metaDescription: 'Notícias publicadas por {name}.',
    notFoundTitle: 'Autor não encontrado',
    notFoundDescription:
      'O endereço pode estar incorreto, ou esta pessoa ainda não tem notícias publicadas.',
    updatedAt: 'Perfil atualizado em <time>{date}</time>.',
    newsCount: { one: '{count} notícia publicada', other: '{count} notícias publicadas' },
    newsTitle: 'Notícias publicadas',
    emptyTitle: 'Nenhuma notícia publicada',
    emptyDescription: 'Quando esta pessoa assinar uma notícia publicada, ela aparece aqui.',
  },

  about: {
    metaTitle: 'Sobre a plataforma',
    metaDescription:
      'Como funciona a Vitrine: catálogo público de iniciativas institucionais, com workflow de revisão editorial.',
    title: 'Um catálogo público para tudo o que a instituição produz',
    intro:
      'A Vitrine reúne, em um só endereço, as iniciativas espalhadas por departamentos, laboratórios e programas — de grupos de pesquisa a empresas juniores. O objetivo é simples: tornar visível o que já existe, para quem procura parceria, orientação, estágio ou apenas quer conhecer.',
    flow: {
      eyebrow: 'Como o conteúdo chega aqui',
      title: 'Todo conteúdo passa por revisão antes de ser publicado',
      description:
        'A vitrine não é um mural aberto. Existe um fluxo editorial claro, com papéis definidos, para que o catálogo se mantenha consistente e confiável.',
      register: {
        title: 'Cadastro',
        body: 'A equipe responsável descreve a iniciativa na área administrativa: resumo, texto completo, áreas de atuação, imagens, responsáveis e contatos.',
      },
      submit: {
        title: 'Envio para revisão',
        body: 'Ao concluir, o conteúdo é enviado à fila de revisão. Enquanto isso permanece invisível para o público.',
      },
      review: {
        title: 'Revisão editorial',
        body: 'Um revisor confere clareza, completude e adequação. Pode aprovar ou devolver com observações para ajuste.',
      },
      publish: {
        title: 'Publicação',
        body: 'Aprovado, o conteúdo entra na vitrine e passa a ser encontrável pela busca, pelas categorias e pelos buscadores externos.',
      },
    },
    who: {
      title: 'Quem pode publicar',
      body: 'O acesso à área administrativa é concedido por um administrador da plataforma. Há três papéis: <strong>editores</strong>, que criam e mantêm o conteúdo das próprias iniciativas; <strong>revisores</strong>, que aprovam ou devolvem o que está na fila; e <strong>administradores</strong>, que cuidam de categorias, usuários e da configuração geral.',
    },
    content: {
      title: 'Sobre este conteúdo',
      body: 'Esta instalação é uma demonstração. As iniciativas, pessoas, endereços e contatos apresentados são fictícios e existem apenas para ilustrar o funcionamento da plataforma. As imagens vêm de um serviço público de placeholders.',
    },
    cta: {
      title: 'Comece a explorar',
      body: 'Use a busca para encontrar iniciativas por tema, área ou responsável — ou navegue pelas categorias.',
      explore: 'Explorar iniciativas',
      categories: 'Ver categorias',
    },
  },

  masthead: {
    metaTitle: 'Expediente',
    metaDescription:
      'Quem responde pelo conteúdo publicado em {brand}: equipe, responsabilidades e contato da redação.',
    eyebrow: 'Expediente',
    title: 'Quem responde por {brand}',
    responsibility: {
      title: 'Responsabilidade editorial',
      p1: 'Todo conteúdo publicado passa por um fluxo de revisão antes de entrar no ar: quem escreve envia para a fila, e um revisor aprova, devolve com observações ou arquiva. Nenhum texto chega ao público sem essa segunda leitura — o controle é aplicado no próprio banco de dados, não apenas na interface.',
      p2: 'Cada notícia é assinada. O nome de quem publicou aparece no alto do texto e leva à página do autor, com as demais publicações e a data da última atualização do perfil.',
    },
    roles: {
      title: 'Papéis da equipe',
      editor: {
        name: 'Editor',
        description: 'Cria e edita conteúdo e o envia para revisão. Não publica diretamente.',
      },
      reviewer: {
        name: 'Revisor',
        description:
          'Analisa a fila, confere clareza e adequação, e decide entre publicar, devolver com observações ou arquivar.',
      },
      admin: {
        name: 'Administrador',
        description:
          'Além do que o revisor faz, gerencia contas, categorias e a identidade do site.',
      },
    },
    corrections: {
      title: 'Correções',
      p1: 'Quando o texto de uma notícia é corrigido depois de publicado, a página passa a exibir a data e o horário da alteração ao lado da data de publicação. A data original nunca é reescrita: republicar não transforma uma notícia antiga em notícia nova.',
      p2: 'Para apontar um erro, use o <link>canal de contato</link>.',
    },
    contactTitle: 'Contato da redação',
    documents: {
      title: 'Documentos',
      policy: 'Política editorial',
      accessibility: 'Declaração de acessibilidade',
      contact: 'Fale com a redação',
      about: 'Sobre a plataforma',
    },
  },

  policy: {
    metaTitle: 'Política editorial',
    metaDescription:
      'Critérios de produção, revisão, datas, correções e créditos aplicados ao conteúdo de {brand}.',
    eyebrow: 'Política editorial',
    title: 'Como o conteúdo é produzido, revisado e corrigido',
    intro:
      'Esta página descreve os critérios que valem para tudo que é publicado aqui. Quem responde pela aplicação deles está no <link>expediente</link>.',
    toc: 'Nesta página',
    sections: {
      producao: {
        title: 'Produção',
        p1: 'O conteúdo é produzido pela equipe identificada no expediente. Cada texto é assinado por quem o escreveu, e a assinatura leva à página do autor.',
        p2: 'Material recebido de terceiros — release, nota oficial, texto de assessoria — é identificado como tal e não é publicado como produção própria.',
      },
      revisao: {
        title: 'Revisão antes da publicação',
        p1: 'Nenhum texto vai ao ar sem passar pela fila de revisão. Quem escreve envia; quem revisa aprova, devolve com observações ou arquiva. As duas funções não são exercidas pela mesma pessoa no mesmo texto.',
        p2: 'A regra é aplicada no banco de dados, e não apenas na tela: uma requisição forjada pelo navegador não consegue publicar conteúdo que não passou pela revisão.',
      },
      datas: {
        title: 'Datas e atualizações',
        p1: 'A data de publicação registra a primeira vez que o texto foi ao ar e não é reescrita depois. Arquivar e republicar uma notícia não a transforma em notícia nova.',
        p2: 'Quando o conteúdo muda depois de publicado, a página passa a mostrar também a data da alteração. Ajustes que o leitor não vê — status, organização interna — não geram esse aviso, para que "atualizado em" continue significando alguma coisa.',
      },
      correcoes: {
        title: 'Erros e correções',
        p1: 'Erro apontado é verificado e, confirmado, corrigido no próprio texto, com a data da correção visível. Correções relevantes ganham uma nota explicando o que mudou.',
        p2: 'Pedidos de correção e de resposta chegam pelo canal de contato e são respondidos pela mesma via.',
      },
      imagens: {
        title: 'Imagens e créditos',
        p1: 'Toda imagem publicada traz crédito de autoria. A legenda descreve a cena; o crédito atribui a autoria — são campos diferentes porque têm funções diferentes.',
        p2: 'Cada imagem também pode receber uma descrição textual, lida por quem usa leitor de tela. Preenchê-la é parte do trabalho de publicação, não um extra.',
      },
      publicidade: {
        title: 'Publicidade e conteúdo patrocinado',
        p1: 'Conteúdo pago, patrocinado ou institucional é identificado de forma visível e não se confunde com o material editorial.',
        p2: 'Relações comerciais não determinam a pauta nem o tratamento dado a um assunto.',
      },
    },
  },

  contact: {
    metaTitle: 'Contato',
    metaDescription:
      'Canais para falar com a redação de {brand}: correções, sugestões de pauta, direito de resposta e barreiras de acessibilidade.',
    jsonLdName: 'Contato — {brand}',
    eyebrow: 'Contato',
    title: 'Fale com a redação',
    intro:
      'Correção de informação, sugestão de pauta, direito de resposta ou barreira de acessibilidade — todos chegam pelos canais abaixo e são respondidos pela mesma via.',
    channels: 'Canais',
    email: 'E-mail',
    phone: 'Telefone',
    whatsapp: 'WhatsApp',
    address: 'Endereço',
    noChannels:
      'Os canais de contato ainda não foram cadastrados. Quem administra o site pode preenchê-los em <strong>Aparência → Rodapé</strong>, no painel.',
    include: {
      title: 'O que incluir na mensagem',
      corrections:
        '<strong>Correções:</strong> o endereço da notícia, o trecho exato e qual é a informação correta.',
      reply:
        '<strong>Direito de resposta:</strong> a notícia, o ponto contestado e o texto que deseja ver publicado.',
      accessibility:
        '<strong>Acessibilidade:</strong> a página, o aparelho e a tecnologia assistiva usada. Isso encurta muito o caminho até a correção — ver a <link>declaração de acessibilidade</link>.',
    },
  },

  accessibility: {
    metaTitle: 'Acessibilidade',
    metaDescription:
      'Recursos de acessibilidade disponíveis, referências seguidas, limitações conhecidas e como relatar uma barreira.',
    eyebrow: 'Acessibilidade',
    title: 'Esta é uma declaração do que já funciona — e do que ainda não',
    intro:
      'O site segue as recomendações da <strong>WCAG 2.2</strong>, buscando o nível AA e alcançando AAA no critério de contraste quando o modo de alto contraste está ativo. Os ajustes ficam no botão de acessibilidade, no canto inferior esquerdo de qualquer página.',
    resourcesTitle: 'Recursos disponíveis',
    resources: {
      fontSize: {
        title: 'Tamanho do texto',
        body: 'Quatro tamanhos, do padrão ao muito grande. O ajuste altera apenas a tipografia — o espaçamento, a grade e as áreas de toque continuam iguais, então nada é cortado nem se reorganiza. Funciona junto com o zoom do navegador.',
      },
      contrast: {
        title: 'Alto contraste',
        body: 'Fundo preto, texto branco e destaques em amarelo. As combinações foram verificadas acima de 7:1, o piso do nível AAA da WCAG. Links ganham sublinhado, para que a distinção não dependa só da cor.',
      },
      speech: {
        title: 'Leitura em voz alta',
        body: 'Cada notícia tem um botão para ouvir o texto, com pausar, continuar, parar e cinco velocidades. É lido apenas o conteúdo editorial — chapéu, título, linha fina e corpo. Menu, botões e rodapé ficam de fora.',
      },
      libras: {
        title: 'Libras',
        body: 'Tradução automática para Libras pela suíte VLibras, do Governo Federal. O recurso é carregado apenas quando você o ativa, e a escolha fica gravada para as próximas visitas.',
      },
      motion: {
        title: 'Redução de animações',
        body: 'Desliga transições e a rolagem suave. A preferência do seu sistema operacional já é respeitada automaticamente; o botão existe para quem não quer alterar a configuração do aparelho inteiro.',
      },
      keyboard: {
        title: 'Teclado e leitores de tela',
        body: 'Toda a navegação funciona por teclado, com foco sempre visível. O primeiro Tab da página revela o atalho "Pular para o conteúdo". A estrutura usa cabeçalho, navegação, conteúdo principal, artigo e rodapé como marcos de página.',
      },
    },
    limitationsTitle: 'Limitações conhecidas',
    limitations: {
      libras: {
        title: 'Libras automática não substitui intérprete humano.',
        body: 'O VLibras traduz por sistema, sem revisão. Ele ajuda a compreender o conteúdo, mas não tem a precisão, o contexto e a expressividade de um intérprete. Para situações em que isso é indispensável, procure a redação pelo canal de contato.',
      },
      speech: {
        title: 'A leitura em voz alta depende do seu aparelho.',
        body: 'A voz vem do sistema operacional ou do navegador, não deste site. A qualidade, o sotaque e a disponibilidade de uma voz em português variam entre aparelhos. Em alguns navegadores antigos o recurso não existe, e nesse caso o botão explica em vez de falhar em silêncio.',
      },
      alt: {
        title: 'Texto alternativo é responsabilidade humana.',
        body: 'O sistema oferece o campo de descrição em cada imagem, mas quem publica precisa preenchê-lo. Quando está vazio, a página recua para a legenda da foto — um substituto razoável, não equivalente.',
      },
      vlibrasFocus: {
        title: 'O botão de Libras desenhado pelo plugin não recebe foco de teclado.',
        body: 'É uma limitação da própria suíte VLibras. Por isso o painel de acessibilidade oferece um botão próprio, alcançável por Tab, que abre o tradutor.',
      },
    },
    reportTitle: 'Encontrou uma barreira?',
    report:
      'Relato de quem usa vale mais que qualquer auditoria automática. Se alguma página não funcionou com seu leitor de tela, se o contraste ficou insuficiente ou se algo não foi alcançável pelo teclado, escreva pelo <link>canal de contato</link>. Descreva a página, o aparelho e a tecnologia assistiva usada — isso encurta muito o caminho até a correção.',
  },

  notFound: {
    title: 'Página não encontrada',
    description: 'O endereço acessado não existe, mudou de lugar ou o conteúdo saiu do ar.',
    home: 'Voltar ao início',
    explore: 'Explorar iniciativas',
  },

  errorBoundary: {
    title: 'Algo deu errado',
    description: 'A página encontrou um erro inesperado. Recarregar costuma resolver.',
    details: 'Detalhes técnicos',
    reload: 'Recarregar página',
  },
}
