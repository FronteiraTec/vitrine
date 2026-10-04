import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ChartColumn,
  ClipboardCheck,
  ExternalLink,
  FolderTree,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Palette,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Users,
} from 'lucide-react'
import { Logo } from './Logo'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { usePendingNews, usePendingReview } from '@/hooks/use-queries'
import { ROLE_META } from '@/lib/constants'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/iniciativas', label: 'Iniciativas', icon: Sparkles },
  { to: '/admin/noticias', label: 'Notícias', icon: Newspaper },
  { to: '/admin/revisao', label: 'Revisão', icon: ClipboardCheck, requires: 'review' },
  { to: '/admin/categorias', label: 'Categorias', icon: FolderTree, requires: 'admin' },
  { to: '/admin/pessoas', label: 'Pessoas', icon: Users },
  { to: '/admin/audiencia', label: 'Audiência', icon: ChartColumn },
  { to: '/admin/usuarios', label: 'Usuários', icon: ShieldCheck, requires: 'admin' },
  { to: '/admin/atividade', label: 'Atividade', icon: History, requires: 'admin' },
  { to: '/admin/aparencia', label: 'Aparência', icon: Palette, requires: 'admin' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

function useVisibleNavItems() {
  const { isAdmin, canReview } = useAuth()
  return NAV_ITEMS.filter((item) => {
    if (item.requires === 'admin') return isAdmin
    if (item.requires === 'review') return canReview
    return true
  })
}

function SidebarNav({ onNavigate }) {
  const items = useVisibleNavItems()
  const { canReview } = useAuth()
  // A fila reúne iniciativas e notícias, então o contador soma as duas — um
  // número que ignorasse metade do que está na tela seria pior que nenhum.
  const { data: pendingInitiatives } = usePendingReview({ ready: canReview })
  const { data: pendingNews } = usePendingNews({ ready: canReview })
  const pendingCount = (pendingInitiatives?.length ?? 0) + (pendingNews?.length ?? 0)

  return (
    <nav className="d-flex flex-column gap-1 px-2" aria-label="Navegação administrativa">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'd-flex align-items-center gap-2 rounded-2 px-2 py-2 fs-7 fw-medium',
              isActive
                ? 'bg-primary text-white'
                : 'text-body-secondary  ',
            )
          }
        >
          <Icon className="icon flex-shrink-0" aria-hidden="true" />
          <span className="flex-grow-1">{label}</span>
          {to === '/admin/revisao' && pendingCount > 0 ? (
            <Badge
              size="sm"
              className="badge-status-review ring-status-review/25 tabular-nums"
            >
              {pendingCount}
            </Badge>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarFooter() {
  return (
    <div className="mt-auto border-top p-2">
      <Button variant="ghost" size="sm" asChild className="w-100 justify-content-start">
        <Link to="/" target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden="true" />
          Ver vitrine pública
        </Link>
      </Button>
    </div>
  )
}

function UserMenu() {
  const { profile, user, signOut, role } = useAuth()
  const name = profile?.name ?? user?.email ?? 'Usuário'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="d-flex align-items-center gap-2 rounded-2 p-1 pe-2"
        >
          <Avatar src={profile?.avatar_url} name={name} size="sm" />
          <span className="d-none text-start d-sm-block">
            <span className="d-block max-w-fx-36 text-truncate fs-7 fw-medium">{name}</span>
            <span className="text-body-secondary d-block fs-8">
              {ROLE_META[role]?.label ?? 'Sem papel'}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fx-56">
        <DropdownMenuLabel className="text-body text-truncate fs-7 fw-medium">
          {profile?.email ?? user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/admin/configuracoes">
            <UserCircle />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/" target="_blank" rel="noreferrer">
            <ExternalLink />
            Vitrine pública
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => signOut()}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  // O drawer é fechado pelo `onNavigate` de cada item; aqui só resta levar a
  // rolagem ao topo quando a rota muda.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="bg-body-tertiary min-vh-100">
      <a href="#admin-conteudo" className="skip-link">
        Pular para o conteúdo
      </a>

      {/* Barra lateral fixa a partir de lg */}
      <aside className="bg-body position-fixed top-0 bottom-0 start-0 z-3 d-none w-fx-64 flex-column border-end d-lg-flex">
        <div className="d-flex h-fx-16 align-items-center border-bottom px-3">
          <Logo to="/admin" />
        </div>
        <div className="flex-grow-1 overflow-y-auto py-3">
          <SidebarNav />
        </div>
        <SidebarFooter />
      </aside>

      <div className="ps-lg-sidebar">
        <header className="bg-body position-sticky top-0 z-3 border-bottom">
          <div className="d-flex h-fx-16 align-items-center gap-2 px-3 px-sm-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="d-lg-none" aria-label="Abrir menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" title="Menu administrativo" className="p-0">
                <div className="d-flex h-100 flex-column py-3">
                  <SidebarNav onNavigate={() => setOpen(false)} />
                  <SidebarFooter />
                </div>
              </SheetContent>
            </Sheet>

            <div className="d-lg-none">
              <Logo to="/admin" compact />
            </div>

            <div className="flex-grow-1" />
            <UserMenu />
          </div>
        </header>

        <main id="admin-conteudo" className="p-3 pb-5 p-sm-4 p-lg-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
