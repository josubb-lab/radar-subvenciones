import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'
import { subvencionSlug } from '../lib/slugify'

export const prerender = false

export const GET: APIRoute = async () => {
  const siteUrl = (import.meta.env.PUBLIC_SITE_URL || 'https://radar-subvenciones.es').replace(/\/$/, '')

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_KEY,
  )

  const { data: rows } = await supabase
    .from('subvenciones')
    .select('id, titulo, fecha_pub')
    .order('fecha_pub', { ascending: false, nullsFirst: false })
    .limit(5000)

  const urls = (rows ?? []).map(s => {
    const slug = subvencionSlug(s.titulo ?? '', s.id)
    const lastmod = s.fecha_pub ? s.fecha_pub.slice(0, 10) : new Date().toISOString().slice(0, 10)
    return `  <url>\n    <loc>${siteUrl}/subvencion/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
  }).join('\n')

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }
  )
}
