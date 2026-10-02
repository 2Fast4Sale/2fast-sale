-- Migration 025: Zugangsdaten der Händler für mobile.de und AutoScout24
--
-- Warum eine eigene Tabelle und nicht ein paar Spalten in profiles:
--
-- 1. Hier liegen fremde Passwörter. Die Tabelle bekommt KEINE
--    RLS-Richtlinie, also kommt niemand mit einem Anon- oder
--    User-Schlüssel heran -- nur der Server mit dem Dienstschlüssel.
--    profiles dagegen liest der Browser selbst (Plan, Guthaben, Name).
--    Ein Passwort in einer Tabelle, die der Browser liest, ist eine
--    Frage der Zeit.
--
-- 2. Je Händler kann es mehrere Zugänge geben (heute zwei Portale,
--    morgen ein drittes). Als Spalten in profiles wären das bei jedem
--    neuen Portal drei neue Spalten.
--
-- Das Geheimnis selbst steht verschlüsselt (AES-256-GCM, Schlüssel in
-- PORTAL_SCHLUESSEL). Die Datenbank sieht also auch im Backup kein
-- Klartextpasswort.

create table if not exists public.portal_zugaenge (
  user_id    uuid not null references public.profiles(id) on delete cascade,

  /* 'mobile' = mobile.de, 'as24' = AutoScout24. */
  portal     text not null check (portal in ('mobile', 'as24')),

  /* Benutzername des API-Zugangs. Kann leer sein, wenn das Portal den
     Händler über eine Partner-Zuordnung kennt und nur die Kontonummer
     braucht. */
  benutzer   text,

  /* Passwort oder Schlüssel, verschlüsselt. Format: v1:iv:tag:cipher */
  geheim     text,

  /* sellerId bei mobile.de, customerId bei AutoScout24. */
  konto_nummer text,

  /* Solange true, geht alles in die Sandbox bzw. den Testmodus des
     Portals. Standard true: Ein Inserat, das aus Versehen öffentlich
     wird, kostet den Händler Geld und seinen Ruf. */
  testmodus  boolean not null default true,

  /* Ergebnis der letzten Prüfung -- damit der Händler sieht, ob seine
     Eingabe stimmt, ohne ein Inserat anzulegen. */
  geprueft_am   timestamptz,
  pruef_ok      boolean,
  pruef_meldung text,

  erstellt_am  timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),

  primary key (user_id, portal)
);

comment on table public.portal_zugaenge is
  'Zugangsdaten der Haendler fuer mobile.de und AutoScout24. Geheimnisse '
  'verschluesselt (AES-256-GCM). Absichtlich ohne RLS-Richtlinie: nur der '
  'Server mit dem Dienstschluessel darf lesen.';

alter table public.portal_zugaenge enable row level security;

-- Bewusst KEINE Richtlinie. Mit aktivem RLS und ohne Richtlinie darf
-- kein Anon- und kein User-Schlüssel etwas sehen; der Dienstschlüssel
-- umgeht RLS ohnehin. Die Oberfläche liest über /api/portal-zugang und
-- bekommt dort nie das Geheimnis zurück, nur ob eines gesetzt ist.

create index if not exists portal_zugaenge_user_idx
  on public.portal_zugaenge (user_id);
