-- Migración: Corregir política RLS de event_registrations que intenta acceder a auth.users
-- Ejecutada: 2025-12-18
-- Descripción: Elimina el acceso directo a auth.users desde la política RLS que causa "permission denied"
--               Usa una función SECURITY DEFINER en su lugar

-- Función helper para obtener el email del usuario autenticado (SECURITY DEFINER)
-- Esta función puede acceder a auth.users porque tiene SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS text AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar la política problemática que intenta acceder directamente a auth.users
DROP POLICY IF EXISTS "Users can view registrations by email" ON event_registrations;

-- Crear nueva política que usa la función SECURITY DEFINER en lugar de acceder directamente a auth.users
CREATE POLICY "Users can view registrations by email"
  ON event_registrations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (email IS NOT NULL AND email = get_user_email())
  );

-- Comentarios
COMMENT ON FUNCTION get_user_email() IS 
  'Función SECURITY DEFINER para obtener el email del usuario autenticado sin problemas de permisos RLS. Necesaria porque las políticas RLS no pueden acceder directamente a auth.users.';
