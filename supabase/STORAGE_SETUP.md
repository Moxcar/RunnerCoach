# Configuración de Supabase Storage para Comprobantes

Para que la funcionalidad de subida de comprobantes funcione, necesitas configurar un bucket de almacenamiento en Supabase.

## Pasos para configurar el bucket

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)

2. Navega a **Storage** en el menú lateral

3. Haz clic en **New bucket**

4. Configura el bucket:

   - **Name**: `receipts`
   - **Public bucket**: ✅ Marca esta opción si quieres que los comprobantes sean accesibles públicamente
   - **File size limit**: 5 MB (o el límite que prefieras)
   - **Allowed MIME types**: `image/jpeg,image/png,image/jpg,application/pdf`

5. Haz clic en **Create bucket**

## Configurar políticas de seguridad (RLS)

Las políticas RLS se configuran automáticamente con la migración `20251215000001_setup_receipts_storage.sql`.

Si necesitas configurarlas manualmente:

1. Ve a **Storage** > **Policies** > **receipts**

2. Ejecuta la migración SQL o crea las políticas manualmente:

```sql
-- Política para permitir que los usuarios autenticados suban sus propios comprobantes
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
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
CREATE POLICY "Public can upload receipts with email"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'receipts' AND
  name ~ '^receipts/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}-[0-9]+\.(jpg|jpeg|png|pdf)$'
);

-- Política pública para ver comprobantes
CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');
```

## Notas importantes

- Los archivos se almacenan con la estructura:
  - Para usuarios autenticados: `receipts/{userId}/{timestamp}.{ext}`
  - Para usuarios sin cuenta: `receipts/{email}-{timestamp}.{ext}`
- El tamaño máximo por defecto es 50MB, pero puedes ajustarlo
- Los comprobantes se validan en el frontend (tipo y tamaño) antes de subirlos
- Los usuarios sin cuenta pueden subir comprobantes usando su email en el nombre del archivo
- Considera implementar limpieza automática de archivos antiguos si es necesario

## Verificar que el bucket existe

Si recibes el error "Bucket not found", verifica que el bucket esté creado:

1. Ve a **Storage** en el dashboard de Supabase
2. Verifica que existe un bucket llamado `receipts`
3. Si no existe, créalo siguiendo los pasos al inicio de este documento
