import { CCAA_LABELS, SECTOR_LABELS, labelList, normalizeText } from './taxonomia.js';
import { scrapearBOE } from './fuente-boe.js';
import { scrapearBDNS } from './fuente-bdns.js';

const SOURCE_REGISTRY = {
  boe: scrapearBOE,
  bdns: scrapearBDNS,
};

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(from, to) {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / 86400000);
}

export function formatDate(value) {
  const date = toDate(value);
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

function medioOrigen(item) {
  const titulo = normalizeText(item.titulo || '');
  const parts = titulo.split(' - ').map(s => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts.at(-1) : '';
}

function inferirBeneficiario(item) {
  const text = normalizeText(`${item.titulo || ''} ${item.descripcion || ''}`).toLowerCase();
  const rules = [
    { label: 'Autonomos', match: ['autonom', 'cuenta propia', 'emprendedor', 'freelance'] },
    { label: 'Pymes', match: ['pyme', 'pequena y mediana', 'pequeña y mediana'] },
    { label: 'Empresas', match: ['empresa', 'sociedad', 'mercantil', 'industria', 'comercio'] },
    { label: 'ONG y asociaciones', match: ['asociacion', 'asociación', 'fundacion', 'fundación', 'ong', 'tercer sector'] },
    { label: 'Ayuntamientos y entidades locales', match: ['ayuntamiento', 'entidad local', 'municipio', 'diputacion', 'diputación'] },
    { label: 'Centros educativos', match: ['universidad', 'centro educativo', 'escuela', 'fp', 'docente'] },
  ];

  for (const rule of rules) {
    if (rule.match.some(token => text.includes(token))) return rule.label;
  }

  if ((item.sector || []).includes('autonomos')) return 'Autonomos';
  if ((item.sector || []).includes('empresas')) return 'Empresas y pymes';
  if ((item.sector || []).includes('ong')) return 'ONG y asociaciones';
  return 'Pendiente de revisar';
}

function inferirAmbito(item) {
  const ccaa = item.ccaa || [];
  if (ccaa.length === 0 || ccaa.includes('nacional')) return 'Nacional';
  if (ccaa.length === 1) return 'Autonomico';
  return 'Multi-CCAA';
}

function inferirUrgencia(item, now) {
  const cierre = toDate(item.fecha_cierre);
  if (!cierre) return 'Sin fecha de cierre detectada';
  const dias = diffDays(now, cierre);
  if (dias < 0) return 'Plazo vencido';
  if (dias <= 7) return 'Alta';
  if (dias <= 21) return 'Media';
  return 'Baja';
}

function inferirPrioridad(item, now) {
  let score = 0;
  const text = normalizeText(`${item.titulo || ''} ${item.descripcion || ''}`).toLowerCase();
  const cierre = toDate(item.fecha_cierre);
  const pub = toDate(item.fecha_pub);
  const sectores = item.sector || [];

  if (sectores.some(s => ['autonomos', 'empresas', 'empleo', 'tecnologia', 'internacionalizacion', 'innovacion'].includes(s))) score += 3;
  if (text.includes('pyme') || text.includes('autonom') || text.includes('digital') || text.includes('internacional')) score += 2;
  if (item.importe_texto) score += 1;
  if (item.fuente === 'BDNS') score += 2;

  if (cierre) {
    const dias = diffDays(now, cierre);
    if (dias >= 0 && dias <= 7) score += 3;
    else if (dias <= 21) score += 2;
    else if (dias <= 45) score += 1;
  } else if (pub) {
    const diasDesdePub = diffDays(pub, now);
    if (diasDesdePub <= 3) score += 2;
    else if (diasDesdePub <= 10) score += 1;
  }

  if (score >= 7) return 'Alta';
  if (score >= 4) return 'Media';
  return 'Baja';
}

function confianzaRegistro(item) {
  const url = String(item.url || '').toLowerCase();
  const medio = medioOrigen(item).toLowerCase();
  if (item.fuente === 'BDNS') return 'Alta';
  if (url.includes('.gob.es') || url.includes('.gov') || url.includes('boe.es') || url.includes('caib.es')) return 'Alta';
  if (medio.includes('gob') || medio.includes('junta') || medio.includes('generalitat') || medio.includes('xunta') || medio.includes('caib.es')) return 'Media';
  return 'Media';
}

export function dedupeSubvenciones(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = [
      normalizeText(item.titulo || '').toLowerCase(),
      formatDate(item.fecha_pub),
      labelList(item.ccaa, CCAA_LABELS),
      item.fuente || '',
    ].join('|');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function enrichSubvencion(item, now = new Date()) {
  const cierre = toDate(item.fecha_cierre);
  const fechaPub = toDate(item.fecha_pub);
  const diasHastaCierre = cierre ? diffDays(now, cierre) : '';
  const diasDesdePublicacion = fechaPub ? diffDays(fechaPub, now) : '';

  return {
    ...item,
    titulo: normalizeText(item.titulo || ''),
    descripcion: normalizeText(item.descripcion || ''),
    organismo: normalizeText(item.organismo || ''),
    prioridad: inferirPrioridad(item, now),
    urgencia: inferirUrgencia(item, now),
    confianza_registro: confianzaRegistro(item),
    medio_origen: medioOrigen(item),
    beneficiario_objetivo: inferirBeneficiario(item),
    ambito: inferirAmbito(item),
    sectores_label: labelList(item.sector, SECTOR_LABELS),
    ccaa_label: labelList(item.ccaa, CCAA_LABELS),
    fecha_publicacion: formatDate(item.fecha_pub),
    fecha_cierre_fmt: formatDate(item.fecha_cierre),
    dias_desde_publicacion: diasDesdePublicacion,
    dias_hasta_cierre: diasHastaCierre,
  };
}

export function mapSubvencionToDbRow(item) {
  return {
    titulo: item.titulo,
    organismo: item.organismo || null,
    descripcion: item.descripcion?.slice(0, 1000) || null,
    importe_texto: item.importe_texto || null,
    fecha_pub: item.fecha_pub || null,
    fecha_cierre: item.fecha_cierre || null,
    plazo_texto: item.plazo_texto || null,
    url: item.url,
    tipo: item.tipo || 'convocatoria',
    sector: item.sector?.length > 0 ? item.sector : [],
    ccaa: item.ccaa?.length > 0 ? item.ccaa : ['nacional'],
    fuente: item.fuente || 'BOE',
    activa: true,
  };
}

export async function recogerSubvenciones({ fuente = 'todas' } = {}) {
  const names = fuente === 'todas' ? Object.keys(SOURCE_REGISTRY) : [fuente];
  const all = [];

  for (const name of names) {
    const run = SOURCE_REGISTRY[name];
    if (!run) throw new Error(`Fuente desconocida: ${name}`);
    all.push(...await run());
  }

  return dedupeSubvenciones(all);
}

export function resumenComercial(item) {
  const sector = item.sectores_label || 'Sin sector claro';
  const beneficiario = item.beneficiario_objetivo || 'pendiente de revisar';
  const importe = item.importe_texto ? ` Importe detectado: ${item.importe_texto}.` : '';
  const fechaCierre = item.fecha_cierre_fmt ? ` Cierre: ${item.fecha_cierre_fmt}.` : ' Cierre: no detectado.';
  return normalizeText(
    `${item.titulo}. Ambito ${item.ambito.toLowerCase()} orientado a ${beneficiario.toLowerCase()}. ` +
    `Sector principal: ${sector}.${importe}${fechaCierre}`
  );
}

export function requisitosClave(item) {
  const text = normalizeText(`${item.titulo || ''} ${item.descripcion || ''}`).toLowerCase();
  const bullets = [];
  if (text.includes('autonom')) bullets.push('Orientada a autonomos o emprendimiento');
  if (text.includes('pyme') || text.includes('empresa')) bullets.push('Enfoque empresa o pyme');
  if (text.includes('digital')) bullets.push('Proyecto de digitalizacion');
  if (text.includes('contrat')) bullets.push('Relacionada con empleo o contratacion');
  if (text.includes('internacional')) bullets.push('Relacionada con exportacion o internacionalizacion');
  if (text.includes('innov')) bullets.push('Componente de innovacion o I+D');
  if (bullets.length === 0) bullets.push('Requiere revision manual de bases');
  return bullets.join(' | ');
}
