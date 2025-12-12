-- Migración: Agregar políticas RLS para admins en event_registrations
-- Ejecutada: 2025-12-18
-- Descripción: Permite que los admins vean todos los registros de eventos para poder contar inscritos

-- Función helper para verificar si un usuario es admin (si no existe)
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin puede ver todos los registros de eventos
DROP POLICY IF EXISTS "Admins can view all event registrations" ON event_registrations;

CREATE POLICY "Admins can view all event registrations"
  ON event_registrations FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin puede actualizar todos los registros de eventos
DROP POLICY IF EXISTS "Admins can update all event registrations" ON event_registrations;

CREATE POLICY "Admins can update all event registrations"
  ON event_registrations FOR UPDATE
  USING (is_admin(auth.uid()));

-- Admin puede eliminar todos los registros de eventos
DROP POLICY IF EXISTS "Admins can delete all event registrations" ON event_registrations;

CREATE POLICY "Admins can delete all event registrations"
  ON event_registrations FOR DELETE
  USING (is_admin(auth.uid()));

-- Comentarios
COMMENT ON POLICY "Admins can view all event registrations" ON event_registrations IS 
  'Permite que los admins vean todos los registros de eventos para poder contar inscritos y gestionar eventos';
