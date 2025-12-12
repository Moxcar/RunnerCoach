-- Migración: Simplificar políticas RLS del storage de receipts
-- Ejecutada: 2025-12-17
-- Descripción: Simplifica las políticas RLS para permitir que cualquier usuario autenticado
--               pueda subir comprobantes en el bucket receipts, sin restricciones complejas.

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload receipts with email" ON storage.objects;

-- Política simplificada: Cualquier usuario autenticado puede subir comprobantes
-- El path debe comenzar con su userId para mantener organización
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  -- El path debe comenzar con el userId del usuario autenticado seguido de un slash
  -- Usamos split_part para extraer la primera parte del path (antes del primer slash)
  split_part(name, '/', 1) = auth.uid()::text
);

-- Política simplificada: Cualquier usuario autenticado puede ver sus propios comprobantes
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  -- El path debe comenzar con el userId del usuario autenticado seguido de un slash
  -- Usamos split_part para extraer la primera parte del path (antes del primer slash)
  split_part(name, '/', 1) = auth.uid()::text
);

-- Política pública para ver comprobantes (necesaria para URLs públicas)
CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Política para permitir que usuarios públicos suban comprobantes con email
-- (para usuarios sin cuenta que quieren registrarse a eventos)
CREATE POLICY "Public can upload receipts with email"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'receipts' AND
  -- El nombre del archivo debe contener un email válido
  name ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}-[0-9]+\.(jpg|jpeg|png|pdf)$'
);

-- NOTA: No se pueden agregar comentarios a políticas de storage.objects en Supabase
-- porque no tenemos permisos de propietario en ese esquema
