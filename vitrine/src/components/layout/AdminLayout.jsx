import { Fragment, useEffect, useState } from 'react'
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
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Users,
} from 'lucide-react'
import { Logo } from './Logo'
import { BotaoAjuda } from '@/components/tutorial/BotaoAjuda'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip } from '@/components/ui/tooltip'
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

/** Chave no `localStorage` da preferência de barra lateral recolhida. */
const COLLAPSED_KEY = 'admin-sidebar-collapsed'

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function SidebarNav({ onNavigate, collapsed = false }) {
  const items = useVisibleNavItems()
  const { canReview } = useAuth()
  // A fila reúne iniciativas e notícias, então o contador soma as duas — um
  // número que ignorasse metade do que está na tela seria pior que nenhum.
  const { data: pendingInitiatives } = usePendingReview({ ready: canReview })
  const { data: pendingNews } = usePendingNews({ ready: canReview })
  const pendingCount = (pendingInitiatives?.length ?? 0) + (pendingNews?.length ?? 0)

  return (
    <nav className="d-flex flex-column gap-1 px-2" aria-label="Navegação administrativa">
      {items.map(({ to, label, icon: Icon, end }) => {
        const badge = to === '/admin/revisao' && pendingCount > 0 ? pendingCount : null
        // Recolhida, o rótulo some da tela mas continua sendo o nome acessível
        // do link; o número de pendências vai junto na dica.
        const link = (
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            aria-label={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'position-relative d-flex align-items-center gap-2 rounded-2 px-2 py-2 fs-7 fw-medium',
                collapsed && 'justify-content-center',
                isActive ? 'bg-primary text-white' : 'text-body-secondary',
              )
            }
          >
            <Icon className="icon flex-shrink-0" aria-hidden="true" />
            {collapsed ? (
              badge ? (
                <span
                  className="position-absolute top-0 end-0 mt-1 me-1 p-1 rounded-circle bg-warning"
                  aria-hidden="true"
                />
              ) : null
            ) : (
              <>
                <span className="flex-grow-1 text-nowrap">{label}</span>
                {badge ? (
                  <Badge
                    size="sm"
                    className="badge-status-review ring-status-review/25 tabular-nums"
                  >
                    {badge}
                  </Badge>
                ) : null}
              </>
            )}
          </NavLink>
        )

        // O gatilho do Tooltip vai num wrapper: com `asChild` direto no NavLink,
        // o Slot do Radix converteria o `className` em função para texto.
        return collapsed ? (
          <Tooltip key={to} side="right" content={badge ? `${label} (${badge})` : label}>
            <div>{link}</div>
          </Tooltip>
        ) : (
          <Fragment key={to}>{link}</Fragment>
        )
      })}
    </nav>
  )
}

function SidebarFooter({ collapsed = false }) {
  const button = (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={cn('w-100', collapsed ? 'justify-content-center' : 'justify-content-start')}
    >
      <Link
        to="/"
        target="_blank"
        rel="noreferrer"
        aria-label={collapsed ? 'Ver vitrine pública' : undefined}
      >
        <ExternalLink aria-hidden="true" />
        {collapsed ? null : <span className="text-nowrap">Ver vitrine pública</span>}
      </Link>
    </Button>
  )

  return (
    <div className="mt-auto border-top p-2">
      {collapsed ? (
        <Tooltip side="right" content="Ver vitrine pública">
          {button}
        </Tooltip>
      ) : (
        button
      )}
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
          data-tour="admin-perfil"
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
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { pathname } = useLocation()

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // Sem armazenamento a escolha vale só nesta visita.
      }
      return next
    })
  }

  // O drawer é fechado pelo `onNavigate` de cada item; aqui só resta levar a
  // rolagem ao topo quando a rota muda.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className={cn('admin-shell bg-body-tertiary min-vh-100', collapsed && 'is-collapsed')}>
      <a href="#admin-conteudo" className="skip-link">
        Pular para o conteúdo
      </a>

      {/* Barra lateral fixa a partir de lg, recolhível até ficar só com ícones */}
      <aside
        id="admin-sidebar"
        className="admin-sidebar bg-body position-fixed top-0 bottom-0 start-0 z-3 d-none flex-column border-end d-lg-flex"
        data-tour="admin-menu"
      >
        <div
          className={cn(
            'd-flex h-fx-16 align-items-center border-bottom',
            collapsed ? 'justify-content-center px-2' : 'px-3',
          )}
        >
          <Logo to="/admin" compact={collapsed} />
        </div>
        <div className="flex-grow-1 overflow-y-auto overflow-x-hidden py-3">
          <SidebarNav collapsed={collapsed} />
        </div>
        <SidebarFooter collapsed={collapsed} />
      </aside>

      <div className="ps-lg-sidebar">
        <header className="bg-body position-sticky top-0 z-3 border-bottom">
          <div className="d-flex h-fx-16 align-items-center gap-2 px-3 px-sm-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="d-lg-none"
                  aria-label="Abrir menu"
                  data-tour="admin-menu"
                >
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

            <Tooltip side="right" content={collapsed ? 'Expandir menu' : 'Recolher menu'}>
              <Button
                variant="ghost"
                size="icon"
                className="d-none d-lg-inline-flex"
                aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
                aria-controls="admin-sidebar"
                aria-expanded={!collapsed}
                onClick={toggleCollapsed}
              >
                {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
              </Button>
            </Tooltip>

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

      <BotaoAjuda />
    </div>
  )
}
