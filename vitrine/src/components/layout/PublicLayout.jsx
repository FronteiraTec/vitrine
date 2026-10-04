import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogIn, Mail, MapPin, Menu, Phone, Search } from 'lucide-react'
import { Logo } from './Logo'
import { SiteTheme } from './SiteTheme'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { LinkIcon } from '@/components/initiatives/LinkIcon'
import { AccessibilityWidget } from '@/components/accessibility/AccessibilityWidget'
import { useCategories, useSiteSettings } from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE, newsListPath } from '@/i18n/config'
import { withAlpha } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

/**
 * Páginas institucionais que o rodapé sempre mostra.
 *
 * São os itens que o Google avalia como transparência editorial de um veículo
 * — quem responde pelo conteúdo, sob que critérios e como falar com a redação —
 * e a declaração de acessibilidade que acompanha o painel do leitor.
 */
const EDITORIAL_LINKS = [
  { to: '/expediente', key: 'footer.masthead' },
  { to: '/politica-editorial', key: 'footer.policy' },
  { to: '/contato', key: 'footer.contact' },
  { to: '/acessibilidade', key: 'footer.accessibility' },
]

/** Páginas do menu padrão, com a chave do rótulo traduzido. */
const NAV_LABELS = {
  '/': 'nav.home',
  '/buscar': 'nav.explore',
  '/categorias': 'nav.categories',
  '/noticias': 'nav.news',
  '/sobre': 'nav.about',
}

/**
 * O menu no idioma da interface.
 *
 * O menu é configurável no painel (`/admin/aparencia`), e o que o
 * administrador escreveu é respeitado: em português ele aparece exatamente
 * como foi escrito. Em outro idioma, um item que aponta para uma página
 * conhecida ganha o rótulo traduzido dela — um "Notícias" no meio de um
 * cabeçalho em inglês seria só o texto que ninguém traduziu. Item que aponta
 * para outro lugar mantém o rótulo do painel, porque não há como saber o que
 * ele diz.
 *
 * "Notícias" leva à lista do idioma da interface: quem lê em inglês chega às
 * notícias em inglês.
 */
function useLocalizedNav(settings) {
  const { locale, t } = useLocale()

  return settings.nav.map((item) => {
    const key = NAV_LABELS[item.to]
    const translate = key && (settings.navIsDefault || locale !== DEFAULT_LOCALE)
    return {
      ...item,
      to: item.to === '/noticias' ? newsListPath(locale) : item.to,
      label: translate ? t(key) : item.label,
    }
  })
}

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
 * `text-body-secondary` fixo ignoraria a cor escolhida e sumiria num fundo
 * escuro.
 */
function navLinkClasses({ isActive, tinted, size = 'desktop' }) {
  const base =
    size === 'desktop'
      ? 'rounded-2 px-2 py-2 fs-7 fw-medium'
      : 'rounded-2 px-2 py-2 fs-7 fw-medium'

  if (tinted) {
    return cn(
      base,
      'text-current',
      isActive ? ' fw-semibold opacity-100' : 'opacity-75',
    )
  }

  return cn(
    base,
    isActive
      ? 'text-primary bg-primary-subtle'
      : 'text-body-secondary ',
  )
}

function DesktopNav({ links, tinted }) {
  const { t } = useLocale()

  return (
    <nav className="d-none align-items-center gap-1 d-lg-flex" aria-label={t('header.mainNav')}>
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
  const { t, locale } = useLocale()
  // Nomes de categoria são conteúdo do banco, escrito em português.
  const catalogLang = locale === DEFAULT_LOCALE ? undefined : DEFAULT_LOCALE

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-current d-lg-none"
          aria-label={t('header.openMenu')}
        >
          <Menu />
        </Button>
      </SheetTrigger>
      {/* O drawer é uma superfície própria, fora do cabeçalho: mantém as cores
          do tema para não depender do contraste da cor escolhida no topo. */}
      <SheetContent side="left" title={t('header.menuTitle')}>
        <div className="space-y-4 p-3">
          <nav className="d-flex flex-column gap-1" aria-label={t('header.mainNav')}>
            {links.map((link) => (
              <SheetClose asChild key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    cn(
                      'rounded-2 px-2 py-2 fs-7 fw-medium',
                      isActive ? 'bg-primary-subtle text-primary' : 'text-body',
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
              <p className="text-body-secondary px-2 fs-8 fw-semibold text-uppercase">
                {t('header.categories')}
              </p>
              <div className="d-flex flex-column gap-1">
                {categories.map((category) => (
                  <SheetClose asChild key={category.id}>
                    <Link
                      to={`/categoria/${category.slug}`}
                      lang={catalogLang}
                      className="text-body-secondary d-flex align-items-center gap-2 rounded-2 px-2 py-2 fs-7"
                    >
                      <CategoryIcon name={category.icon} className="icon flex-shrink-0" />
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
  const { t } = useLocale()
  const nav = useLocalizedNav(settings)

  const tinted = Boolean(settings.headerFg)
  const painted = Boolean(settings.headerBg)

  return (
    <header
      className={cn(
        // `site-header` é o gancho do modo de alto contraste: as cores abaixo
        // vêm por `style` inline, e só um seletor com `!important` as alcança.
        'site-header z-3 border-bottom',
        settings.headerSticky && 'position-sticky top-0',
        !painted && 'bg-body',
        !settings.headerBorder && 'border',
      )}
      style={{
        // 88% em vez de opaco preserva o efeito de vidro do `backdrop-blur`.
        backgroundColor: withAlpha(settings.headerBg, 88),
        color: settings.headerFg ?? undefined,
        borderBottomColor: settings.headerBorder ?? undefined,
      }}
    >
      <div className="container d-flex h-fx-16 align-items-center gap-2">
        <MobileNav links={nav} />
        <Logo />

        <div className="flex-grow-1" />

        <DesktopNav links={nav} tinted={tinted} />

        {/* O divisor separa o menu das ações, e o menu só existe na linha a
            partir do `lg`. Abaixo disso ele cede o espaço ao seletor de idioma
            — no celular a linha já leva menu, marca, busca e idioma. */}
        <div
          className={cn('mx-1 vr d-none d-lg-block', tinted ? '' : 'bg-body-secondary')}
        />

        {settings.headerShowSearch ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(tinted && 'text-current ')}
            onClick={() => navigate('/buscar')}
            aria-label={t('header.search')}
          >
            <Search />
          </Button>
        ) : null}

        <LanguageSwitcher tinted={tinted} />

        <Button
          variant="outline"
          size="sm"
          asChild
          className={cn(
            'd-none d-sm-inline-flex',
            // Sobre um cabeçalho pintado, a superfície clara do botão viraria
            // um retângulo destoante — vira contorno sobre a própria cor.
            painted && ' bg-transparent text-current ',
          )}
        >
          {isAuthenticated && isStaff ? (
            <Link to="/admin">
              <LayoutDashboard aria-hidden="true" />
              {t('header.panel')}
            </Link>
          ) : (
            <Link to="/entrar">
              <LogIn aria-hidden="true" />
              {t('header.signIn')}
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
    <ul className="space-y-2 fs-7">
      {items.map(({ icon: Icon, label, href }) => (
        <li key={label} className="d-flex align-items-start gap-2 opacity-75">
          <Icon className="mt-1 icon flex-shrink-0" aria-hidden="true" />
          {href ? (
            <a href={href}>
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
  const { t, locale } = useLocale()
  const nav = useLocalizedNav(settings)
  const catalogLang = locale === DEFAULT_LOCALE ? undefined : DEFAULT_LOCALE

  return (
    <footer
      className={cn(
        'site-footer mt-5',
        !settings.footerBg && 'bg-primary',
        !settings.footerFg && 'text-white',
      )}
      style={{
        backgroundColor: settings.footerBg ?? undefined,
        color: settings.footerFg ?? undefined,
      }}
    >
      <div className="container py-5">
        <div
          className={cn(
            'd-grid gap-5',
            showCategories ? 'grid-footer-3' : 'grid-footer-2',
          )}
        >
          <div className="space-y-3">
            <Logo to={null} inverted className="text-current" />

            {settings.footerDescription ? (
              <p className="mw-sm fs-7 lh-base opacity-75">
                {settings.footerDescription}
              </p>
            ) : null}

            {settings.partners.length ? (
              <div className="space-y-2">
                {settings.footerPartnersLabel ? (
                  <p className="fw-medium text-uppercase opacity-50">
                    {settings.footerPartnersLabel}
                  </p>
                ) : null}
                {/* A faixa branca existe porque logotipos institucionais são
                    desenhados para fundo claro e sumiriam sobre a cor do rodapé. */}
                <div className="d-inline-flex flex-wrap align-items-center gap-3 rounded-3 bg-white px-3 py-2">
                  {settings.partners.map((partner, index) => (
                    <div key={`${partner.logo_url}-${index}`} className="d-flex align-items-center gap-3">
                      {index > 0 ? (
                        <span className="bg-body-secondary h-fx-9 vr" aria-hidden="true" />
                      ) : null}
                      {partner.url ? (
                        <a href={partner.url} target="_blank" rel="noreferrer noopener">
                          <img src={partner.logo_url} alt={partner.name} className="h-fx-9 w-auto" />
                        </a>
                      ) : (
                        <img src={partner.logo_url} alt={partner.name} className="h-fx-9 w-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {settings.social.length ? (
              <ul className="d-flex flex-wrap align-items-center gap-2">
                {settings.social.map((item) => (
                  <li key={item.url}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="footer-social d-flex h-fx-9 w-fx-9 align-items-center justify-content-center rounded-2 opacity-75"
                      aria-label={item.type}
                    >
                      <LinkIcon type={item.type} className="icon" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <nav aria-labelledby="footer-nav">
            <h2
              id="footer-nav"
              className="mb-3 fs-8 fw-semibold text-uppercase opacity-50"
            >
              {t('footer.navigate')}
            </h2>
            <ul className="space-y-2 fs-7">
              {nav.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="opacity-75">
                    {link.label}
                  </Link>
                </li>
              ))}
              {/* Páginas de transparência editorial.

                  Não vêm de `settings.nav` de propósito: o administrador pode
                  reordenar ou remover itens do menu, e estas quatro precisam
                  existir sempre. Quem publica notícia é avaliado por elas —
                  autoria, responsáveis, critérios e canal de contato. */}
              {EDITORIAL_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="opacity-75">
                    {t(link.key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/entrar" className="opacity-75">
                  {t('footer.admin')}
                </Link>
              </li>
            </ul>

            <div className="mt-4">
              <FooterContact settings={settings} />
            </div>
          </nav>

          {showCategories ? (
            <nav aria-labelledby="footer-categories">
              <h2
                id="footer-categories"
                className="mb-3 fs-8 fw-semibold text-uppercase opacity-50"
              >
                {t('footer.categories')}
              </h2>
              <ul className="space-y-2 fs-7">
                {categories.slice(0, 6).map((category) => (
                  <li key={category.id}>
                    <Link
                      to={`/categoria/${category.slug}`}
                      lang={catalogLang}
                      className="opacity-75"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>

        <div className="footer-rule mt-5 d-flex flex-column gap-2 border-top pt-4 fs-8 opacity-50 flex-sm-row align-items-sm-center justify-content-sm-between">
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
  const { t } = useLocale()

  return (
    <div className="d-flex min-vh-100 flex-column">
      <SiteTheme settings={settings} />
      <ScrollToTop />
      <a href="#conteudo" className="skip-link">
        {t('header.skipToContent')}
      </a>
      <Header settings={settings} />
      <main id="conteudo" className="flex-grow-1">
        <Outlet />
      </main>
      <Footer settings={settings} />

      {/* Só na vitrine pública. O painel administrativo é ferramenta de
          trabalho: inverter as cores ali deixaria ilegível o próprio
          formulário usado para corrigir o problema. */}
      <AccessibilityWidget />
    </div>
  )
}
