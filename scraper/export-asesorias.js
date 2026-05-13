import fs from 'node:fs/promises';
import path from 'node:path';
import { enrichSubvencion, recogerSubvenciones, requisitosClave, resumenComercial } from './motor.js';
import { esCategoriaExportable, puntuarComercial } from './scoring-comercial.js';
import { SECTOR_LABELS } from './taxonomia.js';

const fuenteArg = process.argv.find(a => a.startsWith('--fuente='))?.split('=')[1] ?? 'todas';
const diasArg = Number(process.argv.find(a => a.startsWith('--dias='))?.split('=')[1] ?? '10');
const salidaArg = process.argv.find(a => a.startsWith('--salida='))?.split('=')[1];
const incluirRuidoArg = process.argv.find(a => a.startsWith('--incluir-ruido='))?.split('=')[1] === 'true';

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(from, to) {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / 86400000);
}

function formatDate(value) {
  if (!value) return '';
  const date = toDate(value);
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows, columns) {
  const header = columns.join(';');
  const lines = rows.map(row => columns.map(col => csvEscape(row[col])).join(';'));
  return [header, ...lines].join('\n');
}

function countBy(rows, field) {
  return rows.reduce((acc, row) => {
    const key = String(row[field] || 'Sin valor');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topMotivos(rows, limit = 10) {
  const counts = {};
  for (const row of rows) {
    const motivos = String(row.motivo_comercial || '')
      .split('|')
      .map(motivo => motivo.trim())
      .filter(Boolean);
    for (const motivo of motivos) counts[motivo] = (counts[motivo] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([motivo, total]) => ({ motivo, total }));
}

function buildMetrics({ now, todas, recientes, enriquecidas, exportables, outPath, metricsPath }) {
  const scores = enriquecidas
    .map(row => Number(row.score_comercial))
    .filter(score => Number.isFinite(score));
  const scoreSum = scores.reduce((sum, score) => sum + score, 0);

  return {
    fuente: fuenteArg,
    dias: diasArg,
    incluir_ruido: incluirRuidoArg,
    total_recogidas: todas.length,
    total_recientes: recientes.length,
    total_antes_filtro_comercial: enriquecidas.length,
    total_exportadas: exportables.length,
    distribucion_categoria_comercial: countBy(enriquecidas, 'categoria_comercial'),
    total_excluir_feed_true: enriquecidas.filter(row => row.excluir_feed === 'true').length,
    total_sin_fecha_cierre: enriquecidas.filter(row => !row.fecha_cierre).length,
    score_min: scores.length > 0 ? Math.min(...scores) : null,
    score_max: scores.length > 0 ? Math.max(...scores) : null,
    score_promedio: scores.length > 0 ? Number((scoreSum / scores.length).toFixed(2)) : null,
    top_motivos_comerciales: topMotivos(enriquecidas),
    csv_path: outPath,
    metrics_path: metricsPath,
    fecha_generacion: now.toISOString(),
  };
}

function filterRecientes(items, dias) {
  const now = new Date();
  return items.filter(item => {
    const pub = toDate(item.fecha_pub);
    if (!pub) return true;
    return diffDays(pub, now) <= dias;
  });
}

function enrich(item, now) {
  const enriched = enrichSubvencion(item, now);
  const scoring = puntuarComercial(enriched);

  return {
    fecha_generacion: formatDate(now.toISOString()),
    prioridad: enriched.prioridad,
    urgencia: enriched.urgencia,
    confianza_registro: enriched.confianza_registro,
    fuente: enriched.fuente || '',
    medio_origen: enriched.medio_origen,
    titulo: enriched.titulo,
    organismo: enriched.organismo,
    beneficiario_objetivo: enriched.beneficiario_objetivo,
    sector_principal: ((enriched.sector || []).slice(0, 1).map(s => SECTOR_LABELS[s] || s)).join(' | '),
    sectores: enriched.sectores_label,
    ambito: enriched.ambito,
    ccaa: enriched.ccaa_label,
    fecha_publicacion: enriched.fecha_publicacion,
    fecha_cierre: enriched.fecha_cierre_fmt,
    dias_desde_publicacion: enriched.dias_desde_publicacion,
    dias_hasta_cierre: enriched.dias_hasta_cierre,
    importe_referencia: enriched.importe_texto || '',
    resumen_comercial: resumenComercial(enriched),
    requisitos_clave: requisitosClave(enriched),
    url_oficial: enriched.url || '',
    score_comercial: scoring.score_comercial,
    categoria_comercial: scoring.categoria_comercial,
    motivo_comercial: scoring.motivo_comercial,
    excluir_feed: scoring.excluir_feed,
  };
}

async function main() {
  const now = new Date();
  const todas = await recogerSubvenciones({ fuente: fuenteArg });
  const recientes = filterRecientes(todas, diasArg);
  const enriquecidas = recientes
    .map(item => enrich(item, now))
    .sort((a, b) => {
      const prio = { Alta: 3, Media: 2, Baja: 1 };
      return (prio[b.prioridad] - prio[a.prioridad]) ||
        String(b.fecha_publicacion).localeCompare(String(a.fecha_publicacion)) ||
        a.titulo.localeCompare(b.titulo);
    });
  const exportables = incluirRuidoArg
    ? enriquecidas
    : enriquecidas.filter(item => esCategoriaExportable(item.categoria_comercial) && item.excluir_feed !== 'true');

  const outDir = path.resolve('exports');
  const outFile = salidaArg || `feed-asesorias-${formatDate(now.toISOString())}.csv`;
  const outPath = path.join(outDir, outFile);
  const metricsPath = `${outPath}.metrics.json`;

  await fs.mkdir(outDir, { recursive: true });

  const columns = [
    'fecha_generacion',
    'prioridad',
    'urgencia',
    'confianza_registro',
    'fuente',
    'medio_origen',
    'titulo',
    'organismo',
    'beneficiario_objetivo',
    'sector_principal',
    'sectores',
    'ambito',
    'ccaa',
    'fecha_publicacion',
    'fecha_cierre',
    'dias_desde_publicacion',
    'dias_hasta_cierre',
    'importe_referencia',
    'resumen_comercial',
    'requisitos_clave',
    'url_oficial',
    'score_comercial',
    'categoria_comercial',
    'motivo_comercial',
    'excluir_feed',
  ];

  await fs.writeFile(outPath, toCsv(exportables, columns), 'utf8');
  const metrics = buildMetrics({ now, todas, recientes, enriquecidas, exportables, outPath, metricsPath });
  await fs.writeFile(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');

  console.log(`Feed generado: ${outPath}`);
  console.log(`Metricas generadas: ${metricsPath}`);
  console.log(`Registros recogidos: ${metrics.total_recogidas}`);
  console.log(`Registros recientes: ${metrics.total_recientes}`);
  console.log(`Registros antes del filtro comercial: ${enriquecidas.length}`);
  console.log(`Registros exportados: ${exportables.length}`);
  console.log(`Distribucion comercial: ${JSON.stringify(metrics.distribucion_categoria_comercial)}`);
  console.log(`Excluidos por excluir_feed=true: ${metrics.total_excluir_feed_true}`);
  console.log(`Sin fecha de cierre: ${metrics.total_sin_fecha_cierre}`);
  console.log(`Score min/max/promedio: ${metrics.score_min}/${metrics.score_max}/${metrics.score_promedio}`);
}

main().catch(err => {
  console.error('Error generando feed para asesorias:', err);
  process.exit(1);
});
