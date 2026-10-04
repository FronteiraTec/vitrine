/**
 * Textos da vitrine pública — inglês.
 *
 * Mesmas chaves de `pt-BR.js`, que é a referência. Carregado sob demanda: quem
 * nunca escolhe inglês nunca baixa este arquivo.
 */
export default {
  languageNames: {
    'pt-BR': 'Portuguese',
    en: 'English',
    es: 'Spanish',
  },

  language: {
    trigger: 'Language: {language} ({code}). Change language',
    menu: 'Choose a language',
  },

  common: {
    loading: 'Loading',
    loadingInitiatives: 'Loading initiatives',
    errorTitle: 'Could not load this content',
    retry: 'Try again',
    close: 'Close',
    seeAll: 'See all',
    seeEverything: 'See everything',
    breadcrumb: 'Breadcrumb',
    home: 'Home',
    exploreAll: 'Explore all initiatives',
  },

  pagination: {
    label: 'Results pagination',
    previous: 'Previous page',
    next: 'Next page',
    page: 'Page {page}',
  },

  carousel: {
    pause: 'Pause',
    resume: 'Resume',
    autoplayTarget: 'the automatic scrolling of categories',
    previous: 'Show previous items',
    next: 'Show next items',
  },

  header: {
    skipToContent: 'Skip to content',
    mainNav: 'Main navigation',
    openMenu: 'Open menu',
    menuTitle: 'Navigation',
    search: 'Search initiatives',
    panel: 'Dashboard',
    signIn: 'Sign in',
    categories: 'Categories',
  },

  nav: {
    home: 'Home',
    explore: 'Explore',
    categories: 'Categories',
    news: 'News',
    about: 'About',
  },

  footer: {
    navigate: 'Browse',
    categories: 'Categories',
    masthead: 'Masthead',
    policy: 'Editorial policy',
    contact: 'Contact',
    accessibility: 'Accessibility',
    admin: 'Staff area',
  },

  siteDefaults: {
    footerDescription:
      'Public catalog of the institution’s initiatives: projects, laboratories, research groups, junior enterprises and outreach programs gathered in one place.',
    partnersLabel: 'An initiative of',
    copyright: 'Vitrine Institucional. Demonstration project.',
    note: '© 2026 FronteiraTec. All rights reserved.',
  },

  logo: {
    home: '{brand} — home page',
  },

  home: {
    metaDescription:
      'Public catalog of the institution’s projects, laboratories, research groups, junior enterprises and initiatives.',
    hero: {
      eyebrow: 'Institutional catalog',
      title: 'Discover the initiatives transforming our institution',
      description:
        'Projects, laboratories, research groups, junior enterprises and outreach programs gathered in a public catalog, open to anyone who wants to learn about them, collaborate or take part.',
      searchLabel: 'Search initiatives',
      searchPlaceholder: 'Search by name, field, topic…',
      searchButton: 'Search',
      browseCategories: 'Browse by category',
    },
    categories: {
      eyebrow: 'Categories',
      title: 'Where would you like to start?',
      description:
        'Each category brings together one kind of initiative. They are defined by the institution itself and evolve along with the catalog.',
      error: 'We could not load the categories right now.',
      carouselLabel: 'Catalog categories',
    },
    featured: {
      eyebrow: 'Recently published',
      title: 'Featured initiatives',
      description:
        'The latest additions to the catalog, from research laboratories to programs that serve the community.',
      error: 'We could not load the initiatives right now.',
      emptyTitle: 'No initiatives published yet',
      emptyDescription:
        'The catalog is ready — as soon as the first entry is published, it will show up here.',
    },
    news: {
      eyebrow: 'News',
      title: 'Latest news',
      description: 'Announcements, calls and progress from the institution’s initiatives.',
    },
  },

  connect: {
    description:
      'The Conexão INNE program brings companies, non-profit organizations and government agencies closer to the incubator’s initiatives and researchers. Partners present their needs and find innovative solutions or project proposals that meet them.',
    cta: 'Submit a request',
    ctaLabel: 'Submit a request via WhatsApp {phone}',
    audience: 'Open to companies, non-profit organizations and government agencies.',
    whatsapp: 'WhatsApp support — {phone}',
    message: 'Hello! I would like to submit a request to the Conexão INNE program.',
  },

  search: {
    metaTitle: 'Explore initiatives',
    metaTitleQuery: 'Search: {query}',
    metaDescription:
      'Search projects, laboratories, research groups and programs by name, field, category or topic.',
    title: 'Explore initiatives',
    description:
      'Search by name, description, topic, field of work, person in charge or location.',
    inputLabel: 'Search initiatives',
    placeholder: 'Search initiatives…',
    filters: 'Filters',
    searching: 'Searching initiatives…',
    found: { one: 'initiative found', other: 'initiatives found' },
    for: 'for',
    sortLabel: 'Sort by',
    activeFilters: 'Active filters:',
    removeFilter: 'Remove filter',
    clear: 'Clear',
    categoryFallback: 'Category',
    tagFallback: 'Tag',
    emptyTitle: 'No initiatives found',
    emptyFiltered: 'Try removing some filters or using broader search terms.',
    emptyCatalog: 'There are no initiatives published in the catalog yet.',
    clearAll: 'Clear search and filters',
  },

  sort: {
    recent: 'Newest',
    oldest: 'Oldest',
    name_asc: 'Name (A–Z)',
    name_desc: 'Name (Z–A)',
  },

  filters: {
    title: 'Filters',
    clearAll: 'Clear all',
    category: 'Category',
    area: 'Field',
    tags: 'Tags',
  },

  categories: {
    metaDescription:
      'Browse the catalog by category: research, technology, outreach, entrepreneurship and more.',
    title: 'Categories',
    description:
      'Categories organize the catalog by the nature of each initiative. They are defined by the platform administrators and may change as the institution evolves.',
    emptyTitle: 'No categories yet',
    emptyDescription: 'As soon as the administrators create the first categories, they will show up here.',
    cardNone: 'No published initiatives',
    cardCount: { one: '{count} initiative', other: '{count} initiatives' },
  },

  category: {
    metaDescription: 'Initiatives in the {name} category of the institutional catalog.',
    loadError: 'Could not load this category.',
    notFoundTitle: 'Category not found',
    notFoundDescription: 'The category you are looking for does not exist or was removed from the catalog.',
    published: { one: '{count} published initiative', other: '{count} published initiatives' },
    emptyTitle: 'No initiatives in this category',
    emptyDescription: 'Nothing has been published here yet. Explore the other categories of the catalog.',
  },

  initiative: {
    share: 'Share',
    shareCopied: 'Link copied to the clipboard.',
    shareFailed: 'Could not copy the link.',
    notFoundTitle: 'Initiative not found',
    notFoundDescription:
      'This initiative does not exist, has not been published yet or was removed from the showcase.',
    about: 'About',
    areas: 'Fields of work',
    team: 'Team and people in charge',
    gallery: 'Gallery',
    galleryAlt: 'Image of {name}',
    tags: 'Topics',
    info: 'Information',
    location: 'Location',
    email: 'Email',
    phone: 'Phone',
    website: 'Website',
    publishedAt: 'Published on',
    links: 'Related links',
    viewCategory: 'View category',
    related: 'Related initiatives',
    relatedDescription: 'Other initiatives in {category}.',
  },

  news: {
    list: {
      eyebrow: 'News',
      title: 'News and announcements',
      description:
        'Follow the progress of the institution’s initiatives, along with calls, events and notices.',
      searchLabel: 'Search news',
      searchPlaceholder: 'Search by title or subject…',
      count: { one: '{count} news article found', other: '{count} news articles found' },
      emptySearchTitle: 'No news articles found',
      emptySearchDescription:
        'Try another term or clear the search to see everything that has been published.',
      emptyTitle: 'No news published yet',
      emptyDescription: 'As soon as the first news article is published, it will show up here.',
      translatedOnly:
        'This list includes the news articles translated into {language}. <link>See all news in Portuguese</link>',
      noneInLanguageTitle: 'No news in {language} yet',
      noneInLanguageDescription:
        'News articles are published in Portuguese first. Until translations arrive, here are the latest ones in the original language.',
      originalTitle: 'Latest news in Portuguese',
    },
    card: {
      inLanguage: 'In {language}',
    },
    detail: {
      back: 'News',
      metaFallbackTitle: 'News article',
      by: 'By',
      publishedAt: '{date} at {time}',
      updated: 'Updated',
      related: 'More news',
      notFoundTitle: 'News article not found',
      notFoundDescription: 'It may have been removed or archived, or the address is incorrect.',
      seeAll: 'See all news',
      alsoAvailable: 'Also available in',
      versionsLabel: 'Other languages of this article',
      availableInYourLanguage:
        'This article is available in {language}. <link>Read it in {language}</link>',
      notTranslated:
        'This article has not been translated into {language} yet. You are reading the {current} version.',
    },
  },

  share: {
    group: 'Share this article',
    on: 'Share on {network}',
    more: 'More sharing options',
    copy: 'Copy article link',
    copied: 'Link copied',
    copiedToast: 'Link copied.',
    copyFailed: 'Could not copy. Use the address in your browser bar.',
  },

  tts: {
    listen: 'Listen to this article',
    pause: 'Pause reading',
    resume: 'Resume reading',
    position: 'Reading position',
    progress: '{percent}% of the article',
    rate: 'Reading speed',
    rateLabel: 'Reading speed: ',
    rateNotice: 'Speed {rate}.',
    reading: 'Reading the article aloud.',
    paused: 'Reading paused.',
    finished: 'Reading finished.',
    failedNotice: 'Could not start reading aloud.',
    failed: 'Could not start reading. Please try again.',
    unsupported:
      'Reading aloud relies on a speech synthesis feature this browser does not offer. It works in current versions of Chrome, Edge, Safari and Firefox.',
  },

  a11yPanel: {
    open: 'Accessibility: open reading settings panel',
    label: 'Accessibility settings',
    title: 'Accessibility',
    saved: 'Your choices are saved in this browser.',
    on: 'On',
    off: 'Off',
    fontSize: 'Text size',
    fontDecrease: 'Decrease text size',
    fontIncrease: 'Increase text size',
    fontReset: 'Reset to default text size',
    fontStatus: 'Text size: {size}.',
    fontScales: {
      base: 'Default',
      lg: 'Medium',
      xl: 'Large',
      xxl: 'Extra large',
    },
    contrast: 'High contrast',
    contrastHint: 'Dark background, light text and underlined links.',
    motion: 'Reduce motion',
    motionHint: 'Transitions and smooth scrolling turned off.',
    libras: 'Libras (VLibras)',
    librasLoading: 'Loading the translator…',
    librasError: 'Could not load the translator. Check your connection and try again.',
    librasOn: 'Automatic translation into Libras (Brazilian Sign Language) by the VLibras suite. Works with Portuguese text.',
    librasOff: 'Automatic translation into Libras, Brazilian Sign Language (loads when turned on).',
    librasOpen: 'Open the Libras translator',
    librasLoadingStatus: 'Loading the Libras translator.',
    librasReady: 'Libras translator ready.',
    librasFailed: 'Failed to load the Libras translator.',
    footer: 'Reading aloud is available at the top of each news article. <link>Features and limitations</link>.',
  },

  author: {
    metaFallbackTitle: 'Author',
    metaDescription: 'News published by {name}.',
    notFoundTitle: 'Author not found',
    notFoundDescription:
      'The address may be incorrect, or this person has no published news yet.',
    updatedAt: 'Profile updated on <time>{date}</time>.',
    newsCount: { one: '{count} published article', other: '{count} published articles' },
    newsTitle: 'Published articles',
    emptyTitle: 'No published articles',
    emptyDescription: 'When this person signs a published article, it will show up here.',
  },

  about: {
    metaTitle: 'About the platform',
    metaDescription:
      'How the Vitrine works: a public catalog of institutional initiatives with an editorial review workflow.',
    title: 'A public catalog for everything the institution creates',
    intro:
      'The Vitrine brings together, in a single place, initiatives spread across departments, laboratories and programs — from research groups to junior enterprises. The goal is simple: to make visible what already exists, for anyone looking for partnership, guidance, an internship or who simply wants to learn more.',
    flow: {
      eyebrow: 'How content gets here',
      title: 'All content is reviewed before it is published',
      description:
        'The showcase is not an open bulletin board. There is a clear editorial workflow, with defined roles, so the catalog stays consistent and reliable.',
      register: {
        title: 'Entry',
        body: 'The team in charge describes the initiative in the staff area: summary, full text, fields of work, images, people in charge and contacts.',
      },
      submit: {
        title: 'Submission for review',
        body: 'Once finished, the content is sent to the review queue. Until then it remains invisible to the public.',
      },
      review: {
        title: 'Editorial review',
        body: 'A reviewer checks clarity, completeness and suitability, and can approve it or send it back with notes for changes.',
      },
      publish: {
        title: 'Publication',
        body: 'Once approved, the content enters the showcase and can be found through search, categories and external search engines.',
      },
    },
    who: {
      title: 'Who can publish',
      body: 'Access to the staff area is granted by a platform administrator. There are three roles: <strong>editors</strong>, who create and maintain the content of their own initiatives; <strong>reviewers</strong>, who approve or return what is in the queue; and <strong>administrators</strong>, who manage categories, users and general settings.',
    },
    content: {
      title: 'About this content',
      body: 'This installation is a demonstration. The initiatives, people, addresses and contacts shown are fictitious and exist only to illustrate how the platform works. Images come from a public placeholder service.',
    },
    cta: {
      title: 'Start exploring',
      body: 'Use search to find initiatives by topic, field or person in charge — or browse the categories.',
      explore: 'Explore initiatives',
      categories: 'See categories',
    },
  },

  masthead: {
    metaTitle: 'Masthead',
    metaDescription:
      'Who is responsible for the content published on {brand}: team, responsibilities and newsroom contact.',
    eyebrow: 'Masthead',
    title: 'Who is responsible for {brand}',
    responsibility: {
      title: 'Editorial responsibility',
      p1: 'All published content goes through a review workflow before going live: the writer sends it to the queue, and a reviewer approves it, returns it with notes or archives it. No text reaches the public without this second reading — the control is enforced in the database itself, not only in the interface.',
      p2: 'Every news article is signed. The name of the person who published it appears at the top of the text and links to the author page, with their other articles and the date of the last profile update.',
    },
    roles: {
      title: 'Team roles',
      editor: {
        name: 'Editor',
        description: 'Creates and edits content and sends it for review. Does not publish directly.',
      },
      reviewer: {
        name: 'Reviewer',
        description:
          'Reviews the queue, checks clarity and suitability, and decides whether to publish, return with notes or archive.',
      },
      admin: {
        name: 'Administrator',
        description:
          'In addition to what the reviewer does, manages accounts, categories and the site’s identity.',
      },
    },
    corrections: {
      title: 'Corrections',
      p1: 'When the text of a news article is corrected after publication, the page shows the date and time of the change next to the publication date. The original date is never rewritten: republishing does not turn an old article into a new one.',
      p2: 'To report an error, use the <link>contact channel</link>.',
    },
    contactTitle: 'Newsroom contact',
    documents: {
      title: 'Documents',
      policy: 'Editorial policy',
      accessibility: 'Accessibility statement',
      contact: 'Contact the newsroom',
      about: 'About the platform',
    },
  },

  policy: {
    metaTitle: 'Editorial policy',
    metaDescription:
      'Criteria for producing, reviewing, dating, correcting and crediting the content of {brand}.',
    eyebrow: 'Editorial policy',
    title: 'How content is produced, reviewed and corrected',
    intro:
      'This page describes the criteria that apply to everything published here. Those responsible for applying them are listed in the <link>masthead</link>.',
    toc: 'On this page',
    sections: {
      producao: {
        title: 'Production',
        p1: 'Content is produced by the team identified in the masthead. Each text is signed by whoever wrote it, and the byline links to the author page.',
        p2: 'Material received from third parties — press releases, official statements, communications office texts — is identified as such and is not published as original work.',
      },
      revisao: {
        title: 'Review before publication',
        p1: 'No text goes live without passing through the review queue. The writer submits; the reviewer approves, returns with notes or archives. Both roles are never performed by the same person on the same text.',
        p2: 'The rule is enforced in the database, not only on screen: a request forged in the browser cannot publish content that has not been reviewed.',
      },
      datas: {
        title: 'Dates and updates',
        p1: 'The publication date records the first time the text went live and is never rewritten afterwards. Archiving and republishing a news article does not make it a new one.',
        p2: 'When the content changes after publication, the page also shows the date of the change. Adjustments readers do not see — status, internal organization — do not trigger this notice, so that "updated" keeps meaning something.',
      },
      correcoes: {
        title: 'Errors and corrections',
        p1: 'Reported errors are checked and, once confirmed, corrected in the text itself, with the correction date visible. Relevant corrections come with a note explaining what changed.',
        p2: 'Requests for corrections and replies arrive through the contact channel and are answered the same way.',
      },
      imagens: {
        title: 'Images and credits',
        p1: 'Every published image carries an authorship credit. The caption describes the scene; the credit attributes authorship — they are separate fields because they serve different purposes.',
        p2: 'Each image can also receive a text description, read by people who use screen readers. Filling it in is part of the publishing work, not an extra.',
      },
      publicidade: {
        title: 'Advertising and sponsored content',
        p1: 'Paid, sponsored or institutional content is visibly identified and is never confused with editorial material.',
        p2: 'Commercial relationships do not determine the agenda or how a subject is covered.',
      },
    },
  },

  contact: {
    metaTitle: 'Contact',
    metaDescription:
      'Channels to reach the {brand} newsroom: corrections, story suggestions, right of reply and accessibility barriers.',
    jsonLdName: 'Contact — {brand}',
    eyebrow: 'Contact',
    title: 'Contact the newsroom',
    intro:
      'Corrections, story suggestions, right of reply or accessibility barriers — they all arrive through the channels below and are answered the same way.',
    channels: 'Channels',
    email: 'Email',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    address: 'Address',
    noChannels:
      'Contact channels have not been set up yet. Site administrators can fill them in under <strong>Aparência → Rodapé</strong> (Appearance → Footer) in the dashboard.',
    include: {
      title: 'What to include in your message',
      corrections:
        '<strong>Corrections:</strong> the article address, the exact passage and the correct information.',
      reply:
        '<strong>Right of reply:</strong> the article, the disputed point and the text you would like to see published.',
      accessibility:
        '<strong>Accessibility:</strong> the page, the device and the assistive technology used. This greatly speeds up the fix — see the <link>accessibility statement</link>.',
    },
  },

  accessibility: {
    metaTitle: 'Accessibility',
    metaDescription:
      'Available accessibility features, standards followed, known limitations and how to report a barrier.',
    eyebrow: 'Accessibility',
    title: 'This is a statement of what already works — and what does not yet',
    intro:
      'The site follows the <strong>WCAG 2.2</strong> recommendations, aiming for level AA and reaching AAA for contrast when high-contrast mode is on. Settings are available from the accessibility button in the bottom-left corner of every page.',
    resourcesTitle: 'Available features',
    resources: {
      fontSize: {
        title: 'Text size',
        body: 'Four sizes, from default to extra large. The setting changes only the typography — spacing, grid and touch targets stay the same, so nothing gets cut off or rearranged. It works together with the browser zoom.',
      },
      contrast: {
        title: 'High contrast',
        body: 'Black background, white text and yellow highlights. Color pairs were verified above 7:1, the WCAG AAA threshold. Links get underlined, so the distinction does not rely on color alone.',
      },
      speech: {
        title: 'Read aloud',
        body: 'Each news article has a button to listen to the text, with pause, resume, stop and five speeds. Only the editorial content is read — kicker, headline, standfirst and body. Menus, buttons and footer are left out.',
      },
      libras: {
        title: 'Libras',
        body: 'Automatic translation into Libras (Brazilian Sign Language) by the VLibras suite, from the Brazilian Federal Government. It is loaded only when you turn it on, and the choice is saved for future visits. It translates Portuguese text.',
      },
      motion: {
        title: 'Reduced motion',
        body: 'Turns off transitions and smooth scrolling. Your operating system preference is already respected automatically; the button exists for those who do not want to change the whole device’s settings.',
      },
      keyboard: {
        title: 'Keyboard and screen readers',
        body: 'All navigation works with the keyboard, with focus always visible. The first Tab on the page reveals the "Skip to content" shortcut. The structure uses header, navigation, main content, article and footer landmarks.',
      },
    },
    limitationsTitle: 'Known limitations',
    limitations: {
      libras: {
        title: 'Automatic Libras does not replace a human interpreter.',
        body: 'VLibras translates automatically, without review. It helps people understand the content, but lacks the precision, context and expressiveness of an interpreter. When that is essential, contact the newsroom through the contact channel.',
      },
      speech: {
        title: 'Reading aloud depends on your device.',
        body: 'The voice comes from the operating system or the browser, not from this site. Quality, accent and the availability of a voice in the article’s language vary between devices. Some older browsers do not support it, in which case the button explains instead of failing silently.',
      },
      alt: {
        title: 'Alternative text is a human responsibility.',
        body: 'The system offers a description field for every image, but whoever publishes must fill it in. When it is empty, the page falls back to the photo caption — a reasonable substitute, not an equivalent.',
      },
      vlibrasFocus: {
        title: 'The Libras button drawn by the plugin does not receive keyboard focus.',
        body: 'This is a limitation of the VLibras suite itself. That is why the accessibility panel offers its own button, reachable with Tab, that opens the translator.',
      },
    },
    reportTitle: 'Found a barrier?',
    report:
      'Reports from real users are worth more than any automated audit. If a page did not work with your screen reader, if the contrast was insufficient or if something could not be reached with the keyboard, write to us through the <link>contact channel</link>. Describe the page, the device and the assistive technology used — this greatly speeds up the fix.',
  },

  notFound: {
    title: 'Page not found',
    description: 'The address does not exist, has moved or the content is no longer available.',
    home: 'Back to home',
    explore: 'Explore initiatives',
  },

  errorBoundary: {
    title: 'Something went wrong',
    description: 'The page ran into an unexpected error. Reloading usually fixes it.',
    details: 'Technical details',
    reload: 'Reload page',
  },
}
