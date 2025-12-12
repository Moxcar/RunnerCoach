-- Migración: Agregar link_type a registration_links
-- Ejecutada: 2025-12-12
-- Descripción: Agrega campo link_type para distinguir entre enlaces de clientes y coaches
--               y permite que coach_id sea NULL para enlaces de registro de coaches

-- Primero, hacer coach_id nullable (necesario para enlaces de coaches)
ALTER TABLE registration_links 
ALTER COLUMN coach_id DROP NOT NULL;

-- Agregar columna link_type
ALTER TABLE registration_links 
ADD COLUMN IF NOT EXISTS link_type text DEFAULT 'client' CHECK (link_type IN ('client', 'coach'));

-- Actualizar enlaces existentes para que sean de tipo 'client' (compatibilidad hacia atrás)
UPDATE registration_links 
SET link_type = 'client' 
WHERE link_type IS NULL;

-- Hacer link_type NOT NULL después de actualizar valores existentes
ALTER TABLE registration_links 
ALTER COLUMN link_type SET NOT NULL;

-- Agregar constraint: si link_type es 'client', coach_id debe ser NOT NULL
-- Si link_type es 'coach', coach_id puede ser NULL
ALTER TABLE registration_links 
ADD CONSTRAINT registration_links_client_requires_coach 
CHECK (
  (link_type = 'client' AND coach_id IS NOT NULL) OR 
  (link_type = 'coach')
);

-- Crear índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_registration_links_type ON registration_links(link_type);

-- Comentarios
COMMENT ON COLUMN registration_links.link_type IS 'Tipo de enlace: "client" para asignar clientes a coaches, "coach" para registro de nuevos coaches';
COMMENT ON COLUMN registration_links.coach_id IS 'ID del coach. NULL solo para enlaces de tipo "coach"';

