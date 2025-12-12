-- Migración: Configuración de pagos por coach
-- Ejecutada: 2025-12-10
-- Descripción: Crea tabla para configurar cómo se calculan los pagos a cada coach
--               (porcentaje o cantidad fija)

-- Crear tabla coach_payment_configs
CREATE TABLE IF NOT EXISTS coach_payment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  payment_type text NOT NULL CHECK (payment_type IN ('percentage', 'fixed')),
  percentage_value decimal(5,2),
  fixed_amount decimal(10,2),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_coach_payment_configs_coach_id ON coach_payment_configs(coach_id);

-- Comentarios
COMMENT ON TABLE coach_payment_configs IS 'Configuración de cómo se calculan los pagos a cada coach';
COMMENT ON COLUMN coach_payment_configs.payment_type IS 'Tipo de pago: percentage (porcentaje) o fixed (cantidad fija)';
COMMENT ON COLUMN coach_payment_configs.percentage_value IS 'Porcentaje del pago del cliente que recibe el coach (0-100)';
COMMENT ON COLUMN coach_payment_configs.fixed_amount IS 'Cantidad fija que recibe el coach por cada cliente';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_coach_payment_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coach_payment_config_updated_at
BEFORE UPDATE ON coach_payment_configs
FOR EACH ROW
EXECUTE FUNCTION update_coach_payment_config_updated_at();






