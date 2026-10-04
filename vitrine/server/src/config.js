/**
 * Configuração da API, lida uma vez do ambiente.
 *
 * Tudo aqui vem do `docker-compose.yml` (ou de `server/.env` em
 * desenvolvimento). Nenhum valor tem padrão inseguro: sem `DATABASE_URL` a API
 * não sobe, e sem `SITE_URL` ela funciona, mas avisa — em produção a canônica
 * e os links de e-mail precisam de um domínio fixo.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Carrega `server/.env` em desenvolvimento, sem dependência. Não sobrescreve o ambiente. */
function loadDotEnv() {
  try {
    const text = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      if (!line.includes('=') || line.trimStart().startsWith('#')) continue
      const at = line.indexOf('=')
      const key = line.slice(0, at).trim()
      const value = line.slice(at + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
      if (key && process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    // Sem arquivo: tudo vem do ambiente, que é o caso do container.
  }
}

loadDotEnv()

const env = process.env

function number(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback
  return /^(1|true|yes|sim|on)$/i.test(String(value))
}

const siteUrl = (env.SITE_URL ?? env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')

export const config = {
  port: number(env.PORT, 3000),
  production: env.NODE_ENV === 'production',

  /** Conexão como `authenticator` — o papel que só assume outros papéis. */
  databaseUrl: env.DATABASE_URL ?? '',
  /** Conexão como dono do banco, usada SÓ pelo `migrate.js`. */
  adminDatabaseUrl: env.ADMIN_DATABASE_URL ?? '',
  /** Senha do `authenticator`, aplicada pelo `migrate.js`. */
  appDbPassword: env.APP_DB_PASSWORD ?? '',

  /** Domínio público, sem barra no fim. Canônica, sitemaps, e-mails e URLs de arquivo. */
  siteUrl,

  /**
   * Quantos proxies confiáveis existem entre o visitante e a API. No
   * docker-compose é um: o Nginx. Errar para mais deixa qualquer um forjar o
   * próprio IP pelo `X-Forwarded-For`; errar para menos faz todo acesso parecer
   * vir do Nginx.
   */
  trustProxy: number(env.TRUST_PROXY, 1),

  session: {
    cookieName: 'vitrine_session',
    /** Cookie `Secure` exige HTTPS. Por padrão segue o protocolo de SITE_URL. */
    secureCookie: bool(env.COOKIE_SECURE, siteUrl.startsWith('https://')),
    /** Prazo máximo de uma sessão, mesmo em uso contínuo. */
    maxDays: number(env.SESSION_MAX_DAYS, 30),
    /** Sessão parada por mais que isto expira. */
    idleDays: number(env.SESSION_IDLE_DAYS, 7),
  },

  uploads: {
    dir: env.UPLOADS_DIR ?? fileURLToPath(new URL('../../.uploads', import.meta.url)),
    /** Caminho público em que o Nginx serve a pasta. */
    publicPath: '/arquivos',
  },

  mail: {
    host: env.SMTP_HOST ?? '',
    port: number(env.SMTP_PORT, 587),
    secure: bool(env.SMTP_SECURE, number(env.SMTP_PORT, 587) === 465),
    user: env.SMTP_USER ?? '',
    password: env.SMTP_PASSWORD ?? '',
    from: env.MAIL_FROM ?? '',
  },

  geoipDb: env.GEOIP_DB ?? '',
  analyticsTimezone: env.ANALYTICS_TIMEZONE ?? 'America/Sao_Paulo',

  /**
   * Onde buscar o `index.html` construído, que serve de casca às páginas de
   * notícia renderizadas no servidor. No compose, o próprio Nginx.
   */
  shellUrl: env.SHELL_URL ?? '',
  shellFile: env.SHELL_FILE ?? fileURLToPath(new URL('../../dist/index.html', import.meta.url)),
}

export const isMailConfigured = Boolean(config.mail.host && config.mail.from)
