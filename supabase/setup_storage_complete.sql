-- Script completo para configurar Storage de event-images
-- Ejecuta este script en el SQL Editor de Supabase

-- ============================================
-- PASO 1: Verificar si el bucket existe
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'event-images'
  ) THEN
    RAISE EXCEPTION 'El bucket "event-images" no existe. Por favor, créalo manualmente:
1. Ve a Storage en el dashboard de Supabase
2. Haz clic en "New bucket"
3. Name: event-images
4. Public bucket: ✅ (marcar como público)
5. File size limit: 5 MB
6. Allowed MIME types: image/jpeg,image/png,image/jpg,image/webp
7. Haz clic en "Create bucket"
Luego ejecuta este script nuevamente.';
  ELSE
    RAISE NOTICE '✅ El bucket "event-images" existe';
  END IF;
END $$;

-- ============================================
-- PASO 2: Eliminar políticas existentes
-- ============================================
DROP POLICY IF EXISTS "Coaches can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update own event images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete own event images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view event images" ON storage.objects;

-- ============================================
-- PASO 3: Crear políticas de Storage
-- ============================================

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

-- ============================================
-- PASO 4: Verificar configuración
-- ============================================
DO $$
DECLARE
  bucket_exists boolean;
  bucket_public boolean;
  policy_count int;
BEGIN
  -- Verificar bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'event-images') INTO bucket_exists;
  SELECT public FROM storage.buckets WHERE id = 'event-images' INTO bucket_public;
  
  -- Contar políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%event%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Configuración de Storage:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket existe: %', CASE WHEN bucket_exists THEN '✅ Sí' ELSE '❌ No' END;
  RAISE NOTICE 'Bucket es público: %', CASE WHEN bucket_public THEN '✅ Sí' ELSE '❌ No' END;
  RAISE NOTICE 'Políticas creadas: %', policy_count;
  RAISE NOTICE '========================================';
  
  IF NOT bucket_exists THEN
    RAISE EXCEPTION 'El bucket no existe. Créalo primero en Storage.';
  END IF;
  
  IF NOT bucket_public THEN
    RAISE WARNING 'El bucket no es público. Las imágenes pueden no ser accesibles.';
  END IF;
  
  IF policy_count < 3 THEN
    RAISE WARNING 'Puede que falten algunas políticas. Verifica manualmente.';
  END IF;
END $$;

-- ============================================
-- PASO 5: Verificar tu usuario actual
-- ============================================
SELECT 
  id,
  full_name,
  role,
  CASE 
    WHEN role = 'coach' THEN '✅ Tienes rol de coach - Puedes subir imágenes'
    ELSE '❌ NO tienes rol de coach. Tu rol es: ' || role || ' - Actualiza tu rol a "coach"'
  END as status
FROM user_profiles 
WHERE id = auth.uid();

