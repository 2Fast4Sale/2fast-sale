-- Stripe Customer ID zum Profil hinzufügen
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists plan text default 'free';

-- Index für schnelle Suche
create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id);
