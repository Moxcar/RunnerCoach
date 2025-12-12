-- Migración: Configurar políticas de Storage para el bucket receipts
-- Ejecutada: 2025-12-15
-- Descripción: Configura políticas RLS para permitir subida de comprobantes por usuarios autenticados y públicos (con email)

-- NOTA: El bucket 'receipts' debe crearse manualmente en el dashboard de Supabase
-- Storage > New bucket > Name: receipts > Public bucket: ✅

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload receipts with email" ON storage.objects;

-- Política para permitir que los usuarios autenticados suban sus propios comprobantes
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (
    -- Usuarios autenticados pueden subir en su carpeta de usuario
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- O pueden subir archivos que contengan su email (para compatibilidad)
    name LIKE '%' || (SELECT email FROM auth.users WHERE id = auth.uid()) || '%'
  )
);

-- Política para permitir que los usuarios autenticados vean sus propios comprobantes
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    name LIKE '%' || (SELECT email FROM auth.users WHERE id = auth.uid()) || '%'
  )
);

-- Política para permitir que usuarios públicos (sin cuenta) suban comprobantes
-- Solo si el nombre del archivo contiene un email válido
CREATE POLICY "Public can upload receipts with email"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'receipts' AND
  -- El nombre del archivo debe contener un email (formato: email-timestamp.ext)
  name ~ '^receipts/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}-[0-9]+\.(jpg|jpeg|png|pdf)$'
);

-- Política pública para ver comprobantes (opcional, si quieres que sean públicos)
CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');
