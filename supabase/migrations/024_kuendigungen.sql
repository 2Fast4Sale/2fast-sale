-- Kuendigungen ueber den Kuendigungsbutton.
--
-- Seit Juli 2022 verlangt Paragraf 312k BGB fuer jeden im Netz
-- geschlossenen Dauerschuldvertrag einen Kuendigungsbutton. Die Anlage
-- ist eng gefasst:
--
--   Er muss "staendig verfuegbar sowie unmittelbar und leicht
--   erreichbar" sein. Ein Knopf im eingeloggten Bereich genuegt NICHT
--   -- wer sein Passwort vergessen hat, koennte sonst nicht kuendigen,
--   und genau das war der Anlass fuer das Gesetz.
--
--   Er muss "Vertraege hier kuendigen" heissen oder eine ebenso
--   eindeutige Formulierung tragen.
--
--   Die Bestaetigungsschaltflaeche muss "jetzt kuendigen" heissen.
--
--   Der Eingang ist dem Kunden sofort in Textform zu bestaetigen, mit
--   Inhalt, Datum und Uhrzeit.
--
-- Fehlt der Button, kann der Kunde jederzeit und formlos kuendigen --
-- und es ist abmahnfaehig. Deshalb wird jede Kuendigung hier
-- festgehalten: Wer sie bestreitet, muss belegen koennen, wann sie
-- einging.

create table if not exists public.kuendigungen (
  id             uuid primary key default gen_random_uuid(),

  /*
   * Ohne Anmeldung. Die Kuendigung muss auch dem moeglich sein, der
   * sich nicht mehr einloggen kann -- deshalb ist user_id optional und
   * die Zuordnung passiert ueber die E-Mail-Adresse.
   */
  user_id        uuid references auth.users(id) on delete set null,
  email          text not null,
  name           text,
  vertrag        text,

  /* 'ordentlich' oder 'ausserordentlich' -- Paragraf 312k verlangt die Wahl. */
  art            text not null default 'ordentlich'
    check (art in ('ordentlich', 'ausserordentlich')),
  /* Bei ausserordentlicher Kuendigung verlangt das Gesetz einen Grund. */
  grund          text,
  zum_datum      text,

  eingegangen_am timestamptz not null default now(),
  bestaetigt_am  timestamptz,
  erledigt_am    timestamptz,

  /*
   * Zur Beweissicherung. Wer den Eingang bestreitet, muss belegen
   * koennen, woher die Erklaerung kam.
   */
  ip_adresse     inet
);

comment on table public.kuendigungen is
  'Eingaenge ueber den Kuendigungsbutton nach Paragraf 312k BGB. Ohne Anmeldung moeglich.';

create index if not exists kuendigungen_email_idx on public.kuendigungen (email);
create index if not exists kuendigungen_offen_idx on public.kuendigungen (eingegangen_am)
  where erledigt_am is null;

alter table public.kuendigungen enable row level security;

-- Niemand liest hier ausser dem Server. Eine Kuendigung enthaelt Name,
-- Adresse und Grund -- das geht keinen anderen Kunden etwas an, und der
-- Kuendigende bekommt seine Bestaetigung per Mail.
drop policy if exists "eigene kuendigung sehen" on public.kuendigungen;
create policy "eigene kuendigung sehen" on public.kuendigungen
  for select using (auth.uid() = user_id);
