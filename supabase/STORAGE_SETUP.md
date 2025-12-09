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

Para que los usuarios puedan subir sus propios comprobantes, necesitas configurar políticas de seguridad:

1. Ve a **Storage** > **Policies** > **receipts**

2. Crea una política para permitir que los usuarios suban sus propios archivos:

```sql
-- Política para permitir que los usuarios autenticados suban sus propios comprobantes
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir que los usuarios vean sus propios comprobantes
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

3. Si los comprobantes son públicos, también puedes crear una política pública:

```sql
-- Política pública para ver comprobantes (opcional)
CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');
```

## Notas importantes

- Los archivos se almacenan con la estructura: `receipts/{userId}-{timestamp}.{ext}`
- El tamaño máximo por defecto es 50MB, pero puedes ajustarlo
- Los comprobantes se validan en el frontend (tipo y tamaño) antes de subirlos
- Considera implementar limpieza automática de archivos antiguos si es necesario

