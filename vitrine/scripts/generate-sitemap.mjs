/**
 * Gera dist/sitemap.xml a partir do conteúdo publicado.
 *
 * Roda depois do `vite build`, lendo o banco com a chave anônima — o RLS
 * garante que só entram no arquivo iniciativas com status `published`.
 *
 * Se as variáveis de ambiente não estiverem definidas (por exemplo num build
 * de verificação em CI), o script avisa e sai com sucesso: sitemap ausente não
 * deve derrubar o deploy.
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const siteUrl = (process.env.VITE_SITE_URL ?? 'https://exemplo.com').replace(/\/$/, '')
const outputPath = join(process.cwd(), 'dist', 'sitemap.xml')

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${siteUrl}${loc}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n')
}

async function main() {
  const entries = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/buscar', changefreq: 'daily', priority: '0.8' },
    { loc: '/categorias', changefreq: 'weekly', priority: '0.8' },
    { loc: '/noticias', changefreq: 'daily', priority: '0.8' },
    { loc: '/sobre', changefreq: 'monthly', priority: '0.5' },
  ]

  if (!url || !anonKey) {
    console.warn(
      '[sitemap] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes — gerando apenas as rotas estáticas.',
    )
  } else {
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } })

    const [
      { data: categories, error: categoriesError },
      { data: initiatives, error: initiativesError },
      { data: news, error: newsError },
    ] = await Promise.all([
      supabase.from('categories').select('slug, updated_at'),
      supabase
        .from('initiatives')
        .select('slug, updated_at')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(5000),
      supabase
        .from('news')
        .select('slug, updated_at')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(5000),
    ])

    if (categoriesError || initiativesError || newsError) {
      console.warn(
        '[sitemap] Falha ao consultar o Supabase:',
        (categoriesError ?? initiativesError ?? newsError).message,
      )
    } else {
      for (const category of categories ?? []) {
        entries.push({
          loc: `/categoria/${category.slug}`,
          lastmod: category.updated_at,
          changefreq: 'weekly',
          priority: '0.7',
        })
      }
      for (const initiative of initiatives ?? []) {
        entries.push({
          loc: `/iniciativa/${initiative.slug}`,
          lastmod: initiative.updated_at,
          changefreq: 'monthly',
          priority: '0.6',
        })
      }
      for (const article of news ?? []) {
        entries.push({
          loc: `/noticia/${article.slug}`,
          lastmod: article.updated_at,
          // Notícia não muda depois de publicada; o que interessa ao buscador
          // é descobri-la cedo, não revisitá-la.
          changefreq: 'yearly',
          priority: '0.6',
        })
      }
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(urlEntry),
    '</urlset>',
    '',
  ].join('\n')

  await writeFile(outputPath, xml, 'utf8')
  console.log(`[sitemap] ${entries.length} URLs gravadas em dist/sitemap.xml`)
}

main().catch((error) => {
  console.warn('[sitemap] Não foi possível gerar o sitemap:', error.message)
})
