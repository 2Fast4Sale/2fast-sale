/**
 * Was hat ein Inserat wirklich gekostet — gemessen, nicht geschaetzt.
 *
 *   npx tsx --env-file=.env.local scripts/kosten-auswerten.ts
 *
 * Liest die Tabelle api_costs und rechnet zusammen, was je Dienst
 * angefallen ist. Die Zahlen aus der Kalkulation sind Annahmen; diese
 * hier sind das, was tatsaechlich gebucht wurde.
 */

import { createClient } from '@supabase/supabase-js';
import { formatMicros, microsToEur } from '../lib/apiCosts';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase-Zugang fehlt in .env.local');

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('api_costs')
    .select('service, operation, cost_micros, draft_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  const zeilen = data ?? [];

  if (zeilen.length === 0) { console.log('Keine Eintraege.'); return; }

  /* ── Je Dienst ── */
  const jeDienst = new Map<string, { summe: number; anzahl: number }>();
  for (const z of zeilen) {
    const e = jeDienst.get(z.service) ?? { summe: 0, anzahl: 0 };
    e.summe += z.cost_micros ?? 0;
    e.anzahl++;
    jeDienst.set(z.service, e);
  }

  console.log(`\n${zeilen.length} Buchungen, aelteste ${zeilen[zeilen.length - 1].created_at?.slice(0, 10)}\n`);
  console.log('Dienst              Aufrufe        Summe    je Aufruf');
  console.log('-'.repeat(56));
  let gesamt = 0;
  for (const [dienst, e] of [...jeDienst].sort((a, b) => b[1].summe - a[1].summe)) {
    gesamt += e.summe;
    console.log(
      dienst.padEnd(20),
      String(e.anzahl).padStart(6),
      formatMicros(e.summe, 4).padStart(12),
      formatMicros(Math.round(e.summe / e.anzahl), 4).padStart(12),
    );
  }
  console.log('-'.repeat(56));
  console.log('Gesamt'.padEnd(20), String(zeilen.length).padStart(6), formatMicros(gesamt, 4).padStart(12));

  /* ── Je Entwurf, also je Inserat ── */
  const jeEntwurf = new Map<string, number>();
  for (const z of zeilen) {
    if (!z.draft_id) continue;
    jeEntwurf.set(z.draft_id, (jeEntwurf.get(z.draft_id) ?? 0) + (z.cost_micros ?? 0));
  }

  const ohneZuordnung = zeilen.filter((z) => !z.draft_id).length;
  if (jeEntwurf.size > 0) {
    const werte = [...jeEntwurf.values()].sort((a, b) => a - b);
    const mitte = werte[Math.floor(werte.length / 2)];
    const schnitt = werte.reduce((s, v) => s + v, 0) / werte.length;
    console.log(`\n${jeEntwurf.size} Entwuerfe mit Zuordnung:`);
    console.log('  Mittelwert  ', formatMicros(Math.round(schnitt), 4));
    console.log('  Median      ', formatMicros(mitte, 4));
    console.log('  teuerster   ', formatMicros(werte[werte.length - 1], 4));
  }
  if (ohneZuordnung > 0) {
    console.log(`\n${ohneZuordnung} Buchungen ohne draft_id — die lassen sich keinem Inserat zurechnen.`);
  }

  console.log(`\nHochrechnung bei 3,50 EUR je Inserat:`);
  if (jeEntwurf.size > 0) {
    const schnitt = [...jeEntwurf.values()].reduce((s, v) => s + v, 0) / jeEntwurf.size;
    console.log(`  ${(3.50 - microsToEur(schnitt)).toFixed(2)} EUR Rohertrag je Inserat (nur API-Kosten)`);
  }
}

main().catch((e) => { console.error(String(e)); process.exit(1); });
