-- Migración: Corregir políticas RLS de clients para usar rol 'user' en lugar de 'client'
-- Ejecutada: 2025-12-17
-- Descripción: Las políticas RLS estaban verificando el rol 'client' pero en la base de datos
--               los usuarios tienen el rol 'user'. Esta migración corrige las políticas para
--               verificar el rol correcto.

-- Eliminar políticas existentes que usan 'client'
DROP POLICY IF EXISTS "Clients can update own record" ON clients;
DROP POLICY IF EXISTS "Clients can insert own record" ON clients;
DROP POLICY IF EXISTS "Clients can view own record" ON clients;

-- Clientes (usuarios con rol 'user') pueden ver su propio registro
CREATE POLICY "Clients can view own record"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'user'
    ) AND
    user_id = auth.uid()
  );

-- Clientes (usuarios con rol 'user') pueden actualizar su propio registro
CREATE POLICY "Clients can update own record"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'user'
    ) AND
    user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'user'
    ) AND
    user_id = auth.uid()
  );

-- Clientes (usuarios con rol 'user') pueden insertar su propio registro si no existe
CREATE POLICY "Clients can insert own record"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'user'
    ) AND
    user_id = auth.uid()
  );

-- También corregir la política de eventos que verifica el rol 'client'
DROP POLICY IF EXISTS "Clients can view all events" ON events;
CREATE POLICY "Clients can view all events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'user'
    )
  );

-- Corregir política de payments que verifica el rol 'client'
DROP POLICY IF EXISTS "Clients can insert own payments" ON payments;
CREATE POLICY "Clients can insert own payments"
  ON payments FOR INSERT
  WITH CHECK (
    -- Condición 1: El usuario autenticado debe ser el client_user_id
    (auth.uid() = client_user_id)
    AND
    -- Condición 2: Debe existir un perfil de cliente para este usuario (rol 'user')
    (EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'user'
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
    (payments.coach_id = (
      SELECT c.coach_id 
      FROM clients c
      WHERE c.user_id = auth.uid()
      LIMIT 1
    ))
  );
