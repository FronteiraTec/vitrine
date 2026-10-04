/**
 * Teste de fumaça de renderização.
 *
 * Monta cada página da aplicação com `renderToString` e falha se alguma lançar.
 * Não substitui um teste de interação, mas pega toda a classe de erro que só
 * aparece quando o React realmente executa a árvore — e que `vite build` e o
 * ESLint não veem: `asChild` com filhos demais, componente indefinido, hook
 * fora de ordem, leitura de propriedade em `undefined` durante o render.
 *
 * Também confere os IDIOMAS:
 *
 *   • os três dicionários têm as mesmas chaves, sem texto vazio, com as mesmas
 *     variáveis `{nome}` e as mesmas marcas `<link>` — uma tradução que perde
 *     `{count}` mostraria "notícias encontradas" sem o número;
 *   • a vitrine renderiza em inglês e espanhol sem nenhuma chave crua na tela
 *     (chave sem tradução aparece como "news.list.title");
 *   • a notícia renderiza em cada idioma com o `lang` certo, os links para as
 *     outras versões e o aviso de quando a tradução não existe.
 *
 * Uso: npm run smoke
 */
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { loadMessages } from '@/i18n/store'
import ptBR from '@/i18n/messages/pt-BR.js'
import en from '@/i18n/messages/en.js'
import es from '@/i18n/messages/es.js'
import { localizeArticle } from '@/lib/news-translations'

import { HomePage } from '@/pages/public/HomePage'
import { SearchPage } from '@/pages/public/SearchPage'
import { CategoriesPage } from '@/pages/public/CategoriesPage'
import { CategoryPage } from '@/pages/public/CategoryPage'
import { InitiativeDetailPage } from '@/pages/public/InitiativeDetailPage'
import { NewsPage } from '@/pages/public/NewsPage'
import { NewsDetailPage } from '@/pages/public/NewsDetailPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { AuthorPage } from '@/pages/public/AuthorPage'
import { AccessibilityPage } from '@/pages/public/AccessibilityPage'
import { MastheadPage } from '@/pages/public/MastheadPage'
import { EditorialPolicyPage } from '@/pages/public/EditorialPolicyPage'
import { ContactPage } from '@/pages/public/ContactPage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Carousel, CarouselItem } from '@/components/ui/carousel'
import { CategoryCard } from '@/components/categories/CategoryCard'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { InitiativesAdminPage } from '@/pages/admin/InitiativesAdminPage'
import { InitiativeFormPage } from '@/pages/admin/InitiativeFormPage'
import { ReviewQueuePage } from '@/pages/admin/ReviewQueuePage'
import { CategoriesAdminPage } from '@/pages/admin/CategoriesAdminPage'
import { PeopleAdminPage } from '@/pages/admin/PeopleAdminPage'
import { UsersAdminPage } from '@/pages/admin/UsersAdminPage'
import { ActivityLogPage } from '@/pages/admin/ActivityLogPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { AppearancePage, AppearanceForm } from '@/pages/admin/AppearancePage'
import { NewsAdminPage } from '@/pages/admin/NewsAdminPage'
import { NewsFormPage } from '@/pages/admin/NewsFormPage'
import { NewsTranslationFormPage } from '@/pages/admin/NewsTranslationFormPage'
import { AudiencePage } from '@/pages/admin/AudiencePage'

/** Páginas montadas isoladamente, sem passar pelas guardas de rota. */
const PAGES = [
  ['HomePage', <HomePage />, '/'],
  ['SearchPage', <SearchPage />, '/buscar?q=lab&ordem=name_asc&pagina=2'],
  ['CategoriesPage', <CategoriesPage />, '/categorias'],
  ['CategoryPage', <CategoryPage />, '/categoria/pesquisa'],
  ['InitiativeDetailPage', <InitiativeDetailPage />, '/iniciativa/lab-ia'],
  ['NewsPage', <NewsPage />, '/noticias?q=edital&pagina=2'],
  ['NewsDetailPage', <NewsDetailPage />, '/noticia/edital-2026'],
  ['AboutPage', <AboutPage />, '/sobre'],
  ['AuthorPage', <AuthorPage />, '/autor/gustavo-botezini'],
  ['AccessibilityPage', <AccessibilityPage />, '/acessibilidade'],
  ['MastheadPage', <MastheadPage />, '/expediente'],
  ['EditorialPolicyPage', <EditorialPolicyPage />, '/politica-editorial'],
  ['ContactPage', <ContactPage />, '/contato'],
  ['NotFoundPage', <NotFoundPage />, '/inexistente'],
  ['LoginPage', <LoginPage />, '/entrar'],
  ['SignUpPage', <SignUpPage />, '/criar-conta'],
  ['ForgotPasswordPage', <ForgotPasswordPage />, '/recuperar-senha'],
  ['ResetPasswordPage', <ResetPasswordPage />, '/redefinir-senha'],
  ['DashboardPage', <DashboardPage />, '/admin'],
  ['InitiativesAdminPage', <InitiativesAdminPage />, '/admin/iniciativas'],
  ['InitiativeFormPage (nova)', <InitiativeFormPage />, '/admin/iniciativas/nova'],
  ['ReviewQueuePage', <ReviewQueuePage />, '/admin/revisao'],
  ['CategoriesAdminPage', <CategoriesAdminPage />, '/admin/categorias'],
  ['PeopleAdminPage', <PeopleAdminPage />, '/admin/pessoas'],
  ['UsersAdminPage', <UsersAdminPage />, '/admin/usuarios'],
  ['ActivityLogPage', <ActivityLogPage />, '/admin/atividade'],
  ['NewsAdminPage', <NewsAdminPage />, '/admin/noticias'],
  ['NewsFormPage (nova)', <NewsFormPage />, '/admin/noticias/nova'],
  [
    'NewsTranslationFormPage',
    <NewsTranslationFormPage />,
    '/admin/noticias/n1/traducoes/en',
    { route: 'admin/noticias/:id/traducoes/:locale' },
  ],
  ['SettingsPage', <SettingsPage />, '/admin/configuracoes'],
  ['AudiencePage (carregando)', <AudiencePage />, '/admin/audiencia'],
  ['AppearancePage', <AppearancePage />, '/admin/aparencia'],
  // Com as listas preenchidas: sem itens, os editores de navegação,
  // apoiadores e redes cairiam no estado vazio e nunca seriam renderizados.
  [
    'AppearanceForm (preenchido)',
    <AppearanceForm
      settings={{
        id: true,
        brand_name: 'Vitrine',
        brand_tagline: 'INNE · UFFS',
        header_bg: '#145c33',
        header_fg: '#ffffff',
        header_nav: [{ label: 'Início', to: '/' }],
        footer_partners: [{ name: 'UFFS', logo_url: 'https://exemplo/logo.png', url: '' }],
        footer_social: [{ type: 'instagram', url: 'https://exemplo' }],
      }}
    />,
    '/admin/aparencia',
  ],
  // A home só chega ao carrossel quando há categorias carregadas; sem dados
  // ela para no esqueleto e este trecho nunca seria renderizado.
  [
    'Carousel (categorias)',
    <Carousel label="Categorias do catálogo" autoPlay>
      {[
        // Com capa e sem capa: o cartão troca a faixa de imagem pelo ícone de
        // reserva, e os dois caminhos precisam renderizar.
        {
          id: '1',
          slug: 'pesquisa',
          name: 'Pesquisa',
          icon: 'microscope',
          image_url: 'https://exemplo/capa.jpg',
          published_count: 3,
        },
        { id: '2', slug: 'tecnologia', name: 'Tecnologia', icon: 'cpu', published_count: 0 },
      ].map((category) => (
        <CarouselItem key={category.id}>
          <CategoryCard category={category} className="h-full" />
        </CarouselItem>
      ))}
    </Carousel>,
    '/',
  ],
]

/** Layouts renderizados com um filho qualquer, para exercitar cabeçalho e rodapé. */
const LAYOUTS = [
  ['PublicLayout', <PublicLayout />, '/'],
  ['AdminLayout', <AdminLayout />, '/admin'],
]

/**
 * Monta um elemento dentro dos mesmos provedores da aplicação.
 *
 * `route` dá à rota um padrão com parâmetros (`noticia/:slug`) — sem ele o
 * `useParams()` volta vazio e a página para no esqueleto. `locale` força o
 * idioma da interface, como faria a escolha gravada do leitor. `seed` enche o
 * cache do TanStack Query, para a página renderizar com dados sem rede.
 */
function render(element, path, { expectEmpty = false, route = '*', locale, seed } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  })
  seed?.(queryClient)

  // `createMemoryRouter` é um data router: dá contexto ao `useBlocker` usado no
  // formulário de iniciativas, que num router de componentes lançaria erro.
  const router = createMemoryRouter(
    [
      {
        path: route,
        element: (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <TooltipProvider>
                <LocaleProvider locale={locale}>{element}</LocaleProvider>
              </TooltipProvider>
            </AuthProvider>
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: [path] },
  )

  const html = renderToString(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )

  if (expectEmpty) {
    if (html.length > 0) throw new Error('esperava um redirecionamento, mas houve conteúdo')
  } else if (!html || html.length < 40) {
    throw new Error(`saída suspeita de vazia (${html.length} caracteres)`)
  }
  return html
}

let failures = 0
let total = 0

function check(name, run) {
  total += 1
  try {
    const detail = run()
    console.log(`  ✓ ${name.padEnd(46)} ${detail ?? ''}`)
  } catch (error) {
    failures += 1
    console.error(`  ✗ ${name}`)
    console.error(`    ${error.message.split('\n')[0]}`)
  }
}

function expectIn(html, fragments) {
  for (const fragment of fragments) {
    if (!html.includes(fragment)) throw new Error(`faltou no HTML: ${fragment}`)
  }
}

function expectNotIn(html, fragments) {
  for (const fragment of fragments) {
    if (html.includes(fragment)) throw new Error(`não deveria estar no HTML: ${fragment}`)
  }
}

/* -------------------------------------------------------------------------- */
/* Telas, em português                                                         */
/* -------------------------------------------------------------------------- */

console.log('Telas')
for (const [name, element, path, options] of [...PAGES, ...LAYOUTS]) {
  check(name, () => `${String(render(element, path, options).length).padStart(7)} bytes`)
}

/* -------------------------------------------------------------------------- */
/* Dicionários                                                                 */
/* -------------------------------------------------------------------------- */

console.log('\nDicionários')

/** Folhas do dicionário como `chave → texto`; plurais viram `chave.one`/`chave.other`. */
function flatten(node, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') flatten(value, path, out)
    else out.set(path, value)
  }
  return out
}

const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const tags = (text) => [...String(text).matchAll(/<(\w+)>/g)].map((m) => m[1]).sort().join(',')

const reference = flatten(ptBR)

for (const [code, messages] of [['en', en], ['es', es]]) {
  const flat = flatten(messages)

  check(`${code}: mesmas chaves do português`, () => {
    const missing = [...reference.keys()].filter((key) => !flat.has(key))
    const extra = [...flat.keys()].filter((key) => !reference.has(key))
    if (missing.length || extra.length) {
      throw new Error(`faltando: ${missing.join(', ') || '—'} | sobrando: ${extra.join(', ') || '—'}`)
    }
    return `${flat.size} textos`
  })

  check(`${code}: nenhum texto vazio`, () => {
    const empty = [...flat].filter(([, value]) => typeof value !== 'string' || !value.trim())
    if (empty.length) throw new Error(empty.map(([key]) => key).join(', '))
  })

  check(`${code}: mesmas variáveis {nome} e marcas <tag>`, () => {
    const wrong = [...reference].filter(([key, value]) => {
      const other = flat.get(key)
      return other !== undefined && (placeholders(other) !== placeholders(value) || tags(other) !== tags(value))
    })
    if (wrong.length) throw new Error(wrong.map(([key]) => key).join(', '))
  })
}

check('plurais têm as formas one e other', () => {
  const broken = []
  for (const [code, messages] of [['pt-BR', ptBR], ['en', en], ['es', es]]) {
    for (const [key] of flatten(messages)) {
      if (key.endsWith('.one') && !flatten(messages).has(key.replace(/\.one$/, '.other'))) {
        broken.push(`${code}:${key}`)
      }
    }
  }
  if (broken.length) throw new Error(broken.join(', '))
})

/* -------------------------------------------------------------------------- */
/* A vitrine em cada idioma                                                    */
/* -------------------------------------------------------------------------- */

// Fora do navegador o store não baixa nada sozinho: os dicionários entram
// antes, como o `main.jsx` faz antes da primeira pintura.
await loadMessages('en')
await loadMessages('es')

/*
 * Uma chave sem tradução aparece na tela como a própria chave. Os prefixos são
 * os nomes de primeiro nível do dicionário: "news.list.title" na saída é
 * sinal de texto que ninguém traduziu.
 */
const RAW_KEY = new RegExp(`\\b(?:${Object.keys(ptBR).join('|')})\\.[a-zA-Z]+(?:\\.[a-zA-Z_]+)*\\b`)

const PUBLIC_PAGES = PAGES.filter(([name]) =>
  [
    'HomePage',
    'SearchPage',
    'CategoriesPage',
    'CategoryPage',
    'NewsPage',
    'AboutPage',
    'AccessibilityPage',
    'MastheadPage',
    'EditorialPolicyPage',
    'ContactPage',
    'NotFoundPage',
    'Carousel (categorias)',
  ].includes(name),
)

const EXPECTED = {
  en: { skip: 'Skip to content', news: 'href="/en/news"', label: 'Language: English (EN). Change language' },
  es: { skip: 'Saltar al contenido', news: 'href="/es/noticias"', label: 'Idioma: Español (ES). Cambiar idioma' },
}

for (const locale of ['en', 'es']) {
  console.log(`\nVitrine em ${locale}`)

  for (const [name, element, path, options] of [...PUBLIC_PAGES, ['PublicLayout', <PublicLayout />, '/']]) {
    check(`${name} [${locale}]`, () => {
      const html = render(element, path, { ...options, locale })
      const raw = RAW_KEY.exec(html.replace(/<[^>]+>/g, ' '))
      if (raw) throw new Error(`chave sem tradução na tela: ${raw[0]}`)
      return `${String(html.length).padStart(7)} bytes`
    })
  }

  check(`cabeçalho traduzido e menu de notícias no idioma [${locale}]`, () => {
    const html = render(<PublicLayout />, '/', { locale })
    expectIn(html, [EXPECTED[locale].skip, EXPECTED[locale].news, EXPECTED[locale].label])
  })
}

/* -------------------------------------------------------------------------- */
/* Notícias por idioma                                                         */
/* -------------------------------------------------------------------------- */

console.log('\nNotícias por idioma')

const NEWS = {
  id: 'n1',
  slug: 'startup-do-campus-conquista-premio',
  name: 'Startup do campus conquista prêmio nacional',
  kicker: 'Inovação',
  excerpt: 'Resumo em português.',
  content: '## Intertítulo\n\nCorpo em português.',
  cover_image: 'https://exemplo/capa.jpg',
  cover_alt: 'Equipe no palco',
  cover_caption: 'A premiação',
  cover_credit: 'Foto: Divulgação',
  gallery: [{ url: 'https://exemplo/foto.jpg', caption: 'Legenda em português' }],
  status: 'published',
  published_at: '2026-09-28T12:00:00.000Z',
  created_at: '2026-09-28T12:00:00.000Z',
  updated_at: '2026-09-28T12:00:00.000Z',
  content_updated_at: null,
  author: { id: 'u1', name: 'Gustavo Botezini', slug: 'gustavo-botezini' },
  translations: [{ locale: 'en', slug: 'campus-startup-wins-award' }],
}

const EN_TRANSLATION = {
  id: 't1',
  news_id: 'n1',
  locale: 'en',
  slug: 'campus-startup-wins-award',
  name: 'Campus startup wins national award',
  kicker: 'Innovation',
  excerpt: 'English summary.',
  content: '## Subheading\n\nEnglish body.',
  cover_alt: '',
  cover_caption: '',
  gallery: [],
  created_at: '2026-09-28T15:00:00.000Z',
  updated_at: '2026-09-28T15:00:00.000Z',
  content_updated_at: null,
}

const ORIGINAL = localizeArticle(NEWS, null)
const ENGLISH = localizeArticle(NEWS, EN_TRANSLATION)

function seedArticle(article, locale) {
  return (client) => {
    client.setQueryData(['news', 'slug', locale, article.slug], article)
    client.setQueryData(['news', 'related', locale, article.id], [])
  }
}

check('original em português com link para a versão em inglês', () => {
  const html = render(<NewsDetailPage locale="pt-BR" />, `/noticia/${NEWS.slug}`, {
    route: 'noticia/:slug',
    seed: seedArticle(ORIGINAL, 'pt-BR'),
  })
  expectIn(html, [
    'lang="pt-BR"',
    'Startup do campus conquista prêmio nacional',
    'Também disponível em',
    'href="/en/news/campus-startup-wins-award"',
    'hrefLang="en"',
  ])
})

check('versão em inglês: texto, rótulos e lang em inglês', () => {
  const html = render(<NewsDetailPage locale="en" />, `/en/news/${EN_TRANSLATION.slug}`, {
    route: 'en/news/:slug',
    seed: seedArticle(ENGLISH, 'en'),
    locale: 'en',
  })
  expectIn(html, [
    'lang="en"',
    'Campus startup wins national award',
    'Also available in',
    'href="/noticia/startup-do-campus-conquista-premio"',
    'href="/en/news"',
    ' at ',
  ])
  expectNotIn(html, ['Corpo em português', 'Também disponível em'])
})

check('capa sem texto traduzido declara o português', () => {
  const html = render(<NewsDetailPage locale="en" />, `/en/news/${EN_TRANSLATION.slug}`, {
    route: 'en/news/:slug',
    seed: seedArticle(ENGLISH, 'en'),
    locale: 'en',
  })
  // Legenda da capa e da galeria vêm do original: `lang` próprio nas figuras.
  if ((html.match(/<figure[^>]*lang="pt-BR"/g) ?? []).length < 2) {
    throw new Error('as figuras com texto do original não declararam lang="pt-BR"')
  }
})

check('leitor em espanhol no original sem tradução: aviso de recuo', () => {
  const html = render(<NewsDetailPage locale="pt-BR" />, `/noticia/${NEWS.slug}`, {
    route: 'noticia/:slug',
    seed: seedArticle(ORIGINAL, 'pt-BR'),
    locale: 'es',
  })
  expectIn(html, [
    'Esta noticia todavía no ha sido traducida al español',
    'Estás leyendo la versión en portugués',
    'lang="es"',
  ])
})

check('leitor em inglês no original com tradução: aviso com link', () => {
  const html = render(<NewsDetailPage locale="pt-BR" />, `/noticia/${NEWS.slug}`, {
    route: 'noticia/:slug',
    seed: seedArticle(ORIGINAL, 'pt-BR'),
    locale: 'en',
  })
  expectIn(html, ['This article is available in English', 'Read it in English'])
})

check('slug inexistente em espanhol: página de não encontrada em espanhol', () => {
  const html = render(<NewsDetailPage locale="es" />, '/es/noticia/no-existe', {
    route: 'es/noticia/:slug',
    seed: (client) => client.setQueryData(['news', 'slug', 'es', 'no-existe'], null),
    locale: 'es',
  })
  expectIn(html, ['Noticia no encontrada', 'href="/es/noticias"'])
})

check('lista em inglês mostra só notícias em inglês', () => {
  const html = render(<NewsPage locale="en" />, '/en/news', {
    route: 'en/news',
    locale: 'en',
    seed: (client) => {
      client.setQueryData(['news', 'search', { q: '', page: 1, locale: 'en' }], {
        items: [{ id: 'n1', locale: 'en', slug: EN_TRANSLATION.slug, name: EN_TRANSLATION.name, excerpt: 'x', published_at: NEWS.published_at }],
        total: 1,
        page: 1,
        pageSize: 12,
        pageCount: 1,
      })
      client.setQueryData(['news', 'locales'], ['pt-BR', 'en'])
    },
  })
  expectIn(html, [
    'News and announcements',
    'href="/en/news/campus-startup-wins-award"',
    'translated into English',
    '1 news article found',
  ])
  expectNotIn(html, ['In Portuguese'])
})

check('lista em espanhol vazia: original marcado como português', () => {
  const html = render(<NewsPage locale="es" />, '/es/noticias', {
    route: 'es/noticias',
    locale: 'es',
    seed: (client) => {
      client.setQueryData(['news', 'search', { q: '', page: 1, locale: 'es' }], {
        items: [],
        total: 0,
        page: 1,
        pageSize: 12,
        pageCount: 1,
      })
      client.setQueryData(['news', 'latest', 6, 'pt-BR'], [{ ...ORIGINAL, locale: 'pt-BR' }])
      client.setQueryData(['news', 'locales'], ['pt-BR', 'en'])
    },
  })
  expectIn(html, [
    'Todavía no hay noticias en español',
    'Últimas noticias en portugués',
    'En portugués',
    'lang="pt-BR"',
    'href="/noticia/startup-do-campus-conquista-premio"',
  ])
})

console.log('\nPainel de traduções')

function seedTranslationForm(translations) {
  return (client) => {
    client.setQueryData(['news', 'id', 'n1'], { ...NEWS, translations: undefined })
    client.setQueryData(['news', 'translations', 'n1'], translations)
  }
}

check('tradução nova: formulário completo, em português', () => {
  const html = render(<NewsTranslationFormPage />, '/admin/noticias/n1/traducoes/es', {
    route: 'admin/noticias/:id/traducoes/:locale',
    seed: seedTranslationForm([]),
  })
  expectIn(html, [
    'Traduzir para o espanhol',
    'Original em português',
    'Copiar o corpo do original',
    'lang="es"',
    'Gerado a partir do título',
  ])
  return `${String(html.length).padStart(7)} bytes`
})

check('tradução existente: endereço público e exclusão', () => {
  const html = render(<NewsTranslationFormPage />, '/admin/noticias/n1/traducoes/en', {
    route: 'admin/noticias/:id/traducoes/:locale',
    seed: seedTranslationForm([EN_TRANSLATION]),
  })
  expectIn(html, [
    'Tradução para o inglês',
    '/en/news/campus-startup-wins-award',
    'Campus startup wins national award',
    'Excluir',
  ])
  return `${String(html.length).padStart(7)} bytes`
})

check('idioma inválido na URL do painel não renderiza formulário', () => {
  // `<Navigate>` fora do navegador não pinta nada: a rota devolve vazio.
  render(<NewsTranslationFormPage />, '/admin/noticias/n1/traducoes/fr', {
    route: 'admin/noticias/:id/traducoes/:locale',
    seed: seedTranslationForm([]),
    expectEmpty: true,
  })
})

/* -------------------------------------------------------------------------- */
/* Audiência                                                                   */
/* -------------------------------------------------------------------------- */

console.log('\nAudiência')

/** O mesmo período que a tela calcula para "Últimos 30 dias". */
function last30Days() {
  const pad = (n) => String(n).padStart(2, '0')
  const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 29)
  return { from: iso(start), to: iso(today) }
}

const RANGE = last30Days()
const REPORT = {
  range: { ...RANGE, days: 30 },
  geo: false,
  totals: { views: 42, visitors: 30 },
  previous: { views: 21, visitors: 20 },
  daily: Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - index))
    const pad = (n) => String(n).padStart(2, '0')
    return {
      day: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      views: index % 5,
      visitors: index % 3,
    }
  }),
  items: [
    { type: 'news', id: 'n1', name: 'Startup do campus conquista prêmio', slug: 'startup', status: 'published', views: 30, visitors: 20 },
    { type: 'initiative', id: 'i1', name: null, slug: null, status: null, views: 12, visitors: 10 },
  ],
  countries: [{ country: 'BR', views: 40, visitors: 28 }, { country: '', views: 2, visitors: 2 }],
  regions: [{ country: 'BR', region: 'SC', views: 40, visitors: 28 }],
  cities: [{ country: 'BR', region: 'SC', city: 'Chapecó', views: 40, visitors: 28 }],
  sources: [{ source: 'whatsapp', views: 30, visitors: 20 }, { source: 'direto', views: 12, visitors: 10 }],
  locales: [{ locale: 'pt-BR', views: 42, visitors: 30 }],
}

check('relatório completo: indicadores, ranking e recortes', () => {
  const html = render(<AudiencePage />, '/admin/audiencia', {
    seed: (client) => client.setQueryData(['audience', { ...RANGE, type: null, id: null }], REPORT),
  })
  expectIn(html, [
    'Visualizações por dia',
    'Mais acessados',
    'Startup do campus conquista prêmio',
    'Conteúdo excluído',
    'Santa Catarina',
    'Chapecó (SC)',
    'WhatsApp',
    '+100% em relação aos 30 dias anteriores',
    'A localização ainda não está ativa',
  ])
  return `${String(html.length).padStart(7)} bytes`
})

check('relatório sem acessos: estados vazios, sem gráfico', () => {
  const empty = {
    ...REPORT,
    geo: true,
    totals: { views: 0, visitors: 0 },
    previous: { views: 0, visitors: 0 },
    daily: REPORT.daily.map((row) => ({ ...row, views: 0, visitors: 0 })),
    items: [],
    countries: [],
    regions: [],
    cities: [],
    sources: [],
    locales: [],
  }
  const html = render(<AudiencePage />, '/admin/audiencia', {
    seed: (client) => client.setQueryData(['audience', { ...RANGE, type: null, id: null }], empty),
  })
  expectIn(html, ['Nenhum acesso no período', 'Nenhum conteúdo acessado no período'])
  expectNotIn(html, ['A localização ainda não está ativa'])
})

/* -------------------------------------------------------------------------- */

if (failures > 0) {
  console.error(`\n${failures} de ${total} verificações falharam.`)
  process.exit(1)
}
console.log(`\n${total} verificações de renderização e idioma passaram.`)
