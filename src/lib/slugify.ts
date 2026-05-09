export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function subvencionSlug(titulo: string, id: string): string {
  return `${slugify(titulo).slice(0, 60)}-${id.slice(0, 8)}`
}
