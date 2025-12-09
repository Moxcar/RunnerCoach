-- Script para obtener credenciales de prueba del seeder
-- Ejecuta este script en el SQL Editor de Supabase para obtener los emails de coach y cliente

-- Obtener email del coach
SELECT 
  'COACH' as tipo,
  u.email,
  'password123' as password,
  up.role,
  up.full_name
FROM auth.users u
JOIN user_profiles up ON u.id = up.id
WHERE up.role = 'coach'
LIMIT 1;

-- Obtener emails de clientes (primeros 5)
SELECT 
  'CLIENT' as tipo,
  u.email,
  'password123' as password,
  up.role,
  up.full_name
FROM auth.users u
JOIN user_profiles up ON u.id = up.id
WHERE up.role = 'client'
LIMIT 5;

-- Para usar en el script bash, ejecuta esto y copia los emails:
-- COACH_EMAIL='email_del_coach@runnercoach.test' CLIENT_EMAIL='email_del_cliente@runnercoach.test' ./scripts/open-test-browsers.sh

