/**
 * fuente-bdns.js
 * Base de Datos Nacional de Subvenciones (BDNS) via web scraping.
 * URL: https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const DELAY_MS = 2_000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const BASE = 'https://www.infosubvenciones.es';
const SEARCH_URL = `${BASE}/bdnstrans/GE/es/convocatorias`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
};

const SECTORES_BDNS = [
  '', // sin filtro = todos
  'Agricultura, pesca, alimentación',
  'Cultura y deporte',
  'Empleo',
  'Energía',
  'I+D+i',
  'Medio ambiente',
  'Turismo',
];

function inferirSectores(titulo = '', desc = '') {
  const t = (titulo + ' ' + desc).toLowerCase();
  const sectores = [];
  const map = {
    'autonomos':    ['autónomo', 'autonomo', 'emprendedor', 'cuenta propia'],
    'empresas':     ['empresa', 'pyme', 'sociedad', 'industria'],
    'agricultura':  ['agrícola', 'agricola', 'ganadería', 'ganaderia', 'rural', 'pesca', 'forestal'],
    'cultura':      ['cultura', 'patrimonio', 'artes', 'cine', 'teatro', 'música', 'musica'],
    'deporte':      ['deporte', 'deportiv'],
    'educacion':    ['educación', 'educacion', 'formación', 'formacion', 'beca', 'universidad'],
    'empleo':       ['empleo', 'contratación', 'contratacion', 'inserción laboral', 'desempleo'],
    'energia':      ['energía', 'energia', 'renovable', 'fotovoltaica', 'eficiencia energética', 'solar'],
    'innovacion':   ['innovación', 'innovacion', 'investigación', 'investigacion', 'i+d'],
    'medio-ambiente': ['medio ambiente', 'medioambiental', 'sostenibilidad', 'biodiversidad'],
    'ong':          ['entidad sin ánimo', 'asociación', 'asociacion', 'ong', 'fundación', 'fundacion'],
    'rehabilitacion': ['rehabilitación', 'rehabilitacion', 'vivienda', 'construcción'],
    'salud':        ['salud', 'sanitari', 'hospital', 'biomédica', 'biomedica'],
    'tecnologia':   ['tecnología', 'tecnologia', 'digital', 'digitalización', 'software'],
    'turismo':      ['turismo', 'hostelería', 'hosteleria', 'hotel'],
  };
  for (const [slug, kws] of Object.entries(map)) {
    if (kws.some(kw => t.includes(kw))) sectores.push(slug);
  }
  return sectores.length > 0 ? sectores : ['empresas'];
}

const CCAA_MAP = {
  'andalucía': 'andalucia', 'aragón': 'aragon', 'asturias': 'asturias',
  'illes balears': 'baleares', 'canarias': 'canarias', 'cantabria': 'cantabria',
  'castilla - la mancha': 'castilla-la-mancha', 'castilla y león': 'castilla-y-leon',
  'cataluña': 'cataluna', 'comunitat valenciana': 'comunidad-valenciana',
  'extremadura': 'extremadura', 'galicia': 'galicia', 'la rioja': 'la-rioja',
  'comunidad de madrid': 'madrid', 'región de murcia': 'murcia',
  'comunidad foral de navarra': 'navarra', 'país vasco': 'pais-vasco',
  'ceuta': 'nacional', 'melilla': 'nacional', 'estatal': 'nacional',
};

function normalizarCCAA(texto = '') {
  const t = texto.toLowerCase().trim();
  return CCAA_MAP[t] ?? 'nacional';
}

async function scrapearPagina(pagina = 0) {
  try {
    const { data } = await axios.get(SEARCH_URL, {
      params: { pagina, tamanoPagina: 25 },
      headers: HEADERS,
      timeout: 20_000,
    });

    const $ = cheerio.load(data);
    const resultados = [];

    // La tabla de resultados del BDNS
    $('table tbody tr, .convocatoria-item, .resultado-item').each((_, el) => {
      const celdas = $(el).find('td');
      if (celdas.length < 3) return;

      const titulo    = $(celdas[0]).text().trim() || $(el).find('.titulo, h3, h4').first().text().trim();
      const organismo = $(celdas[1]).text().trim() || $(el).find('.organismo').first().text().trim();
      const enlace    = $(celdas[0]).find('a').attr('href') || $(el).find('a').first().attr('href') || '';
      const fechaText = $(celdas[2]).text().trim() || $(el).find('.fecha').first().text().trim();
      const importe   = $(celdas[3])?.text().trim() || '';

      if (!titulo || titulo.length < 5) return;

      const url = enlace.startsWith('http') ? enlace : (enlace ? `${BASE}${enlace}` : '');

      let fechaPub = null;
      const mFecha = fechaText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (mFecha) {
        fechaPub = `${mFecha[3]}-${mFecha[2].padStart(2,'0')}-${mFecha[1].padStart(2,'0')}`;
      }

      resultados.push({
        titulo,
        organismo,
        descripcion:   '',
        importe_texto: importe || null,
        fecha_pub:     fechaPub,
        fecha_cierre:  null,
        plazo_texto:   null,
        url:           url || SEARCH_URL,
        tipo:          'convocatoria',
        sector:        inferirSectores(titulo, ''),
        ccaa:          [normalizarCCAA(organismo)],
        fuente:        'BDNS',
      });
    });

    return resultados;
  } catch (err) {
    console.warn(`[BDNS] Error página ${pagina}: ${err.message}`);
    return [];
  }
}

export async function scrapearBDNS() {
  console.log('[BDNS] Iniciando scraping...');
  const todos = [];

  for (let pagina = 0; pagina < 8; pagina++) {
    console.log(`[BDNS] Página ${pagina + 1}/8...`);
    const resultados = await scrapearPagina(pagina);
    if (resultados.length === 0 && pagina > 0) break;
    todos.push(...resultados);
    await sleep(DELAY_MS);
  }

  const seen = new Set();
  const unicos = todos.filter(c => {
    const key = c.url + c.titulo.slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).filter(c => c.titulo.trim() !== '');

  console.log(`[BDNS] ${unicos.length} convocatorias encontradas.`);
  return unicos;
}
