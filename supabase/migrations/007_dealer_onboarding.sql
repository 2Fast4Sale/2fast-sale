-- Migration 007: Händler-Profil Erweiterungen + Onboarding-Flag

alter table public.profiles
  add column if not exists onboarding_done    boolean  default false,
  add column if not exists default_background text     default 'studio_white',
  add column if not exists website            text,
  add column if not exists address            text;

-- Bestehende Nutzer als "onboarding done" markieren
-- (damit nur neue Registrierungen den Wizard sehen)
update public.profiles
set onboarding_done = true
where onboarding_done is null or onboarding_done = false;
