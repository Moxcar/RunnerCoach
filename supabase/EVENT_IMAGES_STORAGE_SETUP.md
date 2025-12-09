# Configuración de Supabase Storage para Imágenes de Eventos

Para que la funcionalidad de subida de imágenes de eventos funcione, necesitas configurar un bucket de almacenamiento en Supabase.

## Pasos para configurar el bucket

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)

2. Navega a **Storage** en el menú lateral

3. Haz clic en **New bucket**

4. Configura el bucket:
   - **Name**: `event-images`
   - **Public bucket**: ✅ Marca esta opción para que las imágenes sean accesibles públicamente
   - **File size limit**: 5 MB (o el límite que prefieras)
   - **Allowed MIME types**: `image/jpeg,image/png,image/jpg,image/webp`

5. Haz clic en **Create bucket**

## Configurar políticas de seguridad (RLS)

Para que los coaches puedan subir imágenes de eventos, necesitas configurar políticas de seguridad:

1. Ve a **Storage** > **Policies** > **event-images**

2. Crea una política para permitir que los coaches suban imágenes:

```sql
-- Política para permitir que los coaches suban imágenes de eventos
CREATE POLICY "Coaches can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images' AND
  exists (
    select 1 from user_profiles
    where user_profiles.id = auth.uid()
    and user_profiles.role = 'coach'
  )
);

-- Política para permitir que todos vean las imágenes de eventos (públicas)
CREATE POLICY "Public can view event images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');
```

## Notas importantes

- Los archivos se almacenan con la estructura: `event-images/{coachId}/event-{timestamp}.{ext}`
- El tamaño máximo por defecto es 50MB, pero puedes ajustarlo
- Las imágenes se validan en el frontend (tipo y tamaño) antes de subirlas
- Considera implementar limpieza automática de archivos antiguos si es necesario

