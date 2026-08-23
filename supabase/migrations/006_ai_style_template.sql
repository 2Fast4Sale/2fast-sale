-- KI-Stil-Vorlage und Telefonnummer fuer Haendler
alter table public.profiles
  add column if not exists ai_style_template text,
  add column if not exists phone             text,
  add column if not exists billing_address   jsonb;
