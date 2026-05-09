import Parser from 'rss-parser';

const DELAY_MS = 1_400;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const rssParser = new Parser({
  timeout: 20_000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
});

// Cada query lleva su CCAA implícita (null = nacional/detectar por texto)
const QUERIES = [
  { q: 'extracto convocatoria subvenciones BOE site:boe.es',             ccaa: null },
  { q: 'convocatoria subvenciones ayudas BOE España 2025',               ccaa: null },
  { q: 'extracto orden subvenciones ministerio BOE',                     ccaa: null },
  { q: 'bases reguladoras subvenciones BOE convocatoria',                ccaa: null },
  { q: 'convocatoria becas ayudas BOE resolución',                       ccaa: null },
  { q: 'programa ayudas subvenciones gobierno España BOE',               ccaa: null },
  { q: 'real decreto subvenciones convocatoria BOE España',              ccaa: null },
  { q: 'orden subvenciones autónomos empresas BOE España',               ccaa: null },
  { q: 'subvenciones energía renovable convocatoria BOE',                ccaa: null },
  { q: 'ayudas digitalización empresas pymes BOE convocatoria',          ccaa: null },
  { q: 'subvenciones cultura deporte BOE convocatoria',                  ccaa: null },
  { q: 'ayudas empleo contratación BOE convocatoria',                    ccaa: null },
  { q: 'convocatoria subvenciones ayudas "Junta de Andalucía"',          ccaa: 'andalucia' },
  { q: 'convocatoria subvenciones ayudas BOJA Andalucía',                ccaa: 'andalucia' },
  { q: 'convocatoria subvenciones ayudas "Gobierno de Aragón"',          ccaa: 'aragon' },
  { q: 'convocatoria subvenciones ayudas "Principado de Asturias"',      ccaa: 'asturias' },
  { q: 'convocatoria subvenciones ayudas "Govern Illes Balears"',        ccaa: 'baleares' },
  { q: 'convocatoria subvenciones ayudas "Gobierno de Canarias"',        ccaa: 'canarias' },
  { q: 'convocatoria subvenciones ayudas "Gobierno de Cantabria"',       ccaa: 'cantabria' },
  { q: 'convocatoria subvenciones ayudas "Junta de Castilla-La Mancha"', ccaa: 'castilla-la-mancha' },
  { q: 'convocatoria subvenciones ayudas "Junta de Castilla y León"',    ccaa: 'castilla-y-leon' },
  { q: 'convocatoria subvenciones ayudas "Generalitat de Catalunya"',    ccaa: 'cataluna' },
  { q: 'convocatoria subvenciones ayudas DOGC Catalunya',                ccaa: 'cataluna' },
  { q: 'convocatoria subvenciones ayudas "Generalitat Valenciana"',      ccaa: 'comunidad-valenciana' },
  { q: 'convocatoria subvenciones ayudas "Junta de Extremadura"',        ccaa: 'extremadura' },
  { q: 'convocatoria subvenciones ayudas "Xunta de Galicia"',            ccaa: 'galicia' },
  { q: 'convocatoria subvenciones ayudas "Gobierno de La Rioja"',        ccaa: 'la-rioja' },
  { q: 'convocatoria subvenciones ayudas "Comunidad de Madrid"',         ccaa: 'madrid' },
  { q: 'convocatoria subvenciones ayudas "Región de Murcia"',            ccaa: 'murcia' },
  { q: 'convocatoria subvenciones ayudas "Gobierno de Navarra"',         ccaa: 'navarra' },
  { q: 'convocatoria subvenciones ayudas "Gobierno Vasco" OR Euskadi',   ccaa: 'pais-vasco' },
];

const KEYWORDS_OK  = ['subvenci', 'convocatoria', 'ayuda', 'beca', 'extracto', 'bases reguladoras'];
const KEYWORDS_NOK = ['oposici', 'proceso selectivo', 'concurso traslado', 'personal laboral',
                      'declaración', 'nombramiento', 'cese', 'resolución de recurso'];

function esRelevante(titulo = '', desc = '') {
  const t = (titulo + ' ' + desc).toLowerCase();
  return KEYWORDS_OK.some(kw => t.includes(kw)) && !KEYWORDS_NOK.some(kw => t.includes(kw));
}

function clasificarTipo(titulo = '') {
  const t = titulo.toLowerCase();
  if (t.includes('extracto'))          return 'extracto';
  if (t.includes('bases reguladoras')) return 'bases';
  if (t.includes('resoluci'))          return 'resolucion';
  return 'convocatoria';
}

const SECTORES_MAP = {
  'autonomos':          ['autónomo', 'autonomo', 'emprendedor', 'cuenta propia', 'trabajador por cuenta', 'freelance'],
  'empresas':           ['empresa', 'pyme', 'sociedad', 'industria', 'comercio', 'negocio', 'mercantil'],
  'agricultura':        ['agrícola', 'agricola', 'ganadería', 'ganaderia', 'rural', 'pesca', 'forestal', 'acuicultura', 'regadío', 'viticultura'],
  'cultura':            ['cultura', 'patrimonio', 'artes', 'cine', 'teatro', 'música', 'musica', 'libro', 'editorial', 'audiovisual'],
  'deporte':            ['deporte', 'deportiv', 'olimp', 'atletism', 'federación deportiva'],
  'educacion':          ['educación', 'educacion', 'formación', 'formacion', 'beca', 'universidad', 'escolar', 'enseñanza', 'escuela', 'fp'],
  'empleo':             ['empleo', 'contratación', 'contratacion', 'inserción laboral', 'desempleo', 'laboral', 'trabajador', 'paro', 'erte'],
  'energia':            ['energía', 'energia', 'renovable', 'fotovoltaica', 'eficiencia energética', 'solar', 'eólica', 'biomasa', 'hidrógeno'],
  'innovacion':         ['innovación', 'innovacion', 'investigación', 'investigacion', 'i+d', 'startup', 'tecnológico', 'ciencia', 'r+d'],
  'internacionalizacion': ['internacionalización', 'internacionalizacion', 'exportación', 'exportacion', 'exterior', 'international'],
  'juventud':           ['juventud', 'joven', 'menor', 'infancia', 'adolescente'],
  'medio-ambiente':     ['medio ambiente', 'medioambiental', 'sostenibilidad', 'biodiversidad', 'residuos', 'contaminación', 'clima'],
  'ong':                ['entidad sin ánimo', 'asociación', 'asociacion', 'ong', 'fundación', 'fundacion', 'voluntariado', 'tercer sector'],
  'rehabilitacion':     ['rehabilitación', 'rehabilitacion', 'vivienda', 'edificio', 'construcción', 'alquiler', 'accesibilidad'],
  'salud':              ['salud', 'sanitari', 'hospital', 'biomédica', 'biomedica', 'farmac', 'médico', 'medico', 'enfermedad'],
  'tecnologia':         ['tecnología', 'tecnologia', 'digital', 'digitalización', 'software', 'inteligencia artificial', 'ia', 'ciberseguridad'],
  'turismo':            ['turismo', 'hostelería', 'hosteleria', 'hotel', 'alojamiento', 'turístico'],
};

function inferirSectores(titulo = '', desc = '') {
  const t = (titulo + ' ' + desc).toLowerCase();
  const sectores = [];
  for (const [slug, kws] of Object.entries(SECTORES_MAP)) {
    if (kws.some(kw => t.includes(kw))) sectores.push(slug);
  }
  return sectores; // vacío si no hay match — mejor que un default incorrecto
}

const CCAA_KEYWORDS = {
  'andalucia':            ['andalucía', 'andalucia', 'junta de andalucía', 'boja', 'sevilla', 'málaga', 'granada', 'córdoba'],
  'aragon':               ['aragón', 'aragon', 'zaragoza'],
  'asturias':             ['asturias', 'principado de asturias'],
  'baleares':             ['baleares', 'illes balears', 'mallorca', 'ibiza', 'menorca'],
  'canarias':             ['canarias', 'canaria', 'tenerife', 'gran canaria', 'las palmas'],
  'cantabria':            ['cantabria', 'santander'],
  'castilla-la-mancha':   ['castilla-la mancha', 'castilla la mancha', 'toledo', 'albacete', 'ciudad real'],
  'castilla-y-leon':      ['castilla y león', 'castilla y leon', 'valladolid', 'salamanca', 'burgos', 'ávila', 'segovia', 'soria', 'zamora'],
  'cataluna':             ['cataluña', 'cataluna', 'catalunya', 'generalitat', 'dogc', 'barcelona', 'girona', 'lleida', 'tarragona'],
  'comunidad-valenciana': ['comunitat valenciana', 'comunidad valenciana', 'valencia', 'alicante', 'castellón', 'dogv'],
  'extremadura':          ['extremadura', 'badajoz', 'cáceres'],
  'galicia':              ['galicia', 'xunta', 'galega', 'galego', 'vigo', 'coruña', 'pontevedra', 'ourense', 'lugo'],
  'la-rioja':             ['la rioja', 'logroño'],
  'madrid':               ['comunidad de madrid', 'región de madrid', 'bocm', 'madrid capital'],
  'murcia':               ['región de murcia', 'murcia', 'cartagena'],
  'navarra':              ['navarra', 'nafarroa', 'pamplona'],
  'pais-vasco':           ['país vasco', 'pais vasco', 'euskadi', 'euskal', 'bopv', 'bilbao', 'vitoria', 'donostia', 'san sebastián'],
};

function inferirCCAA(texto = '') {
  const t = texto.toLowerCase();
  const encontradas = [];
  for (const [slug, kws] of Object.entries(CCAA_KEYWORDS)) {
    if (kws.some(kw => t.includes(kw))) encontradas.push(slug);
  }
  return encontradas;
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

  for (const { q, ccaa: ccaaQuery } of QUERIES) {
    const items = await fetchGoogleNews(q);
    total += items.length;

    for (const item of items) {
      const titulo = item.title ?? '';
      const desc   = item.contentSnippet ?? item.content ?? '';
      const texto  = `${titulo} ${desc}`;

      if (!esRelevante(titulo, desc)) continue;

      const url = item.link ?? '';
      if (!url) continue;

      // CCAA: combinar la del query (fiable) con la detectada en el texto
      const ccaaTexto  = inferirCCAA(texto);
      const ccaaFinal  = ccaaQuery
        ? [...new Set([ccaaQuery, ...ccaaTexto])]
        : (ccaaTexto.length > 0 ? ccaaTexto : ['nacional']);

      const sectores = inferirSectores(titulo, desc);

      todos.push({
        titulo,
        organismo:     item.creator || item.author || '',
        descripcion:   desc.slice(0, 500),
        importe_texto: extraerImporte(texto),
        fecha_pub:     item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 10) : null,
        fecha_cierre:  null,
        url,
        tipo:          clasificarTipo(titulo),
        sector:        sectores,
        ccaa:          ccaaFinal,
        fuente:        'BOE',
      });
    }

    await sleep(DELAY_MS);
  }

  const seen   = new Set();
  const unicos = todos.filter(d => {
    if (!d.url || seen.has(d.url)) return false;
    seen.add(d.url);
    return true;
  });

  console.log(`[BOE] ${unicos.length} subvenciones encontradas (de ${total} items).`);
  return unicos;
}
