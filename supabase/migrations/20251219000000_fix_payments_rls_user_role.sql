-- Migración: Corregir política RLS de payments para usuarios con rol 'user'
-- Ejecutada: 2025-12-19
-- Descripción: La política actual verifica rol 'client' pero los usuarios tienen rol 'user'.
--               Esta migración corrige la política SELECT para que usuarios con rol 'user'
--               puedan ver sus propios pagos.

-- Eliminar la política existente que verifica rol 'client'
DROP POLICY IF EXISTS "Clients can view own payments" ON payments;

-- Crear nueva política que verifica rol 'user'
CREATE POLICY "Clients can view own payments"
  ON payments FOR SELECT
  USING (
    -- El usuario autenticado debe ser el client_user_id
    (auth.uid() = client_user_id)
    AND
    -- Debe existir un perfil de usuario con rol 'user'
    (EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'user'
    ))
  );

-- Comentario
COMMENT ON POLICY "Clients can view own payments" ON payments IS 
  'Permite a usuarios con rol user ver sus propios pagos donde client_user_id coincide con auth.uid()';
