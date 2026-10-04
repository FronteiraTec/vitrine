/**
 * Audiência: o registro de visualizações (lado do leitor) e os rótulos do
 * relatório (lado do painel).
 *
 * PRIVACIDADE. Nada aqui identifica o leitor. A página manda à API só o que
 * foi aberto, o idioma, de onde a pessoa chegou e se é a primeira vez que
 * aquele navegador abre aquele conteúdo HOJE — e esse "primeira vez" é
 * decidido aqui, com uma marca guardada no próprio navegador, que nunca sai
 * dele. O servidor estima país, estado e cidade pelo IP e descarta o IP.
 */
import { api } from '@/lib/api'

/* -------------------------------------------------------------------------- */
/* Registro                                                                    */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'vitrine:lidos'

/** O endereço por onde o leitor entrou no site nesta aba. */
const ENTRY_PATH = typeof window === 'undefined' ? '' : window.location.pathname
let entryTracked = false

/** Últimos envios, para o duplo efeito do StrictMode não contar duas vezes. */
const recent = new Map()

function localDay(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Primeira vez que este navegador abre este conteúdo hoje? A lista guarda só
 * as marcas do dia — as de ontem são descartadas a cada leitura, então ela
 * nunca cresce além do que a pessoa leu hoje. Sem `localStorage` (navegação
 * privada restrita), toda visualização conta como leitor novo.
 */
function firstViewToday(key) {
  try {
    const today = localDay()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const fresh = Object.fromEntries(Object.entries(stored).filter(([, day]) => day === today))
    if (fresh[key]) return false
    fresh[key] = today
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    return true
  } catch {
    return true
  }
}

/**
 * Registra a visualização de uma notícia (`news`) ou iniciativa
 * (`initiative`). Falha em silêncio: o contador nunca atrapalha a leitura.
 */
export function trackView({ type, id, locale }) {
  if (typeof window === 'undefined' || !id) return
  // Navegador controlado por automação (testes, robôs que executam JS).
  if (navigator.webdriver) return

  const key = `${type}:${id}`
  const now = Date.now()
  if (now - (recent.get(key) ?? 0) < 3000) return
  recent.set(key, now)

  // A primeira página aberta nesta aba veio de fora; as seguintes, de dentro.
  const internal = entryTracked || window.location.pathname !== ENTRY_PATH
  entryTracked = true

  const params = new URLSearchParams(window.location.search)

  api
    .post(
      '/acessos',
      {
        type,
        id,
        locale,
        unique: firstViewToday(key),
        internal,
        referrer: internal ? '' : document.referrer,
        utmSource: internal ? '' : (params.get('utm_source') ?? ''),
      },
      { keepalive: true },
    )
    .catch(() => {})
}

/* -------------------------------------------------------------------------- */
/* Rótulos do relatório                                                        */
/* -------------------------------------------------------------------------- */

const number = new Intl.NumberFormat('pt-BR')

/** 1234 → '1.234'. */
export const formatCount = (value) => number.format(value ?? 0)

export const CONTENT_TYPE_LABEL = {
  news: 'Notícia',
  initiative: 'Iniciativa',
}

/** Canais reconhecidos pelo servidor (`server/src/analytics/source.js`). */
const SOURCE_LABEL = {
  direto: 'Direto',
  interno: 'Navegação no site',
  google: 'Google',
  bing: 'Bing',
  duckduckgo: 'DuckDuckGo',
  yahoo: 'Yahoo',
  ecosia: 'Ecosia',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  threads: 'Threads',
  tiktok: 'TikTok',
  telegram: 'Telegram',
  email: 'E-mail',
  ia: 'Assistentes de IA',
  app: 'Outro aplicativo',
}

export function sourceLabel(source) {
  if (!source) return 'Não identificado'
  return SOURCE_LABEL[source] ?? source
}

/** Explicação dos canais que mais confundem, para a dica da tela. */
export const SOURCE_HINT =
  '"Direto" reúne link digitado, favorito e aplicativos que não informam de onde vêm — o WhatsApp, na maioria dos celulares. Para medir a divulgação em um canal, compartilhe o link com ?utm_source=whatsapp (ou instagram, email…).'

const LOCALE_LABEL = { 'pt-BR': 'Português', en: 'Inglês', es: 'Espanhol' }

export function localeLabel(code) {
  return LOCALE_LABEL[code] ?? (code || 'Não identificado')
}

let regionNames
/** 'BR' → 'Brasil'. */
export function countryName(code) {
  if (!code) return 'Não identificado'
  try {
    regionNames ??= new Intl.DisplayNames(['pt-BR'], { type: 'region' })
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

const BRAZIL_STATES = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
}

/** Estado pelo código ISO 3166-2 sem o país: ('BR', 'SC') → 'Santa Catarina'. */
export function regionName(country, region) {
  if (!region) return 'Não identificado'
  if (country === 'BR') return BRAZIL_STATES[region] ?? region
  return region
}

/** "Chapecó (SC)", "Buenos Aires (Argentina)". */
export function cityLabel({ country, region, city }) {
  if (!city) return 'Não identificada'
  if (country === 'BR') return region ? `${city} (${region})` : city
  return country ? `${city} (${countryName(country)})` : city
}
