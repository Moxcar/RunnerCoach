-- Migración: Agregar políticas RLS para coaches en event_registrations
-- Ejecutada: 2025-12-18
-- Descripción: Permite que los coaches vean y gestionen las inscripciones de sus clientes a eventos

-- Función helper para verificar si un usuario es coach aprobado (si no existe)
CREATE OR REPLACE FUNCTION is_approved_coach(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'coach' AND is_approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Coaches pueden ver registros de sus clientes
DROP POLICY IF EXISTS "Coaches can view client registrations" ON event_registrations;

CREATE POLICY "Coaches can view client registrations"
  ON event_registrations FOR SELECT
  USING (
    is_approved_coach(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = event_registrations.client_id
      AND clients.coach_id = auth.uid()
    )
  );

-- Coaches pueden actualizar el status de las inscripciones de sus clientes
DROP POLICY IF EXISTS "Coaches can update client registrations" ON event_registrations;

CREATE POLICY "Coaches can update client registrations"
  ON event_registrations FOR UPDATE
  USING (
    is_approved_coach(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = event_registrations.client_id
      AND clients.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    is_approved_coach(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = event_registrations.client_id
      AND clients.coach_id = auth.uid()
    )
  );

-- Prevenir que coaches se registren a eventos
-- Modificar la política existente para excluir coaches
DROP POLICY IF EXISTS "Users can insert own registrations" ON event_registrations;

CREATE POLICY "Users can insert own registrations"
  ON event_registrations FOR INSERT
  WITH CHECK (
    -- Solo verificar que el usuario esté autenticado y que el user_id coincida
    auth.uid() = user_id AND
    -- Verificar que el usuario tenga un perfil (cualquier rol)
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    ) AND
    -- Excluir coaches (solo pueden registrar a sus clientes, no a sí mismos)
    NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'coach'
    )
  );

-- Comentarios
COMMENT ON POLICY "Coaches can view client registrations" ON event_registrations IS 
  'Permite que los coaches vean las inscripciones de sus clientes a eventos';

COMMENT ON POLICY "Coaches can update client registrations" ON event_registrations IS 
  'Permite que los coaches actualicen el status de las inscripciones de sus clientes (aprobar/rechazar)';
