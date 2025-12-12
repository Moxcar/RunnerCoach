-- Migración: Agregar rol admin y actualizar user_profiles
-- Ejecutada: 2025-12-10
-- Descripción: Agrega soporte para rol 'admin', columna is_approved para coaches,
--               y tracking de asignación de clientes

-- 1. Actualizar tipo de role en user_profiles para incluir 'admin'
-- Primero verificamos si necesitamos actualizar el CHECK constraint
DO $$
BEGIN
  -- Eliminar constraint existente si existe
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
  
  -- Agregar nuevo constraint que incluye 'admin' y 'user' (en lugar de 'client')
  ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('admin', 'coach', 'user'));
EXCEPTION
  WHEN OTHERS THEN
    -- Si el constraint no existe o hay otro error, continuar
    NULL;
END $$;

-- 2. Agregar columna is_approved para aprobación de coaches
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;

-- Los coaches existentes se consideran aprobados por defecto
-- Los nuevos coaches invitados por admin tendrán is_approved = false
UPDATE user_profiles 
SET is_approved = true 
WHERE is_approved IS NULL;

-- 3. Agregar columna assigned_by_admin a clients para tracking
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS assigned_by_admin uuid REFERENCES user_profiles(id);

-- 4. Asegurar que coach_id existe en clients (debería existir, pero verificamos)
-- Si no existe, la agregamos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'coach_id'
  ) THEN
    ALTER TABLE clients 
    ADD COLUMN coach_id uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- 5. Comentarios para documentación
COMMENT ON COLUMN user_profiles.is_approved IS 'Indica si un coach ha sido aprobado por el admin. Los admins y usuarios siempre tienen true.';
COMMENT ON COLUMN clients.assigned_by_admin IS 'ID del admin que asignó este cliente al coach. NULL si fue asignado automáticamente o por otro método.';

