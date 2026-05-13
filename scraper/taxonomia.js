export const SECTORES_MAP = {
  autonomos: ['autónomo', 'autonomo', 'emprendedor', 'cuenta propia', 'trabajador por cuenta', 'freelance'],
  empresas: ['empresa', 'pyme', 'sociedad', 'industria', 'comercio', 'negocio', 'mercantil'],
  agricultura: ['agrícola', 'agricola', 'ganadería', 'ganaderia', 'rural', 'pesca', 'forestal', 'acuicultura', 'regadío', 'viticultura'],
  cultura: ['cultura', 'patrimonio', 'artes', 'cine', 'teatro', 'música', 'musica', 'libro', 'editorial', 'audiovisual'],
  deporte: ['deporte', 'deportiv', 'olimp', 'atletism', 'federación deportiva'],
  educacion: ['educación', 'educacion', 'formación', 'formacion', 'beca', 'universidad', 'escolar', 'enseñanza', 'escuela', 'fp'],
  empleo: ['empleo', 'contratación', 'contratacion', 'inserción laboral', 'desempleo', 'laboral', 'trabajador', 'paro', 'erte'],
  energia: ['energía', 'energia', 'renovable', 'fotovoltaica', 'eficiencia energética', 'solar', 'eólica', 'biomasa', 'hidrógeno'],
  innovacion: ['innovación', 'innovacion', 'investigación', 'investigacion', 'i+d', 'startup', 'tecnológico', 'ciencia', 'r+d'],
  internacionalizacion: ['internacionalización', 'internacionalizacion', 'exportación', 'exportacion', 'exterior', 'international'],
  juventud: ['juventud', 'joven', 'menor', 'infancia', 'adolescente'],
  'medio-ambiente': ['medio ambiente', 'medioambiental', 'sostenibilidad', 'biodiversidad', 'residuos', 'contaminación', 'clima'],
  ong: ['entidad sin ánimo', 'asociación', 'asociacion', 'ong', 'fundación', 'fundacion', 'voluntariado', 'tercer sector'],
  rehabilitacion: ['rehabilitación', 'rehabilitacion', 'vivienda', 'edificio', 'construcción', 'alquiler', 'accesibilidad'],
  salud: ['salud', 'sanitari', 'hospital', 'biomédica', 'biomedica', 'farmac', 'médico', 'medico', 'enfermedad'],
  tecnologia: ['tecnología', 'tecnologia', 'digital', 'digitalización', 'software', 'inteligencia artificial', 'ciberseguridad'],
  turismo: ['turismo', 'hostelería', 'hosteleria', 'hotel', 'alojamiento', 'turístico'],
};

export const SECTOR_LABELS = {
  autonomos: 'Autonomos y emprendedores',
  empresas: 'Empresas y pymes',
  agricultura: 'Agricultura y ganaderia',
  cultura: 'Cultura y artes',
  deporte: 'Deporte',
  educacion: 'Educacion y formacion',
  empleo: 'Empleo y contratacion',
  energia: 'Energia y sostenibilidad',
  innovacion: 'I+D+i e innovacion',
  internacionalizacion: 'Internacionalizacion',
  juventud: 'Juventud',
  'medio-ambiente': 'Medio ambiente',
  ong: 'ONG y asociaciones',
  rehabilitacion: 'Rehabilitacion y vivienda',
  salud: 'Salud e investigacion medica',
  tecnologia: 'Tecnologia y digitalizacion',
  turismo: 'Turismo',
};

export const CCAA_KEYWORDS = {
  andalucia: ['andalucía', 'andalucia', 'junta de andalucía', 'boja', 'sevilla', 'málaga', 'granada', 'córdoba'],
  aragon: ['aragón', 'aragon', 'zaragoza'],
  asturias: ['asturias', 'principado de asturias', 'gijón', 'gijon', 'oviedo'],
  baleares: ['baleares', 'illes balears', 'mallorca', 'ibiza', 'menorca'],
  canarias: ['canarias', 'canaria', 'tenerife', 'gran canaria', 'las palmas'],
  cantabria: ['cantabria', 'santander'],
  'castilla-la-mancha': ['castilla-la mancha', 'castilla la mancha', 'toledo', 'albacete', 'ciudad real', 'cuenca', 'guadalajara'],
  'castilla-y-leon': ['castilla y león', 'castilla y leon', 'valladolid', 'salamanca', 'burgos', 'ávila', 'avila', 'segovia', 'soria', 'zamora', 'león', 'leon'],
  cataluna: ['cataluña', 'cataluna', 'catalunya', 'generalitat', 'dogc', 'barcelona', 'girona', 'lleida', 'tarragona'],
  'comunidad-valenciana': ['comunitat valenciana', 'comunidad valenciana', 'valencia', 'alicante', 'castellón', 'castellon', 'dogv'],
  extremadura: ['extremadura', 'badajoz', 'cáceres', 'caceres'],
  galicia: ['galicia', 'xunta', 'galega', 'galego', 'vigo', 'coruña', 'a coruña', 'pontevedra', 'ourense', 'lugo'],
  'la-rioja': ['la rioja', 'logroño', 'logrono'],
  madrid: ['comunidad de madrid', 'región de madrid', 'region de madrid', 'bocm', 'madrid capital'],
  murcia: ['región de murcia', 'region de murcia', 'murcia', 'cartagena'],
  navarra: ['navarra', 'nafarroa', 'pamplona'],
  'pais-vasco': ['país vasco', 'pais vasco', 'euskadi', 'euskal', 'bopv', 'bilbao', 'vitoria', 'donostia', 'san sebastián', 'san sebastian'],
};

export const CCAA_LABELS = {
  andalucia: 'Andalucia',
  aragon: 'Aragon',
  asturias: 'Asturias',
  baleares: 'Baleares',
  canarias: 'Canarias',
  cantabria: 'Cantabria',
  'castilla-la-mancha': 'Castilla-La Mancha',
  'castilla-y-leon': 'Castilla y Leon',
  cataluna: 'Cataluna',
  'comunidad-valenciana': 'Comunidad Valenciana',
  extremadura: 'Extremadura',
  galicia: 'Galicia',
  'la-rioja': 'La Rioja',
  madrid: 'Madrid',
  murcia: 'Murcia',
  navarra: 'Navarra',
  'pais-vasco': 'Pais Vasco',
  nacional: 'Nacional',
};

const CCAA_MAP = {
  'andalucía': 'andalucia',
  'aragon': 'aragon',
  'aragón': 'aragon',
  'asturias': 'asturias',
  'illes balears': 'baleares',
  'canarias': 'canarias',
  'cantabria': 'cantabria',
  'castilla - la mancha': 'castilla-la-mancha',
  'castilla la mancha': 'castilla-la-mancha',
  'castilla y león': 'castilla-y-leon',
  'castilla y leon': 'castilla-y-leon',
  'cataluña': 'cataluna',
  'cataluna': 'cataluna',
  'comunitat valenciana': 'comunidad-valenciana',
  'comunidad valenciana': 'comunidad-valenciana',
  'extremadura': 'extremadura',
  'galicia': 'galicia',
  'la rioja': 'la-rioja',
  'comunidad de madrid': 'madrid',
  'región de murcia': 'murcia',
  'region de murcia': 'murcia',
  'comunidad foral de navarra': 'navarra',
  'navarra': 'navarra',
  'país vasco': 'pais-vasco',
  'pais vasco': 'pais-vasco',
  'ceuta': 'nacional',
  'melilla': 'nacional',
  'estatal': 'nacional',
  'local': 'nacional',
};

export function normalizeText(text = '') {
  return String(text)
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .trim();
}

export function inferirSectores(titulo = '', desc = '') {
  const t = normalizeText(`${titulo} ${desc}`).toLowerCase();
  const sectores = [];
  for (const [slug, kws] of Object.entries(SECTORES_MAP)) {
    if (kws.some(kw => t.includes(kw))) sectores.push(slug);
  }
  return sectores;
}

export function inferirCCAA(texto = '') {
  const t = normalizeText(texto).toLowerCase();
  const encontradas = [];
  for (const [slug, kws] of Object.entries(CCAA_KEYWORDS)) {
    if (kws.some(kw => t.includes(kw))) encontradas.push(slug);
  }
  return encontradas;
}

export function normalizarCCAA(texto = '') {
  const t = normalizeText(texto).toLowerCase();
  return CCAA_MAP[t] ?? null;
}

export function labelList(values = [], labels = {}) {
  const unique = [...new Set((values || []).filter(Boolean))];
  return unique.map(value => labels[value] || value).join(' | ');
}
