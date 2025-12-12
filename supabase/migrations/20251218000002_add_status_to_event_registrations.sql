-- Migración: Agregar campo status a event_registrations
-- Ejecutada: 2025-12-18
-- Descripción: Agrega campo status para rastrear el estado de las inscripciones (pending, approved)

-- Agregar columna status con valores por defecto
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Agregar constraint para validar valores de status
ALTER TABLE event_registrations
DROP CONSTRAINT IF EXISTS event_registrations_status_check;

ALTER TABLE event_registrations
ADD CONSTRAINT event_registrations_status_check
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Actualizar registros existentes a 'approved' por defecto (para mantener compatibilidad)
UPDATE event_registrations
SET status = 'approved'
WHERE status IS NULL OR status = 'pending';

-- Agregar índice para búsquedas por status
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(status);

-- Comentarios
COMMENT ON COLUMN event_registrations.status IS 'Estado de la inscripción: pending (pendiente), approved (aprobada), rejected (rechazada)';
