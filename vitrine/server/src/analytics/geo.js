/**
 * País, estado e cidade estimados pelo IP, com uma base local em formato MMDB
 * (GeoLite2 City da MaxMind, ou DB-IP Lite City — mesmo formato).
 *
 * A consulta é feita aqui, no servidor, em memória: o IP do visitante não vai
 * para serviço externo nenhum, e é descartado logo depois. Sem a base
 * configurada, a audiência é contada igual, só que sem localização.
 *
 * O container `geoipupdate` (perfil `geoip` do docker-compose) baixa a base
 * nova toda semana; `watchForUpdates` faz a API trocar de arquivo sem reiniciar.
 */
import { access } from 'node:fs/promises'
import maxmind from 'maxmind'
import { config } from '../config.js'

let reader = null
let retryTimer = null

async function open() {
  try {
    await access(config.geoipDb)
  } catch {
    return false
  }
  reader = await maxmind.open(config.geoipDb, {
    cache: { max: 10_000 },
    watchForUpdates: true,
    watchForUpdatesNonPersistent: true,
  })
  return true
}

/**
 * Abre a base. Se ela ainda não existe — o `geoipupdate` sobe junto e baixa
 * nos primeiros minutos —, tenta de novo a cada dez minutos.
 */
export async function initGeo() {
  if (!config.geoipDb) {
    console.log('[geo] GEOIP_DB não definida: a audiência será contada sem localização.')
    return
  }
  try {
    if (await open()) {
      console.log(`[geo] base de localização carregada: ${config.geoipDb}`)
      return
    }
  } catch (error) {
    console.error('[geo] base de localização inválida:', error.message)
  }

  console.log(`[geo] ${config.geoipDb} ainda não existe; nova tentativa em 10 minutos.`)
  clearTimeout(retryTimer)
  retryTimer = setTimeout(initGeo, 10 * 60 * 1000)
  retryTimer.unref()
}

export function geoReady() {
  return Boolean(reader)
}

const EMPTY = Object.freeze({ country: '', region: '', city: '' })

const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** Estados pelo nome — a DB-IP Lite traz o nome, sem o código que a MaxMind traz. */
const BRAZIL_STATES = Object.fromEntries(
  Object.entries({
    AC: 'Acre',
    AL: 'Alagoas',
    AP: 'Amapa',
    AM: 'Amazonas',
    BA: 'Bahia',
    CE: 'Ceara',
    DF: 'Distrito Federal',
    ES: 'Espirito Santo',
    GO: 'Goias',
    MA: 'Maranhao',
    MT: 'Mato Grosso',
    MS: 'Mato Grosso do Sul',
    MG: 'Minas Gerais',
    PA: 'Para',
    PB: 'Paraiba',
    PR: 'Parana',
    PE: 'Pernambuco',
    PI: 'Piaui',
    RJ: 'Rio de Janeiro',
    RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul',
    RO: 'Rondonia',
    RR: 'Roraima',
    SC: 'Santa Catarina',
    SP: 'Sao Paulo',
    SE: 'Sergipe',
    TO: 'Tocantins',
  }).map(([code, name]) => [fold(name), code]),
)
BRAZIL_STATES[fold('Federal District')] = 'DF'

/**
 * Estado: o código ISO 3166-2 quando a base traz (MaxMind: 'SC'); no Brasil,
 * o nome é convertido para a sigla, para as duas bases somarem na mesma
 * linha; fora dele, fica o nome.
 */
function regionOf(country, subdivision) {
  if (!subdivision) return ''
  if (subdivision.iso_code) return subdivision.iso_code
  const name = subdivision.names?.['pt-BR'] ?? subdivision.names?.en ?? ''
  if (country === 'BR') return BRAZIL_STATES[fold(name)] ?? name
  return name
}

/** `{ country: 'BR', region: 'SC', city: 'Chapecó' }`, ou campos vazios. */
export function lookup(ip) {
  if (!reader || !ip) return EMPTY
  const address = String(ip).replace(/^::ffff:/, '')
  if (!maxmind.validate(address)) return EMPTY

  try {
    const result = reader.get(address)
    if (!result) return EMPTY
    const country = result.country?.iso_code ?? result.registered_country?.iso_code ?? ''
    const names = result.city?.names ?? {}
    return {
      country,
      region: regionOf(country, result.subdivisions?.[0]),
      city: names['pt-BR'] ?? names.en ?? '',
    }
  } catch {
    return EMPTY
  }
}
