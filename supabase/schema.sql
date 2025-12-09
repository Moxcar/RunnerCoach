-- RunnerCoach Database Schema
-- Ejecuta este script en el SQL Editor de Supabase

-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";

-- Tabla de perfiles de usuario (coach o cliente)
create table if not exists user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text check (role in ('coach', 'client')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de clientes (relación entre coach y cliente)
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references auth.users(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade, -- Si el cliente tiene cuenta
  name text not null,
  email text,
  phone text,
  payment_status text check (payment_status in ('active', 'pending', 'overdue')) default 'pending',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de pagos
create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade,
  client_user_id uuid references auth.users(id) on delete set null, -- Usuario que realizó el pago
  amount decimal(10,2) not null,
  date date not null,
  status text check (status in ('completed', 'pending', 'failed')) default 'pending',
  method text check (method in ('stripe', 'manual', 'cash')) default 'manual',
  stripe_payment_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de eventos
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  date date not null,
  location text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de inscripciones a eventos
create table if not exists event_registrations (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, -- Usuario que se inscribe
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

-- Función para actualizar updated_at automáticamente
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers para updated_at
create trigger update_clients_updated_at
  before update on clients
  for each row
  execute function update_updated_at_column();

create trigger update_events_updated_at
  before update on events
  for each row
  execute function update_updated_at_column();

-- Políticas de seguridad RLS (Row Level Security)
alter table clients enable row level security;
alter table payments enable row level security;
alter table events enable row level security;
alter table event_registrations enable row level security;

-- Política: Los coaches solo pueden ver/editar sus propios datos
create policy "Coaches can view own clients"
  on clients for select
  using (auth.uid() = coach_id);

create policy "Coaches can insert own clients"
  on clients for insert
  with check (auth.uid() = coach_id);

create policy "Coaches can update own clients"
  on clients for update
  using (auth.uid() = coach_id);

create policy "Coaches can delete own clients"
  on clients for delete
  using (auth.uid() = coach_id);

create policy "Coaches can view own payments"
  on payments for select
  using (auth.uid() = coach_id);

create policy "Coaches can insert own payments"
  on payments for insert
  with check (auth.uid() = coach_id);

create policy "Coaches can update own payments"
  on payments for update
  using (auth.uid() = coach_id);

create policy "Coaches can delete own payments"
  on payments for delete
  using (auth.uid() = coach_id);

create policy "Coaches can view own events"
  on events for select
  using (auth.uid() = coach_id);

create policy "Coaches can insert own events"
  on events for insert
  with check (auth.uid() = coach_id);

create policy "Coaches can update own events"
  on events for update
  using (auth.uid() = coach_id);

create policy "Coaches can delete own events"
  on events for delete
  using (auth.uid() = coach_id);

create policy "Coaches can view own event registrations"
  on event_registrations for select
  using (
    exists (
      select 1 from events
      where events.id = event_registrations.event_id
      and events.coach_id = auth.uid()
    )
  );

create policy "Coaches can insert own event registrations"
  on event_registrations for insert
  with check (
    exists (
      select 1 from events
      where events.id = event_registrations.event_id
      and events.coach_id = auth.uid()
    )
  );

create policy "Coaches can delete own event registrations"
  on event_registrations for delete
  using (
    exists (
      select 1 from events
      where events.id = event_registrations.event_id
      and events.coach_id = auth.uid()
    )
  );

-- Índices para mejorar el rendimiento
create index if not exists clients_coach_id_idx on clients(coach_id);
create index if not exists clients_payment_status_idx on clients(payment_status);
create index if not exists payments_coach_id_idx on payments(coach_id);
create index if not exists payments_client_id_idx on payments(client_id);
create index if not exists payments_date_idx on payments(date);
create index if not exists events_coach_id_idx on events(coach_id);
create index if not exists events_date_idx on events(date);
create index if not exists event_registrations_event_id_idx on event_registrations(event_id);
create index if not exists event_registrations_client_id_idx on event_registrations(client_id);

