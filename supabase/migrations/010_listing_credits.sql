-- Migration 010: Listing Credits für Privatpersonen (4,99 € / Inserat)
alter table public.profiles
  add column if not exists listing_credits integer default 0;

-- Index für Abfragen
create index if not exists profiles_listing_credits_idx
  on public.profiles (listing_credits);

-- Tabelle für bereits erfüllte Stripe-Sessions (verhindert Doppel-Gutschriften)
create table if not exists public.stripe_fulfillments (
  id         text primary key,           -- Stripe checkout session_id
  user_id    uuid references public.profiles(id) on delete cascade,
  quantity   integer not null default 1,
  created_at timestamptz default now()
);

-- Nur der User selbst darf seine eigenen Einträge lesen
alter table public.stripe_fulfillments enable row level security;

create policy "User sieht eigene Fulfillments"
  on public.stripe_fulfillments for select
  using (auth.uid() = user_id);
