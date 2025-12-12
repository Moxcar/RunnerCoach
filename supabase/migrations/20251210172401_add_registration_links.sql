-- Migración: Tabla de enlaces de registro
-- Ejecutada: 2025-12-10
-- Descripción: Crea tabla para gestionar enlaces de registro que asignan
--               automáticamente clientes a coaches

-- Crear tabla registration_links
CREATE TABLE IF NOT EXISTS registration_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  used_count integer DEFAULT 0,
  created_by uuid REFERENCES user_profiles(id)
);

-- Crear índice para búsquedas rápidas por token
CREATE INDEX IF NOT EXISTS idx_registration_links_token ON registration_links(token);
CREATE INDEX IF NOT EXISTS idx_registration_links_coach_id ON registration_links(coach_id);
CREATE INDEX IF NOT EXISTS idx_registration_links_active ON registration_links(is_active) WHERE is_active = true;

-- Función para incrementar el contador de uso de un enlace
CREATE OR REPLACE FUNCTION increment_registration_link_usage(link_token text)
RETURNS void AS $$
BEGIN
  UPDATE registration_links
  SET used_count = used_count + 1
  WHERE token = link_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON TABLE registration_links IS 'Enlaces de registro generados por coaches o admin para asignar automáticamente clientes';
COMMENT ON COLUMN registration_links.token IS 'Token único para el enlace de registro';
COMMENT ON COLUMN registration_links.expires_at IS 'Fecha de expiración del enlace. NULL significa sin expiración';
COMMENT ON COLUMN registration_links.used_count IS 'Número de veces que se ha usado este enlace';
COMMENT ON COLUMN registration_links.created_by IS 'Usuario que creó el enlace (coach o admin)';

