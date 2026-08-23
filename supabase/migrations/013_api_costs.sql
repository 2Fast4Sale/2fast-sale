-- Migration 013: Kostenerfassung pro API-Aufruf
-- Zweck: echte Marge pro Inserat und pro Haendler sichtbar machen.
-- Diese Daten sind INTERN -- Haendler duerfen sie nie sehen.

-- Admin-Flag auf Profilen
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create table if not exists public.api_costs (
  id          uuid default gen_random_uuid() primary key,
  -- Wer hat den Aufruf ausgeloest
  user_id     uuid references auth.users(id) on delete set null,
  -- Zu welchem Fahrzeug gehoert er (optional -- z.B. Scan vor dem Anlegen)
  vehicle_id  uuid references public.vehicles(id) on delete set null,
  -- Anbieter: anthropic | removebg | photoroom | fal | pixelcut
  service     text not null,
  -- Konkrete Operation: generate-description | remove-bg | scan-doc | ...
  operation   text not null,
  -- Verrechnungseinheiten (Tokens bei LLM, Bilder bei Bildbearbeitung)
  units_in    integer default 0,
  units_out   integer default 0,
  -- Kosten in Mikro-Euro (1 EUR = 1_000_000). Integer vermeidet Rundungsdrift.
  cost_micros bigint  not null default 0,
  meta        jsonb   default '{}'::jsonb,
  created_at  timestamptz default now()
);

create index if not exists api_costs_user_idx    on public.api_costs (user_id, created_at desc);
create index if not exists api_costs_vehicle_idx on public.api_costs (vehicle_id);
create index if not exists api_costs_created_idx on public.api_costs (created_at desc);

alter table public.api_costs enable row level security;

-- Standardmaessig darf NIEMAND ueber den Anon-Key lesen.
-- Schreiben passiert ausschliesslich serverseitig mit dem Service-Role-Key,
-- der RLS ohnehin umgeht. Nur Admins duerfen lesen.
drop policy if exists "admins_read_api_costs" on public.api_costs;
create policy "admins_read_api_costs" on public.api_costs
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

comment on table public.api_costs is
  'Interne Kostenerfassung pro API-Aufruf. Nur fuer Admins sichtbar.';
comment on column public.api_costs.cost_micros is
  'Kosten in Mikro-Euro. 1 EUR = 1000000. Integer statt float gegen Rundungsdrift.';
