import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

const FALLBACK_EMAIL = 'josue@benchdatalab.com'

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fallbackResponse() {
  return json({ ok: true, fallback: true, contact_email: FALLBACK_EMAIL })
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

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY
  if (!supabaseUrl || !supabaseKey) return fallbackResponse()

  const supabase = createClient(supabaseUrl, supabaseKey)

  const lead = {
    nombre,
    empresa,
    email,
    tipo_despacho: tipoDespacho,
    clientes,
    interes,
    origen: 'web-b2b',
  }

  try {
    const { error } = await supabase
      .from('leads_asesorias')
      .insert(lead)

    if (!error) return json({ ok: true })

    console.warn('[lead-asesoria] Supabase insert error', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })

    // Duplicado: tratamos la solicitud como recibida.
    if (error.code === '23505') return json({ ok: true, duplicate: true })

    // Si falla la tabla específica, intentamos un fallback blando en suscriptores.
    if (error.code === '42P01') {
      const { error: fallbackError } = await supabase
        .from('suscriptores')
        .insert({ email })

      if (!fallbackError || fallbackError.code === '23505') {
        return fallbackResponse()
      }
    }

    // Cualquier problema operativo de Supabase no debe romper el formulario.
    const message = String(error.message || '').toLowerCase()
    const isOperationalFailure =
      error.code !== '23505' &&
      (
        error.code === '42P01' ||
        message.includes('schema cache') ||
        message.includes('could not find the table') ||
        message.includes('relation') ||
        message.includes('does not exist') ||
        message.includes('failed to reach') ||
        message.includes('network') ||
        message.includes('timeout')
      )

    if (isOperationalFailure) return fallbackResponse()
    return fallbackResponse()
  } catch {
    return fallbackResponse()
  }
}
