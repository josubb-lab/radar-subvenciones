-- Tabla para captar leads B2B desde la landing y la home

CREATE TABLE IF NOT EXISTS leads_asesorias (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre        text        NOT NULL,
  empresa       text        NOT NULL,
  email         text        NOT NULL UNIQUE,
  tipo_despacho text        NOT NULL,
  clientes      text,
  interes       text,
  origen        text        DEFAULT 'web-b2b',
  creado_en     timestamptz DEFAULT now()
);

ALTER TABLE leads_asesorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insercion publica leads asesorias" ON leads_asesorias
  FOR INSERT WITH CHECK (true);
