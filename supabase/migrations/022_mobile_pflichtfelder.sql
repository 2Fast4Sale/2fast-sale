-- Die fuenf Pflichtfelder von mobile.de.
--
-- Ohne sie laesst sich dort kein Inserat anlegen. Quelle ist die
-- offizielle CSV-Schnittstelle (services.mobile.de/manual):
--
--   kategorie              Fahrzeugklasse.Karosserieform, z.B. "Car.Limousine"
--   mwst                   0 = ausgewiesen, 1 = nicht ausgewiesen (§ 25a)
--   beschaedigtes_fahrzeug 0/1
--   metallic               0/1
--   garantie               0/1
--
-- Bisher entstanden hier Inserate, die vollstaendig aussahen und beim
-- Uebertragen zurueckgewiesen worden waeren. Das faellt erst auf, wenn
-- der Haendler es schon eingetragen hat.

alter table public.vehicles
  -- Karosserieform. Als Text und nicht als Zahl: Der mobile.de-Code
  -- ("Car.Limousine") gehoert in die Exportschicht, nicht in unsere
  -- Datenhaltung — sonst muesste man beim Anbieterwechsel jede Zeile
  -- anfassen.
  add column if not exists body_type text,

  /*
   * Umsatzsteuer.
   *
   * 'ausgewiesen'  — Regelbesteuerung, der Kaeufer kann Vorsteuer ziehen.
   * 'differenz'    — § 25a UStG, kein Ausweis moeglich.
   *
   * Das ist keine Formalie: Gewerbliche Kaeufer filtern danach, und ein
   * falscher Wert kostet den Haendler den Geschaeftskunden.
   */
  add column if not exists vat_type text
    check (vat_type in ('ausgewiesen', 'differenz')),

  -- Unfallfahrzeug im Sinne von mobile.de: Schaden vorhanden.
  add column if not exists damaged boolean not null default false,

  add column if not exists metallic boolean not null default false,

  add column if not exists warranty boolean not null default false;

comment on column public.vehicles.body_type is
  'Karosserieform im Klartext. Die Umsetzung in mobile.de-Codes passiert beim Export.';
comment on column public.vehicles.vat_type is
  'ausgewiesen = Regelbesteuerung, differenz = § 25a UStG.';

/*
 * Voreinstellungen am Haendler.
 *
 * Umsatzsteuerbehandlung und Garantie sind bei den meisten Haendlern bei
 * jedem Fahrzeug gleich. Sie bei jedem Inserat neu abzufragen ist genau
 * die Art von Arbeit, die ein Werkzeug abnehmen soll — es sind zwei
 * Zeilen, aber bei zwanzig Fahrzeugen im Monat vierzig.
 *
 * Sie sind Vorbelegung, keine Festlegung: Ein Fahrzeug vom Privatmann
 * faellt unter § 25a, auch wenn der Haendler sonst ausweist.
 */
alter table public.profiles
  add column if not exists default_vat_type text
    check (default_vat_type in ('ausgewiesen', 'differenz')),
  add column if not exists default_warranty boolean not null default false;

comment on column public.profiles.default_vat_type is
  'Vorbelegung fuer neue Inserate. Ueberschreibbar, weil sie je Fahrzeug abweichen kann.';
