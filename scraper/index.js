/**
 * scraper/index.js
 * Orquestador del Radar Subvenciones.
 * Uso: node scraper/index.js [--fuente=boe|bdns|todas]
 */

import { createClient } from '@supabase/supabase-js';
import { scrapearBOE }  from './fuente-boe.js';
import { scrapearBDNS } from './fuente-bdns.js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan variables de entorno PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fuenteArg = process.argv.find(a => a.startsWith('--fuente='))?.split('=')[1] ?? 'todas';

async function upsertSubvenciones(subvenciones) {
  if (subvenciones.length === 0) return;

  // Obtener URLs existentes para no duplicar
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

  const CHUNK = 50;
  let insertadas = 0;
  for (let i = 0; i < nuevas.length; i += CHUNK) {
    const chunk = nuevas.slice(i, i + CHUNK);
    const { error } = await supabase.from('subvenciones').insert(chunk);
    if (error) {
      console.error(`Error insertando chunk: ${error.message}`);
    } else {
      insertadas += chunk.length;
    }
  }

  console.log(`✓ ${insertadas} subvenciones insertadas.`);
}

async function marcarExpiradas() {
  const hoy = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('subvenciones')
    .update({ activa: false })
    .lt('fecha_cierre', hoy)
    .eq('activa', true);

  if (error) console.warn(`Error marcando expiradas: ${error.message}`);
  else console.log('Expiradas marcadas como inactivas.');
}

async function main() {
  console.log(`\n=== Radar Subvenciones — fuente: ${fuenteArg} ===\n`);

  const todas = [];

  if (fuenteArg === 'boe' || fuenteArg === 'todas') {
    const boe = await scrapearBOE();
    todas.push(...boe);
  }

  if (fuenteArg === 'bdns' || fuenteArg === 'todas') {
    const bdns = await scrapearBDNS();
    todas.push(...bdns);
  }

  await upsertSubvenciones(todas);
  await marcarExpiradas();

  console.log('\n=== Scraper finalizado ===');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
