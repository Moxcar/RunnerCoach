-- Migración: Agregar campos extendidos opcionales a eventos
-- Ejecutada: 2025-12-14
-- Descripción: Permite información extendida para eventos especiales (Ultra Backyard, etc.)

-- Agregar campos de loop (para eventos tipo Ultra Backyard)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS loop_distance decimal(5,2);

ALTER TABLE events
ADD COLUMN IF NOT EXISTS loop_elevation integer;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS loop_duration integer;

-- Agregar campo de premios
ALTER TABLE events
ADD COLUMN IF NOT EXISTS prize_pool decimal(10,2);

-- Agregar campos de fechas extendidas
ALTER TABLE events
ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS end_date date;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS registration_deadline date;

-- Agregar tipo de evento y URL externa
ALTER TABLE events
ADD COLUMN IF NOT EXISTS event_type text;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS external_registration_url text;

-- Comentarios para documentación
COMMENT ON COLUMN events.loop_distance IS 'Distancia del loop en km (ej: 5.2 para Ultra Backyard)';
COMMENT ON COLUMN events.loop_elevation IS 'Elevación del loop en metros (ej: 221)';
COMMENT ON COLUMN events.loop_duration IS 'Duración del loop en minutos (ej: 60)';
COMMENT ON COLUMN events.prize_pool IS 'Bolsa de premios total en MXN';
COMMENT ON COLUMN events.start_date IS 'Fecha de inicio para eventos multi-día';
COMMENT ON COLUMN events.end_date IS 'Fecha de fin para eventos multi-día';
COMMENT ON COLUMN events.registration_deadline IS 'Fecha límite de inscripción';
COMMENT ON COLUMN events.event_type IS 'Tipo de evento (ultra_backyard, marathon, trail, etc.)';
COMMENT ON COLUMN events.external_registration_url IS 'URL externa para registro (opcional)';

