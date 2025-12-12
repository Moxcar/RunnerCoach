-- Migración: Agregar tabla plans y plan_id a clients
-- Ejecutada: 2025-12-11
-- Descripción: Crea tabla de planes de suscripción que los admins pueden gestionar
--               y asocia planes a clientes para determinar el monto a pagar

-- Crear tabla plans
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cost decimal(10,2) NOT NULL,
  features text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id)
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plans_created_by ON plans(created_by);

-- Agregar plan_id a clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES plans(id) ON DELETE SET NULL;

-- Crear índice para plan_id en clients
CREATE INDEX IF NOT EXISTS idx_clients_plan_id ON clients(plan_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_plans_updated_at();

-- RLS Policies para plans
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Admin puede hacer todo con planes
CREATE POLICY "Admins can manage all plans"
  ON plans FOR ALL
  USING (is_admin(auth.uid()));

-- Cualquiera puede ver planes activos (para landing page)
CREATE POLICY "Anyone can view active plans"
  ON plans FOR SELECT
  USING (is_active = true);

-- Comentarios
COMMENT ON TABLE plans IS 'Planes de suscripción que los admins pueden crear y gestionar';
COMMENT ON COLUMN plans.name IS 'Nombre del plan';
COMMENT ON COLUMN plans.cost IS 'Costo mensual del plan';
COMMENT ON COLUMN plans.features IS 'Array de características o beneficios del plan';
COMMENT ON COLUMN plans.is_active IS 'Indica si el plan está activo y visible';
COMMENT ON COLUMN clients.plan_id IS 'Plan de suscripción asignado al cliente. Determina el monto a pagar.';






