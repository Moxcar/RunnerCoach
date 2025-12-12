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

-- ============================================
-- PASO 0: ACTUALIZAR CONSTRAINT Y TRIGGER
-- ============================================

-- Este bloque ya no es necesario aquí, se hace después de borrar datos
-- Se mantiene solo para actualizar el trigger

-- Actualizar el trigger handle_new_user para usar 'user' como valor por defecto
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'user')::text
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(new.raw_user_meta_data->>'name', new.email),
    role = coalesce(new.raw_user_meta_data->>'role', 'user')::text;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE registration_links DISABLE ROW LEVEL SECURITY;

-- Borrar datos en orden (respetando foreign keys)
DELETE FROM event_registrations;
DELETE FROM payments;
DELETE FROM events;
DELETE FROM clients;
DELETE FROM plans;
DELETE FROM registration_links; -- Debe borrarse antes de user_profiles por la FK created_by
DELETE FROM user_profiles;
DELETE FROM auth.users;

-- Actualizar constraint de role ANTES de reactivar RLS
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Buscar y eliminar todos los constraints relacionados con role
  FOR constraint_name IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'user_profiles'::regclass 
    AND contype = 'c'
    AND (pg_get_constraintdef(oid) LIKE '%role%' OR conname LIKE '%role%')
  LOOP
    EXECUTE format('ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
  END LOOP;
  
  -- Agregar nuevo constraint que incluye 'admin', 'coach', 'user'
  BEGIN
    ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_role_check 
    CHECK (role IN ('admin', 'coach', 'user'));
  EXCEPTION
    WHEN duplicate_object THEN
      -- Si ya existe, intentar eliminarlo y recrearlo
      ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check CASCADE;
      ALTER TABLE user_profiles 
      ADD CONSTRAINT user_profiles_role_check 
      CHECK (role IN ('admin', 'coach', 'user'));
  END;
END $$;

-- Reactivar RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_links ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 2: CREAR USUARIOS (sin enviar correos)
-- ============================================

-- Función auxiliar para generar emails aleatorios
DO $$
DECLARE
  admin_id uuid;
  coach_ids uuid[] := ARRAY[]::uuid[];
  all_coach_ids uuid[] := ARRAY[]::uuid[]; -- Incluye admin + coaches
  client_ids uuid[] := ARRAY[]::uuid[];
  client_count int := 20 + floor(random() * 31)::int; -- Número aleatorio entre 20-50
  i int;
  j int;
  random_email text;
  random_name text;
  first_names text[] := ARRAY['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Laura', 'Pedro', 'Carmen', 'Miguel', 'Isabel', 'José', 'Patricia', 'Francisco', 'Lucía', 'Antonio', 'Sofía', 'Manuel', 'Elena', 'David', 'Marta', 'Javier', 'Cristina', 'Daniel', 'Paula', 'Alejandro', 'Andrea', 'Pablo', 'Sara', 'Jorge', 'Natalia', 'Roberto', 'Claudia', 'Fernando', 'Raquel', 'Álvaro', 'Beatriz', 'Rubén', 'Mónica', 'Sergio', 'Verónica'];
  last_names text[] := ARRAY['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Suárez', 'Molina', 'Morales', 'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Núñez'];
  random_first text;
  random_last text;
  temp_coach_id uuid;
BEGIN
  -- Crear el admin
  admin_id := gen_random_uuid();
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
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    random_email,
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', random_name, 'role', 'admin'),
    now(),
    now(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  );
  
  all_coach_ids := array_append(all_coach_ids, admin_id);
  
  -- Crear 3 coaches
  FOR j IN 1..3 LOOP
    temp_coach_id := gen_random_uuid();
    random_first := first_names[floor(random() * array_length(first_names, 1)) + 1];
    random_last := last_names[floor(random() * array_length(last_names, 1)) + 1];
    random_name := random_first || ' ' || random_last;
    random_email := lower(replace(remove_accents(random_name), ' ', '.')) || j::text || '@runnercoach.test';
    
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
      temp_coach_id,
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
    
    coach_ids := array_append(coach_ids, temp_coach_id);
    all_coach_ids := array_append(all_coach_ids, temp_coach_id);
  END LOOP;

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
        jsonb_build_object('name', random_name, 'role', 'user'),
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
  -- PASO 2.5: CREAR PERFILES DE USUARIO
  -- ============================================
  
  DECLARE
    admin_name text;
    coach_name text;
    user_name text;
  BEGIN
    -- Obtener nombre del admin
    SELECT coalesce(raw_user_meta_data->>'name', email) INTO admin_name
    FROM auth.users WHERE id = admin_id;
    
    -- Crear perfil para admin
    INSERT INTO user_profiles (id, full_name, role, is_approved)
    VALUES (admin_id, admin_name, 'admin', true)
    ON CONFLICT (id) DO UPDATE SET 
      full_name = admin_name,
      role = 'admin', 
      is_approved = true;
    
    -- Crear perfiles para coaches
    FOR j IN 1..array_length(coach_ids, 1) LOOP
      SELECT coalesce(raw_user_meta_data->>'name', email) INTO coach_name
      FROM auth.users WHERE id = coach_ids[j];
      
      INSERT INTO user_profiles (id, full_name, role, is_approved)
      VALUES (coach_ids[j], coach_name, 'coach', true)
      ON CONFLICT (id) DO UPDATE SET 
        full_name = coach_name,
        role = 'coach', 
        is_approved = true;
    END LOOP;
    
    -- Crear perfiles para usuarios
    FOR i IN 1..array_length(client_ids, 1) LOOP
      SELECT coalesce(raw_user_meta_data->>'name', email) INTO user_name
      FROM auth.users WHERE id = client_ids[i];
      
      INSERT INTO user_profiles (id, full_name, role, is_approved)
      VALUES (client_ids[i], user_name, 'user', true)
      ON CONFLICT (id) DO UPDATE SET 
        full_name = user_name,
        role = 'user', 
        is_approved = true;
    END LOOP;
  END;

  -- ============================================
  -- PASO 3: CREAR PLANES (3 planes globales)
  -- ============================================
  
  DECLARE
    plan_ids uuid[] := ARRAY[]::uuid[];
    plan_id uuid;
  BEGIN
    -- Crear solo 3 planes globales (asignados al admin)
    
    -- Plan Básico
    plan_id := gen_random_uuid();
    INSERT INTO plans (
      id,
      name,
      cost,
      features,
      is_active,
      created_by
    ) VALUES (
      plan_id,
      'Plan Básico',
      29.99,
      ARRAY[
        'Seguimiento mensual',
        'Plan de entrenamiento básico',
        'Acceso a eventos locales',
        'Soporte por email'
      ],
      true,
      admin_id
    );
    plan_ids := array_append(plan_ids, plan_id);
    
    -- Plan Intermedio
    plan_id := gen_random_uuid();
    INSERT INTO plans (
      id,
      name,
      cost,
      features,
      is_active,
      created_by
    ) VALUES (
      plan_id,
      'Plan Intermedio',
      59.99,
      ARRAY[
        'Seguimiento semanal',
        'Plan de entrenamiento personalizado',
        'Acceso a todos los eventos',
        'Soporte prioritario',
        'Análisis de rendimiento',
        'Consultas ilimitadas'
      ],
      true,
      admin_id
    );
    plan_ids := array_append(plan_ids, plan_id);
    
    -- Plan Premium
    plan_id := gen_random_uuid();
    INSERT INTO plans (
      id,
      name,
      cost,
      features,
      is_active,
      created_by
    ) VALUES (
      plan_id,
      'Plan Premium',
      99.99,
      ARRAY[
        'Seguimiento diario',
        'Plan de entrenamiento ultra personalizado',
        'Acceso VIP a eventos exclusivos',
        'Soporte 24/7',
        'Análisis avanzado de rendimiento',
        'Consultas ilimitadas',
        'Sesiones de coaching en vivo',
        'Nutrición personalizada',
        'Preparación para competiciones'
      ],
      true,
      admin_id
    );
    plan_ids := array_append(plan_ids, plan_id);
  END;

  -- ============================================
  -- PASO 4: CREAR CLIENTES (tabla clients)
  -- Repartir entre admin y los 3 coaches
  -- ============================================
  
  DECLARE
    client_record_id uuid;
    payment_statuses text[] := ARRAY['active', 'pending', 'overdue'];
    status text;
    phone_prefixes text[] := ARRAY['+34 600', '+34 601', '+34 602', '+34 603', '+34 610', '+34 611', '+34 612', '+34 613', '+34 620', '+34 621'];
    phone_number text;
    client_user_id uuid;
    selected_plan_id uuid;
    all_plan_ids uuid[];
    assigned_coach_id uuid;
    coach_index int;
  BEGIN
    -- Obtener todos los planes creados
    SELECT array_agg(id) INTO all_plan_ids FROM plans;
    
    FOR i IN 1..array_length(client_ids, 1) LOOP
      client_user_id := client_ids[i];
      
      -- Obtener nombre del usuario
      SELECT raw_user_meta_data->>'name' INTO random_name
      FROM auth.users
      WHERE id = client_user_id;
      
      -- Asignar cliente a un coach/admin aleatorio (repartir equitativamente)
      coach_index := ((i - 1) % array_length(all_coach_ids, 1)) + 1;
      assigned_coach_id := all_coach_ids[coach_index];
      
      -- Generar teléfono aleatorio
      phone_number := phone_prefixes[floor(random() * array_length(phone_prefixes, 1)) + 1] || ' ' || 
                      lpad(floor(random() * 1000000)::text, 6, '0');
      
      -- Status de pago aleatorio
      status := payment_statuses[floor(random() * array_length(payment_statuses, 1)) + 1];
      
      -- Asignar plan aleatorio de los planes globales (70% de probabilidad de tener plan)
      IF random() < 0.7 AND all_plan_ids IS NOT NULL AND array_length(all_plan_ids, 1) > 0 THEN
        -- Seleccionar un plan aleatorio de todos los planes disponibles
        selected_plan_id := all_plan_ids[floor(random() * array_length(all_plan_ids, 1)) + 1];
      ELSE
        selected_plan_id := NULL;
      END IF;
      
      INSERT INTO clients (
        coach_id,
        user_id,
        name,
        email,
        phone,
        payment_status,
        plan_id,
        notes,
        created_at
      ) VALUES (
        assigned_coach_id,
        client_user_id,
        random_name,
        (SELECT email FROM auth.users WHERE id = client_user_id),
        phone_number,
        status,
        selected_plan_id,
        CASE WHEN random() > 0.7 THEN 'Cliente activo desde hace ' || floor(random() * 12)::text || ' meses' ELSE NULL END,
        (SELECT created_at FROM auth.users WHERE id = client_user_id)
      );
    END LOOP;
  END;

  -- ============================================
  -- PASO 5: CREAR HISTORIAL DE PAGOS RANDOM
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
          email,
          created_at
        ) VALUES (
          client_record.coach_id,
          client_record.client_id,
          client_record.user_id,
          payment_amount,
          payment_date,
          payment_status,
          payment_method,
          NULL, -- email (NULL porque el usuario tiene cuenta)
          payment_date::timestamp with time zone
        );
      END LOOP;
    END LOOP;
  END;

  -- ============================================
  -- PASO 6: CREAR EVENTOS (últimos 6 meses)
  -- Crear eventos para cada coach/admin
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
    num_events_per_coach int := 3; -- 3 eventos por coach/admin
    event_id uuid;
    event_coach_id uuid;
  BEGIN
    -- Crear eventos para cada coach/admin
    FOR j IN 1..array_length(all_coach_ids, 1) LOOP
      event_coach_id := all_coach_ids[j];
      
      FOR i IN 1..num_events_per_coach LOOP
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
          max_capacity,
          image_url,
          loop_distance,
          loop_elevation,
          loop_duration,
          prize_pool,
          start_date,
          end_date,
          registration_deadline,
          event_type,
          external_registration_url,
          slug,
          created_at
        ) VALUES (
          event_coach_id,
          event_name,
          event_date,
          event_location,
          event_description,
          event_price,
          NULL, -- max_capacity
          NULL, -- image_url
          NULL, -- loop_distance
          NULL, -- loop_elevation
          NULL, -- loop_duration
          NULL, -- prize_pool
          NULL, -- start_date
          NULL, -- end_date
          NULL, -- registration_deadline
          NULL, -- event_type
          NULL, -- external_registration_url
          NULL, -- slug
          event_date::timestamp with time zone - interval '7 days' -- Creado 7 días antes del evento
        ) RETURNING id INTO event_id;
      
        -- ============================================
        -- PASO 7: CREAR REGISTROS DE EVENTOS
        -- ============================================
        
        -- Cada evento tiene entre 3 y 20 participantes aleatorios
        DECLARE
          num_registrations int := 3 + floor(random() * 18)::int;
          registration_client_id uuid;
          registration_user_id uuid;
          selected_clients uuid[];
          k int;
          v_coach_id uuid := event_coach_id; -- Alias para evitar ambigüedad
          v_event_id uuid := event_id; -- Alias para evitar ambigüedad
        BEGIN
          -- Seleccionar clientes aleatorios para este evento (del coach que creó el evento)
          SELECT array_agg(c.user_id ORDER BY random())
          INTO selected_clients
          FROM clients c
          WHERE c.coach_id = v_coach_id
          LIMIT num_registrations;
          
          -- Si hay clientes seleccionados, crear registros
          IF selected_clients IS NOT NULL THEN
            FOR k IN 1..array_length(selected_clients, 1) LOOP
              registration_user_id := selected_clients[k];
              
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
                  email,
                  created_at
                )
                SELECT 
                  v_event_id,
                  registration_client_id,
                  registration_user_id,
                  NULL, -- email (NULL porque el usuario tiene cuenta)
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
    END LOOP;
  END;

  -- ============================================
  -- PASO 6.5: CREAR EVENTO UBY PROTRAIL (Ultra Backyard 2025)
  -- ============================================
  
  DECLARE
    uby_event_id uuid;
    uby_coach_id uuid;
    uby_description text := 'Tu propio Ultra Backyard. Tu reto personal.

¿Por cuántas vueltas vas?

El Ultra Backyard es la prueba definitiva de resistencia mental y física.

Tienes 60 minutos para completar un circuito de 5.2 km 221 D+ (info puede variar según el GPS).

El tiempo que sobra es para recuperar fuerzas y prepararte para el siguiente loop, que arranca puntual a la hora exacta.

LOOP DE 5.2 KM
+221 MTS
60 MINS

El circuito es retador, pero accesible.

Caminando y trotando (CA/CO) puedes completarlo en menos de una hora, asegurando que todos vivan la emoción de la experiencia UBY de poder reiniciar una y otra vez.

¿Cuál será tu límite?

¿Solo quieres disfrutar?

¡O quizás ganar un dinerito!

Hemos añadido un incentivo extra para avivar la llama de la competición: el modo #maltratate.

La bolsa total a repartir es de $15,000.00 m.n.

Rifas y regalos para los corredores que van finalizando

#MALTRÁTATE

Cada 10 vueltas (Vuelta 10, 20, 30 y 40)

EL DESAFÍO

El y la corredora más rápida de cada 10 vueltas ganan un premio en efectivo de nuestros patrocinadores.

TU ESTRATEGIA

Puedes competir por la victoria total como el o la última corredora en quedar de pie, buscar ganar los bonos en efectivo cada 10 vueltas o simplemente correr y ver hasta dónde puedes llegar

PROGRAMA

VIERNES 12 DE DICIEMBRE

Horario: 12 a 19 hrs. (no olvides tu QR y una identificación)
Entrega de números
Deporte Habitat Sur
Av López Mateos Sur, Vicente Guerrero 3188, entre Constitución, Agua Blanca Sur, 45235 Zapopan, Jal.

SÁBADO 13 DE DICIEMBRE

La Soledad Bike Park

6:00 a.m.
Apertura del área de meta para recibir a corredores y acompañantes.

6:00 a.m. - 7:00 a.m.
Continúa entrega de números (La Soledad Bike Park)
Se requiere presentar tu QR y Identificación oficial para la entrega

8:00 a.m.
Arranque puntual de la primera vuelta.

Cada hora se repite la salida hasta que quede un(a) solo(a) corredor(a) en pie o se complete la vuelta #40.

DOMINGO 14 DE DICIEMBRE

11:00 p.m.
Última arrancada: vuelta final.

11:59 p.m.
Cierre de meta e inicio de preparativos para la premiación.

Si los finalistas no llegan a la vuelta #40, se premiará al concluir la última vuelta completada y se entregaran los premios en efectivo de la manera que se explica en el Reglamento.

12:15 a.m. (lunes)
En caso de alcanzar la vuelta #40
Clausura oficial del evento deportivo.
Continúa el campamento y convivencia para quienes decidan quedarse a descansar.

MATERIAL SUGERIDO

• Calzado para trail
• Lámpara frontal
• Botiquín personal
• Tienda de campaña y sleeping (para el descanso del corredor o acompañantes)
• Rompevientos
• Bastones
• Material para aseo personal

AUTO SUFICIENCIA

El evento no cuenta con un abastecimiento oficial de alimentos sólidos, contaremos con producto de GU en geles, gomas e hidratación pero es obligatorio para cada corredor llevar su propio alimento.

DETALLES DEL DESAFÍO

INSCRIPCIONES Y PAGOS

• Fechas de inscripción: cierre de registro lunes 8 diciembre 11 am
• Costo de inscripción: $650
• Proceso de inscripción: protrail.mx/eventos/uby-2025/registro
• Métodos de pago: SPEI y Tarjetas de crédito/débito
• Límite de corredores: 250 corredores
• PROMOCION para equipos: Paga 10 y recibe 11 folios
• Menores de edad con acompañante mayor de edad y firmando responsiva especial
• Pet Friendly, mascotas bienvenidas en el evento.

CATEGORÍAS Y PREMIACIÓN

• Categorias: Libre varonil y libre femenil
• Premiación: $15,000MXN a repartir de la siguiente manera:
  - $500.00 para el corredor y la corredora más rápida de la vuelta 10
  - $1,000.00 para el corredor y la corredora más rápida de la vuelta 20
  - $2,000.00 para el corredor y la corredora más rápida de la vuelta 30
  - $4,000.00 para el corredor y la corredora más rápida de la vuelta 40
• Trofeo al último hombre y la última mujer de pie como ganadores absolutos.

REGLAS DEL JUEGO Y PARTE LEGAL

Consulta cada apartado de información

Reglamento de competencia
Deslinde de Responsabilidad

Para poder participar es requerido firmar reglamento y deslinde de responsabilidad.

CONDICIONES DE REGISTRO

Para cambios se debe presentar copia de INE el mismo día de entrega de números. No hay devoluciones o reembolsos.

SERVICIOS ADICIONALES

• Busca tus Fotos a cargo de PHOTOSPORTS
• Estacionamiento y zona de camping sin costo extra';
  BEGIN
    -- Seleccionar el primer coach/admin disponible para el evento UBY
    SELECT id INTO uby_coach_id
    FROM user_profiles
    WHERE role IN ('admin', 'coach')
    ORDER BY created_at
    LIMIT 1;
    
    -- Crear el evento Ultra Backyard 2025
    INSERT INTO events (
      coach_id,
      name,
      date,
      location,
      description,
      price,
      max_capacity,
      image_url,
      loop_distance,
      loop_elevation,
      loop_duration,
      prize_pool,
      start_date,
      end_date,
      registration_deadline,
      event_type,
      external_registration_url,
      slug,
      created_at,
      updated_at
    ) VALUES (
      uby_coach_id,
      'Ultra Backyard 2025',
      '2025-12-13'::date,
      'La Soledad Bike Park, Zapopan, Jalisco',
      uby_description,
      650.00,
      250,
      NULL, -- image_url
      NULL, -- loop_distance
      NULL, -- loop_elevation
      NULL, -- loop_duration
      NULL, -- prize_pool
      NULL, -- start_date
      NULL, -- end_date
      NULL, -- registration_deadline
      NULL, -- event_type
      NULL, -- external_registration_url
      NULL, -- slug
      '2025-12-12 03:32:49.481998+00'::timestamp with time zone,
      '2025-12-12 03:32:49.481998+00'::timestamp with time zone
    ) RETURNING id INTO uby_event_id;
    
    RAISE NOTICE 'Evento Ultra Backyard 2025 creado con ID: %', uby_event_id;
  END;

  RAISE NOTICE 'Seeder completado exitosamente!';
  RAISE NOTICE 'Admin creado con ID: %', admin_id;
  RAISE NOTICE 'Coaches creados: %', array_length(coach_ids, 1);
  RAISE NOTICE 'Clientes creados: %', client_count;
  RAISE NOTICE 'Total coaches/admin: %', array_length(all_coach_ids, 1);
END $$;

-- ============================================
-- VERIFICACIÓN DE DATOS CREADOS
-- ============================================

SELECT 
  'Admin' as tipo,
  count(*) as cantidad
FROM user_profiles
WHERE role = 'admin'

UNION ALL

SELECT 
  'Coaches' as tipo,
  count(*) as cantidad
FROM user_profiles
WHERE role = 'coach'

UNION ALL

SELECT 
  'Usuarios' as tipo,
  count(*) as cantidad
FROM user_profiles
WHERE role = 'user'

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
FROM event_registrations

UNION ALL

SELECT 
  'Planes' as tipo,
  count(*) as cantidad
FROM plans;

