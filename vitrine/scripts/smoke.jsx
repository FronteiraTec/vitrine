/**
 * Teste de fumaça de renderização.
 *
 * Monta cada página da aplicação com `renderToString` e falha se alguma lançar.
 * Não substitui um teste de interação, mas pega toda a classe de erro que só
 * aparece quando o React realmente executa a árvore — e que `vite build` e o
 * ESLint não veem: `asChild` com filhos demais, componente indefinido, hook
 * fora de ordem, leitura de propriedade em `undefined` durante o render.
 *
 * Uso: npm run smoke
 */
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'

import { HomePage } from '@/pages/public/HomePage'
import { SearchPage } from '@/pages/public/SearchPage'
import { CategoriesPage } from '@/pages/public/CategoriesPage'
import { CategoryPage } from '@/pages/public/CategoryPage'
import { InitiativeDetailPage } from '@/pages/public/InitiativeDetailPage'
import { NewsPage } from '@/pages/public/NewsPage'
import { NewsDetailPage } from '@/pages/public/NewsDetailPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'
import { SetupPage } from '@/pages/SetupPage'
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
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { AppearancePage, AppearanceForm } from '@/pages/admin/AppearancePage'
import { NewsAdminPage } from '@/pages/admin/NewsAdminPage'
import { NewsFormPage } from '@/pages/admin/NewsFormPage'

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
  ['NotFoundPage', <NotFoundPage />, '/inexistente'],
  // O build de fumaça define credenciais fictícias, então a tela de setup faz o
  // que deve fazer: redireciona e não pinta nada.
  ['SetupPage (redireciona)', <SetupPage />, '/configuracao', { expectEmpty: true }],
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
  ['NewsAdminPage', <NewsAdminPage />, '/admin/noticias'],
  ['NewsFormPage (nova)', <NewsFormPage />, '/admin/noticias/nova'],
  ['SettingsPage', <SettingsPage />, '/admin/configuracoes'],
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

function render(element, path, { expectEmpty = false } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  // `createMemoryRouter` é um data router: dá contexto ao `useBlocker` usado no
  // formulário de iniciativas, que num router de componentes lançaria erro.
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <TooltipProvider>{element}</TooltipProvider>
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
  return html.length
}

let failures = 0

for (const [name, element, path, options] of [...PAGES, ...LAYOUTS]) {
  try {
    const size = render(element, path, options)
    console.log(`  ✓ ${name.padEnd(28)} ${String(size).padStart(7)} bytes`)
  } catch (error) {
    failures += 1
    console.error(`  ✗ ${name}`)
    console.error(`    ${error.message.split('\n')[0]}`)
  }
}

const total = PAGES.length + LAYOUTS.length
if (failures > 0) {
  console.error(`\n${failures} de ${total} telas falharam ao renderizar.`)
  process.exit(1)
}
console.log(`\n${total} telas renderizadas sem erros.`)
