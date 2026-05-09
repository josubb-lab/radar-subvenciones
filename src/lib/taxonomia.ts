export const SECTORES = [
  { slug: 'autonomos',          nombre: 'Autónomos y emprendedores' },
  { slug: 'empresas',           nombre: 'Empresas y pymes' },
  { slug: 'agricultura',        nombre: 'Agricultura y ganadería' },
  { slug: 'cultura',            nombre: 'Cultura y artes' },
  { slug: 'deporte',            nombre: 'Deporte' },
  { slug: 'educacion',          nombre: 'Educación y formación' },
  { slug: 'empleo',             nombre: 'Empleo y contratación' },
  { slug: 'energia',            nombre: 'Energía y sostenibilidad' },
  { slug: 'innovacion',         nombre: 'I+D+i e innovación' },
  { slug: 'internacionalizacion', nombre: 'Internacionalización' },
  { slug: 'juventud',           nombre: 'Juventud' },
  { slug: 'medio-ambiente',     nombre: 'Medio ambiente' },
  { slug: 'ong',                nombre: 'ONG y asociaciones' },
  { slug: 'rehabilitacion',     nombre: 'Rehabilitación y vivienda' },
  { slug: 'salud',              nombre: 'Salud e investigación médica' },
  { slug: 'tecnologia',         nombre: 'Tecnología y digitalización' },
  { slug: 'turismo',            nombre: 'Turismo' },
]

export const CCAA = [
  { slug: 'andalucia',           nombre: 'Andalucía' },
  { slug: 'aragon',              nombre: 'Aragón' },
  { slug: 'asturias',            nombre: 'Asturias' },
  { slug: 'baleares',            nombre: 'Baleares' },
  { slug: 'canarias',            nombre: 'Canarias' },
  { slug: 'cantabria',           nombre: 'Cantabria' },
  { slug: 'castilla-la-mancha',  nombre: 'Castilla-La Mancha' },
  { slug: 'castilla-y-leon',     nombre: 'Castilla y León' },
  { slug: 'cataluna',            nombre: 'Cataluña' },
  { slug: 'comunidad-valenciana', nombre: 'Comunidad Valenciana' },
  { slug: 'extremadura',         nombre: 'Extremadura' },
  { slug: 'galicia',             nombre: 'Galicia' },
  { slug: 'la-rioja',            nombre: 'La Rioja' },
  { slug: 'madrid',              nombre: 'Madrid' },
  { slug: 'murcia',              nombre: 'Murcia' },
  { slug: 'navarra',             nombre: 'Navarra' },
  { slug: 'pais-vasco',          nombre: 'País Vasco' },
  { slug: 'nacional',            nombre: 'Nacional (toda España)' },
]

export function slugToSector(slug: string) {
  return SECTORES.find(s => s.slug === slug)
}

export function slugToCCAA(slug: string) {
  return CCAA.find(c => c.slug === slug)
}
