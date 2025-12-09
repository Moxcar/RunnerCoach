-- Migración URGENTE: Corregir políticas RLS de events para coaches
-- El coach debe poder crear eventos sin problemas

-- Eliminar TODAS las políticas de INSERT de events
DROP POLICY IF EXISTS "Coaches can insert own events" ON events;

-- Verificar que la política pública no interfiera
-- (La política pública solo afecta SELECT, no INSERT)

-- Crear política SIMPLE y DIRECTA para que coaches puedan insertar eventos
CREATE POLICY "Coaches can insert own events"
  ON events FOR INSERT
  WITH CHECK (
    -- Verificación simple: el coach_id debe ser el usuario autenticado
    auth.uid() = coach_id
  );

-- Si la política simple no funciona, crear una alternativa más permisiva
-- (Solo usar si la anterior falla)
-- DROP POLICY IF EXISTS "Coaches can insert own events" ON events;
-- CREATE POLICY "Coaches can insert own events"
--   ON events FOR INSERT
--   WITH CHECK (true);

