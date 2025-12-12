-- Migración: Agregar columna email a event_registrations para registro sin cuenta
-- Ejecutada: 2025-12-13
-- Descripción: Permite que usuarios sin cuenta se registren a eventos solo con email

-- Agregar columna email (opcional, puede ser NULL para usuarios con cuenta)
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS email text;

-- Agregar índice para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_event_registrations_email ON event_registrations(email);

-- Agregar constraint para asegurar que o user_id o email esté presente
ALTER TABLE event_registrations
DROP CONSTRAINT IF EXISTS event_registrations_user_or_email_check;

ALTER TABLE event_registrations
ADD CONSTRAINT event_registrations_user_or_email_check 
CHECK (
  (user_id IS NOT NULL) OR (email IS NOT NULL)
);

-- Actualizar políticas RLS para permitir inserción sin autenticación cuando se usa email
DROP POLICY IF EXISTS "Allow public event registration with email" ON event_registrations;

CREATE POLICY "Allow public event registration with email"
  ON event_registrations FOR INSERT
  TO public
  WITH CHECK (
    email IS NOT NULL AND
    user_id IS NULL AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_registrations.event_id
      AND events.date >= CURRENT_DATE
    )
  );

-- Política para que usuarios autenticados puedan ver sus registros por email
DROP POLICY IF EXISTS "Users can view registrations by email" ON event_registrations;

CREATE POLICY "Users can view registrations by email"
  ON event_registrations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Comentarios
COMMENT ON COLUMN event_registrations.email IS 'Email del usuario cuando se registra sin cuenta. NULL si el usuario tiene cuenta.';
COMMENT ON CONSTRAINT event_registrations_user_or_email_check ON event_registrations IS 'Asegura que o user_id o email esté presente';

