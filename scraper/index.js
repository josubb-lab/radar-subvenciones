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

  // Test de conexión con fetch directo (bypasa el cliente JS)
  const testUrl = `https://test-diagnostico-${Date.now()}.internal`;
  const rawRes = await fetch(`${SUPABASE_URL}/rest/v1/subvenciones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ titulo: 'diagnostico', url: testUrl }),
  });
  const rawText = await rawRes.text();
  console.log(`[TEST] Status: ${rawRes.status} | Body: ${rawText.slice(0, 300)}`);
  if (!rawRes.ok) {
    console.error('ERROR: insert directo fallido. Abortando.');
    return;
  }
  await fetch(`${SUPABASE_URL}/rest/v1/subvenciones?url=eq.${encodeURIComponent(testUrl)}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  console.log('✓ Conexión Supabase OK');

  // Obtener URLs existentes para no duplicar
  const { data: existentes, error: selErr } = await supabase
    .from('subvenciones')
    .select('url');
  if (selErr) console.warn('Advertencia select:', selErr.message);

  const urlsExistentes = new Set((existentes ?? []).map(r => r.url));
  const nuevas = subvenciones.filter(s => s.url && !urlsExistentes.has(s.url));

  if (nuevas.length === 0) {
    console.log('Sin subvenciones nuevas.');
    return;
  }

  console.log(`Insertando ${nuevas.length} subvenciones nuevas...`);
  console.log('Muestra primer item:', JSON.stringify(nuevas[0]).slice(0, 200));

  const CHUNK = 20;
  let insertadas = 0;
  for (let i = 0; i < nuevas.length; i += CHUNK) {
    const chunk = nuevas.slice(i, i + CHUNK);
    const { error } = await supabase.from('subvenciones').insert(chunk);
    if (error) {
      console.error(`Error chunk ${i/CHUNK+1}: ${error.message} | code: ${error.code}`);
      if (i === 0) console.error('Primer item fallido:', JSON.stringify(chunk[0]).slice(0, 300));
    } else {
      insertadas += chunk.length;
    }
  }

  console.log(`✓ ${insertadas} subvenciones insertadas.`);
}

async function marcarExpiradas() {
  const hoy = new Date().toISOString().slice(0, 10);
  // Seleccionar IDs expiradas primero (lt excluye nulls en PostgreSQL)
  const { data: expiradas } = await supabase
    .from('subvenciones')
    .select('id')
    .eq('activa', true)
    .lt('fecha_cierre', hoy);

  if (!expiradas || expiradas.length === 0) {
    console.log('Sin subvenciones expiradas.');
    return;
  }

  const ids = expiradas.map(r => r.id);
  const { error } = await supabase
    .from('subvenciones')
    .update({ activa: false })
    .in('id', ids);

  if (error) console.warn(`Error marcando expiradas: ${error.message}`);
  else console.log(`${ids.length} expiradas marcadas como inactivas.`);
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
