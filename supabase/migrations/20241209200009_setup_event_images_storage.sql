-- Configuración de políticas de Storage para el bucket event-images
-- NOTA: El bucket 'event-images' debe crearse manualmente en el dashboard de Supabase
-- Storage > New bucket > Name: event-images > Public bucket: ✅

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Coaches can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;

-- Política simple para permitir que usuarios autenticados suban imágenes
-- La estructura de archivos es: events/{userId}/event-{timestamp}.{ext}
-- Verificamos que la carpeta coincida con el userId del usuario autenticado
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images' AND
  (storage.foldername(name))[1] = 'events' AND
  (storage.foldername(name))[2] = auth.uid()::text
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

