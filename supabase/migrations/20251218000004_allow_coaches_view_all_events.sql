-- Migración: Permitir que coaches vean todos los eventos
-- Ejecutada: 2025-12-18
-- Descripción: Los coaches necesitan ver todos los eventos para poder ver las inscripciones de sus clientes,
--               no solo los eventos que ellos crearon

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

-- Agregar política para que coaches puedan ver todos los eventos (no solo los suyos)
-- Esto es necesario para que puedan ver las inscripciones de sus clientes
DROP POLICY IF EXISTS "Coaches can view all events" ON events;

CREATE POLICY "Coaches can view all events"
  ON events FOR SELECT
  USING (is_approved_coach(auth.uid()));

-- Comentario
COMMENT ON POLICY "Coaches can view all events" ON events IS 
  'Permite que los coaches vean todos los eventos para poder ver las inscripciones de sus clientes, no solo los eventos que ellos crearon';
