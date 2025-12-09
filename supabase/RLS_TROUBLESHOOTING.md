# Solución de Problemas RLS (Row Level Security)

Si estás recibiendo el error "new row violates row-level security policy", sigue estos pasos:

## Paso 1: Ejecutar el script de diagnóstico

Ejecuta `supabase/diagnose_rls_issue.sql` en el SQL Editor de Supabase para verificar:
- Si tu usuario tiene un perfil con el rol correcto
- Qué políticas están activas
- Si hay conflictos entre políticas

## Paso 2: Verificar el perfil de usuario

Asegúrate de que tu usuario tenga un perfil con el rol correcto:

```sql
-- Verificar tu perfil
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Si no existe o el rol es incorrecto, actualízalo:
UPDATE user_profiles 
SET role = 'coach'  -- o 'client' según corresponda
WHERE id = auth.uid();
```

## Paso 3: Ejecutar el script de corrección

Ejecuta `supabase/fix_rls_policies.sql` para corregir las políticas RLS.

Este script:
- Elimina políticas conflictivas
- Recrea las políticas con verificaciones explícitas de rol
- Asegura que las políticas de INSERT funcionen correctamente

## Paso 4: Verificar que RLS esté habilitado

```sql
-- Verificar que RLS esté habilitado en las tablas
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('events', 'event_registrations', 'payments');
```

## Problemas comunes y soluciones

### Error al crear eventos (coach)
**Problema**: "new row violates row-level security policy" al crear un evento

**Solución**:
1. Verifica que tu usuario tenga `role = 'coach'` en `user_profiles`
2. Ejecuta el script `fix_rls_policies.sql`
3. Asegúrate de que estás autenticado correctamente

### Error al registrarse a eventos (cliente)
**Problema**: "new row violates row-level security policy" al registrarse

**Solución**:
1. Verifica que tu usuario tenga `role = 'client'` en `user_profiles`
2. Verifica que exista un registro en `clients` asociado a tu `user_id`
3. Verifica que el `coach_id` del evento coincida con tu `coach_id` en `clients`

### Error al crear pagos
**Problema**: "new row violates row-level security policy" al crear un pago

**Solución**:
1. Verifica que exista un registro en `clients` con tu `user_id`
2. Verifica que el `coach_id` del pago coincida con tu `coach_id` en `clients`
3. Ejecuta el script `fix_rls_policies.sql`

## Políticas temporales para desarrollo (NO usar en producción)

Si necesitas deshabilitar temporalmente RLS para debugging (solo en desarrollo):

```sql
-- ⚠️ SOLO PARA DESARROLLO - NO USAR EN PRODUCCIÓN
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
```

**IMPORTANTE**: Vuelve a habilitar RLS después de debugging:

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
```

## Verificar políticas activas

Para ver todas las políticas activas:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

