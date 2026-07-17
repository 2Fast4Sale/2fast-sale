-- Migration 009: Vollständige Settings-Erweiterungen für Launch

-- Fehlende Spalten im profiles table
alter table public.profiles
  add column if not exists phone                text,
  add column if not exists billing_address      jsonb,
  add column if not exists ai_style_template    text  default '',
  add column if not exists ai_title_template    text  default '',
  add column if not exists watermark_enabled    boolean default false,
  add column if not exists notifications_email  boolean default true,
  add column if not exists notifications_news   boolean default true,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_plan_name     text,
  add column if not exists plan_expires_at      timestamptz;

-- App-weite Einstellungen (Stripe Price IDs etc.)
create table if not exists public.app_settings (
  key   text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Nur service role darf app_settings lesen/schreiben
alter table public.app_settings enable row level security;
create policy "service_only" on public.app_settings
  using (false); -- Kein direkter Client-Zugriff
