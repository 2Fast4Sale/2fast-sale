-- Der Probelauf und sein Missbrauchsschutz.
--
-- 5 € für 2 Inserate, einmal je Person. Die Frage ist, woran man "eine
-- Person" festmacht.
--
-- NICHT an der IP-Adresse. Das war der erste Gedanke, und er faellt bei
-- naeherem Hinsehen durch:
--
--   Ein Autohaus mit drei Mitarbeitern hat eine IP. Wer pro IP sperrt,
--   sperrt den zweiten und dritten Mitarbeiter aus — also genau die
--   Kunden, die man will.
--
--   Mobilfunk in Deutschland laeuft ueber CGNAT: Tausende Teilnehmer
--   teilen sich eine IPv4. Wer sich unterwegs anmeldet, waere gesperrt,
--   weil irgendein Fremder dieselbe Adresse hatte.
--
--   Die Telekom trennt taeglich und vergibt eine neue Adresse. Dieselbe
--   Person hat morgen eine andere IP — die Sperre haelt also nicht
--   einmal gegen denjenigen, gegen den sie gedacht war.
--
--   Und umgehen laesst sie sich mit einem Fingertipp: Mobilfunk statt
--   WLAN, fertig.
--
-- Ergebnis waere: Ehrliche Kunden werden ausgesperrt, Missbraucher nicht
-- aufgehalten. Die schlechteste Kombination, die eine Sperre haben kann.
--
-- STATTDESSEN: die Zahlungsmethode.
--
-- Der Probelauf kostet Geld, also braucht er eine Karte. Stripe liefert
-- zu jeder Karte einen "fingerprint" — derselbe Wert fuer dieselbe
-- physische Karte, auch ueber verschiedene Konten und Kundennummern
-- hinweg. Wer ein zweites Konto anlegt und wieder mit derselben Karte
-- zahlen will, faellt auf.
--
-- Das ist keine perfekte Sperre — wer mehrere Karten hat, kommt durch.
-- Aber es ist die einzige, die den ehrlichen Kunden nicht trifft, und
-- der Aufwand fuer den Missbraucher steht in keinem Verhaeltnis zu zwei
-- geschenkten Inseraten.

create table if not exists public.probelaeufe (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  /*
   * Stripes Kennung der physischen Karte. Gleiche Karte, gleicher Wert —
   * auch bei einem anderen Konto. Das ist der eigentliche Schutz.
   */
  karten_kennung text,

  /*
   * IP nur zur Beobachtung, nicht zum Sperren.
   *
   * Wenn zwanzig Probelaeufe von derselben Adresse kommen, will man das
   * sehen — aber ansehen und automatisch sperren sind zwei verschiedene
   * Dinge. Nach DSGVO ist eine IP ein personenbezogenes Datum; sie steht
   * hier zur Missbrauchsabwehr und wird nach 90 Tagen geloescht.
   */
  ip_adresse    inet,

  eingeloest_am timestamptz not null default now(),
  betrag_cent   integer not null default 500,
  inserate      integer not null default 2
);

comment on table public.probelaeufe is
  'Ein Probelauf je Person. Erkannt an der Karte, nicht an der IP.';

-- Ein Probelauf je Konto.
create unique index if not exists probelaeufe_user_idx
  on public.probelaeufe (user_id);

-- Ein Probelauf je Karte, ueber Konten hinweg. Das ist die eigentliche
-- Sperre; NULL-Werte kollidieren in Postgres nicht, deshalb der
-- Teilindex.
create unique index if not exists probelaeufe_karte_idx
  on public.probelaeufe (karten_kennung)
  where karten_kennung is not null;

create index if not exists probelaeufe_ip_idx
  on public.probelaeufe (ip_adresse, eingeloest_am);

alter table public.probelaeufe enable row level security;

-- Nur der Server schreibt hier. Der Nutzer darf sehen, ob er seinen
-- Probelauf schon verbraucht hat — mehr nicht.
drop policy if exists "eigenen probelauf sehen" on public.probelaeufe;
create policy "eigenen probelauf sehen" on public.probelaeufe
  for select using (auth.uid() = user_id);

/*
 * Darf dieser Nutzer mit dieser Karte den Probelauf noch nutzen?
 *
 * Als Funktion, damit die Bedingung an einer Stelle steht und nicht in
 * jedem Aufrufer neu formuliert wird.
 */
create or replace function public.probelauf_moeglich(
  p_user_id uuid,
  p_karten_kennung text
)
returns boolean
language plpgsql
security definer
as $$
begin
  if exists (select 1 from public.probelaeufe where user_id = p_user_id) then
    return false;
  end if;

  if p_karten_kennung is not null
     and exists (select 1 from public.probelaeufe where karten_kennung = p_karten_kennung) then
    return false;
  end if;

  return true;
end;
$$;

/*
 * IP-Adressen nach 90 Tagen entfernen.
 *
 * Sie sind zur Missbrauchsabwehr erhoben, und danach ist der Zweck
 * erfuellt. Der Probelauf selbst bleibt stehen — fuer die Sperre wird
 * die IP ohnehin nicht gebraucht.
 */
create or replace function public.probelauf_ips_aufraeumen()
returns integer
language plpgsql
security definer
as $$
declare
  v_anzahl integer;
begin
  update public.probelaeufe
     set ip_adresse = null
   where ip_adresse is not null
     and eingeloest_am < now() - interval '90 days';
  get diagnostics v_anzahl = row_count;
  return v_anzahl;
end;
$$;
