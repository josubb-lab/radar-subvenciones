import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

export const prerender = false

export const GET: APIRoute = async () => {
  const siteUrl = (import.meta.env.PUBLIC_SITE_URL || 'https://radar-subvenciones.es').replace(/\/$/, '')

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_KEY,
  )

  const { data: rows } = await supabase
    .from('subvenciones')
    .select('id, titulo, descripcion, organismo, fecha_pub, url, tipo, sector, ccaa')
    .eq('activa', true)
    .order('fecha_pub', { ascending: false, nullsFirst: false })
    .limit(50)

  const ahora = new Date().toUTCString()

  const items = (rows ?? []).map(s => {
    const titulo = (s.titulo ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const desc   = (s.descripcion ?? `Subvención publicada por ${s.organismo ?? 'organismo oficial'} en España.`)
      .slice(0, 300).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const pubDate = s.fecha_pub ? new Date(s.fecha_pub).toUTCString() : ahora
    const link    = s.url ?? `${siteUrl}`

    return `  <item>
    <title>${titulo}</title>
    <link>${link}</link>
    <guid isPermaLink="false">${s.id}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${desc}</description>
    <source url="${siteUrl}/rss.xml">Radar Subvenciones</source>
  </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Radar Subvenciones — Ayudas públicas en España</title>
    <link>${siteUrl}</link>
    <description>Subvenciones y ayudas públicas en España actualizadas a diario. BOE, BDNS y boletines autonómicos.</description>
    <language>es</language>
    <lastBuildDate>${ahora}</lastBuildDate>
    <ttl>360</ttl>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
