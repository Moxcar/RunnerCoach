# Debug: Creación de Eventos

## Cambios realizados en el frontend

1. **Eliminada verificación previa del perfil**: Ahora confiamos en la política RLS de Supabase
2. **Subida de imagen opcional**: Si falla la subida de imagen, el evento se crea sin imagen
3. **Mejor manejo de errores**: Mensajes más descriptivos según el tipo de error

## Cómo debuggear

1. **Abre la consola del navegador** (F12)
2. **Intenta crear un evento**
3. **Revisa los logs**:
   - `User ID:` - Debe mostrar tu ID de usuario
   - `User email:` - Debe mostrar tu email
   - `Insert error details:` - Mostrará el error exacto de Supabase

## Errores comunes y soluciones

### Error: "new row violates row-level security policy"

**Causa**: La política RLS está bloqueando el INSERT

**Solución**: Ejecuta esto en el SQL Editor de Supabase:

```sql
DROP POLICY IF EXISTS "Coaches can insert own events" ON events;

CREATE POLICY "Coaches can insert own events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = coach_id);
```

### Error: "Bucket not found"

**Causa**: El bucket `event-images` no existe

**Solución**:

1. Ve a Storage en Supabase
2. Crea el bucket `event-images`
3. Configura las políticas según `supabase/EVENT_IMAGES_STORAGE_SETUP.md`

### Error: "No tienes permisos para crear eventos"

**Causa**: Tu usuario no tiene el rol 'coach' en user_profiles

**Solución**: Ejecuta esto en el SQL Editor:

```sql
UPDATE user_profiles
SET role = 'coach'
WHERE id = auth.uid();
```

## Verificar estado actual

Ejecuta esto en el SQL Editor para verificar:

```sql
-- Ver tu perfil
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Ver políticas de events
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'events' AND cmd = 'INSERT';

-- Probar insertar un evento (ajusta los valores)
INSERT INTO events (coach_id, name, date, price)
VALUES (auth.uid(), 'Evento de prueba', CURRENT_DATE, 0);
```







