/**
 * scraper/index.js
 * Guarda subvenciones en la tabla 'subvenciones' con todos los campos clasificados.
 */

import { createClient } from '@supabase/supabase-js';
import { scrapearBOE }  from './fuente-boe.js';
import { scrapearBDNS } from './fuente-bdns.js';

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
    .map(s => ({
      titulo:        s.titulo,
      organismo:     s.organismo || null,
      descripcion:   s.descripcion?.slice(0, 1000) || null,
      importe_texto: s.importe_texto || null,
      fecha_pub:     s.fecha_pub || null,
      fecha_cierre:  s.fecha_cierre || null,
      url:           s.url,
      tipo:          s.tipo || 'convocatoria',
      sector:        s.sector?.length > 0 ? s.sector : [],
      ccaa:          s.ccaa?.length > 0 ? s.ccaa : ['nacional'],
      fuente:        s.fuente || 'BOE',
      activa:        true,
    }));

  if (rows.length === 0) return;
  console.log(`Procesando ${rows.length} subvenciones...`);

  const CHUNK = 50;
  let insertadas = 0;
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
      console.error(`Error chunk ${i/CHUNK+1}: ${res.status} | ${msg.slice(0, 200)}`);
    } else {
      insertadas += chunk.length;
    }
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
    .filter(s => s.titulo && s.url)
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

  const todas = [];
  if (fuenteArg === 'boe'  || fuenteArg === 'todas') todas.push(...await scrapearBOE());
  if (fuenteArg === 'bdns' || fuenteArg === 'todas') todas.push(...await scrapearBDNS());

  await upsertSubvenciones(todas);
  await marcarExpiradas();
  await publicarEnTelegram(todas);
  console.log('\n=== Scraper finalizado ===');
}

main().catch(err => { console.error('Error fatal:', err); process.exit(1); });
