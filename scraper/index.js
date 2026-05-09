/**
 * scraper/index.js
 * Guarda subvenciones en la tabla hallazgos con nicho='subvenciones'.
 */

import { createClient } from '@supabase/supabase-js';
import { scrapearBOE }  from './fuente-boe.js';
import { scrapearBDNS } from './fuente-bdns.js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_KEY');
  process.exit(1);
}

console.log('URL:', SUPABASE_URL);
console.log('KEY length:', SUPABASE_KEY?.length, '| starts:', SUPABASE_KEY?.slice(0, 10));

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const NICHO   = 'subvenciones';
const fuenteArg = process.argv.find(a => a.startsWith('--fuente='))?.split('=')[1] ?? 'todas';

async function upsertSubvenciones(subvenciones) {
  if (subvenciones.length === 0) return;

  const { data: existentes } = await supabase
    .from('hallazgos')
    .select('url')
    .eq('nicho', NICHO);

  const urlsExistentes = new Set((existentes ?? []).map(r => r.url));
  const nuevas = subvenciones.filter(s => s.url && !urlsExistentes.has(s.url));

  if (nuevas.length === 0) {
    console.log('Sin subvenciones nuevas.');
    return;
  }

  console.log(`Insertando ${nuevas.length} subvenciones nuevas...`);

  const rows = nuevas.map(s => ({
    nicho:       NICHO,
    titulo:      s.titulo,
    descripcion: [s.importe_texto, s.organismo, s.descripcion].filter(Boolean).join(' | ').slice(0, 500),
    fuente:      s.fuente ?? 'BOE',
    fecha:       s.fecha_pub ?? null,
    url:         s.url,
    puntos:      10,
  }));

  const CHUNK = 50;
  let insertadas = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from('hallazgos').insert(rows.slice(i, i + CHUNK));
    if (error) console.error(`Error chunk ${i/CHUNK+1}: ${error.message}`);
    else insertadas += Math.min(CHUNK, rows.length - i);
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
