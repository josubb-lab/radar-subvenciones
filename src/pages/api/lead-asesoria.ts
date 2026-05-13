import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const POST: APIRoute = async ({ request }) => {
  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Petición inválida' }, 400)
  }

  const nombre = String(payload.nombre || '').trim()
  const empresa = String(payload.empresa || '').trim()
  const email = String(payload.email || '').trim().toLowerCase()
  const tipoDespacho = String(payload.tipo_despacho || '').trim()
  const clientes = String(payload.clientes || '').trim()
  const interes = String(payload.interes || '').trim()

  if (!nombre || !empresa || !email || !tipoDespacho) {
    return json({ error: 'Faltan campos obligatorios' }, 400)
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Email no válido' }, 400)
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_KEY,
  )

  const lead = {
    nombre,
    empresa,
    email,
    tipo_despacho: tipoDespacho,
    clientes,
    interes,
    origen: 'web-b2b',
  }

  const { error } = await supabase
    .from('leads_asesorias')
    .insert(lead)

  if (!error) return json({ ok: true })

  // Fallback operativo para no perder el contacto si la tabla nueva aun no existe.
  if (error.code === '42P01') {
    const { error: fallbackError } = await supabase
      .from('suscriptores')
      .insert({ email })

    if (!fallbackError || fallbackError.code === '23505') {
      return json({ ok: true, fallback: true })
    }
  }

  if (error.code === '23505') return json({ ok: true, duplicate: true })
  return json({ error: error.message, code: error.code }, 500)
}
