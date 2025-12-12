-- Migración: Solución simple y directa para RLS de payments
-- Ejecutada: 2024-12-09
-- Esta versión usa una verificación más simple sin funciones auxiliares

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "Clients can insert own payments" ON payments;

-- Crear política simple que verifica directamente
-- La clave es usar una subconsulta que obtiene el coach_id del cliente
-- y compararlo directamente con el valor que se está insertando
CREATE POLICY "Clients can insert own payments"
  ON payments FOR INSERT
  WITH CHECK (
    -- Verificar que el usuario autenticado es el que hace el pago
    auth.uid() = client_user_id 
    AND
    -- Verificar que es un cliente
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'client'
    )
    AND
    -- Verificar que el coach_id insertado coincide con el coach_id del cliente
    -- Usamos una subconsulta escalar para obtener el coach_id del cliente
    payments.coach_id = (
      SELECT clients.coach_id 
      FROM clients 
      WHERE clients.user_id = auth.uid()
      LIMIT 1
    )
  );








