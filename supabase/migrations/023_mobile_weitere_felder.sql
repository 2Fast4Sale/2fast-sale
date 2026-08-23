-- Die weiteren mobile.de-Felder.
--
-- Nicht Pflicht wie die fuenf aus 022, aber auf jedem ernsthaften
-- Inserat vorhanden. Kaeufer filtern nach HU und Vorbesitzern; ein
-- Inserat ohne diese Angaben wird bei der Suche schlicht nicht
-- gefunden.
--
-- Aufgeteilt nach Herkunft, weil das darueber entscheidet, wie viel
-- Arbeit sie machen:
--
--   Vom Fahrzeugschein  Tueren, Schadstoffklasse, Leergewicht,
--                       Antriebsart. Der Scan kann sie lesen, der
--                       Haendler prueft sie nur.
--
--   Vom Haendlerprofil  Umweltplakette. Aendert sich pro Haendler nie -
--                       fast immer gruen.
--
--   Je Fahrzeug         HU, Vorbesitzer, Polsterung, Innenfarbe. Diese
--                       vier muss er wirklich eintragen, drei davon per
--                       Knopfdruck.

alter table public.vehicles
  -- Vom Fahrzeugschein
  add column if not exists doors integer,
  -- Euronorm 1 bis 6, wie mobile.de sie erwartet
  add column if not exists emission_class text,
  add column if not exists drive_type text,

  -- Vom Profil vorbelegt
  -- 1 keine, 2 rot, 3 gelb, 4 gruen
  add column if not exists emission_sticker text,

  -- Je Fahrzeug
  -- Format MM/JJJJ. Als Text und nicht als Datum: Der Fahrzeugschein
  -- nennt Monat und Jahr, kein genaues Datum, und ein erfundener Tag
  -- waere eine Angabe, die niemand gemacht hat.
  add column if not exists hu_until text,
  add column if not exists previous_owners integer,
  add column if not exists interior_type text,
  add column if not exists interior_color text;

comment on column public.vehicles.hu_until is
  'Hauptuntersuchung gueltig bis, Format MM/JJJJ.';
comment on column public.vehicles.emission_class is
  'Euronorm als Text, z.B. "Euro 6d". Die Umsetzung in den mobile.de-Code passiert beim Export.';

-- Voreinstellung am Haendler. Die Umweltplakette ist bei praktisch jedem
-- Fahrzeug im Bestand dieselbe; sie bei jedem Inserat abzufragen ist
-- genau die Art von Arbeit, die ein Werkzeug abnehmen soll.
alter table public.profiles
  add column if not exists default_emission_sticker text;

comment on column public.profiles.default_emission_sticker is
  'Vorbelegung fuer neue Inserate. Ueberschreibbar je Fahrzeug.';
