-- Migración: Asegurar políticas RLS de events
-- Ejecutada: 2024-12-09

-- Asegurar que coaches pueden insertar eventos
DROP POLICY IF EXISTS "Coaches can insert own events" ON events;

CREATE POLICY "Coaches can insert own events"
  ON events FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'coach'
    )
  );








