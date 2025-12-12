-- Migración: Agregar campo slug a eventos para URLs personalizadas
-- Ejecutada: 2025-12-16
-- Descripción: Permite usar slugs personalizados en lugar de UUIDs en las URLs de eventos

-- Agregar campo slug
ALTER TABLE events
ADD COLUMN IF NOT EXISTS slug text;

-- Crear índice único para slug (permitir NULL para compatibilidad con eventos existentes)
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique_idx 
ON events (slug) 
WHERE slug IS NOT NULL;

-- Comentario para documentación
COMMENT ON COLUMN events.slug IS 'Slug personalizado para la URL del evento (ej: uby-protrail-2025). Debe ser único si se proporciona.';
