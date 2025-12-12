-- Corregir políticas de Storage para el bucket event-images
-- Este script corrige las políticas para que los coaches puedan subir imágenes

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Coaches can upload event images" ON storage.objects;
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








