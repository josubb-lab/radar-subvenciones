import { normalizeText } from './taxonomia.js';

const CATEGORIAS_EXPORTABLES = new Set(['Muy interesante', 'Interesante']);

const SECTORES_B2B = new Set([
  'autonomos',
  'empresas',
  'empleo',
  'tecnologia',
  'internacionalizacion',
  'energia',
  'medio-ambiente',
]);

const SECTORES_B2B_DEBILES = new Set(['innovacion']);
const SECTORES_RUIDO = new Set(['cultura', 'deporte', 'educacion', 'juventud', 'ong']);

const TOKENS_B2B_FUERTES = [
  'pyme',
  'pymes',
  'autonomo',
  'autónomo',
  'autonomos',
  'autónomos',
  'trabajador por cuenta',
  'empresa',
  'empresas',
  'empresarial',
  'sociedad mercantil',
  'mercantil',
  'negocio',
  'comercio',
  'industria',
  'industrial',
  'empleo',
  'contratacion',
  'contratación',
];

const TOKENS_EMPRESA_EXPLICITA = [
  'pyme',
  'pymes',
  'autonomo',
  'autónomo',
  'autonomos',
  'autónomos',
  'trabajador por cuenta',
  'empresa',
  'empresas',
  'empresarial',
  'emprendedor',
  'emprendedora',
  'contratacion',
  'contratación',
  'empleo',
];

const TOKENS_COMERCIO_LOCAL_EXPLICITO = [
  'comercio',
  'comercios',
  'hosteleria',
  'hostelería',
  'actividad empresarial',
  'actividades empresariales',
  'emprendimiento',
  'emprendedor',
  'emprendedora',
  'empresa',
  'empresas',
];

const TOKENS_DIGITAL_TECNOLOGIA = [
  'digital',
  'digitalizacion',
  'digitalización',
  'tecnologia',
  'tecnología',
  'tecnologica',
  'tecnológica',
  'software',
  'ciberseguridad',
  'inteligencia artificial',
];

const TOKENS_CLIENTE_COMERCIAL = [
  'empresa',
  'empresas',
  'pyme',
  'pymes',
  'autonomo',
  'autónomo',
  'autonomos',
  'autónomos',
  'comercio',
  'comercios',
  'negocio',
  'negocios',
];

const TOKENS_B2B_DEBILES = [
  'digital',
  'digitalizacion',
  'digitalización',
  'innovacion',
  'innovación',
  'i+d',
  'internacionalizacion',
  'internacionalización',
  'exportacion',
  'exportación',
  'energia',
  'energía',
  'sostenibilidad',
  'eficiencia energetica',
  'eficiencia energética',
  'renovable',
];

const TOKENS_RUIDO = [
  'cultura',
  'cultural',
  'deporte',
  'deportivo',
  'juventud',
  'juvenil',
  'educacion',
  'educación',
  'beca',
  'ong',
  'asociacion',
  'asociación',
  'fundacion',
  'fundación',
  'voluntariado',
];

const TOKENS_EDUCACION_FUERTE = [
  'desayuno escolar',
  'comedor escolar',
  'escolar',
  'escolares',
  'alumno',
  'alumnos',
  'estudiante',
  'estudiantes',
  'universidad',
  'universidades',
  'centro educativo',
  'curso',
  'docente',
  'profesor',
  'coros escolares',
];

const TOKENS_INVESTIGACION_PUBLICA = [
  'investigacion publica',
  'investigación pública',
  'instituto de salud carlos iii',
  'isciii',
  'accion estrategica en salud',
  'acción estratégica en salud',
  'ministerio de ciencia',
  'consejeria de educacion',
  'consejería de educación',
  'ciencia y universidades',
];

const TOKENS_LINGUISTICOS = [
  'euskera',
  'euskar',
  'lingüistic',
  'linguistic',
  'lengua',
  'rotulacion',
  'rotulación',
];

const TOKENS_NOMINATIVA = [
  'nominativa',
  'concesion directa',
  'concesión directa',
  'subvencion directa',
  'subvención directa',
  'convenio nominativo',
  'adjudicacion directa',
  'adjudicación directa',
];

const TOKENS_EXCLUSION = [
  'cofradia',
  'cofradía',
  'hermandad',
  'fiesta',
  'fiestas',
  'festejo',
  'peña',
  'pena ',
  'premio',
  'premios',
  'certamen',
  'asociacion de vecinos',
  'asociación de vecinos',
  'club deportivo',
];

const TOKENS_PUBLICO_LOCAL = [
  'ayuntamiento',
  'ayuntamientos',
  'entidad local',
  'entidades locales',
  'municipio',
  'municipios',
  'diputacion',
  'diputación',
  'cabildo',
  'consell insular',
];

function countMatches(text, tokens) {
  return tokens.filter(token => text.includes(token)).length;
}

function hasAny(text, tokens) {
  return tokens.some(token => text.includes(token));
}

function capScore(score, max, condition, motivos, motivo) {
  if (!condition || score <= max) return score;
  motivos.push(motivo);
  return max;
}

function categoriaDesdeScore(score, excluirFeed) {
  if (excluirFeed) return 'Ruido';
  if (score >= 45) return 'Muy interesante';
  if (score >= 25) return 'Interesante';
  if (score >= 5) return 'Revisar';
  return 'Ruido';
}

export function esCategoriaExportable(categoria) {
  return CATEGORIAS_EXPORTABLES.has(categoria);
}

export function puntuarComercial(item) {
  const sectores = item.sector || [];
  const text = normalizeText([
    item.titulo,
    item.descripcion,
    item.organismo,
  ].filter(Boolean).join(' ')).toLowerCase();

  let score = 0;
  const motivos = [];
  const sectoresB2B = sectores.filter(sector => SECTORES_B2B.has(sector));
  const sectoresB2BDebiles = sectores.filter(sector => SECTORES_B2B_DEBILES.has(sector));
  const sectoresRuido = sectores.filter(sector => SECTORES_RUIDO.has(sector));
  const mencionesB2BFuertes = countMatches(text, TOKENS_B2B_FUERTES);
  const mencionesB2BDebiles = countMatches(text, TOKENS_B2B_DEBILES);
  const mencionesRuido = countMatches(text, TOKENS_RUIDO);
  const orientacionEmpresarialExplicita = hasAny(text, TOKENS_EMPRESA_EXPLICITA);
  const orientacionEmpresarialClara = sectoresB2B.length > 0 || mencionesB2BFuertes > 0;
  const orientacionEmpresarial = orientacionEmpresarialClara || sectoresB2BDebiles.length > 0 || mencionesB2BDebiles > 0;
  const sinFechaCierre = !item.fecha_cierre_fmt && !item.fecha_cierre;
  const tieneFechaCierre = !sinFechaCierre;
  const tieneImporte = Boolean(item.importe_texto);
  const nominativa = hasAny(text, TOKENS_NOMINATIVA);
  const publicoLocal = hasAny(text, TOKENS_PUBLICO_LOCAL);
  const comercioLocalExplicito = publicoLocal && hasAny(text, TOKENS_COMERCIO_LOCAL_EXPLICITO);
  const digitalConClienteComercial =
    (sectores.includes('tecnologia') || hasAny(text, TOKENS_DIGITAL_TECNOLOGIA)) &&
    hasAny(text, TOKENS_CLIENTE_COMERCIAL);
  const empleoContratacionAutonomoEmpresa =
    sectores.some(sector => ['autonomos', 'empresas', 'empleo'].includes(sector)) &&
    orientacionEmpresarialExplicita;
  const educacionFuerte = sectores.includes('educacion') || hasAny(text, TOKENS_EDUCACION_FUERTE);
  const investigacionPublica = hasAny(text, TOKENS_INVESTIGACION_PUBLICA);
  const linguistica = hasAny(text, TOKENS_LINGUISTICOS);
  const agriculturaTecnologiaInnovacionSinEmpresa =
    sectores.includes('agricultura') &&
    (sectores.includes('tecnologia') || sectoresB2BDebiles.includes('innovacion') || mencionesB2BDebiles > 0) &&
    !orientacionEmpresarialExplicita;
  const exclusionDirecta = hasAny(text, TOKENS_EXCLUSION);
  const publicoLocalSinCliente = publicoLocal && !orientacionEmpresarialClara;
  const excluirFeed = exclusionDirecta || publicoLocalSinCliente;

  if (sectoresB2B.length > 0) {
    score += 25;
    motivos.push(`sectores B2B: ${sectoresB2B.join(', ')}`);
  }

  if (sectoresB2BDebiles.length > 0) {
    score += 10;
    motivos.push(`sectores B2B debiles: ${sectoresB2BDebiles.join(', ')}`);
  }

  if (mencionesB2BFuertes > 0) {
    score += Math.min(24, mencionesB2BFuertes * 6);
    motivos.push('terminos empresariales detectados');
  }

  if (mencionesB2BDebiles > 0) {
    score += Math.min(12, mencionesB2BDebiles * 3);
    motivos.push('terminos comerciales debiles detectados');
  }

  if (tieneImporte) {
    score += 5;
    motivos.push('importe detectado');
  }

  if (item.fuente === 'BDNS') {
    score += 5;
    motivos.push('fuente BDNS');
  }

  if (empleoContratacionAutonomoEmpresa) {
    score += 12;
    motivos.push('empleo/contratacion/autonomos/empresa explicito');
  }

  if (comercioLocalExplicito) {
    score += 14;
    motivos.push('comercio local municipal con cliente comercial explicito');
  }

  if (digitalConClienteComercial) {
    score += 12;
    motivos.push('digitalizacion/tecnologia con cliente comercial claro');
  }

  if (sinFechaCierre) {
    score -= 20;
    motivos.push('sin fecha de cierre detectada');
  }

  if (nominativa) {
    score -= 25;
    motivos.push('convocatoria nominativa/directa');
  }

  if (sectoresRuido.length > 0 && !orientacionEmpresarial) {
    score -= 25;
    motivos.push(`vertical no empresarial: ${sectoresRuido.join(', ')}`);
  } else if (sectoresRuido.length > 0 && !orientacionEmpresarialClara) {
    score -= 20;
    motivos.push(`vertical no empresarial sin beneficiario claro: ${sectoresRuido.join(', ')}`);
  } else if (mencionesRuido > 0 && !orientacionEmpresarial) {
    score -= 15;
    motivos.push('posible vertical no empresarial');
  }

  if (educacionFuerte && !orientacionEmpresarialExplicita) {
    score -= 30;
    motivos.push('educacion sin pyme/empresa/autonomo/contratacion explicita');
  }

  if ((educacionFuerte || investigacionPublica) && !orientacionEmpresarialExplicita) {
    score = capScore(score, 20, true, motivos, 'innovacion/I+D no basta en educacion o investigacion publica');
  }

  if (linguistica && !(tieneImporte && tieneFechaCierre && orientacionEmpresarialExplicita)) {
    score = capScore(score, 20, true, motivos, 'ayuda linguistica sin importe, cierre y orientacion empresarial clara');
  }

  if (agriculturaTecnologiaInnovacionSinEmpresa) {
    score = capScore(score, 20, true, motivos, 'agricultura con tecnologia/innovacion sin beneficiario empresarial claro');
  }

  if (publicoLocal && orientacionEmpresarialClara) {
    score = capScore(score, 35, true, motivos, 'comercio local municipal con score moderado');
  }

  if (exclusionDirecta) {
    score -= 50;
    motivos.push('exclusion por cofradias/fiestas/premios/asociaciones hiperlocales');
  }

  if (publicoLocalSinCliente) {
    score -= 40;
    motivos.push('entidad publica/local sin cliente empresarial claro');
  }

  const scoreComercial = Math.max(0, Math.min(100, score));
  const categoria = categoriaDesdeScore(scoreComercial, excluirFeed);

  return {
    score_comercial: scoreComercial,
    categoria_comercial: categoria,
    motivo_comercial: motivos.length > 0 ? motivos.join(' | ') : 'sin senales comerciales claras',
    excluir_feed: excluirFeed ? 'true' : 'false',
  };
}
