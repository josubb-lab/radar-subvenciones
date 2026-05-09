import type { APIRoute } from 'astro'
import { SECTORES, CCAA } from '../lib/taxonomia'

export const prerender = false

export const GET: APIRoute = async () => {
  const siteUrl = (import.meta.env.PUBLIC_SITE_URL || 'https://radar-subvenciones.es').replace(/\/$/, '')
  const hoy = new Date().toISOString().slice(0, 10)

  const urls: string[] = []

  const add = (loc: string, priority: string, changefreq: string, lastmod = hoy) =>
    urls.push(`  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`)

  // Páginas principales
  add(`${siteUrl}/`, '1.0', 'daily')
  add(`${siteUrl}/sectores`, '0.6', 'weekly')
  add(`${siteUrl}/quienes-somos`, '0.4', 'monthly')
  add(`${siteUrl}/origen-datos`, '0.4', 'monthly')
  add(`${siteUrl}/guias`, '0.6', 'weekly')

  // Páginas de sector
  for (const s of SECTORES) {
    add(`${siteUrl}/sector/${s.slug}`, '0.8', 'daily')
    add(`${siteUrl}/guias/${s.slug}`, '0.6', 'monthly')
  }

  // Páginas de CCAA
  for (const c of CCAA) {
    add(`${siteUrl}/ccaa/${c.slug}`, '0.7', 'daily')
  }

  // Combinaciones sector × CCAA
  for (const s of SECTORES) {
    for (const c of CCAA) {
      add(`${siteUrl}/subvenciones/${s.slug}/${c.slug}`, '0.6', 'weekly')
    }
  }

  // Combinaciones sector × CCAA × año
  for (const anio of ['2024', '2025', '2026']) {
    for (const s of SECTORES) {
      for (const c of CCAA) {
        add(`${siteUrl}/subvenciones/${s.slug}/${c.slug}/${anio}`, '0.5', 'monthly')
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
