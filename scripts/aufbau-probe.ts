/**
 * Ordnet Feld 4 des Fahrzeugscheins die richtige Karosserieform zu?
 *
 *   npx tsx scripts/aufbau-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * -- Warum es diese Probe gibt -------------------------------------
 *
 * Gefunden an einem echten Schein: In Feld 4 stand "PERSONENKRAFTWAGEN
 * OFFEN" ausgeschrieben statt als Code AE. Kein Muster traf, das Feld
 * blieb leer — ein Cabrio ohne Karosserieform im Inserat.
 *
 * Die Probe prueft beide Richtungen, und die zweite ist wichtiger:
 *
 *   1. Eindeutige Angaben muessen zugeordnet werden.
 *   2. Mehrdeutige muessen LEER bleiben. Ein SUV hat keinen eigenen
 *      Code; wer AC auf "Kombi" abbildet, schreibt bei jedem Tiguan
 *      etwas Falsches ins Inserat, und das faellt niemandem auf.
 */

import { aufbauZuordnen } from '../lib/aufbauZuordnen';

type Fall = { feld4: string; erwartet: string | null; warum: string };

const FAELLE: Fall[] = [
  /* -- Muss zugeordnet werden -------------------------------------- */
  { feld4: 'AE', erwartet: 'Cabrio / Roadster', warum: 'Code blank' },
  { feld4: 'AE0002', erwartet: 'Cabrio / Roadster', warum: 'Code mit Ziffernfolge' },
  { feld4: 'PERSONENKRAFTWAGEN OFFEN', erwartet: 'Cabrio / Roadster', warum: 'ausgeschrieben, echter Schein' },
  { feld4: 'PKW OFFEN', erwartet: 'Cabrio / Roadster', warum: 'Kurzform' },
  { feld4: 'Kabriolimousine', erwartet: 'Cabrio / Roadster', warum: 'amtliche Schreibweise' },
  { feld4: 'AD0001', erwartet: 'Coupé', warum: 'Coupé als Code' },
  { feld4: 'Coupe', erwartet: 'Coupé', warum: 'ohne Akzent geschrieben' },
  { feld4: 'AG', erwartet: 'SUV / Geländewagen', warum: 'Gelaendewagen' },
  { feld4: 'Pick-up', erwartet: 'SUV / Geländewagen', warum: 'mit Bindestrich' },
  { feld4: 'AA0002', erwartet: 'Limousine', warum: 'Stufenheck als Code' },
  { feld4: 'Stufenheck', erwartet: 'Limousine', warum: 'ausgeschrieben' },

  /* -- Muss LEER bleiben ------------------------------------------- */
  { feld4: 'AC', erwartet: null, warum: 'Kombi — kann auch ein SUV sein' },
  { feld4: 'AF0003', erwartet: null, warum: 'Mehrzweckfahrzeug — Touran oder Tiguan' },
  { feld4: 'AB', erwartet: null, warum: 'Schraegheck — Portale kennen das so nicht' },
  { feld4: 'Kombilimousine', erwartet: null, warum: 'enthaelt "limousine", ist aber keine' },
  { feld4: 'OFFENER KASTENWAGEN', erwartet: null, warum: 'Pritsche, kein Cabrio — "offen" allein reicht nicht' },
  { feld4: 'PERSONENKRAFTWAGEN', erwartet: null, warum: 'sagt nichts ueber die Form' },
  { feld4: '', erwartet: null, warum: 'leeres Feld' },
  { feld4: '   ', erwartet: null, warum: 'nur Leerzeichen' },
];

let fehler = 0;
for (const f of FAELLE) {
  const ist = aufbauZuordnen(f.feld4);
  const ok = ist === f.erwartet;
  console.log(`${ok ? 'OK   ' : 'FEHLER'} ${JSON.stringify(f.feld4).padEnd(28)} -> ${String(ist).padEnd(20)} (${f.warum})`);
  if (!ok) {
    console.log(`       erwartet: ${String(f.erwartet)}`);
    fehler++;
  }
}

const zuordnen = FAELLE.filter((f) => f.erwartet !== null).length;
console.log(`\n${zuordnen} muessen zugeordnet werden, ${FAELLE.length - zuordnen} muessen leer bleiben.`);
console.log('Der zweite Teil ist der wichtigere: Eine falsche Karosserieform');
console.log('faellt niemandem auf und steht am Ende trotzdem im Inserat.');

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
