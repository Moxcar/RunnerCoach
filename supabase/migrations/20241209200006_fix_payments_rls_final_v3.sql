-- Migración: Solución final definitiva para RLS de payments
-- Ejecutada: 2024-12-09
-- Esta versión elimina todas las políticas y crea una nueva desde cero

-- Eliminar TODAS las políticas de INSERT de payments para clientes
DROP POLICY IF EXISTS "Clients can insert own payments" ON payments;

-- Verificar que no hay políticas conflictivas
-- (Esto es solo informativo, no hace nada si no existen)

-- Crear política completamente nueva con verificación explícita
-- Usamos una estrategia diferente: verificar que el cliente existe
-- y que el coach_id que se inserta es el mismo que el del cliente
CREATE POLICY "Clients can insert own payments"
  ON payments FOR INSERT
  WITH CHECK (
    -- Condición 1: El usuario autenticado debe ser el client_user_id
    (auth.uid() = client_user_id)
    AND
    -- Condición 2: Debe existir un perfil de cliente para este usuario
    (EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'client'
    ))
    AND
    -- Condición 3: Debe existir un registro en clients para este usuario
    (EXISTS (
      SELECT 1 
      FROM clients 
      WHERE clients.user_id = auth.uid()
    ))
    AND
    -- Condición 4: El coach_id que se inserta debe coincidir con el del cliente
    -- Esta es la parte crítica - usamos una subconsulta escalar
    (payments.coach_id = (
      SELECT c.coach_id 
      FROM clients c
      WHERE c.user_id = auth.uid()
      LIMIT 1
    ))
  );

-- Comentario: Si esta política aún falla, el problema puede ser:
-- 1. El usuario no tiene un registro en clients
-- 2. El coach_id que se está insertando no coincide con el del cliente
-- 3. Hay un problema con la autenticación (auth.uid() es null)








