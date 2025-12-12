-- Migración: Agregar columna email a payments para pagos de usuarios sin cuenta
-- Ejecutada: 2025-12-15
-- Descripción: Permite identificar pagos realizados por usuarios sin cuenta usando solo email

-- Agregar columna email (opcional, puede ser NULL para usuarios con cuenta)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS email text;

-- Agregar índice para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(email);

-- Política RLS para permitir insertar pagos con email cuando el usuario no está autenticado
DROP POLICY IF EXISTS "Allow public payment with email" ON payments;

CREATE POLICY "Allow public payment with email"
  ON payments FOR INSERT
  TO public
  WITH CHECK (
    email IS NOT NULL AND
    client_user_id IS NULL AND
    client_id IS NULL
  );

-- Comentarios
COMMENT ON COLUMN payments.email IS 'Email del usuario cuando realiza un pago sin cuenta. NULL si el usuario tiene cuenta.';
