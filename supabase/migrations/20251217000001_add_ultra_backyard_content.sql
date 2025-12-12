-- Migración: Agregar campos de contenido personalizado para Ultra Backyard
-- Ejecutada: 2025-12-17
-- Descripción: Permite contenido personalizado para eventos Ultra Backyard

-- Agregar campos de texto personalizado para Ultra Backyard
ALTER TABLE events
ADD COLUMN IF NOT EXISTS ultra_backyard_intro text;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS ultra_backyard_description text;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS ultra_backyard_conclusion text;

-- Comentarios para documentación
COMMENT ON COLUMN events.ultra_backyard_intro IS 'Texto introductorio personalizado para eventos Ultra Backyard (ej: "Tu propio Ultra Backyard. Tu reto personal.")';
COMMENT ON COLUMN events.ultra_backyard_description IS 'Descripción detallada del desafío Ultra Backyard';
COMMENT ON COLUMN events.ultra_backyard_conclusion IS 'Texto de conclusión/motivacional para eventos Ultra Backyard';
