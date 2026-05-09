/**
 * fuente-boe.js
 * Extrae convocatorias de subvenciones del BOE usando la API JSON oficial.
 * API: https://www.boe.es/buscar/api/
 */

import axios from 'axios';

const DELAY_MS = 1_200;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const TERMINOS_SUBVENCION = [
  'convocatoria subvenciones',
  'convocatoria ayudas',
  'extracto convocatoria subvenciones',
  'bases reguladoras subvenciones',
  'concesion directa subvenciones',
  'programa de ayudas',
  'orden de ayudas',
  'convocatoria de becas',
  'convocatoria de prestaciones',
];

function clasificarTipo(titulo = '') {
  const t = titulo.toLowerCase();
  if (t.includes('extracto')) return 'extracto';
  if (t.includes('bases reguladoras')) return 'bases';
  if (t.includes('resoluci')) return 'resolucion';
  return 'convocatoria';
}

function extraerImporte(texto = '') {
  const match = texto.match(/(\d[\d.,]*)\s*(millones?|mill\.?|€|euros?|M€)/i);
  if (!match) return null;
  return match[0].trim();
}

function extraerFechaCierre(texto = '') {
  const patterns = [
    /plazo[^.]*hasta el (\d{1,2} de \w+ de \d{4})/i,
    /hasta el (\d{1,2} de \w+ de \d{4})/i,
    /plazo[^.]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ];
  for (const p of patterns) {
    const m = texto.match(p);
    if (m) return m[1];
  }
  return null;
}

async function buscarEnBOE(termino) {
  const url = 'https://www.boe.es/buscar/api/boe.json';
  try {
    const { data } = await axios.get(url, {
      params: { q: termino, sort_field: 'fecha_publicacion', sort_order: 'desc', page_size: 30 },
      timeout: 15_000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
    });

    const documentos = data?.response?.docs ?? [];
    return documentos.map(doc => ({
      titulo:       doc.titulo ?? '',
      organismo:    doc.departamento ?? doc.organo ?? '',
      descripcion:  doc.texto?.slice(0, 500) ?? '',
      importe_texto: extraerImporte(doc.texto ?? ''),
      fecha_pub:    doc.fecha_publicacion ? doc.fecha_publicacion.slice(0, 10) : null,
      plazo_texto:  extraerFechaCierre(doc.texto ?? ''),
      url:          doc.url_pdf ? `https://www.boe.es${doc.url_pdf}` : `https://www.boe.es/boe/dias/${doc.fecha_publicacion?.slice(0,4)}/${doc.fecha_publicacion?.slice(5,7)}/${doc.fecha_publicacion?.slice(8,10)}/index.php?s=1#${doc.id}`,
      tipo:         clasificarTipo(doc.titulo ?? ''),
      sector:       [],
      ccaa:         inferirCCAA(doc.titulo + ' ' + (doc.departamento ?? '')),
      fuente:       'BOE',
    }));
  } catch (err) {
    console.warn(`[BOE] Error («${termino}»): ${err.message}`);
    return [];
  }
}

const CCAA_KEYWORDS = {
  'andalucia':           ['andalucía', 'andalucia', 'junta de andalucía', 'junta de andalucia'],
  'aragon':              ['aragón', 'aragon', 'gobierno de aragón'],
  'asturias':            ['asturias', 'principado de asturias'],
  'baleares':            ['baleares', 'illes balears', 'islas baleares'],
  'canarias':            ['canarias', 'gobierno de canarias'],
  'cantabria':           ['cantabria', 'gobierno de cantabria'],
  'castilla-la-mancha':  ['castilla-la mancha', 'castilla la mancha', 'junta de comunidades'],
  'castilla-y-leon':     ['castilla y león', 'castilla y leon', 'junta de castilla'],
  'cataluna':            ['cataluña', 'cataluna', 'catalunya', 'generalitat de cataluña', 'generalitat de catalunya'],
  'comunidad-valenciana':['comunitat valenciana', 'comunidad valenciana', 'generalitat valenciana'],
  'extremadura':         ['extremadura', 'junta de extremadura'],
  'galicia':             ['galicia', 'xunta de galicia'],
  'la-rioja':            ['la rioja', 'gobierno de la rioja'],
  'madrid':              ['comunidad de madrid', 'región de madrid'],
  'murcia':              ['región de murcia', 'region de murcia', 'comunidad autónoma de murcia'],
  'navarra':             ['navarra', 'foral de navarra', 'comunidad foral'],
  'pais-vasco':          ['país vasco', 'pais vasco', 'euskadi', 'gobierno vasco'],
};

function inferirCCAA(texto = '') {
  const t = texto.toLowerCase();
  const ccaaEncontradas = [];
  for (const [slug, keywords] of Object.entries(CCAA_KEYWORDS)) {
    if (keywords.some(kw => t.includes(kw))) {
      ccaaEncontradas.push(slug);
    }
  }
  return ccaaEncontradas.length > 0 ? ccaaEncontradas : ['nacional'];
}

export async function scrapearBOE() {
  console.log('[BOE] Iniciando búsqueda de subvenciones...');
  const todos = [];

  for (const termino of TERMINOS_SUBVENCION) {
    console.log(`[BOE] Buscando: "${termino}"`);
    const docs = await buscarEnBOE(termino);
    todos.push(...docs);
    await sleep(DELAY_MS);
  }

  const seen = new Set();
  const unicos = todos.filter(d => {
    if (!d.url || seen.has(d.url)) return false;
    seen.add(d.url);
    return true;
  });

  console.log(`[BOE] ${unicos.length} subvenciones únicas encontradas.`);
  return unicos;
}
