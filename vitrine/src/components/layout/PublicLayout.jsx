import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogIn, Mail, MapPin, Menu, Phone, Search } from 'lucide-react'
import { Logo } from './Logo'
import { SiteTheme } from './SiteTheme'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { LinkIcon } from '@/components/initiatives/LinkIcon'
import { useCategories, useSiteSettings } from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'
import { withAlpha } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

/**
 * Com cor de texto personalizada no cabeçalho, os estados do menu passam a ser
 * feitos com opacidade sobre `currentColor` em vez dos tokens de texto: um
 * `text-muted-foreground` fixo ignoraria a cor escolhida e sumiria num fundo
 * escuro.
 */
function navLinkClasses({ isActive, tinted, size = 'desktop' }) {
  const base =
    size === 'desktop'
      ? 'rounded-md px-3 py-2 text-sm font-medium transition-colors'
      : 'rounded-md px-3 py-2.5 text-sm font-medium transition-colors'

  if (tinted) {
    return cn(
      base,
      'text-current',
      isActive ? 'bg-current/10 font-semibold opacity-100' : 'opacity-70 hover:opacity-100',
    )
  }

  return cn(
    base,
    isActive
      ? 'text-primary bg-accent'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
  )
}

function DesktopNav({ links, tinted }) {
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => navLinkClasses({ isActive, tinted })}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}

function MobileNav({ links }) {
  // Cada link do drawer é envolvido por <SheetClose>, que fecha o painel ao
  // ser acionado — por isso não há efeito sincronizando com a rota.
  const [open, setOpen] = useState(false)
  const { data: categories } = useCategories()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-current lg:hidden" aria-label="Abrir menu">
          <Menu />
        </Button>
      </SheetTrigger>
      {/* O drawer é uma superfície própria, fora do cabeçalho: mantém as cores
          do tema para não depender do contraste da cor escolhida no topo. */}
      <SheetContent side="left" title="Navegação">
        <div className="space-y-6 p-5">
          <nav className="flex flex-col gap-1" aria-label="Navegação principal">
            {links.map((link) => (
              <SheetClose asChild key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-accent text-primary' : 'text-foreground hover:bg-muted',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </SheetClose>
            ))}
          </nav>

          {categories?.length ? (
            <div className="space-y-2">
              <p className="text-muted-foreground px-3 text-xs font-semibold tracking-[0.12em] uppercase">
                Categorias
              </p>
              <div className="flex flex-col gap-0.5">
                {categories.map((category) => (
                  <SheetClose asChild key={category.id}>
                    <Link
                      to={`/categoria/${category.slug}`}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
                    >
                      <CategoryIcon name={category.icon} className="size-4 shrink-0" />
                      {category.name}
                    </Link>
                  </SheetClose>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Header({ settings }) {
  const { isAuthenticated, isStaff } = useAuth()
  const navigate = useNavigate()

  const tinted = Boolean(settings.headerFg)
  const painted = Boolean(settings.headerBg)

  return (
    <header
      className={cn(
        'z-40 border-b backdrop-blur-md',
        settings.headerSticky && 'sticky top-0',
        !painted && 'bg-background/85',
        !settings.headerBorder && 'border-border',
      )}
      style={{
        // 88% em vez de opaco preserva o efeito de vidro do `backdrop-blur`.
        backgroundColor: withAlpha(settings.headerBg, 88),
        color: settings.headerFg ?? undefined,
        borderBottomColor: settings.headerBorder ?? undefined,
      }}
    >
      <div className="container-page flex h-16 items-center gap-3">
        <MobileNav links={settings.nav} />
        <Logo />

        <div className="flex-1" />

        <DesktopNav links={settings.nav} tinted={tinted} />

        <div
          className={cn('mx-1 hidden h-6 w-px lg:block', tinted ? 'bg-current/25' : 'bg-border')}
        />

        {settings.headerShowSearch ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(tinted && 'text-current hover:bg-current/10')}
            onClick={() => navigate('/buscar')}
            aria-label="Buscar iniciativas"
          >
            <Search />
          </Button>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          asChild
          className={cn(
            'hidden sm:inline-flex',
            // Sobre um cabeçalho pintado, a superfície clara do botão viraria
            // um retângulo destoante — vira contorno sobre a própria cor.
            painted && 'border-current/30 bg-transparent text-current hover:bg-current/10',
          )}
        >
          {isAuthenticated && isStaff ? (
            <Link to="/admin">
              <LayoutDashboard aria-hidden="true" />
              Painel
            </Link>
          ) : (
            <Link to="/entrar">
              <LogIn aria-hidden="true" />
              Entrar
            </Link>
          )}
        </Button>
      </div>
    </header>
  )
}

function FooterContact({ settings }) {
  const items = [
    settings.footerContactEmail && {
      icon: Mail,
      label: settings.footerContactEmail,
      href: `mailto:${settings.footerContactEmail}`,
    },
    settings.footerContactPhone && {
      icon: Phone,
      label: settings.footerContactPhone,
      href: `tel:${settings.footerContactPhone.replace(/[^\d+]/g, '')}`,
    },
    settings.footerAddress && { icon: MapPin, label: settings.footerAddress },
  ].filter(Boolean)

  if (!items.length) return null

  return (
    <ul className="space-y-2.5 text-sm">
      {items.map(({ icon: Icon, label, href }) => (
        <li key={label} className="flex items-start gap-2.5 opacity-80">
          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {href ? (
            <a href={href} className="transition-opacity hover:opacity-100">
              {label}
            </a>
          ) : (
            <span>{label}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function Footer({ settings }) {
  const { data: categories } = useCategories()
  const showCategories = settings.footerShowCategories && Boolean(categories?.length)

  return (
    <footer
      className={cn(
        'mt-24',
        !settings.footerBg && 'bg-primary',
        !settings.footerFg && 'text-primary-foreground',
      )}
      style={{
        backgroundColor: settings.footerBg ?? undefined,
        color: settings.footerFg ?? undefined,
      }}
    >
      <div className="container-page py-14">
        <div
          className={cn(
            'grid gap-10',
            showCategories ? 'md:grid-cols-[1.4fr_1fr_1fr]' : 'md:grid-cols-[1.6fr_1fr]',
          )}
        >
          <div className="space-y-5">
            <Logo to={null} inverted className="text-current" />

            {settings.footerDescription ? (
              <p className="max-w-sm text-sm leading-relaxed opacity-75">
                {settings.footerDescription}
              </p>
            ) : null}

            {settings.partners.length ? (
              <div className="space-y-2.5">
                {settings.footerPartnersLabel ? (
                  <p className="text-[0.625rem] font-medium tracking-[0.16em] uppercase opacity-60">
                    {settings.footerPartnersLabel}
                  </p>
                ) : null}
                {/* A faixa branca existe porque logotipos institucionais são
                    desenhados para fundo claro e sumiriam sobre a cor do rodapé. */}
                <div className="flex w-fit flex-wrap items-center gap-4 rounded-lg bg-white/95 px-4 py-3">
                  {settings.partners.map((partner, index) => (
                    <div key={`${partner.logo_url}-${index}`} className="flex items-center gap-4">
                      {index > 0 ? (
                        <span className="bg-border h-9 w-px" aria-hidden="true" />
                      ) : null}
                      {partner.url ? (
                        <a href={partner.url} target="_blank" rel="noreferrer noopener">
                          <img src={partner.logo_url} alt={partner.name} className="h-9 w-auto" />
                        </a>
                      ) : (
                        <img src={partner.logo_url} alt={partner.name} className="h-9 w-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {settings.social.length ? (
              <ul className="flex flex-wrap items-center gap-2">
                {settings.social.map((item) => (
                  <li key={item.url}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex size-9 items-center justify-center rounded-md bg-current/10 opacity-80 transition-opacity hover:opacity-100"
                      aria-label={item.type}
                    >
                      <LinkIcon type={item.type} className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <nav aria-labelledby="footer-nav">
            <h2
              id="footer-nav"
              className="mb-4 text-xs font-semibold tracking-[0.14em] uppercase opacity-60"
            >
              Navegar
            </h2>
            <ul className="space-y-2.5 text-sm">
              {settings.nav.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="opacity-80 transition-opacity hover:opacity-100">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/entrar" className="opacity-80 transition-opacity hover:opacity-100">
                  Área administrativa
                </Link>
              </li>
            </ul>

            <div className="mt-6">
              <FooterContact settings={settings} />
            </div>
          </nav>

          {showCategories ? (
            <nav aria-labelledby="footer-categories">
              <h2
                id="footer-categories"
                className="mb-4 text-xs font-semibold tracking-[0.14em] uppercase opacity-60"
              >
                Categorias
              </h2>
              <ul className="space-y-2.5 text-sm">
                {categories.slice(0, 6).map((category) => (
                  <li key={category.id}>
                    <Link
                      to={`/categoria/${category.slug}`}
                      className="opacity-80 transition-opacity hover:opacity-100"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-current/10 pt-6 text-xs opacity-60 sm:flex-row sm:items-center sm:justify-between">
          {settings.footerCopyright ? (
            <p>
              © {new Date().getFullYear()} {settings.footerCopyright}
            </p>
          ) : (
            <span />
          )}
          {settings.footerNote ? <p>{settings.footerNote}</p> : null}
        </div>
      </div>
    </footer>
  )
}

export function PublicLayout() {
  const settings = useSiteSettings()

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteTheme settings={settings} />
      <ScrollToTop />
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <Header settings={settings} />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Footer settings={settings} />
    </div>
  )
}
