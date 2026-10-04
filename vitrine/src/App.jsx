import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
} from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { GuestRoute, ProtectedRoute, FullScreenLoader } from '@/routes/ProtectedRoute'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { newsListPath } from '@/i18n/config'

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

/**
 * A área administrativa é carregada sob demanda: quem só visita a vitrine
 * pública nunca baixa o código do painel.
 */
const AdminLayout = lazy(() =>
  import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const DashboardPage = lazy(() =>
  import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const InitiativesAdminPage = lazy(() =>
  import('@/pages/admin/InitiativesAdminPage').then((m) => ({ default: m.InitiativesAdminPage })),
)
const InitiativeFormPage = lazy(() =>
  import('@/pages/admin/InitiativeFormPage').then((m) => ({ default: m.InitiativeFormPage })),
)
const ReviewQueuePage = lazy(() =>
  import('@/pages/admin/ReviewQueuePage').then((m) => ({ default: m.ReviewQueuePage })),
)
const CategoriesAdminPage = lazy(() =>
  import('@/pages/admin/CategoriesAdminPage').then((m) => ({ default: m.CategoriesAdminPage })),
)
const PeopleAdminPage = lazy(() =>
  import('@/pages/admin/PeopleAdminPage').then((m) => ({ default: m.PeopleAdminPage })),
)
const UsersAdminPage = lazy(() =>
  import('@/pages/admin/UsersAdminPage').then((m) => ({ default: m.UsersAdminPage })),
)
const ActivityLogPage = lazy(() =>
  import('@/pages/admin/ActivityLogPage').then((m) => ({ default: m.ActivityLogPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const AppearancePage = lazy(() =>
  import('@/pages/admin/AppearancePage').then((m) => ({ default: m.AppearancePage })),
)
const NewsAdminPage = lazy(() =>
  import('@/pages/admin/NewsAdminPage').then((m) => ({ default: m.NewsAdminPage })),
)
const NewsFormPage = lazy(() =>
  import('@/pages/admin/NewsFormPage').then((m) => ({ default: m.NewsFormPage })),
)
const AudiencePage = lazy(() =>
  import('@/pages/admin/AudiencePage').then((m) => ({ default: m.AudiencePage })),
)
const NewsTranslationFormPage = lazy(() =>
  import('@/pages/admin/NewsTranslationFormPage').then((m) => ({
    default: m.NewsTranslationFormPage,
  })),
)

/** Fronteira de Suspense única para as rotas carregadas sob demanda. */
function RouterShell() {
  // O idioma fica aqui, dentro do roteador, porque o endereço é parte da
  // decisão: `/en/news/...` é inglês, e o painel é sempre português.
  return (
    <LocaleProvider>
      <Suspense fallback={<FullScreenLoader />}>
        <Outlet />
      </Suspense>
    </LocaleProvider>
  )
}

/*
 * Router de dados (`createBrowserRouter`) e não `<BrowserRouter>`: é ele que
 * habilita o `useBlocker`, usado no formulário de iniciativas para avisar
 * antes de descartar alterações não salvas.
 */
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RouterShell />}>
      {/* Vitrine pública ------------------------------------------------ */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="buscar" element={<SearchPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="categoria/:slug" element={<CategoryPage />} />
        <Route path="iniciativa/:slug" element={<InitiativeDetailPage />} />
        {/* Notícias: o único conteúdo com endereço por idioma. O português
            mantém as URLs que já estavam no ar. */}
        <Route path="noticias" element={<NewsPage locale="pt-BR" />} />
        <Route path="noticia/:slug" element={<NewsDetailPage locale="pt-BR" />} />
        <Route path="en/news" element={<NewsPage locale="en" />} />
        <Route path="en/news/:slug" element={<NewsDetailPage locale="en" />} />
        <Route path="es/noticias" element={<NewsPage locale="es" />} />
        <Route path="es/noticia/:slug" element={<NewsDetailPage locale="es" />} />
        {/* `/en` e `/es` sozinhos levam à seção que existe nesses idiomas. */}
        <Route path="en" element={<Navigate to={newsListPath('en')} replace />} />
        <Route path="es" element={<Navigate to={newsListPath('es')} replace />} />
        <Route path="autor/:slug" element={<AuthorPage />} />
        <Route path="sobre" element={<AboutPage />} />

        {/* Transparência editorial. São as páginas que identificam o
            veículo, os critérios e o canal de contato — critérios que o
            Google avalia em quem publica notícia, e que o dado estruturado
            do publisher referencia por URL. */}
        <Route path="expediente" element={<MastheadPage />} />
        <Route path="politica-editorial" element={<EditorialPolicyPage />} />
        <Route path="contato" element={<ContactPage />} />
        <Route path="acessibilidade" element={<AccessibilityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Autenticação --------------------------------------------------- */}
      <Route element={<GuestRoute />}>
        <Route path="entrar" element={<LoginPage />} />
        <Route path="criar-conta" element={<SignUpPage />} />
        <Route path="recuperar-senha" element={<ForgotPasswordPage />} />
      </Route>
      {/* Fora do GuestRoute: quem já está logado também pode abrir o link do e-mail. */}
      <Route path="redefinir-senha" element={<ResetPasswordPage />} />

      {/* Área administrativa -------------------------------------------- */}
      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="iniciativas" element={<InitiativesAdminPage />} />
          <Route path="iniciativas/nova" element={<InitiativeFormPage />} />
          <Route path="iniciativas/:id" element={<InitiativeFormPage />} />
          <Route path="noticias" element={<NewsAdminPage />} />
          <Route path="noticias/nova" element={<NewsFormPage />} />
          <Route path="noticias/:id" element={<NewsFormPage />} />
          <Route path="noticias/:id/traducoes/:locale" element={<NewsTranslationFormPage />} />
          <Route path="pessoas" element={<PeopleAdminPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
          <Route path="audiencia" element={<AudiencePage />} />

          <Route element={<ProtectedRoute requires="review" />}>
            <Route path="revisao" element={<ReviewQueuePage />} />
          </Route>

          <Route element={<ProtectedRoute requires="admin" />}>
            <Route path="categorias" element={<CategoriesAdminPage />} />
            <Route path="usuarios" element={<UsersAdminPage />} />
            <Route path="atividade" element={<ActivityLogPage />} />
            <Route path="aparencia" element={<AppearancePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Route>,
  ),
)

export function App() {
  return <RouterProvider router={router} />
}
