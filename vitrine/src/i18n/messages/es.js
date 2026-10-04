/**
 * Textos da vitrine pública — espanhol.
 *
 * Mesmas chaves de `pt-BR.js`, que é a referência. Carregado sob demanda: quem
 * nunca escolhe espanhol nunca baixa este arquivo.
 */
export default {
  languageNames: {
    'pt-BR': 'portugués',
    en: 'inglés',
    es: 'español',
  },

  language: {
    trigger: 'Idioma: {language} ({code}). Cambiar idioma',
    menu: 'Elige el idioma',
  },

  common: {
    loading: 'Cargando',
    loadingInitiatives: 'Cargando iniciativas',
    errorTitle: 'No se pudo cargar',
    retry: 'Intentar de nuevo',
    close: 'Cerrar',
    seeAll: 'Ver todas',
    seeEverything: 'Ver todo',
    breadcrumb: 'Ruta de navegación',
    home: 'Inicio',
    exploreAll: 'Explorar todas las iniciativas',
  },

  pagination: {
    label: 'Paginación de resultados',
    previous: 'Página anterior',
    next: 'Página siguiente',
    page: 'Página {page}',
  },

  carousel: {
    pause: 'Pausar',
    resume: 'Reanudar',
    autoplayTarget: 'el desplazamiento automático de las categorías',
    previous: 'Ver elementos anteriores',
    next: 'Ver elementos siguientes',
  },

  header: {
    skipToContent: 'Saltar al contenido',
    mainNav: 'Navegación principal',
    openMenu: 'Abrir menú',
    menuTitle: 'Navegación',
    search: 'Buscar iniciativas',
    panel: 'Panel',
    signIn: 'Iniciar sesión',
    categories: 'Categorías',
  },

  nav: {
    home: 'Inicio',
    explore: 'Explorar',
    categories: 'Categorías',
    news: 'Noticias',
    about: 'Acerca de',
  },

  footer: {
    navigate: 'Navegar',
    categories: 'Categorías',
    masthead: 'Equipo editorial',
    policy: 'Política editorial',
    contact: 'Contacto',
    accessibility: 'Accesibilidad',
    admin: 'Área administrativa',
  },

  siteDefaults: {
    footerDescription:
      'Catálogo público de las iniciativas de la institución: proyectos, laboratorios, grupos de investigación, empresas júnior y programas de extensión reunidos en un solo lugar.',
    partnersLabel: 'Una iniciativa de',
    copyright: 'Vitrine Institucional. Proyecto de demostración.',
    note: '© 2026 FronteiraTec. Todos los derechos reservados.',
  },

  logo: {
    home: '{brand} — página de inicio',
  },

  home: {
    metaDescription:
      'Catálogo público de proyectos, laboratorios, grupos de investigación, empresas júnior e iniciativas de la institución.',
    hero: {
      eyebrow: 'Catálogo institucional',
      title: 'Conoce las iniciativas que transforman nuestra institución',
      description:
        'Proyectos, laboratorios, grupos de investigación, empresas júnior y programas de extensión reunidos en un catálogo público, abierto a quien quiera conocerlos, colaborar o formar parte.',
      searchLabel: 'Buscar iniciativas',
      searchPlaceholder: 'Buscar por nombre, área, tema…',
      searchButton: 'Buscar',
      browseCategories: 'Navegar por categoría',
    },
    categories: {
      eyebrow: 'Categorías',
      title: '¿Por dónde quieres empezar?',
      description:
        'Cada categoría reúne un tipo de iniciativa. Las define la propia institución y evolucionan junto con el catálogo.',
      error: 'No pudimos cargar las categorías en este momento.',
      carouselLabel: 'Categorías del catálogo',
    },
    featured: {
      eyebrow: 'Publicadas recientemente',
      title: 'Iniciativas destacadas',
      description:
        'Las incorporaciones más recientes al catálogo, desde laboratorios de investigación hasta programas que atienden a la comunidad.',
      error: 'No pudimos cargar las iniciativas en este momento.',
      emptyTitle: 'Todavía no hay iniciativas publicadas',
      emptyDescription:
        'El catálogo está listo: en cuanto se publique el primer contenido, aparecerá aquí.',
    },
    news: {
      eyebrow: 'Noticias',
      title: 'Últimas novedades',
      description: 'Comunicados, convocatorias y avances de las iniciativas de la institución.',
    },
  },

  connect: {
    description:
      'El programa Conexão INNE acerca a empresas, entidades sin fines de lucro y organismos gubernamentales a las iniciativas e investigadores de la incubadora. Los socios presentan sus demandas y encuentran soluciones innovadoras o propuestas de proyectos que respondan a sus necesidades.',
    cta: 'Registrar demanda',
    ctaLabel: 'Registrar demanda por WhatsApp {phone}',
    audience: 'Disponible para empresas, entidades sin fines de lucro y organismos gubernamentales.',
    whatsapp: 'Atención por WhatsApp — {phone}',
    message: '¡Hola! Me gustaría registrar una demanda en el programa Conexão INNE.',
  },

  search: {
    metaTitle: 'Explorar iniciativas',
    metaTitleQuery: 'Búsqueda: {query}',
    metaDescription:
      'Busca proyectos, laboratorios, grupos de investigación y programas por nombre, área, categoría o tema.',
    title: 'Explorar iniciativas',
    description:
      'Busca por nombre, descripción, tema, área de actuación, responsable o ubicación.',
    inputLabel: 'Buscar iniciativas',
    placeholder: 'Buscar iniciativas…',
    filters: 'Filtros',
    searching: 'Buscando iniciativas…',
    found: { one: 'iniciativa encontrada', other: 'iniciativas encontradas' },
    for: 'para',
    sortLabel: 'Ordenar',
    activeFilters: 'Filtros activos:',
    removeFilter: 'Quitar filtro',
    clear: 'Limpiar',
    categoryFallback: 'Categoría',
    tagFallback: 'Etiqueta',
    emptyTitle: 'No se encontraron iniciativas',
    emptyFiltered: 'Prueba a quitar algunos filtros o a usar términos más amplios en la búsqueda.',
    emptyCatalog: 'Todavía no hay iniciativas publicadas en el catálogo.',
    clearAll: 'Limpiar búsqueda y filtros',
  },

  sort: {
    recent: 'Más recientes',
    oldest: 'Más antiguas',
    name_asc: 'Nombre (A–Z)',
    name_desc: 'Nombre (Z–A)',
  },

  filters: {
    title: 'Filtros',
    clearAll: 'Limpiar todo',
    category: 'Categoría',
    area: 'Área',
    tags: 'Etiquetas',
  },

  categories: {
    metaDescription:
      'Navega por el catálogo por categoría: investigación, tecnología, extensión, emprendimiento y más.',
    title: 'Categorías',
    description:
      'Las categorías organizan el catálogo según la naturaleza de cada iniciativa. Las define la administración de la plataforma y pueden cambiar a medida que la institución evoluciona.',
    emptyTitle: 'No hay categorías registradas',
    emptyDescription:
      'En cuanto la administración cree las primeras categorías, aparecerán aquí.',
    cardNone: 'Ninguna iniciativa publicada',
    cardCount: { one: '{count} iniciativa', other: '{count} iniciativas' },
  },

  category: {
    metaDescription: 'Iniciativas de la categoría {name} en el catálogo institucional.',
    loadError: 'No se pudo cargar esta categoría.',
    notFoundTitle: 'Categoría no encontrada',
    notFoundDescription: 'La categoría que buscas no existe o fue eliminada del catálogo.',
    published: { one: '{count} iniciativa publicada', other: '{count} iniciativas publicadas' },
    emptyTitle: 'No hay iniciativas en esta categoría',
    emptyDescription:
      'Todavía no hay contenido publicado aquí. Explora las demás categorías del catálogo.',
  },

  initiative: {
    share: 'Compartir',
    shareCopied: 'Enlace copiado al portapapeles.',
    shareFailed: 'No se pudo copiar el enlace.',
    notFoundTitle: 'Iniciativa no encontrada',
    notFoundDescription:
      'Esta iniciativa no existe, todavía no se ha publicado o salió de la vitrina.',
    about: 'Acerca de',
    areas: 'Áreas de actuación',
    team: 'Equipo y responsables',
    gallery: 'Galería',
    galleryAlt: 'Imagen de {name}',
    tags: 'Temas',
    info: 'Información',
    location: 'Ubicación',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    website: 'Sitio web',
    publishedAt: 'Publicado el',
    links: 'Enlaces relacionados',
    viewCategory: 'Ver categoría',
    related: 'Iniciativas relacionadas',
    relatedDescription: 'Otras iniciativas en {category}.',
  },

  news: {
    list: {
      eyebrow: 'Noticias',
      title: 'Novedades y comunicados',
      description:
        'Sigue los avances de las iniciativas, las convocatorias, los eventos y los avisos de la institución.',
      searchLabel: 'Buscar noticias',
      searchPlaceholder: 'Buscar por título o tema…',
      count: { one: '{count} noticia encontrada', other: '{count} noticias encontradas' },
      emptySearchTitle: 'No se encontraron noticias',
      emptySearchDescription:
        'Prueba con otro término o limpia la búsqueda para ver todo lo que se ha publicado.',
      emptyTitle: 'Todavía no hay noticias publicadas',
      emptyDescription: 'En cuanto se publique la primera noticia, aparecerá aquí.',
      translatedOnly:
        'Esta lista reúne las noticias traducidas al {language}. <link>Ver todas las noticias en portugués</link>',
      noneInLanguageTitle: 'Todavía no hay noticias en {language}',
      noneInLanguageDescription:
        'Las noticias se publican primero en portugués. Mientras llegan las traducciones, aquí están las más recientes en el idioma original.',
      originalTitle: 'Últimas noticias en portugués',
    },
    card: {
      inLanguage: 'En {language}',
    },
    detail: {
      back: 'Noticias',
      metaFallbackTitle: 'Noticia',
      by: 'Por',
      publishedAt: '{date} a las {time}',
      updated: 'Actualizado el',
      related: 'Otras noticias',
      notFoundTitle: 'Noticia no encontrada',
      notFoundDescription: 'Puede haber sido eliminada o archivada, o la dirección es incorrecta.',
      seeAll: 'Ver todas las noticias',
      alsoAvailable: 'También disponible en',
      versionsLabel: 'Otros idiomas de esta noticia',
      availableInYourLanguage:
        'Esta noticia está disponible en {language}. <link>Leer en {language}</link>',
      notTranslated:
        'Esta noticia todavía no ha sido traducida al {language}. Estás leyendo la versión en {current}.',
    },
  },

  share: {
    group: 'Compartir esta noticia',
    on: 'Compartir en {network}',
    more: 'Más opciones para compartir',
    copy: 'Copiar enlace de la noticia',
    copied: 'Enlace copiado',
    copiedToast: 'Enlace copiado.',
    copyFailed: 'No se pudo copiar. Usa la dirección de la barra del navegador.',
  },

  tts: {
    listen: 'Escuchar noticia',
    pause: 'Pausar lectura',
    resume: 'Continuar lectura',
    position: 'Posición de la lectura',
    progress: '{percent}% de la noticia',
    rate: 'Velocidad de lectura',
    rateLabel: 'Velocidad de lectura: ',
    rateNotice: 'Velocidad {rate}.',
    reading: 'Leyendo la noticia en voz alta.',
    paused: 'Lectura en pausa.',
    finished: 'Lectura terminada.',
    failedNotice: 'No se pudo iniciar la lectura en voz alta.',
    failed: 'No se pudo iniciar la lectura. Inténtalo de nuevo.',
    unsupported:
      'La lectura en voz alta depende de una función de síntesis de voz que este navegador no ofrece. Funciona en las versiones actuales de Chrome, Edge, Safari y Firefox.',
  },

  a11yPanel: {
    open: 'Accesibilidad: abrir el panel de ajustes de lectura',
    label: 'Ajustes de accesibilidad',
    title: 'Accesibilidad',
    saved: 'Tus elecciones quedan guardadas en este navegador.',
    on: 'Activado',
    off: 'Desactivado',
    fontSize: 'Tamaño del texto',
    fontDecrease: 'Reducir el tamaño del texto',
    fontIncrease: 'Aumentar el tamaño del texto',
    fontReset: 'Restablecer el tamaño predeterminado del texto',
    fontStatus: 'Tamaño del texto: {size}.',
    fontScales: {
      base: 'Predeterminado',
      lg: 'Mediano',
      xl: 'Grande',
      xxl: 'Muy grande',
    },
    contrast: 'Alto contraste',
    contrastHint: 'Fondo oscuro, texto claro y enlaces subrayados.',
    motion: 'Reducir animaciones',
    motionHint: 'Transiciones y desplazamiento suave desactivados.',
    libras: 'Libras (VLibras)',
    librasLoading: 'Cargando el traductor…',
    librasError: 'No se pudo cargar el traductor. Revisa la conexión e inténtalo de nuevo.',
    librasOn: 'Traducción automática a Libras (lengua de señas brasileña) mediante la suite VLibras. Funciona con texto en portugués.',
    librasOff: 'Traducción automática a Libras, la lengua de señas brasileña (se carga al activarla).',
    librasOpen: 'Abrir el traductor de Libras',
    librasLoadingStatus: 'Cargando el traductor de Libras.',
    librasReady: 'Traductor de Libras listo.',
    librasFailed: 'Error al cargar el traductor de Libras.',
    footer: 'La lectura en voz alta está al inicio de cada noticia. <link>Recursos y limitaciones</link>.',
  },

  author: {
    metaFallbackTitle: 'Autor',
    metaDescription: 'Noticias publicadas por {name}.',
    notFoundTitle: 'Autor no encontrado',
    notFoundDescription:
      'La dirección puede ser incorrecta, o esta persona todavía no tiene noticias publicadas.',
    updatedAt: 'Perfil actualizado el <time>{date}</time>.',
    newsCount: { one: '{count} noticia publicada', other: '{count} noticias publicadas' },
    newsTitle: 'Noticias publicadas',
    emptyTitle: 'Ninguna noticia publicada',
    emptyDescription: 'Cuando esta persona firme una noticia publicada, aparecerá aquí.',
  },

  about: {
    metaTitle: 'Acerca de la plataforma',
    metaDescription:
      'Cómo funciona la Vitrine: catálogo público de iniciativas institucionales, con un flujo de revisión editorial.',
    title: 'Un catálogo público para todo lo que produce la institución',
    intro:
      'La Vitrine reúne, en una sola dirección, las iniciativas repartidas entre departamentos, laboratorios y programas, desde grupos de investigación hasta empresas júnior. El objetivo es simple: hacer visible lo que ya existe, para quien busca colaboración, orientación, prácticas o simplemente quiere conocer.',
    flow: {
      eyebrow: 'Cómo llega el contenido aquí',
      title: 'Todo el contenido pasa por revisión antes de publicarse',
      description:
        'La vitrina no es un mural abierto. Existe un flujo editorial claro, con roles definidos, para que el catálogo se mantenga coherente y confiable.',
      register: {
        title: 'Registro',
        body: 'El equipo responsable describe la iniciativa en el área administrativa: resumen, texto completo, áreas de actuación, imágenes, responsables y contactos.',
      },
      submit: {
        title: 'Envío a revisión',
        body: 'Al terminar, el contenido se envía a la cola de revisión. Mientras tanto, sigue invisible para el público.',
      },
      review: {
        title: 'Revisión editorial',
        body: 'Un revisor comprueba la claridad, la integridad y la adecuación. Puede aprobarlo o devolverlo con observaciones para ajustes.',
      },
      publish: {
        title: 'Publicación',
        body: 'Una vez aprobado, el contenido entra en la vitrina y se puede encontrar mediante la búsqueda, las categorías y los buscadores externos.',
      },
    },
    who: {
      title: 'Quién puede publicar',
      body: 'El acceso al área administrativa lo concede un administrador de la plataforma. Hay tres roles: <strong>editores</strong>, que crean y mantienen el contenido de sus propias iniciativas; <strong>revisores</strong>, que aprueban o devuelven lo que está en la cola; y <strong>administradores</strong>, que se encargan de las categorías, los usuarios y la configuración general.',
    },
    content: {
      title: 'Sobre este contenido',
      body: 'Esta instalación es una demostración. Las iniciativas, personas, direcciones y contactos presentados son ficticios y existen solo para ilustrar el funcionamiento de la plataforma. Las imágenes provienen de un servicio público de marcadores de posición.',
    },
    cta: {
      title: 'Empieza a explorar',
      body: 'Usa la búsqueda para encontrar iniciativas por tema, área o responsable, o navega por las categorías.',
      explore: 'Explorar iniciativas',
      categories: 'Ver categorías',
    },
  },

  masthead: {
    metaTitle: 'Equipo editorial',
    metaDescription:
      'Quién responde por el contenido publicado en {brand}: equipo, responsabilidades y contacto de la redacción.',
    eyebrow: 'Equipo editorial',
    title: 'Quién responde por {brand}',
    responsibility: {
      title: 'Responsabilidad editorial',
      p1: 'Todo el contenido publicado pasa por un flujo de revisión antes de salir al aire: quien escribe lo envía a la cola, y un revisor lo aprueba, lo devuelve con observaciones o lo archiva. Ningún texto llega al público sin esa segunda lectura; el control se aplica en la propia base de datos, no solo en la interfaz.',
      p2: 'Cada noticia va firmada. El nombre de quien la publicó aparece al inicio del texto y lleva a la página del autor, con sus demás publicaciones y la fecha de la última actualización del perfil.',
    },
    roles: {
      title: 'Roles del equipo',
      editor: {
        name: 'Editor',
        description: 'Crea y edita contenido y lo envía a revisión. No publica directamente.',
      },
      reviewer: {
        name: 'Revisor',
        description:
          'Analiza la cola, comprueba la claridad y la adecuación, y decide entre publicar, devolver con observaciones o archivar.',
      },
      admin: {
        name: 'Administrador',
        description:
          'Además de lo que hace el revisor, gestiona cuentas, categorías y la identidad del sitio.',
      },
    },
    corrections: {
      title: 'Correcciones',
      p1: 'Cuando el texto de una noticia se corrige después de publicado, la página muestra la fecha y la hora del cambio junto a la fecha de publicación. La fecha original nunca se reescribe: volver a publicar no convierte una noticia antigua en una nueva.',
      p2: 'Para señalar un error, usa el <link>canal de contacto</link>.',
    },
    contactTitle: 'Contacto de la redacción',
    documents: {
      title: 'Documentos',
      policy: 'Política editorial',
      accessibility: 'Declaración de accesibilidad',
      contact: 'Habla con la redacción',
      about: 'Acerca de la plataforma',
    },
  },

  policy: {
    metaTitle: 'Política editorial',
    metaDescription:
      'Criterios de producción, revisión, fechas, correcciones y créditos aplicados al contenido de {brand}.',
    eyebrow: 'Política editorial',
    title: 'Cómo se produce, revisa y corrige el contenido',
    intro:
      'Esta página describe los criterios que valen para todo lo que se publica aquí. Quienes responden por su aplicación figuran en el <link>equipo editorial</link>.',
    toc: 'En esta página',
    sections: {
      producao: {
        title: 'Producción',
        p1: 'El contenido lo produce el equipo que figura en la página del equipo editorial. Cada texto va firmado por quien lo escribió, y la firma lleva a la página del autor.',
        p2: 'El material recibido de terceros — comunicado de prensa, nota oficial, texto de una oficina de comunicación — se identifica como tal y no se publica como producción propia.',
      },
      revisao: {
        title: 'Revisión antes de la publicación',
        p1: 'Ningún texto sale al aire sin pasar por la cola de revisión. Quien escribe lo envía; quien revisa lo aprueba, lo devuelve con observaciones o lo archiva. Ambas funciones nunca las ejerce la misma persona en el mismo texto.',
        p2: 'La regla se aplica en la base de datos, y no solo en la pantalla: una solicitud falsificada desde el navegador no puede publicar contenido que no haya pasado por la revisión.',
      },
      datas: {
        title: 'Fechas y actualizaciones',
        p1: 'La fecha de publicación registra la primera vez que el texto salió al aire y no se reescribe después. Archivar y volver a publicar una noticia no la convierte en una noticia nueva.',
        p2: 'Cuando el contenido cambia después de publicado, la página también muestra la fecha del cambio. Los ajustes que el lector no ve — estado, organización interna — no generan este aviso, para que "actualizado el" siga significando algo.',
      },
      correcoes: {
        title: 'Errores y correcciones',
        p1: 'Todo error señalado se verifica y, si se confirma, se corrige en el propio texto, con la fecha de la corrección visible. Las correcciones relevantes llevan una nota que explica qué cambió.',
        p2: 'Las solicitudes de corrección y de réplica llegan por el canal de contacto y se responden por la misma vía.',
      },
      imagens: {
        title: 'Imágenes y créditos',
        p1: 'Toda imagen publicada lleva crédito de autoría. El pie de foto describe la escena; el crédito atribuye la autoría: son campos distintos porque cumplen funciones distintas.',
        p2: 'Cada imagen también puede recibir una descripción textual, que leen quienes usan lector de pantalla. Completarla es parte del trabajo de publicación, no un extra.',
      },
      publicidade: {
        title: 'Publicidad y contenido patrocinado',
        p1: 'El contenido pagado, patrocinado o institucional se identifica de forma visible y no se confunde con el material editorial.',
        p2: 'Las relaciones comerciales no determinan la agenda ni el tratamiento de un tema.',
      },
    },
  },

  contact: {
    metaTitle: 'Contacto',
    metaDescription:
      'Canales para hablar con la redacción de {brand}: correcciones, sugerencias de temas, derecho de réplica y barreras de accesibilidad.',
    jsonLdName: 'Contacto — {brand}',
    eyebrow: 'Contacto',
    title: 'Habla con la redacción',
    intro:
      'Corrección de información, sugerencia de tema, derecho de réplica o barrera de accesibilidad: todo llega por los canales de abajo y se responde por la misma vía.',
    channels: 'Canales',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    whatsapp: 'WhatsApp',
    address: 'Dirección',
    noChannels:
      'Todavía no se han registrado los canales de contacto. Quien administra el sitio puede completarlos en <strong>Aparência → Rodapé</strong> (Apariencia → Pie de página), en el panel.',
    include: {
      title: 'Qué incluir en el mensaje',
      corrections:
        '<strong>Correcciones:</strong> la dirección de la noticia, el fragmento exacto y cuál es la información correcta.',
      reply:
        '<strong>Derecho de réplica:</strong> la noticia, el punto cuestionado y el texto que deseas ver publicado.',
      accessibility:
        '<strong>Accesibilidad:</strong> la página, el dispositivo y la tecnología de apoyo utilizada. Esto acorta mucho el camino hasta la corrección — consulta la <link>declaración de accesibilidad</link>.',
    },
  },

  accessibility: {
    metaTitle: 'Accesibilidad',
    metaDescription:
      'Recursos de accesibilidad disponibles, referencias seguidas, limitaciones conocidas y cómo informar de una barrera.',
    eyebrow: 'Accesibilidad',
    title: 'Esta es una declaración de lo que ya funciona — y de lo que todavía no',
    intro:
      'El sitio sigue las recomendaciones de las <strong>WCAG 2.2</strong>, buscando el nivel AA y alcanzando AAA en el criterio de contraste cuando el modo de alto contraste está activado. Los ajustes están en el botón de accesibilidad, en la esquina inferior izquierda de cualquier página.',
    resourcesTitle: 'Recursos disponibles',
    resources: {
      fontSize: {
        title: 'Tamaño del texto',
        body: 'Cuatro tamaños, del predeterminado al muy grande. El ajuste cambia solo la tipografía: el espaciado, la cuadrícula y las áreas táctiles siguen iguales, así que nada se corta ni se reorganiza. Funciona junto con el zoom del navegador.',
      },
      contrast: {
        title: 'Alto contraste',
        body: 'Fondo negro, texto blanco y destacados en amarillo. Las combinaciones se verificaron por encima de 7:1, el mínimo del nivel AAA de las WCAG. Los enlaces se subrayan, para que la distinción no dependa solo del color.',
      },
      speech: {
        title: 'Lectura en voz alta',
        body: 'Cada noticia tiene un botón para escuchar el texto, con pausar, continuar, detener y cinco velocidades. Solo se lee el contenido editorial: antetítulo, título, entradilla y cuerpo. El menú, los botones y el pie de página quedan fuera.',
      },
      libras: {
        title: 'Libras',
        body: 'Traducción automática a Libras (lengua de señas brasileña) mediante la suite VLibras, del Gobierno Federal de Brasil. El recurso se carga solo cuando lo activas, y la elección queda guardada para las próximas visitas. Traduce textos en portugués.',
      },
      motion: {
        title: 'Reducción de animaciones',
        body: 'Desactiva las transiciones y el desplazamiento suave. La preferencia de tu sistema operativo ya se respeta automáticamente; el botón existe para quien no quiere cambiar la configuración de todo el dispositivo.',
      },
      keyboard: {
        title: 'Teclado y lectores de pantalla',
        body: 'Toda la navegación funciona con el teclado, con el foco siempre visible. El primer Tab de la página muestra el atajo "Saltar al contenido". La estructura usa encabezado, navegación, contenido principal, artículo y pie de página como puntos de referencia.',
      },
    },
    limitationsTitle: 'Limitaciones conocidas',
    limitations: {
      libras: {
        title: 'La Libras automática no sustituye a un intérprete humano.',
        body: 'VLibras traduce de forma automática, sin revisión. Ayuda a comprender el contenido, pero no tiene la precisión, el contexto ni la expresividad de un intérprete. Cuando eso sea indispensable, contacta con la redacción por el canal de contacto.',
      },
      speech: {
        title: 'La lectura en voz alta depende de tu dispositivo.',
        body: 'La voz proviene del sistema operativo o del navegador, no de este sitio. La calidad, el acento y la disponibilidad de una voz en el idioma de la noticia varían entre dispositivos. En algunos navegadores antiguos el recurso no existe y, en ese caso, el botón lo explica en lugar de fallar en silencio.',
      },
      alt: {
        title: 'El texto alternativo es una responsabilidad humana.',
        body: 'El sistema ofrece el campo de descripción en cada imagen, pero quien publica debe completarlo. Cuando está vacío, la página recurre al pie de foto: un sustituto razonable, no equivalente.',
      },
      vlibrasFocus: {
        title: 'El botón de Libras que dibuja el plugin no recibe el foco del teclado.',
        body: 'Es una limitación de la propia suite VLibras. Por eso el panel de accesibilidad ofrece un botón propio, accesible con Tab, que abre el traductor.',
      },
    },
    reportTitle: '¿Encontraste una barrera?',
    report:
      'El relato de quien usa el sitio vale más que cualquier auditoría automática. Si alguna página no funcionó con tu lector de pantalla, si el contraste fue insuficiente o si algo no se pudo alcanzar con el teclado, escríbenos por el <link>canal de contacto</link>. Describe la página, el dispositivo y la tecnología de apoyo utilizada: eso acorta mucho el camino hasta la corrección.',
  },

  notFound: {
    title: 'Página no encontrada',
    description: 'La dirección no existe, cambió de lugar o el contenido ya no está disponible.',
    home: 'Volver al inicio',
    explore: 'Explorar iniciativas',
  },

  errorBoundary: {
    title: 'Algo salió mal',
    description: 'La página encontró un error inesperado. Recargarla suele resolverlo.',
    details: 'Detalles técnicos',
    reload: 'Recargar página',
  },
}
