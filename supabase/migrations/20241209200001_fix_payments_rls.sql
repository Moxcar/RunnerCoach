-- Migración: Corregir política RLS de payments
-- Ejecutada: 2024-12-09
-- Problema: La política anterior fallaba durante INSERT porque verificaba payments.coach_id
-- Solución: Usar IN con subconsulta en lugar de EXISTS con comparación directa

-- Eliminar la política problemática
DROP POLICY IF EXISTS "Clients can insert own payments" ON payments;

-- Crear la política corregida
CREATE POLICY "Clients can insert own payments"
  ON payments FOR INSERT
  WITH CHECK (
    auth.uid() = client_user_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'client'
    ) AND
    payments.coach_id IN (
      SELECT clients.coach_id 
      FROM clients 
      WHERE clients.user_id = auth.uid()
    )
  );

