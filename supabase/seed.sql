-- Seeder completo para RunnerCoach
-- Este script borra toda la base de datos y crea datos de prueba
-- Ejecuta este script en el SQL Editor de Supabase
--
-- IMPORTANTE: Este script crea usuarios directamente en auth.users
-- sin enviar correos de autenticación. Todos los usuarios tendrán
-- la contraseña: password123
--
-- Requisitos:
-- - Extensión pgcrypto debe estar habilitada (normalmente ya lo está en Supabase)

-- Habilitar extensión pgcrypto si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función auxiliar para eliminar acentos de texto (para emails)
CREATE OR REPLACE FUNCTION remove_accents(text)
RETURNS text AS $$
BEGIN
  RETURN translate(
    $1,
    'áàäâéèëêíìïîóòöôúùüûñÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑ',
    'aaaeeeeiiiioooouuuunAAAEEEEIIIIOOOOUUUUN'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- PASO 1: BORRAR TODOS LOS DATOS
-- ============================================

-- Desactivar temporalmente RLS para poder borrar datos
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Borrar datos en orden (respetando foreign keys)
DELETE FROM event_registrations;
DELETE FROM payments;
DELETE FROM events;
DELETE FROM clients;
DELETE FROM user_profiles;
DELETE FROM auth.users;

-- Reactivar RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 2: CREAR USUARIOS (sin enviar correos)
-- ============================================

-- Función auxiliar para generar emails aleatorios
DO $$
DECLARE
  coach_id uuid;
  client_ids uuid[] := ARRAY[]::uuid[];
  client_count int := 20 + floor(random() * 31)::int; -- Número aleatorio entre 20-50
  i int;
  random_email text;
  random_name text;
  first_names text[] := ARRAY['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Laura', 'Pedro', 'Carmen', 'Miguel', 'Isabel', 'José', 'Patricia', 'Francisco', 'Lucía', 'Antonio', 'Sofía', 'Manuel', 'Elena', 'David', 'Marta', 'Javier', 'Cristina', 'Daniel', 'Paula', 'Alejandro', 'Andrea', 'Pablo', 'Sara', 'Jorge', 'Natalia', 'Roberto', 'Claudia', 'Fernando', 'Raquel', 'Álvaro', 'Beatriz', 'Rubén', 'Mónica', 'Sergio', 'Verónica'];
  last_names text[] := ARRAY['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Suárez', 'Molina', 'Morales', 'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Núñez'];
  random_first text;
  random_last text;
BEGIN
  -- Crear el coach
  coach_id := gen_random_uuid();
  random_first := first_names[floor(random() * array_length(first_names, 1)) + 1];
  random_last := last_names[floor(random() * array_length(last_names, 1)) + 1];
  random_name := random_first || ' ' || random_last;
  random_email := lower(replace(remove_accents(random_name), ' ', '.')) || '@runnercoach.test';
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    aud,
    role
  ) VALUES (
    coach_id,
    '00000000-0000-0000-0000-000000000000',
    random_email,
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', random_name, 'role', 'coach'),
    now(),
    now(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  );

  -- Crear clientes
  FOR i IN 1..client_count LOOP
    random_first := first_names[floor(random() * array_length(first_names, 1)) + 1];
    random_last := last_names[floor(random() * array_length(last_names, 1)) + 1];
    random_name := random_first || ' ' || random_last;
    random_email := lower(replace(remove_accents(random_name), ' ', '.')) || i::text || '@runnercoach.test';
    
    DECLARE
      client_user_id uuid := gen_random_uuid();
    BEGIN
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token,
        aud,
        role
      ) VALUES (
        client_user_id,
        '00000000-0000-0000-0000-000000000000',
        random_email,
        crypt('password123', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('name', random_name, 'role', 'client'),
        now() - (random() * interval '180 days'), -- Clientes creados en los últimos 6 meses
        now(),
        '',
        '',
        '',
        '',
        'authenticated',
        'authenticated'
      );
      
      client_ids := array_append(client_ids, client_user_id);
    END;
  END LOOP;

  -- ============================================
  -- PASO 3: CREAR CLIENTES (tabla clients)
  -- ============================================
  
  DECLARE
    client_record_id uuid;
    payment_statuses text[] := ARRAY['active', 'pending', 'overdue'];
    status text;
    phone_prefixes text[] := ARRAY['+34 600', '+34 601', '+34 602', '+34 603', '+34 610', '+34 611', '+34 612', '+34 613', '+34 620', '+34 621'];
    phone_number text;
    client_user_id uuid;
  BEGIN
    FOR i IN 1..array_length(client_ids, 1) LOOP
      client_user_id := client_ids[i];
      
      -- Obtener nombre del usuario
      SELECT raw_user_meta_data->>'name' INTO random_name
      FROM auth.users
      WHERE id = client_user_id;
      
      -- Generar teléfono aleatorio
      phone_number := phone_prefixes[floor(random() * array_length(phone_prefixes, 1)) + 1] || ' ' || 
                      lpad(floor(random() * 1000000)::text, 6, '0');
      
      -- Status de pago aleatorio
      status := payment_statuses[floor(random() * array_length(payment_statuses, 1)) + 1];
      
      INSERT INTO clients (
        coach_id,
        user_id,
        name,
        email,
        phone,
        payment_status,
        notes,
        created_at
      ) VALUES (
        coach_id,
        client_user_id,
        random_name,
        (SELECT email FROM auth.users WHERE id = client_user_id),
        phone_number,
        status,
        CASE WHEN random() > 0.7 THEN 'Cliente activo desde hace ' || floor(random() * 12)::text || ' meses' ELSE NULL END,
        (SELECT created_at FROM auth.users WHERE id = client_user_id)
      );
    END LOOP;
  END;

  -- ============================================
  -- PASO 4: CREAR HISTORIAL DE PAGOS RANDOM
  -- ============================================
  
  DECLARE
    client_record RECORD;
    payment_methods text[] := ARRAY['stripe', 'manual', 'cash'];
    payment_statuses text[] := ARRAY['completed', 'pending', 'failed'];
    num_payments int;
    payment_date date;
    payment_amount decimal(10,2);
    payment_method text;
    payment_status text;
  BEGIN
    FOR client_record IN 
      SELECT c.id as client_id, c.user_id, c.coach_id
      FROM clients c
    LOOP
      -- Cada cliente tiene entre 0 y 8 pagos
      num_payments := floor(random() * 9)::int;
      
      FOR i IN 1..num_payments LOOP
        -- Fecha aleatoria en los últimos 6 meses
        payment_date := current_date - (random() * 180)::int;
        
        -- Monto aleatorio entre 50 y 500
        payment_amount := (50 + random() * 450)::decimal(10,2);
        
        -- Método y status aleatorios
        payment_method := payment_methods[floor(random() * array_length(payment_methods, 1)) + 1];
        payment_status := payment_statuses[floor(random() * array_length(payment_statuses, 1)) + 1];
        
        INSERT INTO payments (
          coach_id,
          client_id,
          client_user_id,
          amount,
          date,
          status,
          method,
          created_at
        ) VALUES (
          client_record.coach_id,
          client_record.client_id,
          client_record.user_id,
          payment_amount,
          payment_date,
          payment_status,
          payment_method,
          payment_date::timestamp with time zone
        );
      END LOOP;
    END LOOP;
  END;

  -- ============================================
  -- PASO 5: CREAR EVENTOS (últimos 6 meses)
  -- ============================================
  
  DECLARE
    event_names text[] := ARRAY[
      'Carrera 5K Ciudad',
      'Maratón de Montaña',
      'Trail Running Sierra',
      'Carrera Nocturna',
      'Ultra Trail 50K',
      'Carrera Familiar 3K',
      'Media Maratón Urbana',
      'Carrera de Obstáculos',
      'Maratón de Primavera',
      'Trail Running Nocturno',
      'Carrera Solidaria',
      'Desafío Montaña',
      'Carrera de Velocidad',
      'Ultra Trail 100K',
      'Carrera de Resistencia'
    ];
    locations text[] := ARRAY[
      'Parque Central',
      'Sierra Norte',
      'Centro Deportivo',
      'Pista Municipal',
      'Montaña del Sol',
      'Bosque de los Pinos',
      'Playa del Este',
      'Valle Verde',
      'Cerro del Águila',
      'Parque Nacional'
    ];
    descriptions text[] := ARRAY[
      'Una carrera emocionante para todos los niveles',
      'Desafío para corredores experimentados',
      'Evento familiar y divertido',
      'Carrera técnica por terrenos variados',
      'Prueba tu resistencia en esta carrera épica',
      'Perfecta para principiantes',
      'Carrera competitiva con premios',
      'Disfruta de la naturaleza mientras corres',
      'Evento benéfico para una buena causa',
      'Carrera nocturna con iluminación especial'
    ];
    event_name text;
    event_location text;
    event_description text;
    event_date date;
    event_price decimal(10,2);
    num_events int := 12; -- Crear 12 eventos en los últimos 6 meses
    event_id uuid;
  BEGIN
    FOR i IN 1..num_events LOOP
      -- Fecha aleatoria en los últimos 6 meses
      event_date := current_date - (random() * 180)::int;
      
      -- Seleccionar datos aleatorios
      event_name := event_names[floor(random() * array_length(event_names, 1)) + 1] || ' ' || 
                    to_char(event_date, 'MM/YYYY');
      event_location := locations[floor(random() * array_length(locations, 1)) + 1];
      event_description := descriptions[floor(random() * array_length(descriptions, 1)) + 1];
      event_price := (0 + random() * 100)::decimal(10,2); -- Entre 0 y 100
      
      INSERT INTO events (
        coach_id,
        name,
        date,
        location,
        description,
        price,
        created_at
      ) VALUES (
        coach_id,
        event_name,
        event_date,
        event_location,
        event_description,
        event_price,
        event_date::timestamp with time zone - interval '7 days' -- Creado 7 días antes del evento
      ) RETURNING id INTO event_id;
      
      -- ============================================
      -- PASO 6: CREAR REGISTROS DE EVENTOS
      -- ============================================
      
      -- Cada evento tiene entre 3 y 20 participantes aleatorios
      DECLARE
        num_registrations int := 3 + floor(random() * 18)::int;
        registration_client_id uuid;
        registration_user_id uuid;
        selected_clients uuid[];
        j int;
        v_coach_id uuid := coach_id; -- Alias para evitar ambigüedad
        v_event_id uuid := event_id; -- Alias para evitar ambigüedad
      BEGIN
        -- Seleccionar clientes aleatorios para este evento
        SELECT array_agg(c.user_id ORDER BY random())
        INTO selected_clients
        FROM clients c
        WHERE c.coach_id = v_coach_id
        LIMIT num_registrations;
        
        -- Si hay clientes seleccionados, crear registros
        IF selected_clients IS NOT NULL THEN
          FOR j IN 1..array_length(selected_clients, 1) LOOP
            registration_user_id := selected_clients[j];
            
            SELECT id INTO registration_client_id
            FROM clients
            WHERE user_id = registration_user_id
            LIMIT 1;
            
            -- Solo registrar si el evento ya pasó o es futuro (lógica realista)
            IF event_date <= current_date OR random() > 0.3 THEN
              -- Usar una subconsulta para evitar ambigüedad en ON CONFLICT
              INSERT INTO event_registrations (
                event_id,
                client_id,
                user_id,
                created_at
              )
              SELECT 
                v_event_id,
                registration_client_id,
                registration_user_id,
                event_date::timestamp with time zone - (random() * 30)::int * interval '1 day'
              WHERE NOT EXISTS (
                SELECT 1 FROM event_registrations er
                WHERE er.event_id = v_event_id 
                AND er.user_id = registration_user_id
              );
            END IF;
          END LOOP;
        END IF;
      END;
    END LOOP;
  END;

  RAISE NOTICE 'Seeder completado exitosamente!';
  RAISE NOTICE 'Coach creado con ID: %', coach_id;
  RAISE NOTICE 'Clientes creados: %', client_count;
END $$;

-- ============================================
-- VERIFICACIÓN DE DATOS CREADOS
-- ============================================

SELECT 
  'Coach' as tipo,
  count(*) as cantidad
FROM user_profiles
WHERE role = 'coach'

UNION ALL

SELECT 
  'Clientes' as tipo,
  count(*) as cantidad
FROM user_profiles
WHERE role = 'client'

UNION ALL

SELECT 
  'Pagos' as tipo,
  count(*) as cantidad
FROM payments

UNION ALL

SELECT 
  'Eventos' as tipo,
  count(*) as cantidad
FROM events

UNION ALL

SELECT 
  'Registros de Eventos' as tipo,
  count(*) as cantidad
FROM event_registrations;

