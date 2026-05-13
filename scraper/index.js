/**
 * scraper/index.js
 * Guarda subvenciones en la tabla 'subvenciones' con todos los campos clasificados.
 */

import { createClient } from '@supabase/supabase-js';
import { enrichSubvencion, mapSubvencionToDbRow, recogerSubvenciones } from './motor.js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_KEY');
  process.exit(1);
}

console.log('URL:', SUPABASE_URL);
console.log('KEY length:', SUPABASE_KEY?.length, '| starts:', SUPABASE_KEY?.slice(0, 10));

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const fuenteArg = process.argv.find(a => a.startsWith('--fuente='))?.split('=')[1] ?? 'todas';

async function upsertSubvenciones(subvenciones) {
  if (subvenciones.length === 0) return;

  const rows = subvenciones
    .filter(s => s.url)
    .map(mapSubvencionToDbRow);

  if (rows.length === 0) return;
  console.log(`Procesando ${rows.length} subvenciones...`);

  const CHUNK = 50;
  let insertadas = 0;
  let errores = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subvenciones?on_conflict=url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal,resolution=merge-duplicates',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const msg = await res.text();
      errores += 1;
      console.error(`Error chunk ${i/CHUNK+1}: ${res.status} | ${msg.slice(0, 200)}`);
    } else {
      insertadas += chunk.length;
    }
  }

  if (errores > 0) {
    throw new Error(`Upsert incompleto: ${errores} chunks fallaron y solo ${insertadas}/${rows.length} filas se insertaron.`);
  }

  if (insertadas === 0 && rows.length > 0) {
    throw new Error('Upsert fallido: no se insertó ninguna subvención.');
  }

  console.log(`✓ ${insertadas} subvenciones insertadas.`);
}

async function marcarExpiradas() {
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: expiradas } = await supabase
    .from('subvenciones')
    .select('id')
    .eq('activa', true)
    .lt('fecha_cierre', hoy);

  if (!expiradas || expiradas.length === 0) return;

  const ids = expiradas.map(r => r.id);
  const { error } = await supabase
    .from('subvenciones')
    .update({ activa: false })
    .in('id', ids);

  if (error) console.warn(`Error marcando expiradas: ${error.message}`);
  else console.log(`${ids.length} subvenciones marcadas como inactivas.`);
}

async function publicarEnTelegram(subvenciones) {
  const TOKEN   = process.env.TELEGRAM_TOKEN;
  const CHANNEL = process.env.TELEGRAM_CHANNEL;
  if (!TOKEN || !CHANNEL) return;

  const top = subvenciones
    .map(item => enrichSubvencion(item))
    .filter(s => s.titulo && s.url)
    .sort((a, b) => {
      const prio = { Alta: 3, Media: 2, Baja: 1 };
      return (prio[b.prioridad] - prio[a.prioridad]) ||
        String(b.fecha_publicacion).localeCompare(String(a.fecha_publicacion));
    })
    .slice(0, 5);

  if (top.length === 0) return;

  const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  let msg = `📢 *Nuevas subvenciones — ${fecha}*\n\n`;
  top.forEach((s, i) => {
    const titulo = s.titulo.slice(0, 100).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    const ccaa   = s.ccaa?.[0] ? ` · ${s.ccaa[0]}` : '';
    msg += `*${i + 1}\\. ${titulo}*${ccaa}\n[Ver convocatoria](${s.url})\n\n`;
  });
  msg += `🔍 [Ver todas en radar\\-subvenciones\\.es](https://radar-subvenciones.es)`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHANNEL, text: msg, parse_mode: 'MarkdownV2', disable_web_page_preview: false }),
    });
    if (res.ok) console.log('✓ Telegram: mensaje publicado.');
    else console.warn('Telegram error:', await res.text());
  } catch (e) {
    console.warn('Telegram error:', e.message);
  }
}

async function main() {
  console.log(`\n=== Radar Subvenciones — fuente: ${fuenteArg} ===\n`);

  const todas = await recogerSubvenciones({ fuente: fuenteArg });

  await upsertSubvenciones(todas);
  await marcarExpiradas();
  await publicarEnTelegram(todas);
  console.log('\n=== Scraper finalizado ===');
}

main().catch(err => { console.error('Error fatal:', err); process.exit(1); });
