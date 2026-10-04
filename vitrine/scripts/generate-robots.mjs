/**
 * Escreve `dist/robots.txt` com o domínio real do deploy.
 *
 * Substitui o antigo `generate-sitemap.mjs`. O sitemap deixou de ser gerado no
 * build e passou a ser servido pela API (`server/src/seo/sitemap.js`), porque
 * um arquivo escrito no build fica congelado: uma notícia publicada às 9h só
 * entraria nele no próximo deploy — e quem publica notícia não faz deploy.
 *
 * Não grave `dist/sitemap.xml`: o Nginx repassa esse endereço à API, e um
 * arquivo estático com o mesmo nome só confundiria quem procurasse o sitemap
 * na pasta do build.
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const siteUrl = (process.env.VITE_SITE_URL ?? '').replace(/\/+$/, '')
const output = join(process.cwd(), 'dist', 'robots.txt')

/*
 * Um grupo `User-agent` só, de propósito.
 *
 * A tentação é escrever um bloco `User-agent: Googlebot-News` para "garantir"
 * o acesso do rastreador de notícias. Seria um tiro no pé: quando existe um
 * grupo específico para um robô, ele passa a obedecer APENAS àquele grupo e
 * ignora o `*` inteiro — inclusive os `Disallow` da área administrativa. Um
 * bloco escrito para liberar acabaria liberando o painel junto.
 *
 * O grupo `*` com `Allow: /` já permite Googlebot, Googlebot-News, Bingbot e
 * qualquer rastreador legítimo. Não há nada a acrescentar.
 *
 * E `Disallow` impede o RASTREAMENTO, não a indexação: uma URL bloqueada ainda
 * pode entrar no índice se alguém apontar um link para ela. Por isso as telas
 * de login e do painel também trazem `noindex` na própria página — ver
 * `PRIVATE_ROBOTS` em `src/lib/seo.js`.
 */
const lines = [
  'User-agent: *',
  'Allow: /',
  '',
  '# Área administrativa e telas de autenticação.',
  'Disallow: /admin',
  'Disallow: /entrar',
  'Disallow: /criar-conta',
  'Disallow: /recuperar-senha',
  'Disallow: /redefinir-senha',
  'Disallow: /configuracao',
  '',
]

if (siteUrl) {
  lines.push(
    `Sitemap: ${siteUrl}/sitemap.xml`,
    // Declarado além do índice: alguns rastreadores de notícia leem o
    // robots.txt e vão direto ao arquivo do Google News sem abrir o índice.
    `Sitemap: ${siteUrl}/sitemap-google-news.xml`,
    '',
  )
} else {
  lines.push(
    '# VITE_SITE_URL não definida no build: a linha Sitemap foi omitida.',
    '# Um endereço de exemplo aqui faria o Search Console reportar erro de',
    '# domínio cruzado, que é pior do que a ausência da linha.',
    '',
  )
}

await writeFile(output, lines.join('\n'), 'utf8')

console.log(
  siteUrl
    ? `[robots] dist/robots.txt gravado com sitemaps em ${siteUrl}`
    : '[robots] dist/robots.txt gravado SEM a linha Sitemap (defina VITE_SITE_URL).',
)
