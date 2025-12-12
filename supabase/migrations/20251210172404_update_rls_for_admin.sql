-- Migración: Actualizar políticas RLS para admin
-- Ejecutada: 2025-12-10
-- Descripción: Actualiza todas las políticas RLS para incluir permisos de admin

-- Función helper para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función helper para verificar si un usuario es coach aprobado
CREATE OR REPLACE FUNCTION is_approved_coach(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'coach' AND is_approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USER_PROFILES RLS
-- ============================================

-- Eliminar políticas existentes de user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Admin puede ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin puede editar todos los perfiles
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (is_admin(auth.uid()));

-- Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Usuarios pueden actualizar su propio perfil
-- La restricción de no cambiar rol/is_approved se maneja con un trigger
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger para prevenir que usuarios cambien su propio rol o is_approved
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el usuario no es admin, no puede cambiar su rol o is_approved
  IF NOT is_admin(auth.uid()) THEN
    -- Si intenta cambiar el rol, mantener el anterior
    IF OLD.role != NEW.role THEN
      NEW.role := OLD.role;
    END IF;
    -- Si intenta cambiar is_approved, mantener el anterior
    IF OLD.is_approved IS DISTINCT FROM NEW.is_approved THEN
      NEW.is_approved := OLD.is_approved;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_prevent_role_change ON user_profiles;
CREATE TRIGGER trigger_prevent_role_change
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();

-- ============================================
-- CLIENTS RLS
-- ============================================

-- Eliminar políticas existentes de clients
DROP POLICY IF EXISTS "Coaches can view own clients" ON clients;
DROP POLICY IF EXISTS "Coaches can insert clients" ON clients;
DROP POLICY IF EXISTS "Coaches can update own clients" ON clients;

-- Admin puede ver todos los clientes
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin puede insertar clientes
CREATE POLICY "Admins can insert clients"
  ON clients FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Admin puede actualizar todos los clientes
CREATE POLICY "Admins can update all clients"
  ON clients FOR UPDATE
  USING (is_admin(auth.uid()));

-- Coaches aprobados pueden ver sus clientes
CREATE POLICY "Coaches can view own clients"
  ON clients FOR SELECT
  USING (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- Coaches aprobados pueden actualizar sus clientes
CREATE POLICY "Coaches can update own clients"
  ON clients FOR UPDATE
  USING (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- Clientes pueden ver su propio registro
CREATE POLICY "Clients can view own record"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'client'
    ) AND
    user_id = auth.uid()
  );

-- ============================================
-- PAYMENTS RLS
-- ============================================

-- Eliminar políticas existentes de payments (mantener las que funcionan)
-- No eliminamos todas para no romper el sistema actual

-- Admin puede ver todos los pagos
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin puede actualizar todos los pagos (aprobar/rechazar)
CREATE POLICY "Admins can update all payments"
  ON payments FOR UPDATE
  USING (is_admin(auth.uid()));

-- Coaches aprobados pueden ver pagos de sus clientes (solo lectura)
CREATE POLICY "Coaches can view client payments"
  ON payments FOR SELECT
  USING (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- Mantener política existente para que clientes puedan insertar sus pagos
-- (No la eliminamos para mantener compatibilidad)

-- ============================================
-- EVENTS RLS
-- ============================================

-- Eliminar políticas existentes de events
DROP POLICY IF EXISTS "Coaches can insert own events" ON events;
DROP POLICY IF EXISTS "Coaches can view own events" ON events;
DROP POLICY IF EXISTS "Coaches can update own events" ON events;
DROP POLICY IF EXISTS "Coaches can delete own events" ON events;

-- Admin puede ver todos los eventos
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin puede insertar eventos
CREATE POLICY "Admins can insert events"
  ON events FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Admin puede actualizar todos los eventos
CREATE POLICY "Admins can update all events"
  ON events FOR UPDATE
  USING (is_admin(auth.uid()));

-- Admin puede eliminar todos los eventos
CREATE POLICY "Admins can delete all events"
  ON events FOR DELETE
  USING (is_admin(auth.uid()));

-- Coaches aprobados pueden ver sus eventos
CREATE POLICY "Coaches can view own events"
  ON events FOR SELECT
  USING (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- Coaches aprobados pueden insertar sus eventos
CREATE POLICY "Coaches can insert own events"
  ON events FOR INSERT
  WITH CHECK (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- Coaches aprobados pueden actualizar sus eventos
CREATE POLICY "Coaches can update own events"
  ON events FOR UPDATE
  USING (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- Coaches aprobados pueden eliminar sus eventos
CREATE POLICY "Coaches can delete own events"
  ON events FOR DELETE
  USING (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- Clientes pueden ver eventos de su coach
DROP POLICY IF EXISTS "Clients can view coach events" ON events;
CREATE POLICY "Clients can view coach events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN user_profiles up ON up.id = c.user_id
      WHERE c.user_id = auth.uid()
      AND up.role = 'client'
      AND c.coach_id = events.coach_id
    )
  );

-- ============================================
-- REGISTRATION_LINKS RLS
-- ============================================

-- Admin puede ver todos los enlaces
CREATE POLICY "Admins can view all registration links"
  ON registration_links FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin puede insertar enlaces
CREATE POLICY "Admins can insert registration links"
  ON registration_links FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Admin puede actualizar todos los enlaces
CREATE POLICY "Admins can update all registration links"
  ON registration_links FOR UPDATE
  USING (is_admin(auth.uid()));

-- Coaches aprobados pueden ver sus enlaces
CREATE POLICY "Coaches can view own registration links"
  ON registration_links FOR SELECT
  USING (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- Coaches aprobados pueden insertar sus enlaces
CREATE POLICY "Coaches can insert own registration links"
  ON registration_links FOR INSERT
  WITH CHECK (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- Coaches aprobados pueden actualizar sus enlaces
CREATE POLICY "Coaches can update own registration links"
  ON registration_links FOR UPDATE
  USING (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- Cualquier usuario autenticado puede ver enlaces activos (para validar tokens)
CREATE POLICY "Authenticated users can view active links"
  ON registration_links FOR SELECT
  USING (
    is_active = true AND
    (expires_at IS NULL OR expires_at > now())
  );

-- ============================================
-- COACH_PAYMENT_CONFIGS RLS
-- ============================================

-- Admin puede ver todas las configuraciones
CREATE POLICY "Admins can view all payment configs"
  ON coach_payment_configs FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin puede insertar configuraciones
CREATE POLICY "Admins can insert payment configs"
  ON coach_payment_configs FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Admin puede actualizar todas las configuraciones
CREATE POLICY "Admins can update all payment configs"
  ON coach_payment_configs FOR UPDATE
  USING (is_admin(auth.uid()));

-- Coaches aprobados pueden ver su configuración
CREATE POLICY "Coaches can view own payment config"
  ON coach_payment_configs FOR SELECT
  USING (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

-- ============================================
-- COACH_PAYMENTS RLS
-- ============================================

-- Admin puede ver todos los pagos a coaches
CREATE POLICY "Admins can view all coach payments"
  ON coach_payments FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin puede insertar pagos
CREATE POLICY "Admins can insert coach payments"
  ON coach_payments FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Admin puede actualizar todos los pagos
CREATE POLICY "Admins can update all coach payments"
  ON coach_payments FOR UPDATE
  USING (is_admin(auth.uid()));

-- Coaches aprobados pueden ver sus pagos
CREATE POLICY "Coaches can view own payments"
  ON coach_payments FOR SELECT
  USING (
    is_approved_coach(auth.uid()) AND
    coach_id = auth.uid()
  );

