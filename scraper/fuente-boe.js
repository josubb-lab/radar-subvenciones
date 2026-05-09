/**
 * fuente-boe.js
 * Extrae convocatorias de subvenciones del BOE via RSS oficial.
 */

import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';

const DELAY_MS = 1_200;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const rssParser = new Parser({
  timeout: 15_000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
});

// RSS feeds oficiales del BOE
const BOE_RSS_FEEDS = [
  'https://www.boe.es/rss/boe.php',
  'https://www.boe.es/rss/boed.php',
];

const KEYWORDS_SUBVENCION = [
  'subvenci', 'convocatoria', 'ayuda', 'beca', 'prestaci',
  'extracto', 'bases reguladoras', 'programa de apoyo',
];

const KEYWORDS_EXCLUIR = [
  'oposici', 'proceso selectivo', 'concurso de traslado',
  'relación de puestos', 'personal laboral',
];

function esSubvencion(titulo = '', desc = '') {
  const t = (titulo + ' ' + desc).toLowerCase();
  return (
    KEYWORDS_SUBVENCION.some(kw => t.includes(kw)) &&
    !KEYWORDS_EXCLUIR.some(kw => t.includes(kw))
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
  'andalucia':           ['andalucía', 'andalucia', 'junta de andalucía'],
  'aragon':              ['aragón', 'aragon'],
  'asturias':            ['asturias', 'principado de asturias'],
  'baleares':            ['baleares', 'illes balears'],
  'canarias':            ['canarias'],
  'cantabria':           ['cantabria'],
  'castilla-la-mancha':  ['castilla-la mancha', 'castilla la mancha'],
  'castilla-y-leon':     ['castilla y león', 'castilla y leon'],
  'cataluna':            ['cataluña', 'cataluna', 'catalunya', 'generalitat de cataluña'],
  'comunidad-valenciana':['comunitat valenciana', 'comunidad valenciana', 'generalitat valenciana'],
  'extremadura':         ['extremadura'],
  'galicia':             ['galicia', 'xunta de galicia'],
  'la-rioja':            ['la rioja'],
  'madrid':              ['comunidad de madrid', 'región de madrid'],
  'murcia':              ['región de murcia', 'murcia'],
  'navarra':             ['navarra', 'foral de navarra'],
  'pais-vasco':          ['país vasco', 'pais vasco', 'euskadi'],
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

export async function scrapearBOE() {
  console.log('[BOE] Iniciando búsqueda via RSS...');
  const todos = [];

  for (const feedUrl of BOE_RSS_FEEDS) {
    try {
      console.log(`[BOE] Procesando: ${feedUrl}`);
      const feed = await rssParser.parseURL(feedUrl);
      const items = feed.items ?? [];
      console.log(`[BOE] ${items.length} items en el feed`);

      for (const item of items) {
        const titulo = item.title ?? '';
        const desc   = item.contentSnippet ?? item.content ?? '';
        const texto  = `${titulo} ${desc}`;

        if (!esSubvencion(titulo, desc)) continue;

        const url = item.link ?? '';
        if (!url) continue;

        todos.push({
          titulo,
          organismo:     extraerOrganismo(titulo),
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
    } catch (err) {
      console.warn(`[BOE] Error en ${feedUrl}: ${err.message}`);
    }
  }

  const seen = new Set();
  const unicos = todos.filter(d => {
    if (!d.url || seen.has(d.url)) return false;
    seen.add(d.url);
    return true;
  });

  console.log(`[BOE] ${unicos.length} subvenciones encontradas.`);
  return unicos;
}

function extraerOrganismo(titulo = '') {
  // Patrón BOE: "Extracto de la Orden de ... por el que se convocan..."
  const m = titulo.match(/(?:Orden|Resolución|Real Decreto)[^,]*(?:de|del?)\s+(.+?)(?:\s+por|\s+que|\s*,)/i);
  return m ? m[1].trim() : '';
}
