-- Migración: Simplificar y corregir política RLS de SELECT para event_registrations
-- Ejecutada: 2025-12-18
-- Descripción: Corrige la política para permitir que usuarios autenticados vean
--               sus registros usando la función get_user_email() existente

-- Asegurar que la función get_user_email() existe (de la migración anterior)
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS text AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar política existente que puede estar causando problemas
DROP POLICY IF EXISTS "Users can view registrations by email" ON event_registrations;
DROP POLICY IF EXISTS "Users can view own registrations" ON event_registrations;

-- Crear política simplificada que permite ver registros por user_id o por email
-- Usa la función get_user_email() que tiene SECURITY DEFINER
CREATE POLICY "Users can view own registrations"
  ON event_registrations FOR SELECT
  TO authenticated
  USING (
    -- Si el registro tiene user_id, debe coincidir con el usuario autenticado
    user_id = auth.uid()
    OR
    -- Si el registro tiene email, verificar que coincida con el email del usuario autenticado
    -- usando la función SECURITY DEFINER que puede acceder a auth.users
    (
      email IS NOT NULL 
      AND email = get_user_email()
    )
  );

-- Comentarios
COMMENT ON POLICY "Users can view own registrations" ON event_registrations IS 
  'Permite que usuarios autenticados vean sus propios registros de eventos, ya sea por user_id o por email. Usa la función get_user_email() para evitar problemas de permisos RLS.';
