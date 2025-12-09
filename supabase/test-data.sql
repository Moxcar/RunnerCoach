-- Datos de prueba para desarrollo
-- NOTA: Solo ejecuta esto después de crear un usuario en la aplicación
-- Reemplaza 'TU_USER_ID_AQUI' con el UUID de tu usuario de Supabase

-- Para obtener tu user_id:
-- 1. Ve a Authentication > Users en Supabase
-- 2. Copia el UUID del usuario que creaste

-- Ejemplo de uso:
-- INSERT INTO clients (coach_id, name, email, phone, payment_status, notes)
-- VALUES 
--   ('TU_USER_ID_AQUI', 'Juan Pérez', 'juan@example.com', '+34 600 123 456', 'active', 'Cliente desde enero 2024'),
--   ('TU_USER_ID_AQUI', 'María García', 'maria@example.com', '+34 600 234 567', 'pending', '');

-- INSERT INTO events (coach_id, name, date, location, description)
-- VALUES 
--   ('TU_USER_ID_AQUI', 'Carrera 5K Ciudad', '2024-12-20', 'Parque Central', 'Carrera de 5 kilómetros por el centro de la ciudad'),
--   ('TU_USER_ID_AQUI', 'Maratón de Montaña', '2025-01-15', 'Sierra Norte', 'Maratón de 42km por senderos de montaña');

-- INSERT INTO payments (coach_id, client_id, amount, date, status, method)
-- SELECT 
--   'TU_USER_ID_AQUI',
--   c.id,
--   150.00,
--   '2024-12-01',
--   'completed',
--   'stripe'
-- FROM clients c
-- WHERE c.coach_id = 'TU_USER_ID_AQUI' AND c.name = 'Juan Pérez';

