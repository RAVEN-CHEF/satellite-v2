-- =====================================================================
-- SATELLITE V2 · SUPABASE SCHEMA CORREGIDO
-- Ejecutar en Supabase SQL Editor
-- Notas: usa "profiles" (vinculada a auth.users), no tabla "users"
-- =====================================================================

-- Extensiones
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────
-- PROFILES (vinculada a auth.users vía trigger)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  nombre     text,
  role       text not null default 'empleado'
               check (role in ('raven','admin','empleado')),
  permisos   jsonb not null default '{}',
  activo     boolean not null default true,
  created_at timestamptz default now()
);

-- Trigger: auto-crear perfil al registrar usuario en auth.users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'empleado')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────
-- RECETAS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.recetas (
  id            uuid primary key default uuid_generate_v4(),
  nombre        text not null,
  categoria     text,
  ingredientes  jsonb not null default '[]',
  pasos         text,
  subrecetas    jsonb not null default '[]',
  scale_min     float not null default 0.25,
  scale_max     float not null default 10,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- INVENTARIO
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.inventory (
  id           uuid primary key default uuid_generate_v4(),
  ingrediente  text not null,
  stock        numeric not null default 0 check (stock >= 0),
  unit         text not null default 'kg',
  updated_at   timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- CHECKINS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.checkins (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  gps        text,
  status     text not null default 'ok',
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- FIRMAS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.signatures (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  image      text,
  status     text not null default 'pending'
               check (status in ('pending','approved','rejected')),
  token      text unique default encode(gen_random_bytes(16),'hex'),
  used       boolean not null default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- HORARIOS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.horarios (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  week_start  date not null,
  day_index   int  not null check (day_index between 0 and 6),
  shift       text check (shift in ('Mañana','Tarde','Noche','Descanso')),
  observation text,
  created_at  timestamptz default now(),
  unique(user_id, week_start, day_index)
);

-- ─────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.recetas    enable row level security;
alter table public.inventory  enable row level security;
alter table public.checkins   enable row level security;
alter table public.signatures enable row level security;
alter table public.horarios   enable row level security;

-- Helper: verificar rol del usuario autenticado
create or replace function public.get_my_role()
returns text language sql security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

-- ── PROFILES ──────────────────────────────────────────────────────────
drop policy if exists "profiles_read_own"  on public.profiles;
drop policy if exists "profiles_read_admin" on public.profiles;
drop policy if exists "profiles_write_admin" on public.profiles;

create policy "profiles_read_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_read_admin"
  on public.profiles for select
  using (get_my_role() in ('admin','raven'));

create policy "profiles_write_admin"
  on public.profiles for all
  using (get_my_role() in ('admin','raven'));

-- ── RECETAS ───────────────────────────────────────────────────────────
drop policy if exists "recetas_read"  on public.recetas;
drop policy if exists "recetas_write" on public.recetas;

create policy "recetas_read"
  on public.recetas for select
  using (auth.role() = 'authenticated');

create policy "recetas_write"
  on public.recetas for all
  using (get_my_role() in ('admin','raven'));

-- ── INVENTORY ─────────────────────────────────────────────────────────
drop policy if exists "inventory_read"  on public.inventory;
drop policy if exists "inventory_write" on public.inventory;

create policy "inventory_read"
  on public.inventory for select
  using (auth.role() = 'authenticated');

create policy "inventory_write"
  on public.inventory for all
  using (get_my_role() in ('admin','raven'));

-- ── CHECKINS ──────────────────────────────────────────────────────────
drop policy if exists "checkins_select_own"   on public.checkins;
drop policy if exists "checkins_select_admin" on public.checkins;
drop policy if exists "checkins_insert"       on public.checkins;

create policy "checkins_select_own"
  on public.checkins for select
  using (user_id = auth.uid());

create policy "checkins_select_admin"
  on public.checkins for select
  using (get_my_role() in ('admin','raven'));

create policy "checkins_insert"
  on public.checkins for insert
  with check (user_id = auth.uid());

-- ── SIGNATURES ────────────────────────────────────────────────────────
drop policy if exists "signatures_select_own"     on public.signatures;
drop policy if exists "signatures_select_admin"   on public.signatures;
drop policy if exists "signatures_insert"         on public.signatures;
drop policy if exists "signatures_update_admin"   on public.signatures;

create policy "signatures_select_own"
  on public.signatures for select
  using (user_id = auth.uid());

create policy "signatures_select_admin"
  on public.signatures for select
  using (get_my_role() in ('admin','raven'));

create policy "signatures_insert"
  on public.signatures for insert
  with check (user_id = auth.uid());

create policy "signatures_update_admin"
  on public.signatures for update
  using (get_my_role() in ('admin','raven'));

-- ── HORARIOS ──────────────────────────────────────────────────────────
drop policy if exists "horarios_select_own"   on public.horarios;
drop policy if exists "horarios_select_admin" on public.horarios;
drop policy if exists "horarios_write_admin"  on public.horarios;

create policy "horarios_select_own"
  on public.horarios for select
  using (user_id = auth.uid());

create policy "horarios_select_admin"
  on public.horarios for select
  using (get_my_role() in ('admin','raven'));

create policy "horarios_write_admin"
  on public.horarios for all
  using (get_my_role() in ('admin','raven'));

-- ─────────────────────────────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────────────────────────────
create index if not exists idx_checkins_user    on public.checkins(user_id);
create index if not exists idx_checkins_date    on public.checkins(created_at desc);
create index if not exists idx_signatures_user  on public.signatures(user_id);
create index if not exists idx_signatures_token on public.signatures(token);
create index if not exists idx_signatures_status on public.signatures(status);
create index if not exists idx_horarios_week    on public.horarios(week_start);
create index if not exists idx_horarios_user    on public.horarios(user_id);
create index if not exists idx_recetas_cat      on public.recetas(categoria);
create index if not exists idx_profiles_role    on public.profiles(role);
