-- Migración: Permitir que los clientes actualicen su propio registro y creen su registro si no existe
-- Ejecutada: 2025-12-12
-- Descripción: Agrega políticas RLS para que los clientes puedan actualizar su plan_id
--               y crear su propio registro en clients si no existe

-- Clientes pueden actualizar su propio registro (especialmente plan_id)
CREATE POLICY "Clients can update own record"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'client'
    ) AND
    user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'client'
    ) AND
    user_id = auth.uid()
  );

-- Clientes pueden insertar su propio registro si no existe
CREATE POLICY "Clients can insert own record"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'client'
    ) AND
    user_id = auth.uid()
  );
