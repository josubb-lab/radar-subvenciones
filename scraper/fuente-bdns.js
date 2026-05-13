import axios from 'axios';
import { inferirCCAA, inferirSectores, normalizarCCAA } from './taxonomia.js';

const DELAY_MS = 900;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const BASE = 'https://www.infosubvenciones.es';
const SEARCH_URL = `${BASE}/bdnstrans/api/convocatorias/ultimas`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json,text/plain,*/*',
  'Accept-Language': 'es-ES,es;q=0.9',
};

function construirUrlOficial(item) {
  return `${BASE}/bdnstrans/GE/es/convocatorias/${item.numeroConvocatoria}`;
}

async function scrapearPagina(pagina = 0) {
  try {
    const { data } = await axios.get(SEARCH_URL, {
      params: { page: pagina, size: 50, sort: 'fechaRecepcion,desc' },
      headers: HEADERS,
      timeout: 20_000,
    });

    return (data.content || []).map(item => {
      const titulo = item.descripcion?.trim();
      const organismo = [item.nivel3, item.nivel2, item.nivel1].filter(Boolean).join(' · ');
      const ccaa = [
        normalizarCCAA(item.nivel2),
        normalizarCCAA(item.nivel3),
        ...inferirCCAA(`${item.descripcion || ''} ${organismo}`),
      ].filter(Boolean);

      return {
        titulo,
        organismo,
        descripcion: item.descripcionLeng || item.descripcion || '',
        importe_texto: null,
        fecha_pub: item.fechaRecepcion || null,
        fecha_cierre: null,
        plazo_texto: null,
        url: construirUrlOficial(item),
        tipo: 'convocatoria',
        sector: inferirSectores(item.descripcion || '', organismo),
        ccaa: ccaa.length > 0 ? [...new Set(ccaa)] : ['nacional'],
        fuente: 'BDNS',
        referencia_externa: item.numeroConvocatoria || String(item.id),
      };
    }).filter(item => item.titulo && item.url);
  } catch (err) {
    console.warn(`[BDNS] Error página ${pagina}: ${err.message}`);
    return [];
  }
}

export async function scrapearBDNS() {
  console.log('[BDNS] Iniciando scraping...');
  const todos = [];

  for (let pagina = 0; pagina < 4; pagina++) {
    console.log(`[BDNS] Página ${pagina + 1}/4...`);
    const resultados = await scrapearPagina(pagina);
    if (resultados.length === 0 && pagina > 0) break;
    todos.push(...resultados);
    await sleep(DELAY_MS);
  }

  const seen = new Set();
  const unicos = todos.filter(c => {
    const key = `${c.referencia_externa || ''}|${c.titulo.slice(0, 80)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).filter(c => c.titulo.trim() !== '');

  console.log(`[BDNS] ${unicos.length} convocatorias encontradas.`);
  return unicos;
}
