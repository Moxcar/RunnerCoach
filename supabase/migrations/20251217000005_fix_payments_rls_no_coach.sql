-- Migración: Corregir política RLS de payments para permitir pagos sin coach asignado
-- Ejecutada: 2025-12-17
-- Descripción: Actualiza la política RLS de payments para permitir que usuarios
--               se registren a eventos y creen pagos incluso si no tienen coach asignado.
--               El coach_id del pago viene del evento, no del cliente.

-- Eliminar política existente
DROP POLICY IF EXISTS "Clients can insert own payments" ON payments;

-- Crear nueva política que permite pagos sin requerir coach asignado al cliente
-- Simplificada: Cualquier usuario autenticado puede crear un pago para un evento
CREATE POLICY "Clients can insert own payments"
  ON payments FOR INSERT
  WITH CHECK (
    -- Condición 1: El usuario autenticado debe ser el client_user_id
    auth.uid() = client_user_id
    AND
    -- Condición 2: Debe existir un perfil de usuario (cualquier rol)
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid()
    )
    AND
    (
      -- Condición 3a: Si el cliente tiene coach_id asignado, debe coincidir con el del pago
      -- (para mantener seguridad: solo puede pagar a su coach asignado)
      (
        EXISTS (
          SELECT 1 
          FROM clients 
          WHERE clients.user_id = auth.uid() 
          AND clients.coach_id IS NOT NULL
        )
        AND
        payments.coach_id = (
          SELECT c.coach_id 
          FROM clients c
          WHERE c.user_id = auth.uid()
          LIMIT 1
        )
      )
      OR
      -- Condición 3b: Si el cliente NO tiene coach_id (NULL) o no existe en clients,
      -- permitir el pago (el coach_id viene del evento y se asignará después)
      (
        NOT EXISTS (
          SELECT 1 
          FROM clients 
          WHERE clients.user_id = auth.uid() 
          AND clients.coach_id IS NOT NULL
        )
      )
    )
  );
