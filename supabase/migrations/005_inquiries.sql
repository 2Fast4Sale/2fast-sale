-- Anfragen-Posteingang
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  dealer_id   uuid not null references public.profiles(id) on delete cascade,
  vehicle_id  uuid references public.vehicles(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text,
  message     text,
  status      text not null default 'new', -- new | read | replied | archived
  notes       text
);

create index if not exists inquiries_dealer_id_idx on public.inquiries(dealer_id);
create index if not exists inquiries_vehicle_id_idx on public.inquiries(vehicle_id);

-- RLS
alter table public.inquiries enable row level security;

-- Händler sieht nur seine eigenen Anfragen
create policy "dealer sees own inquiries"
  on public.inquiries for select
  using (auth.uid() = dealer_id);

create policy "dealer updates own inquiries"
  on public.inquiries for update
  using (auth.uid() = dealer_id);

-- Jeder kann eine Anfrage erstellen (Kontaktformular)
create policy "anyone can insert inquiry"
  on public.inquiries for insert
  with check (true);
