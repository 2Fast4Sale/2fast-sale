-- Migration 026: Kraftstoffverbrauch bei entladener Batterie
--
-- Die Pkw-EnVKV verlangt bei Plug-in-Hybriden neben dem gewichteten
-- Verbrauch auch den Verbrauch bei LEERER Batterie -- und AutoScout24
-- fuehrt ihn als Pflichtfeld fuer deutsche Haendler
-- (consumptionCombinedDischarged, "mandatory for PHEV"). Gespeichert
-- wurde bisher nur das Gegenstueck fuer CO2.
--
-- Folge ohne diese Spalte: Der Haendler traegt den Wert ein, das Inserat
-- geht damit raus, aber beim naechsten Oeffnen ist er weg -- und im PDF
-- und auf der oeffentlichen Inseratsseite fehlt eine Pflichtangabe.

alter table public.vehicles
  add column if not exists consumption_combined_discharged numeric;

comment on column public.vehicles.consumption_combined_discharged is
  'Kraftstoffverbrauch kombiniert bei entladener Batterie in l/100 km (WLTP). '
  'Nur Plug-in-Hybride; Pflichtangabe nach Pkw-EnVKV.';
