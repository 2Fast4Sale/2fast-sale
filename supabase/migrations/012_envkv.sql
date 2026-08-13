-- Migration 012: PKW-EnVKV Pflichtangaben (Energieverbrauchskennzeichnung)
-- Gilt fuer Neuwagen, Tageszulassungen und Vorfuehrwagen.

alter table public.vehicles
  -- Fahrzeugart: neuwagen | tageszulassung | vorfuehrwagen | jahreswagen | gebrauchtwagen
  add column if not exists vehicle_kind text default 'gebrauchtwagen',

  -- Kraftstoffverbrauch kombiniert, l/100 km (WLTP)
  add column if not exists consumption_combined numeric(5,2),

  -- Stromverbrauch kombiniert, kWh/100 km (WLTP) — Elektro & Plug-in
  add column if not exists power_consumption_combined numeric(6,2),

  -- CO2-Emissionen kombiniert, g/km (WLTP)
  add column if not exists co2_combined numeric(6,1),

  -- Nur Plug-in-Hybrid: CO2 kombiniert bei entladener Batterie, g/km
  add column if not exists co2_combined_discharged numeric(6,1),

  -- Elektrische Reichweite in km — Elektro & Plug-in
  add column if not exists electric_range_km numeric(6,1);

comment on column public.vehicles.vehicle_kind is
  'Fahrzeugart. Bestimmt, ob die Pkw-EnVKV-Angaben verpflichtend sind.';
comment on column public.vehicles.consumption_combined is
  'Kraftstoffverbrauch kombiniert in l/100 km nach WLTP.';
comment on column public.vehicles.co2_combined is
  'CO2-Emissionen kombiniert in g/km nach WLTP. Basis fuer die CO2-Klasse.';
