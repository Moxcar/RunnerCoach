-- Migración: Corregir política RLS de payments (versión mejorada)
-- Ejecutada: 2024-12-09
-- Problema: La política con IN aún puede fallar en algunos casos
-- Solución: Usar una función auxiliar o verificación más directa

-- Eliminar la política anterior
DROP POLICY IF EXISTS "Clients can insert own payments" ON payments;

-- Crear función auxiliar para verificar que el cliente pertenece al coach
-- Esto hace la verificación más explícita y confiable
CREATE OR REPLACE FUNCTION check_client_coach_match(
  p_client_user_id uuid,
  p_coach_id uuid
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM clients 
    WHERE clients.user_id = p_client_user_id
    AND clients.coach_id = p_coach_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear la política usando la función auxiliar
CREATE POLICY "Clients can insert own payments"
  ON payments FOR INSERT
  WITH CHECK (
    auth.uid() = client_user_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'client'
    ) AND
    check_client_coach_match(auth.uid(), payments.coach_id)
  );

