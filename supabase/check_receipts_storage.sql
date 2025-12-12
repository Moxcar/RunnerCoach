-- Script para verificar la configuración del bucket receipts
-- Ejecuta este script en el SQL Editor de Supabase para verificar el estado

-- 1. Verificar si el bucket existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'receipts')
    THEN '✅ El bucket "receipts" existe'
    ELSE '❌ El bucket "receipts" NO existe. Créalo en Storage > New bucket'
  END as bucket_status;

-- 2. Verificar si el bucket es público
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'receipts' AND public = true)
    THEN '✅ El bucket "receipts" es público'
    ELSE '⚠️  El bucket "receipts" NO es público. Márcalo como público en Storage'
  END as bucket_public_status;

-- 3. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN roles = '{authenticated}' THEN 'Usuarios autenticados'
    WHEN roles = '{public}' THEN 'Público'
    ELSE array_to_string(roles, ', ')
  END as aplica_a,
  cmd as operacion
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%receipt%'
ORDER BY policyname;

-- 4. Mostrar información del bucket si existe
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'receipts';
