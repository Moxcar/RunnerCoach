-- Migración: Agregar max_capacity a eventos
-- Ejecutada: 2024-12-10

-- Agregar columna max_capacity para almacenar el cupo máximo del evento (opcional, NULL = sin límite)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS max_capacity integer;

-- Comentario para documentar el campo
COMMENT ON COLUMN events.max_capacity IS 'Cupo máximo del evento. NULL significa sin límite de cupo.';

