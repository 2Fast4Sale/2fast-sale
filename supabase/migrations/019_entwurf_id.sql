-- Entwurfs-Nummer fuer die Kostenzuordnung.
--
-- Problem: api_costs.vehicle_id war bei jedem einzelnen Eintrag leer.
-- Nicht weil jemand den Parameter vergessen hat, sondern wegen der
-- Reihenfolge — alle KI-Aufrufe passieren in den Schritten 1 bis 3, das
-- Fahrzeug entsteht erst beim Speichern in Schritt 4. Zum Zeitpunkt des
-- Scans gibt es die vehicle_id schlicht noch nicht.
--
-- Loesung: Beim Start eines Inserats erzeugt das Formular eine
-- Entwurfs-Nummer und schickt sie bei jedem Aufruf mit. Beim Speichern
-- werden alle Posten mit dieser Nummer dem entstandenen Fahrzeug
-- zugeordnet.

alter table public.api_costs
  add column if not exists draft_id uuid;

comment on column public.api_costs.draft_id is
  'Entwurfs-Nummer aus dem Formular. Verbindet Kosten, die vor dem Anlegen '
  'des Fahrzeugs entstehen, mit dem spaeter erzeugten Datensatz.';

-- Fuer das Nachtragen beim Speichern: nur noch offene Posten sind
-- interessant, deshalb ein Teilindex.
create index if not exists api_costs_draft_offen_idx
  on public.api_costs (draft_id)
  where vehicle_id is null;

/*
 * Ordnet die Posten eines Entwurfs einem Fahrzeug zu.
 *
 * Als Funktion und nicht als Update aus der Anwendung, damit die
 * Bedingungen an einer Stelle stehen:
 *
 *  - nur Posten des aufrufenden Nutzers, sonst koennte jemand mit einer
 *    geratenen Entwurfs-Nummer fremde Kosten auf sein Fahrzeug ziehen
 *  - nur Posten, die noch keinem Fahrzeug zugeordnet sind, damit ein
 *    zweiter Aufruf nichts umhaengt
 */
create or replace function public.kosten_zuordnen(
  p_draft_id   uuid,
  p_vehicle_id uuid,
  p_user_id    uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_anzahl integer;
begin
  if p_draft_id is null or p_vehicle_id is null then
    return 0;
  end if;

  update public.api_costs
     set vehicle_id = p_vehicle_id
   where draft_id = p_draft_id
     and vehicle_id is null
     and user_id = p_user_id;

  get diagnostics v_anzahl = row_count;
  return v_anzahl;
end;
$$;
