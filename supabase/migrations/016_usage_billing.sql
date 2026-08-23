-- Migration 016: Nutzungsbasierte Abrechnung
--
-- Modell: Grundgebuehr als Abo + Preis pro Inserat, gesammelt am Monatsende.
-- Technisch ueber Stripe Invoice Items: die werden ohne Rechnungszuordnung
-- angelegt und automatisch auf die naechste Abo-Rechnung gesetzt. Dadurch
-- entsteht EINE Abbuchung statt einer pro Inserat -- spart die Stripe-Fixgebuehr
-- von 0,25 EUR je Transaktion und ist fuer den Haendler uebersichtlicher.

-- Wer wird nutzungsbasiert abgerechnet? Alte Paketkunden bleiben unberuehrt.
alter table public.profiles
  add column if not exists usage_billing boolean not null default false;

-- Eine Zeile je berechnetem Inserat.
create table if not exists public.listing_charges (
  id                     uuid default gen_random_uuid() primary key,
  user_id                uuid references auth.users(id) on delete set null,

  -- UNIQUE ist hier die Idempotenz-Garantie: ein Inserat kann nie zweimal
  -- berechnet werden, auch wenn der Speichervorgang wiederholt wird.
  vehicle_id             uuid references public.vehicles(id) on delete set null unique,

  amount_cents           integer not null,
  -- Null bedeutet: in der DB vermerkt, aber noch nicht an Stripe gemeldet.
  -- So geht keine Forderung verloren, wenn Stripe gerade nicht erreichbar ist.
  stripe_invoice_item_id text,
  billed_at              timestamptz,
  created_at             timestamptz default now()
);

create index if not exists listing_charges_user_idx
  on public.listing_charges (user_id, created_at desc);
create index if not exists listing_charges_offen_idx
  on public.listing_charges (created_at) where stripe_invoice_item_id is null;

alter table public.listing_charges enable row level security;

-- Haendler duerfen ihre eigenen Posten sehen -- das ist die Grundlage fuer die
-- laufende Kostenanzeige im Dashboard. Geschrieben wird nur serverseitig.
drop policy if exists "select_own_charges" on public.listing_charges;
create policy "select_own_charges" on public.listing_charges
  for select using (auth.uid() = user_id);

comment on table public.listing_charges is
  'Je Inserat ein Abrechnungsposten. vehicle_id ist unique -- verhindert '
  'Doppelberechnung bei wiederholtem Speichern.';

-- Credit-Pruefung erweitern: nutzungsbasierte Kunden brauchen keine Credits,
-- sie zahlen nachtraeglich ueber die Monatsrechnung.
create or replace function public.consume_listing_credit(uid uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_plan    text;
  v_usage   boolean;
  v_updated integer;
begin
  select plan, usage_billing into v_plan, v_usage
    from public.profiles where id = uid;

  if v_plan is null then
    return false;
  end if;

  -- Nachtraegliche Abrechnung: Inserat erlauben, nichts abziehen
  if v_usage is true then
    return true;
  end if;

  -- Aktives Abo deckt Inserate ab
  if v_plan <> 'free' then
    return true;
  end if;

  update public.profiles
     set listing_credits = listing_credits - 1
   where id = uid
     and coalesce(listing_credits, 0) >= 1;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;
