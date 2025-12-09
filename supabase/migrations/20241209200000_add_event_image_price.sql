-- Migración: Agregar image_url y price a eventos
-- Ejecutada: 2024-12-09

-- Agregar columna image_url para almacenar la URL de la imagen del evento
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS image_url text;

-- Agregar columna price para almacenar el precio del evento (0 para eventos gratis)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS price decimal(10,2) DEFAULT 0 NOT NULL;

-- Actualizar política para que eventos públicos sean visibles sin autenticación
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;

CREATE POLICY "Public events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

