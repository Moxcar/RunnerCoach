-- Migración: Actualizar trigger handle_new_user para usar 'user' en lugar de 'client'
-- Ejecutada: 2025-12-11
-- Descripción: Actualiza el trigger que crea perfiles automáticamente para usar 'user' como rol por defecto

-- Actualizar la función del trigger handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'user')::text
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(new.raw_user_meta_data->>'name', new.email),
    role = coalesce(new.raw_user_meta_data->>'role', 'user')::text;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

