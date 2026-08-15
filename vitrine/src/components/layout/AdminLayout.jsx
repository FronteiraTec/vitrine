import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ClipboardCheck,
  ExternalLink,
  FolderTree,
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
  { to: '/admin/usuarios', label: 'Usuários', icon: ShieldCheck, requires: 'admin' },
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
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Navegação administrativa">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{label}</span>
          {to === '/admin/revisao' && pendingCount > 0 ? (
            <Badge
              size="sm"
              className="bg-status-review-bg text-status-review ring-status-review/25 tabular-nums"
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
    <div className="border-border mt-auto border-t p-3">
      <Button variant="ghost" size="sm" asChild className="w-full justify-start">
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
          className="hover:bg-muted flex items-center gap-2.5 rounded-md p-1 pr-2.5 transition-colors"
        >
          <Avatar src={profile?.avatar_url} name={name} size="sm" />
          <span className="hidden text-left sm:block">
            <span className="block max-w-36 truncate text-sm font-medium">{name}</span>
            <span className="text-muted-foreground block text-xs">
              {ROLE_META[role]?.label ?? 'Sem papel'}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel className="text-foreground truncate text-sm font-medium">
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
    <div className="bg-muted/40 min-h-dvh">
      <a href="#admin-conteudo" className="skip-link">
        Pular para o conteúdo
      </a>

      {/* Barra lateral fixa a partir de lg */}
      <aside className="bg-card border-border fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r lg:flex">
        <div className="border-border flex h-16 items-center border-b px-5">
          <Logo to="/admin" />
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav />
        </div>
        <SidebarFooter />
      </aside>

      <div className="lg:pl-64">
        <header className="bg-card/85 border-border sticky top-0 z-20 border-b backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" title="Menu administrativo" className="p-0">
                <div className="flex h-full flex-col py-4">
                  <SidebarNav onNavigate={() => setOpen(false)} />
                  <SidebarFooter />
                </div>
              </SheetContent>
            </Sheet>

            <div className="lg:hidden">
              <Logo to="/admin" compact />
            </div>

            <div className="flex-1" />
            <UserMenu />
          </div>
        </header>

        <main id="admin-conteudo" className="p-4 pb-16 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
