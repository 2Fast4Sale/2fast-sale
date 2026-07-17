-- ============================================================
-- 2Fast4Sale — Datenbank Schema
-- In Supabase SQL Editor ausführen
-- ============================================================

-- VEHICLES Tabelle
create table if not exists public.vehicles (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references auth.users(id) on delete cascade not null,
  brand             text,
  vin               text,
  first_registration text,
  displacement_ccm  text,
  power_kw          text,
  fuel_type         text,
  color             text,
  seats             text,
  gross_weight_kg   text,
  km                text,
  price             text,
  dealer_notes      text,
  description       text,
  equipment         text[]  default '{}',
  status            text    default 'Entwurf',
  views             integer default 0,
  background_id     text    default 'studio_white',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- VEHICLE_IMAGES Tabelle
create table if not exists public.vehicle_images (
  id            uuid default gen_random_uuid() primary key,
  vehicle_id    uuid references public.vehicles(id) on delete cascade not null,
  original_url  text,
  processed_url text,
  position      integer default 0,
  created_at    timestamptz default now()
);

-- PROFILES Tabelle (erweiterte Nutzerinfos)
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  full_name  text,
  company    text,
  plan       text default 'free',
  created_at timestamptz default now()
);

-- Automatisch Profile anlegen wenn ein User sich registriert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, company)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at automatisch aktualisieren
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists vehicles_updated_at on public.vehicles;
create trigger vehicles_updated_at
  before update on public.vehicles
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Jeder sieht nur seine Daten
-- ============================================================

alter table public.vehicles       enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.profiles       enable row level security;

-- Vehicles
create policy "select_own_vehicles" on public.vehicles
  for select using (auth.uid() = user_id);
create policy "insert_own_vehicles" on public.vehicles
  for insert with check (auth.uid() = user_id);
create policy "update_own_vehicles" on public.vehicles
  for update using (auth.uid() = user_id);
create policy "delete_own_vehicles" on public.vehicles
  for delete using (auth.uid() = user_id);

-- Vehicle images
create policy "select_own_images" on public.vehicle_images
  for select using (
    vehicle_id in (select id from public.vehicles where user_id = auth.uid())
  );
create policy "insert_own_images" on public.vehicle_images
  for insert with check (
    vehicle_id in (select id from public.vehicles where user_id = auth.uid())
  );
create policy "delete_own_images" on public.vehicle_images
  for delete using (
    vehicle_id in (select id from public.vehicles where user_id = auth.uid())
  );

-- Profiles
create policy "select_own_profile" on public.profiles
  for select using (auth.uid() = id);
create policy "update_own_profile" on public.profiles
  for update using (auth.uid() = id);
