import inneLogo from '@/images/INNE-LOGO.png'
import uffsLogo from '@/images/UFFS-LOGO.png'

/**
 * Identidade do cabeçalho e do rodapé.
 *
 * Os valores abaixo são exatamente o conteúdo que estava escrito no layout
 * antes desta tela existir. Enquanto ninguém editar nada, a vitrine renderiza
 * igual — a personalização é um override, não uma substituição do tema.
 *
 * Cor `null` significa "usar o token do design system" (`src/index.css`).
 * Guardar `null` em vez de copiar o valor da paleta mantém uma fonte de
 * verdade só: mudar o tema no CSS continua refletindo em quem não personalizou.
 */

export const DEFAULT_NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/buscar', label: 'Explorar' },
  { to: '/categorias', label: 'Categorias' },
  { to: '/noticias', label: 'Notícias' },
  { to: '/sobre', label: 'Sobre' },
]

export const DEFAULT_PARTNERS = [
  { name: 'UFFS — Universidade Federal da Fronteira Sul', logo_url: uffsLogo, url: '' },
  { name: 'INNE — Incubadora de Negócios', logo_url: inneLogo, url: '' },
]

export const DEFAULT_LOGO = inneLogo

export const SITE_SETTINGS_DEFAULTS = {
  brand_name: 'Vitrine',
  brand_tagline: 'INNE · UFFS',
  logo_url: null,

  header_bg: null,
  header_fg: null,
  header_border: null,
  header_sticky: true,
  header_show_search: true,
  header_nav: [],

  footer_bg: null,
  footer_fg: null,
  footer_description:
    'Catálogo público das iniciativas da instituição: projetos, laboratórios, grupos de pesquisa, empresas juniores e programas de extensão reunidos em um só lugar.',
  footer_partners_label: 'Uma iniciativa da',
  footer_partners: [],
  footer_social: [],
  footer_show_categories: true,
  footer_contact_email: '',
  footer_contact_phone: '',
  footer_address: '',
  footer_copyright: 'Vitrine Institucional. Projeto de demonstração.',
  footer_note: 'Conteúdo fictício, criado para fins de apresentação.',

  primary_color: null,
  brand_color: null,
}

/** Campos de cor — usados pela tela de aparência e pela injeção de tokens. */
export const COLOR_FIELDS = [
  'header_bg',
  'header_fg',
  'header_border',
  'footer_bg',
  'footer_fg',
  'primary_color',
  'brand_color',
]

const HEX = /^#[0-9a-fA-F]{6}$/

/** Espelha o `check` de `site_settings_colors_are_hex` na migration 0005. */
export function isHexColor(value) {
  return typeof value === 'string' && HEX.test(value)
}

/** Descarta cor malformada em vez de deixá-la chegar ao `style` da página. */
function color(value) {
  return isHexColor(value) ? value : null
}

function text(value, fallback = '') {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || fallback
}

function list(value) {
  return Array.isArray(value) ? value : []
}

/**
 * Mistura uma cor com transparência preservando o efeito de vidro do
 * cabeçalho: `backdrop-blur` sem alfa no fundo não borra nada.
 */
export function withAlpha(hex, percent) {
  if (!isHexColor(hex)) return undefined
  return `color-mix(in oklab, ${hex} ${percent}%, transparent)`
}

/**
 * Normaliza a linha do banco em um objeto sempre completo.
 *
 * Recebe `undefined` durante o carregamento e na renderização de servidor
 * (`npm run smoke`), então nenhum consumidor precisa tratar ausência: o
 * cabeçalho e o rodapé sempre têm o que pintar.
 */
export function resolveSiteSettings(row) {
  const data = row ?? {}
  const d = SITE_SETTINGS_DEFAULTS

  const nav = list(data.header_nav)
    .filter((item) => item?.label && item?.to)
    .map((item) => ({ to: String(item.to), label: String(item.label), end: item.to === '/' }))

  const partners = list(data.footer_partners)
    .filter((item) => item?.logo_url)
    .map((item) => ({
      name: text(item.name),
      logo_url: String(item.logo_url),
      url: text(item.url),
    }))

  const social = list(data.footer_social)
    .filter((item) => item?.url)
    .map((item) => ({ type: text(item.type, 'other'), url: String(item.url) }))

  return {
    brandName: text(data.brand_name, d.brand_name),
    brandTagline: text(data.brand_tagline, d.brand_tagline),
    logoUrl: text(data.logo_url) || DEFAULT_LOGO,

    headerBg: color(data.header_bg),
    headerFg: color(data.header_fg),
    headerBorder: color(data.header_border),
    headerSticky: data.header_sticky ?? d.header_sticky,
    headerShowSearch: data.header_show_search ?? d.header_show_search,
    // Lista vazia = navegação padrão. Evita que um rodapé sem links deixe o
    // site sem menu por um salvamento distraído.
    nav: nav.length ? nav : DEFAULT_NAV,

    footerBg: color(data.footer_bg),
    footerFg: color(data.footer_fg),
    footerDescription: text(data.footer_description, d.footer_description),
    footerPartnersLabel: text(data.footer_partners_label, d.footer_partners_label),
    partners: partners.length ? partners : DEFAULT_PARTNERS,
    social,
    footerShowCategories: data.footer_show_categories ?? d.footer_show_categories,
    footerContactEmail: text(data.footer_contact_email),
    footerContactPhone: text(data.footer_contact_phone),
    footerAddress: text(data.footer_address),
    footerCopyright: text(data.footer_copyright, d.footer_copyright),
    footerNote: text(data.footer_note, d.footer_note),

    primaryColor: color(data.primary_color),
    brandColor: color(data.brand_color),
  }
}

/** Preenche o formulário da tela de aparência a partir da linha do banco. */
export function toFormValues(row) {
  const data = row ?? {}
  return Object.fromEntries(
    Object.entries(SITE_SETTINGS_DEFAULTS).map(([key, fallback]) => {
      const value = data[key]
      if (Array.isArray(fallback)) return [key, list(value)]
      if (typeof fallback === 'boolean') return [key, value ?? fallback]
      if (COLOR_FIELDS.includes(key)) return [key, color(value)]
      return [key, value ?? fallback]
    }),
  )
}
