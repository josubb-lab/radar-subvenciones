-- Migrar registros existentes de hallazgos → subvenciones
-- Ejecutar una sola vez en el SQL Editor de Supabase

INSERT INTO subvenciones (titulo, descripcion, fuente, fecha_pub, url, sector, ccaa, tipo, activa)
SELECT
  titulo,
  descripcion,
  fuente,
  fecha::date,
  url,
  '{}'::text[],
  '{nacional}'::text[],
  'convocatoria',
  true
FROM hallazgos
WHERE nicho = 'subvenciones'
  AND url IS NOT NULL
ON CONFLICT (url) DO NOTHING;
