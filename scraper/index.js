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

  const { data: existentes } = await supabase
    .from('subvenciones')
    .select('url');

  const urlsExistentes = new Set((existentes ?? []).map(r => r.url));
  const nuevas = subvenciones.filter(s => s.url && !urlsExistentes.has(s.url));

  if (nuevas.length === 0) {
    console.log('Sin subvenciones nuevas.');
    return;
  }

  console.log(`Insertando ${nuevas.length} subvenciones nuevas...`);

  const rows = nuevas.map(s => ({
    titulo:        s.titulo,
    organismo:     s.organismo || null,
    descripcion:   s.descripcion?.slice(0, 1000) || null,
    importe_texto: s.importe_texto || null,
    fecha_pub:     s.fecha_pub || null,
    fecha_cierre:  s.fecha_cierre || null,
    plazo_texto:   s.plazo_texto || null,
    url:           s.url,
    tipo:          s.tipo || 'convocatoria',
    sector:        s.sector?.length > 0 ? s.sector : [],
    ccaa:          s.ccaa?.length > 0 ? s.ccaa : ['nacional'],
    fuente:        s.fuente || 'BOE',
    activa:        true,
  }));

  const CHUNK = 50;
  let insertadas = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subvenciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
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

async function main() {
  console.log(`\n=== Radar Subvenciones — fuente: ${fuenteArg} ===\n`);

  const todas = [];
  if (fuenteArg === 'boe'  || fuenteArg === 'todas') todas.push(...await scrapearBOE());
  if (fuenteArg === 'bdns' || fuenteArg === 'todas') todas.push(...await scrapearBDNS());

  await upsertSubvenciones(todas);
  console.log('\n=== Scraper finalizado ===');
}

main().catch(err => { console.error('Error fatal:', err); process.exit(1); });
