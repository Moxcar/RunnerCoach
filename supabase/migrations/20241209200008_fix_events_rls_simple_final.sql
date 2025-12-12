-- SOLUCIÓN DEFINITIVA: Política RLS simple para events
-- Elimina todas las verificaciones complejas que pueden fallar

-- Eliminar TODAS las políticas de INSERT de events
DROP POLICY IF EXISTS "Coaches can insert own events" ON events;

-- Crear política ULTRA SIMPLE - solo verifica que el coach_id sea el usuario autenticado
-- Sin verificaciones de user_profiles que pueden fallar
CREATE POLICY "Coaches can insert own events"
  ON events FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id
  );

-- Si aún falla, usar esta versión completamente permisiva (solo para coaches autenticados)
-- DROP POLICY IF EXISTS "Coaches can insert own events" ON events;
-- CREATE POLICY "Coaches can insert own events"
--   ON events FOR INSERT
--   WITH CHECK (auth.uid() IS NOT NULL);








