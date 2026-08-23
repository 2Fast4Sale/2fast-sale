-- Merkspalten fuer verschickte E-Mails.
--
-- Ohne Zustand verschickt die Plattform die Begruessung bei jedem Login
-- erneut und den Guthaben-Hinweis nach jedem einzelnen Inserat. Nichts
-- bringt einen Haendler schneller dazu, den Absender zu blockieren -- und
-- danach kommt auch die Rechnung nicht mehr an.

alter table public.profiles
  add column if not exists welcome_email_at timestamptz;

comment on column public.profiles.welcome_email_at is
  'Zeitpunkt der Begruessungsmail. Gesetzt = bereits verschickt, wird nie zurueckgesetzt.';

alter table public.profiles
  add column if not exists low_credit_email_at timestamptz;

comment on column public.profiles.low_credit_email_at is
  'Zeitpunkt des letzten Guthaben-Hinweises. Wird beim Aufladen auf NULL '
  'gesetzt, damit beim naechsten Zurneigegehen wieder gewarnt wird.';

-- Beide Spalten werden ausschliesslich serverseitig gesetzt. Die
-- bestehende RLS-Policy auf profiles erlaubt dem Nutzer, seine eigene
-- Zeile zu aendern -- er koennte den Zeitstempel also selbst zuruecksetzen
-- und sich die Mails erneut schicken lassen. Harmlos, aber unnoetig:
-- ein Trigger haelt die Spalten gegen Aenderungen von aussen fest.
create or replace function public.email_zustand_schuetzen()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Der Service-Role-Schluessel umgeht RLS und laeuft nicht als
  -- authenticated; nur fuer diese Rolle sind Aenderungen erlaubt.
  if auth.role() = 'authenticated' then
    new.welcome_email_at    := old.welcome_email_at;
    new.low_credit_email_at := old.low_credit_email_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_email_zustand on public.profiles;
create trigger profiles_email_zustand
  before update on public.profiles
  for each row execute function public.email_zustand_schuetzen();
