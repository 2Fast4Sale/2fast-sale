-- Privat oder gewerblich.
--
-- Wer als Privatperson ein einzelnes Auto verkauft, hat keine Firma. Das
-- Registrierungsformular fragt das jetzt ab; ohne diese Spalte bliebe die
-- Angabe in den Anmeldedaten stecken und waere nirgends abfragbar.
--
-- Gebraucht wird sie an mehreren Stellen:
--   - Rechnung: bei Privatkunden gibt es keinen Firmennamen und keine
--     USt-IdNr., und die Preise muessen brutto ausgezeichnet sein (PAngV).
--   - Preisseite: Haendlerpakete ergeben fuer eine Privatperson keinen
--     Sinn, die kauft einzelne Credits.
--   - Widerrufsrecht: Verbrauchern steht es zu, Haendlern nicht. Wer das
--     nicht auseinanderhalten kann, kann es auch nicht richtig belehren.

alter table public.profiles
  add column if not exists konto_art text
    not null default 'haendler'
    check (konto_art in ('privat', 'haendler'));

comment on column public.profiles.konto_art is
  'privat = Verbraucher, kauft einzelne Credits. haendler = Gewerbe, bucht Pakete.';

create index if not exists profiles_konto_art_idx
  on public.profiles (konto_art);

/*
 * Die Angabe aus der Registrierung uebernehmen.
 *
 * Die bestehende Funktion schrieb nur Name und Firma. Ohne diese
 * Ergaenzung liefe die Auswahl im Formular ins Leere — sie stuende in
 * auth.users.raw_user_meta_data und niemand laese sie je.
 *
 * Der Rueckfall auf 'haendler' ist Absicht: Alle bisherigen Konten sind
 * ueber das Formular ohne Auswahl entstanden, und dort war die Firma das
 * vorgesehene Feld.
 */
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, company, konto_art)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company',
    coalesce(new.raw_user_meta_data->>'konto_art', 'haendler')
  );
  return new;
end;
$$ language plpgsql security definer;
