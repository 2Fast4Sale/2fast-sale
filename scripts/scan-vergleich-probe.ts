/**
 * Faengt der Vergleich zweier Lesungen die Abweichungen?
 *
 *   npx tsx scripts/scan-vergleich-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * -- Warum es diese Probe gibt --------------------------------------
 *
 * Der Anlass ist gemessen, nicht vermutet: Derselbe Golf, dasselbe
 * Foto, zwei Laeufe am 14. November 2026 — einmal 77 kW, einmal 71 kW.
 * Also 105 PS gegen 97 PS. Eine falsche Leistungsangabe im Inserat ist
 * eine Zusicherung, fuer die der Haendler haftet.
 *
 * Geprueft wird in beide Richtungen, und die zweite ist die
 * gefaehrlichere:
 *
 *   1. Abweichungen muessen das Feld leeren.
 *   2. UEBEREINSTIMMUNGEN muessen durchgehen. Ein Vergleich, der auch
 *      einige Felder leert, macht die Software unbrauchbar — dann tippt
 *      der Haendler wieder alles selbst, und genau das sollte sie ihm
 *      abnehmen.
 */

import { scanVergleichen } from '../lib/scanVergleichen';

type Fall = {
  was: string;
  a: Record<string, unknown>;
  b: Record<string, unknown> | null;
  /** Felder, die im Ergebnis stehen muessen, mit Wert. */
  drin?: Record<string, unknown>;
  /** Felder, die NICHT im Ergebnis stehen duerfen. */
  weg?: string[];
  /** Anzahl der benannten unsicheren Stellen. */
  unsicher: number;
};

const FAELLE: Fall[] = [
  {
    was: 'Der echte Fall: 77 kW gegen 71 kW',
    a: { powerKw: 77, vin: 'WVWZZZ1KZ6B117703' },
    b: { powerKw: 71, vin: 'WVWZZZ1KZ6B117703' },
    drin: { vin: 'WVWZZZ1KZ6B117703' }, weg: ['powerKw'], unsicher: 1,
  },
  {
    was: 'Einig bleibt einig — nichts geht verloren',
    a: { brand: 'VOLKSWAGEN', model: 'POLO', powerKw: 59, displacementCcm: 1598 },
    b: { brand: 'VOLKSWAGEN', model: 'POLO', powerKw: 59, displacementCcm: 1598 },
    drin: { brand: 'VOLKSWAGEN', model: 'POLO', powerKw: 59, displacementCcm: 1598 },
    unsicher: 0,
  },
  {
    was: 'Schreibweise ist kein Widerspruch',
    a: { brand: 'VOLKSWAGEN', color: 'Rot' },
    b: { brand: 'Volkswagen', color: 'rot' },
    drin: { brand: 'VOLKSWAGEN', color: 'Rot' }, unsicher: 0,
  },
  {
    was: 'Zahl als Text ist dieselbe Zahl',
    a: { seats: 5 }, b: { seats: '5' },
    drin: { seats: 5 }, unsicher: 0,
  },
  {
    was: 'Ein Dreher in der FIN faellt auf',
    a: { vin: 'WVWZZZ1KZ6B117703' }, b: { vin: 'WVWZZZ1KZ6B117708' },
    weg: ['vin'], unsicher: 1,
  },
  {
    was: 'Nur einmal gelesen gilt als unsicher',
    a: { emissionClass: 'Euro 5' }, b: {},
    weg: ['emissionClass'], unsicher: 1,
  },
  {
    was: 'Zweimal nicht gefunden ist kein Widerspruch',
    a: { doors: null }, b: {},
    weg: ['doors'], unsicher: 0,
  },
  {
    was: 'Mehrere Abweichungen werden alle benannt',
    a: { powerKw: 77, color: 'Grau', seats: 5 },
    b: { powerKw: 71, color: 'Silber', seats: 5 },
    drin: { seats: 5 }, weg: ['powerKw', 'color'], unsicher: 2,
  },
  {
    was: 'Ausstattung: nur was beide gesehen haben',
    a: { equipment: ['Sitzheizung', 'Navigationssystem', 'Anhängerkupplung'] },
    b: { equipment: ['Sitzheizung', 'Navigationssystem'] },
    drin: { equipment: ['Sitzheizung', 'Navigationssystem'] }, unsicher: 1,
  },
  {
    was: 'Ausstattung voellig einig — keine Meldung',
    a: { equipment: ['Sitzheizung'] }, b: { equipment: ['Sitzheizung'] },
    drin: { equipment: ['Sitzheizung'] }, unsicher: 0,
  },
  {
    was: 'Ohne zweite Lesung bleibt die erste unveraendert',
    a: { powerKw: 77, emissionClass: 'Euro 5' }, b: null,
    drin: { powerKw: 77, emissionClass: 'Euro 5' }, unsicher: 0,
  },
  {
    was: 'Felder ausserhalb der Liste bleiben unangetastet',
    a: { huUntil: '06/2027' }, b: { huUntil: 'anders' },
    drin: { huUntil: '06/2027' }, unsicher: 0,
  },
];

let fehler = 0;
for (const f of FAELLE) {
  const { ergebnis, unsicher } = scanVergleichen(f.a, f.b);
  const probleme: string[] = [];

  for (const [k, v] of Object.entries(f.drin ?? {})) {
    const ist = ergebnis[k];
    const passt = Array.isArray(v)
      ? JSON.stringify(ist) === JSON.stringify(v)
      : ist === v;
    if (!passt) probleme.push(`${k}: ${JSON.stringify(ist)} statt ${JSON.stringify(v)}`);
  }
  for (const k of f.weg ?? []) {
    if (k in ergebnis) probleme.push(`${k} haette wegfallen muessen, steht aber drin`);
  }
  if (unsicher.length !== f.unsicher) {
    probleme.push(`${unsicher.length} unsichere statt ${f.unsicher}: ${JSON.stringify(unsicher)}`);
  }

  console.log(`${probleme.length === 0 ? 'OK   ' : 'FEHLER'} ${f.was}`);
  for (const pr of probleme) { console.log('       ' + pr); }
  if (probleme.length) fehler++;
}

const leeren = FAELLE.filter((f) => f.unsicher > 0).length;
console.log(`\n${FAELLE.length} Faelle. ${leeren} muessen ein Feld leeren, `
  + `${FAELLE.length - leeren} duerfen nichts anfassen.`);
console.log('Der zweite Teil entscheidet, ob der Vergleich eingeschaltet bleibt:');
console.log('Wer dem Haendler auch einige Felder leert, laesst ihn wieder alles tippen.');

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
