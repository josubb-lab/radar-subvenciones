import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

export const POST: APIRoute = async ({ request }) => {
  let email: string
  try {
    ;({ email } = await request.json())
  } catch {
    return new Response(JSON.stringify({ error: 'Petición inválida' }), { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Email no válido' }), { status: 400 })
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_KEY,
  )

  const { error } = await supabase
    .from('suscriptores')
    .insert({ email: email.toLowerCase().trim() })

  if (error && error.code !== '23505') {
    return new Response(JSON.stringify({ error: error.message, code: error.code }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
