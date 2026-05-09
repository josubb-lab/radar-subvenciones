/**
 * fuente-boe.js
 * Busca convocatorias del BOE via Google News RSS.
 */

import Parser from 'rss-parser';

const DELAY_MS = 1_400;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const rssParser = new Parser({
  timeout: 20_000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
});

const QUERIES = [
  'extracto convocatoria subvenciones BOE site:boe.es',
  'convocatoria subvenciones ayudas BOE España 2025',
  'extracto orden subvenciones ministerio BOE',
  'bases reguladoras subvenciones BOE convocatoria',
  'convocatoria becas ayudas BOE resolución',
  'programa ayudas subvenciones gobierno España BOE',
  'real decreto subvenciones convocatoria BOE España',
  'orden subvenciones autónomos empresas BOE España',
  'subvenciones energía renovable convocatoria BOE',
  'ayudas digitalización empresas pymes BOE convocatoria',
  'subvenciones cultura deporte BOE convocatoria',
  'ayudas empleo contratación BOE convocatoria',
];

const KEYWORDS_OK = [
  'subvenci', 'convocatoria', 'ayuda', 'beca', 'extracto', 'bases reguladoras',
];
const KEYWORDS_NOK = [
  'oposici', 'proceso selectivo', 'concurso traslado', 'personal laboral',
  'declaración', 'nombramiento', 'cese', 'resolución de recurso',
];

function esRelevante(titulo = '', desc = '') {
  const t = (titulo + ' ' + desc).toLowerCase();
  return (
    KEYWORDS_OK.some(kw => t.includes(kw)) &&
    !KEYWORDS_NOK.some(kw => t.includes(kw))
  );
}

function clasificarTipo(titulo = '') {
  const t = titulo.toLowerCase();
  if (t.includes('extracto')) return 'extracto';
  if (t.includes('bases reguladoras')) return 'bases';
  if (t.includes('resoluci')) return 'resolucion';
  return 'convocatoria';
}

const CCAA_KEYWORDS = {
  'andalucia':            ['andalucía', 'andalucia', 'junta de andalucía'],
  'aragon':               ['aragón', 'aragon'],
  'asturias':             ['asturias'],
  'baleares':             ['baleares', 'illes balears'],
  'canarias':             ['canarias'],
  'cantabria':            ['cantabria'],
  'castilla-la-mancha':   ['castilla-la mancha', 'castilla la mancha'],
  'castilla-y-leon':      ['castilla y león', 'castilla y leon'],
  'cataluna':             ['cataluña', 'cataluna', 'catalunya'],
  'comunidad-valenciana': ['comunitat valenciana', 'comunidad valenciana'],
  'extremadura':          ['extremadura'],
  'galicia':              ['galicia'],
  'la-rioja':             ['la rioja'],
  'madrid':               ['comunidad de madrid', 'región de madrid'],
  'murcia':               ['región de murcia', 'murcia'],
  'navarra':              ['navarra'],
  'pais-vasco':           ['país vasco', 'pais vasco', 'euskadi'],
};

function inferirCCAA(texto = '') {
  const t = texto.toLowerCase();
  const encontradas = [];
  for (const [slug, kws] of Object.entries(CCAA_KEYWORDS)) {
    if (kws.some(kw => t.includes(kw))) encontradas.push(slug);
  }
  return encontradas.length > 0 ? encontradas : ['nacional'];
}

function extraerImporte(texto = '') {
  const m = texto.match(/(\d[\d.,]*)\s*(millones?|mill\.?|€|euros?|M€)/i);
  return m ? m[0].trim() : null;
}

async function fetchGoogleNews(query) {
  const url = 'https://news.google.com/rss/search?' +
    new URLSearchParams({ q: query, hl: 'es', gl: 'ES', ceid: 'ES:es' });
  try {
    const feed = await rssParser.parseURL(url);
    return feed.items ?? [];
  } catch (err) {
    console.warn(`[BOE] Error («${query.slice(0, 50)}»): ${err.message}`);
    return [];
  }
}

export async function scrapearBOE() {
  console.log('[BOE] Iniciando búsqueda via Google News...');
  const todos = [];
  let total = 0;

  for (const query of QUERIES) {
    const items = await fetchGoogleNews(query);
    total += items.length;

    for (const item of items) {
      const titulo = item.title ?? '';
      const desc   = item.contentSnippet ?? item.content ?? '';
      const texto  = `${titulo} ${desc}`;

      if (!esRelevante(titulo, desc)) continue;

      const url = item.link ?? '';
      if (!url) continue;

      todos.push({
        titulo,
        organismo:     '',
        descripcion:   desc.slice(0, 500),
        importe_texto: extraerImporte(texto),
        fecha_pub:     item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 10) : null,
        fecha_cierre:  null,
        plazo_texto:   null,
        url,
        tipo:          clasificarTipo(titulo),
        sector:        [],
        ccaa:          inferirCCAA(texto),
        fuente:        'BOE',
      });
    }

    await sleep(DELAY_MS);
  }

  const seen = new Set();
  const unicos = todos.filter(d => {
    if (!d.url || seen.has(d.url)) return false;
    seen.add(d.url);
    return true;
  });

  console.log(`[BOE] ${unicos.length} subvenciones encontradas (de ${total} items).`);
  return unicos;
}
