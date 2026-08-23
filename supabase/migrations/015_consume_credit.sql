-- Migration 015: Credit atomar verbrauchen
--
-- Hintergrund: Die Credit-Pruefung sass nur in Schritt 1 des Formulars.
-- Die Schritte 2-4 beziehen ihre Daten aus der URL, /api/vehicles hat gar
-- nicht geprueft. Wer /dashboard/listing/step2?brand=... direkt aufrief,
-- konnte ein Inserat anlegen, ohne je einen Credit zu verbrauchen.
--
-- Die Pruefung gehoert an den Punkt, an dem das Inserat wirklich entsteht.
-- Und sie muss atomar sein, sonst koennen zwei parallele Anfragen denselben
-- Credit zweimal ausgeben.

create or replace function public.consume_listing_credit(uid uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_plan    text;
  v_updated integer;
begin
  select plan into v_plan from public.profiles where id = uid;

  -- Unbekanntes Profil: kein Inserat
  if v_plan is null then
    return false;
  end if;

  -- Aktives Abo deckt Inserate ab, kein Credit noetig
  if v_plan <> 'free' then
    return true;
  end if;

  -- Privatperson: nur abziehen, wenn wirklich einer da ist.
  -- Die Bedingung im UPDATE macht das atomar -- zwei parallele Aufrufe
  -- koennen denselben Credit nicht doppelt verbrauchen.
  update public.profiles
     set listing_credits = listing_credits - 1
   where id = uid
     and coalesce(listing_credits, 0) >= 1;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

comment on function public.consume_listing_credit is
  'Zieht atomar einen Inserat-Credit ab. Gibt true zurueck, wenn das Inserat '
  'angelegt werden darf (Abo aktiv oder Credit vorhanden).';
