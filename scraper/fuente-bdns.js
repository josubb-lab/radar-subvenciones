/**
 * fuente-bdns.js
 * Base de Datos Nacional de Subvenciones (BDNS)
 * API pública: https://www.infosubvenciones.es/bdnstrans/
 */

import axios from 'axios';

const DELAY_MS = 1_500;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const BASE_URL = 'https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias.json';

const SECTORES_BDNS = [
  { codigo: '01', slug: 'agricultura' },
  { codigo: '05', slug: 'cultura' },
  { codigo: '06', slug: 'deporte' },
  { codigo: '07', slug: 'educacion' },
  { codigo: '08', slug: 'empleo' },
  { codigo: '10', slug: 'energia' },
  { codigo: '13', slug: 'innovacion' },
  { codigo: '17', slug: 'medio-ambiente' },
  { codigo: '22', slug: 'salud' },
  { codigo: '24', slug: 'tecnologia' },
  { codigo: '25', slug: 'turismo' },
];

function inferirSectores(titulo = '', descripcion = '') {
  const t = (titulo + ' ' + descripcion).toLowerCase();
  const sectores = [];
  const keywords = {
    'autonomos':          ['autónomo', 'autonomo', 'trabajador por cuenta propia', 'emprendedor', 'startup'],
    'empresas':           ['empresa', 'empresas', 'pyme', 'micropyme', 'sociedad', 'industria'],
    'agricultura':        ['agrícola', 'agricola', 'ganadería', 'ganaderia', 'rural', 'agroalimentari'],
    'cultura':            ['cultura', 'cultural', 'patrimonio', 'artes', 'cine', 'teatro', 'música', 'musica'],
    'deporte':            ['deporte', 'deportiv', 'actividad física', 'actividad fisica'],
    'educacion':          ['educación', 'educacion', 'formación', 'formacion', 'beca', 'becas', 'universidad'],
    'empleo':             ['empleo', 'contratación', 'contratacion', 'inserción laboral', 'desempleo', 'paro'],
    'energia':            ['energía', 'energia', 'renovable', 'fotovoltaica', 'eficiencia energética', 'solar'],
    'innovacion':         ['innovación', 'innovacion', 'investigación', 'investigacion', 'I+D', 'desarrollo tecnológico'],
    'internacionalizacion': ['internacionaliz', 'exportación', 'exportacion', 'exterior', 'comercio exterior'],
    'juventud':           ['juventud', 'joven', 'jóvenes', 'jovenes', 'menor'],
    'medio-ambiente':     ['medio ambiente', 'medioambiental', 'sostenibilidad', 'ecológico', 'ecologico', 'biodiversidad'],
    'ong':                ['entidad sin ánimo', 'asociación', 'asociacion', 'ONG', 'fundación', 'fundacion', 'tercer sector'],
    'rehabilitacion':     ['rehabilitación', 'rehabilitacion', 'vivienda', 'alquiler', 'construcción', 'construccion'],
    'salud':              ['salud', 'sanitari', 'hospital', 'investigación biomédica', 'farmacéutico'],
    'tecnologia':         ['tecnología', 'tecnologia', 'digital', 'digitalización', 'digitalizacion', 'software', 'IA'],
    'turismo':            ['turismo', 'turístico', 'turistico', 'hostelería', 'hosteleria', 'hotel'],
  };
  for (const [slug, kws] of Object.entries(keywords)) {
    if (kws.some(kw => t.includes(kw))) sectores.push(slug);
  }
  return sectores.length > 0 ? sectores : ['empresas'];
}

async function fetchConvocatorias(params = {}) {
  try {
    const { data } = await axios.get(BASE_URL, {
      params: {
        pageNumber: 0,
        pageSize: 50,
        orden: 'desc',
        ...params,
      },
      timeout: 20_000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)', 'Accept': 'application/json' },
    });

    const convocatorias = data?.content ?? data?.data ?? data ?? [];
    if (!Array.isArray(convocatorias)) return [];

    return convocatorias.map(c => ({
      titulo:       c.descripcion ?? c.titulo ?? c.denominacion ?? '',
      organismo:    c.organoConvocante ?? c.organismo ?? '',
      descripcion:  c.objeto ?? c.descripcion ?? '',
      importe_texto: c.importeTotal ? `${Number(c.importeTotal).toLocaleString('es-ES')} €` : null,
      fecha_pub:    c.fechaPublicacion ? c.fechaPublicacion.slice(0, 10) : null,
      fecha_cierre: c.fechaFinSolicitud ? c.fechaFinSolicitud.slice(0, 10) : null,
      plazo_texto:  null,
      url:          c.urlBOE ?? c.url ?? `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/${c.id ?? ''}`,
      tipo:         'convocatoria',
      sector:       inferirSectores(c.descripcion ?? '', c.objeto ?? ''),
      ccaa:         c.ambitoGeografico ? [slugificarCCAA(c.ambitoGeografico)] : ['nacional'],
      fuente:       'BDNS',
    }));
  } catch (err) {
    console.warn(`[BDNS] Error: ${err.message}`);
    return [];
  }
}

const CCAA_NORMALIZA = {
  'andalucía': 'andalucia', 'aragón': 'aragon', 'asturias': 'asturias',
  'baleares': 'baleares', 'illes balears': 'baleares',
  'canarias': 'canarias', 'cantabria': 'cantabria',
  'castilla-la mancha': 'castilla-la-mancha', 'castilla y león': 'castilla-y-leon',
  'cataluña': 'cataluna', 'catalunya': 'cataluna',
  'comunitat valenciana': 'comunidad-valenciana', 'comunidad valenciana': 'comunidad-valenciana',
  'extremadura': 'extremadura', 'galicia': 'galicia', 'la rioja': 'la-rioja',
  'madrid': 'madrid', 'comunidad de madrid': 'madrid',
  'murcia': 'murcia', 'región de murcia': 'murcia',
  'navarra': 'navarra', 'país vasco': 'pais-vasco', 'euskadi': 'pais-vasco',
  'nacional': 'nacional', 'estatal': 'nacional',
};

function slugificarCCAA(nombre = '') {
  const n = nombre.toLowerCase().trim();
  return CCAA_NORMALIZA[n] ?? 'nacional';
}

export async function scrapearBDNS() {
  console.log('[BDNS] Iniciando búsqueda de convocatorias...');
  const todos = [];

  // Página principal: últimas convocatorias
  console.log('[BDNS] Últimas convocatorias...');
  const recientes = await fetchConvocatorias({ pageSize: 100 });
  todos.push(...recientes);
  await sleep(DELAY_MS);

  // Por sector
  for (const sector of SECTORES_BDNS) {
    console.log(`[BDNS] Sector ${sector.slug}...`);
    const resultados = await fetchConvocatorias({ sectorActividad: sector.codigo, pageSize: 50 });
    todos.push(...resultados);
    await sleep(DELAY_MS);
  }

  const seen = new Set();
  const unicos = todos.filter(c => {
    if (!c.url || seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  }).filter(c => c.titulo.trim() !== '');

  console.log(`[BDNS] ${unicos.length} convocatorias únicas encontradas.`);
  return unicos;
}
