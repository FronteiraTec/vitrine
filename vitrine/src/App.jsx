import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useLocation,
} from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { GuestRoute, ProtectedRoute, FullScreenLoader } from '@/routes/ProtectedRoute'
import { isSupabaseConfigured } from '@/lib/supabase'

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

/**
 * Fronteira de Suspense única para as rotas carregadas sob demanda.
 *
 * Também intercepta o caso "sem credenciais": as consultas ficam desabilitadas
 * quando o Supabase não está configurado e, sem este desvio, as telas ficariam
 * em esqueleto para sempre. Melhor mandar direto para as instruções de setup.
 */
function RouterShell() {
  const { pathname } = useLocation()

  if (!isSupabaseConfigured && pathname !== '/configuracao') {
    return <Navigate to="/configuracao" replace />
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Outlet />
    </Suspense>
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
        <Route path="noticias" element={<NewsPage />} />
        <Route path="noticia/:slug" element={<NewsDetailPage />} />
        <Route path="sobre" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Autenticação --------------------------------------------------- */}
      <Route element={<GuestRoute />}>
        <Route path="entrar" element={<LoginPage />} />
        <Route path="criar-conta" element={<SignUpPage />} />
        <Route path="recuperar-senha" element={<ForgotPasswordPage />} />
      </Route>
      {/* Fora do GuestRoute: o link do e-mail já cria uma sessão temporária. */}
      <Route path="redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="configuracao" element={<SetupPage />} />

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
          <Route path="pessoas" element={<PeopleAdminPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />

          <Route element={<ProtectedRoute requires="review" />}>
            <Route path="revisao" element={<ReviewQueuePage />} />
          </Route>

          <Route element={<ProtectedRoute requires="admin" />}>
            <Route path="categorias" element={<CategoriesAdminPage />} />
            <Route path="usuarios" element={<UsersAdminPage />} />
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
