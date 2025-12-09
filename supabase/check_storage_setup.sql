-- Script de diagnóstico para verificar la configuración de Storage
-- Ejecuta este script en el SQL Editor de Supabase para diagnosticar problemas

-- 1. Verificar si el bucket existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'event-images') 
    THEN '✅ El bucket "event-images" existe'
    ELSE '❌ El bucket "event-images" NO existe. Créalo en Storage > New bucket'
  END as bucket_status;

-- 2. Verificar si el bucket es público
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'event-images' AND public = true) 
    THEN '✅ El bucket "event-images" es público'
    ELSE '⚠️  El bucket "event-images" NO es público. Márcalo como público en Storage'
  END as bucket_public_status;

-- 3. Verificar políticas de Storage existentes
SELECT 
  policyname as "Política",
  cmd as "Comando",
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
    ELSE 'Sin USING'
  END as "Condiciones"
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%event%'
ORDER BY policyname;

-- 4. Verificar tu perfil de usuario (reemplaza 'TU_USER_ID' con tu ID real)
-- Descomenta y ejecuta esta consulta con tu user_id:
-- SELECT 
--   id,
--   full_name,
--   role,
--   CASE 
--     WHEN role = 'coach' THEN '✅ Tienes rol de coach'
--     ELSE '❌ NO tienes rol de coach. Tu rol es: ' || role
--   END as status
-- FROM user_profiles 
-- WHERE id = auth.uid();

-- 5. Verificar si RLS está habilitado en storage.objects
SELECT 
  CASE 
    WHEN relrowsecurity = true 
    THEN '✅ RLS está habilitado en storage.objects'
    ELSE '⚠️  RLS NO está habilitado en storage.objects'
  END as rls_status
FROM pg_class 
WHERE relname = 'objects' 
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');

