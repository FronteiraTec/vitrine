/**
 * De onde o leitor veio — o "canal de origem" do relatório.
 *
 * Três sinais, nesta ordem:
 *
 *   1. navegação dentro do próprio site (a página avisa) → 'interno';
 *   2. `utm_source` no endereço, que quem divulga controla → o canal dele;
 *   3. o `document.referrer` → o canal do site que mandou, ou o domínio.
 *
 * Sem nenhum dos três: 'direto' — link digitado, favorito, ou aplicativo que
 * não informa a origem. O WhatsApp é o principal caso: na maioria dos
 * celulares ele abre o link sem referrer, e o acesso cai em 'direto'. Para
 * medir o WhatsApp de verdade, divulgue o link com `?utm_source=whatsapp`.
 */

const CHANNELS = [
  // Webmail antes dos buscadores: `mail.google.com` não é busca no Google.
  [/^(mail\.google\.com|outlook\.(live|office|office365)\.com|mail\.yahoo\.com)$/, 'email'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)yahoo\.[a-z.]+$/, 'yahoo'],
  [/(^|\.)ecosia\.org$/, 'ecosia'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'x'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)threads\.(net|com)$/, 'threads'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/^(t\.me|(.+\.)?telegram\.(org|me))$/, 'telegram'],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$|(^|\.)perplexity\.ai$|(^|\.)claude\.ai$/, 'ia'],
]

/** Aplicativos Android se identificam como `android-app://<pacote>`. */
const ANDROID_APPS = {
  'com.whatsapp': 'whatsapp',
  'com.whatsapp.w4b': 'whatsapp',
  'com.google.android.gm': 'email',
  'com.google.android.googlequicksearchbox': 'google',
  'com.instagram.android': 'instagram',
  'com.facebook.katana': 'facebook',
  'com.facebook.orca': 'facebook',
  'com.linkedin.android': 'linkedin',
  'org.telegram.messenger': 'telegram',
  'com.twitter.android': 'x',
  'com.google.android.youtube': 'youtube',
}

/** Valores de `utm_source` escritos de mais de um jeito. */
const UTM_ALIASES = {
  wa: 'whatsapp',
  zap: 'whatsapp',
  whats: 'whatsapp',
  ig: 'instagram',
  insta: 'instagram',
  fb: 'facebook',
  twitter: 'x',
  'e-mail': 'email',
  mail: 'email',
  newsletter: 'email',
}

function hostOf(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function channelOfHost(host) {
  for (const [pattern, channel] of CHANNELS) if (pattern.test(host)) return channel
  return null
}

/**
 * @param {object} input
 * @param {boolean} input.internal  a página veio de outra página do site
 * @param {string}  input.utmSource `utm_source` do endereço
 * @param {string}  input.referrer  `document.referrer`
 * @param {string}  input.siteHost  domínio do próprio site
 */
export function classifySource({ internal, utmSource, referrer, siteHost }) {
  if (internal) return 'interno'

  const utm = String(utmSource ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 40)
  if (utm) return UTM_ALIASES[utm] ?? channelOfHost(utm) ?? utm

  const raw = String(referrer ?? '').trim().slice(0, 500)
  if (!raw) return 'direto'

  if (raw.startsWith('android-app://')) {
    const app = raw.slice('android-app://'.length).split('/')[0]
    return ANDROID_APPS[app] ?? 'app'
  }

  const host = hostOf(raw)
  if (!host) return 'direto'
  if (siteHost && host === siteHost.replace(/^www\./, '')) return 'interno'
  return channelOfHost(host) ?? host.slice(0, 100)
}
