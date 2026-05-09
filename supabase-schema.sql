-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS subvenciones (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo        text        NOT NULL,
  organismo     text,
  descripcion   text,
  importe_max   numeric,
  importe_texto text,
  fecha_pub     date,
  fecha_cierre  date,
  plazo_texto   text,
  url           text        UNIQUE NOT NULL,
  sector        text[]      DEFAULT '{}',
  ccaa          text[]      DEFAULT '{}',
  tipo          text        DEFAULT 'convocatoria',
  activa        boolean     DEFAULT true,
  fuente        text,
  creado_en     timestamptz DEFAULT now()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_subvenciones_activa     ON subvenciones (activa);
CREATE INDEX IF NOT EXISTS idx_subvenciones_fecha_pub  ON subvenciones (fecha_pub DESC);
CREATE INDEX IF NOT EXISTS idx_subvenciones_sector     ON subvenciones USING GIN (sector);
CREATE INDEX IF NOT EXISTS idx_subvenciones_ccaa       ON subvenciones USING GIN (ccaa);

-- Acceso público de lectura (para el frontend)
ALTER TABLE subvenciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública" ON subvenciones
  FOR SELECT USING (true);
