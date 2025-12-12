-- Script para corregir las políticas de Storage para event-images
-- Ejecuta este script en el SQL Editor de Supabase

-- IMPORTANTE: Asegúrate de que el bucket 'event-images' existe:
-- 1. Ve a Storage en el dashboard de Supabase
-- 2. Si no existe, crea el bucket 'event-images'
-- 3. Márcalo como 'Public bucket' ✅

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Coaches can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update own event images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete own event images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view event images" ON storage.objects;

-- Política para permitir que los coaches suban imágenes de eventos
-- Verifica que el usuario tenga rol 'coach' en user_profiles
-- La estructura de archivos es: events/{userId}/event-{timestamp}.{ext}
CREATE POLICY "Coaches can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images' AND
  (storage.foldername(name))[1] = 'events' AND
  (storage.foldername(name))[2] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'coach'
  )
);

-- Política para permitir que los coaches actualicen sus propias imágenes
CREATE POLICY "Coaches can update own event images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  (storage.foldername(name))[1] = 'events' AND
  (storage.foldername(name))[2] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'coach'
  )
)
WITH CHECK (
  bucket_id = 'event-images' AND
  (storage.foldername(name))[1] = 'events' AND
  (storage.foldername(name))[2] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'coach'
  )
);

-- Política para permitir que los coaches eliminen sus propias imágenes
CREATE POLICY "Coaches can delete own event images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  (storage.foldername(name))[1] = 'events' AND
  (storage.foldername(name))[2] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'coach'
  )
);

-- Política para permitir que todos vean las imágenes de eventos (públicas)
CREATE POLICY "Public can view event images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');

-- Política para permitir que los usuarios autenticados vean todas las imágenes
CREATE POLICY "Authenticated users can view event images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'event-images');

-- Verificar que el bucket existe (esto mostrará un error si no existe, pero es informativo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'event-images'
  ) THEN
    RAISE NOTICE '⚠️  ADVERTENCIA: El bucket "event-images" no existe.';
    RAISE NOTICE '   Por favor, créalo manualmente en Storage > New bucket';
    RAISE NOTICE '   - Name: event-images';
    RAISE NOTICE '   - Public bucket: ✅';
  ELSE
    RAISE NOTICE '✅ El bucket "event-images" existe';
  END IF;
END $$;








