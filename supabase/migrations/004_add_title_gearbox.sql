-- Migration: title + gearbox_type Spalten hinzufuegen
alter table public.vehicles
  add column if not exists title       text,
  add column if not exists gearbox_type text,
  add column if not exists year        text;
