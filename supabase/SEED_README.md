# Seeder de Base de Datos - RunnerCoach

Este seeder borra toda la base de datos y crea datos de prueba realistas para desarrollo.

## ¿Qué hace el seeder?

1. **Borra todos los datos existentes** de:

   - Registros de eventos
   - Pagos
   - Eventos
   - Clientes
   - Perfiles de usuario
   - Usuarios de autenticación

2. **Crea un coach** con:

   - Email aleatorio (formato: nombre.apellido@runnercoach.test)
   - Contraseña: `password123`
   - Perfil completo

3. **Crea 20-50 clientes** con:

   - Emails aleatorios únicos
   - Contraseña: `password123`
   - Teléfonos aleatorios españoles
   - Estados de pago aleatorios (active, pending, overdue)
   - Notas opcionales

4. **Crea historial de pagos** para cada cliente:

   - Entre 0 y 8 pagos por cliente
   - Fechas aleatorias en los últimos 6 meses
   - Montos entre €50 y €500
   - Métodos: stripe, manual, cash
   - Estados: completed, pending, failed

5. **Crea 12 eventos** en los últimos 6 meses:

   - Nombres variados (carreras, maratones, trails, etc.)
   - Ubicaciones aleatorias
   - Precios entre €0 y €100
   - Descripciones variadas

6. **Crea registros de eventos**:
   - Entre 3 y 20 participantes por evento
   - Selección aleatoria de clientes
   - Fechas de registro realistas

## Cómo usar

### Opción 1: SQL Editor de Supabase

1. Abre el SQL Editor en tu proyecto de Supabase
2. Copia y pega el contenido de `seed.sql`
3. Ejecuta el script
4. Verifica los resultados con la consulta al final del script

### Opción 2: CLI de Supabase

```bash
supabase db reset
psql -h <tu-host> -U postgres -d postgres -f supabase/seed.sql
```

## Credenciales de prueba

Todos los usuarios creados tienen la contraseña: **`password123`**

Los emails siguen el formato:

- Coach: `nombre.apellido@runnercoach.test`
- Clientes: `nombre.apellido1@runnercoach.test`, `nombre.apellido2@runnercoach.test`, etc.

## Notas importantes

- ⚠️ Este script **BORRA TODOS LOS DATOS** antes de crear nuevos
- Los usuarios se crean directamente en `auth.users` sin enviar correos
- Todos los usuarios tienen `email_confirmed_at` establecido, por lo que no necesitan confirmar su email
- El trigger `handle_new_user` crea automáticamente los perfiles en `user_profiles`
- RLS se desactiva temporalmente durante la limpieza y se reactiva después

## Verificación

Al final del script se ejecuta una consulta que muestra:

- Número de coaches creados
- Número de clientes creados
- Número de pagos creados
- Número de eventos creados
- Número de registros de eventos creados

## Personalización

Puedes modificar el seeder para ajustar:

- Número de clientes: cambia `client_count` (línea ~40)
- Número de eventos: cambia `num_events` (línea ~285)
- Rango de pagos por cliente: modifica `num_payments` (línea ~198)
- Rango de participantes por evento: modifica `num_registrations` (línea ~341)
