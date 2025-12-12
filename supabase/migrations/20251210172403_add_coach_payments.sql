-- Migración: Tabla de pagos a coaches
-- Ejecutada: 2025-12-10
-- Descripción: Crea tabla para registrar los pagos realizados por el admin a los coaches

-- Crear tabla coach_payments
CREATE TABLE IF NOT EXISTS coach_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES user_profiles(id),
  amount decimal(10,2) NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('percentage', 'fixed')),
  percentage_value decimal(5,2),
  fixed_amount decimal(10,2),
  client_payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_date date,
  created_at timestamp with time zone DEFAULT now(),
  notes text,
  completed_at timestamp with time zone
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_coach_payments_coach_id ON coach_payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_payments_admin_id ON coach_payments(admin_id);
CREATE INDEX IF NOT EXISTS idx_coach_payments_status ON coach_payments(status);
CREATE INDEX IF NOT EXISTS idx_coach_payments_client_payment_id ON coach_payments(client_payment_id);
CREATE INDEX IF NOT EXISTS idx_coach_payments_payment_date ON coach_payments(payment_date);

-- Comentarios
COMMENT ON TABLE coach_payments IS 'Registro de pagos realizados por el admin a los coaches';
COMMENT ON COLUMN coach_payments.payment_type IS 'Tipo de cálculo usado: percentage o fixed';
COMMENT ON COLUMN coach_payments.percentage_value IS 'Porcentaje usado si payment_type es percentage';
COMMENT ON COLUMN coach_payments.fixed_amount IS 'Cantidad fija usada si payment_type es fixed';
COMMENT ON COLUMN coach_payments.client_payment_id IS 'ID del pago del cliente que generó este pago al coach (si aplica)';
COMMENT ON COLUMN coach_payments.status IS 'Estado del pago: pending (pendiente), completed (completado), cancelled (cancelado)';
COMMENT ON COLUMN coach_payments.completed_at IS 'Fecha y hora en que se completó el pago';






