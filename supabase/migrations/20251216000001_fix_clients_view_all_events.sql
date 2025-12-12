-- Migración: Permitir que clientes vean todos los eventos
-- Ejecutada: 2025-12-16
-- Descripción: Los clientes deben poder ver todos los eventos, no solo los de su coach

-- Eliminar la política restrictiva que solo permite ver eventos del coach
DROP POLICY IF EXISTS "Clients can view coach events" ON events;

-- Crear nueva política que permite a todos los clientes ver todos los eventos
CREATE POLICY "Clients can view all events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );
