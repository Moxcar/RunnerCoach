-- Migración: Asegurar políticas RLS de event_registrations
-- Ejecutada: 2024-12-09

-- Asegurar que clientes pueden insertar registros
DROP POLICY IF EXISTS "Clients can insert own registrations" ON event_registrations;

CREATE POLICY "Clients can insert own registrations"
  ON event_registrations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'client'
    ) AND
    EXISTS (
      SELECT 1 FROM events
      JOIN clients ON clients.coach_id = events.coach_id
      WHERE events.id = event_registrations.event_id
      AND clients.user_id = auth.uid()
    )
  );








