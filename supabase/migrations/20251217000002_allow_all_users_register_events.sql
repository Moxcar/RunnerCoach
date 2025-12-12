-- Migración: Permitir que cualquier usuario autenticado se registre a eventos
-- Ejecutada: 2025-12-17
-- Descripción: Actualiza la política RLS de event_registrations para permitir
--               que cualquier usuario autenticado se registre a eventos,
--               sin requerir coach ni plan asignado.

-- Eliminar política existente que requiere coach
DROP POLICY IF EXISTS "Clients can insert own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can insert own registrations" ON event_registrations;

-- Crear nueva política que permite a cualquier usuario autenticado registrarse
CREATE POLICY "Users can insert own registrations"
  ON event_registrations FOR INSERT
  WITH CHECK (
    -- Solo verificar que el usuario esté autenticado y que el user_id coincida
    auth.uid() = user_id AND
    -- Verificar que el usuario tenga un perfil (cualquier rol)
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- Comentario para documentación
COMMENT ON POLICY "Users can insert own registrations" ON event_registrations IS 
  'Permite que cualquier usuario autenticado se registre a eventos. No requiere coach ni plan asignado.';
