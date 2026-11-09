/**
 * Stimmt die Liste der unsichtbaren Ausstattung?
 *
 *   npx tsx scripts/abfrage-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * ── Warum es diese Probe gibt ──────────────────────────────────────
 *
 * lib/ausstattungAbfrage.ts nennt die Merkmale nur ueber ihre ID. Ein
 * Tippfehler in einer ID faellt NICHT auf: Die Zeile verschwindet
 * einfach aus der Oberflaeche, ohne Fehler, ohne Warnung. Der Haendler
 * sieht dann kein Luftfahrwerk zum Anklicken und merkt nicht, dass es
 * fehlt — und im Inserat fehlt das teuerste Merkmal des Autos.
 *
 * Genau das faengt diese Probe ab, zusammen mit zwei weiteren Fehlern,
 * die man beim Pflegen der Liste leicht macht: dasselbe Merkmal
 * zweimal in verschiedenen Gruppen, und Merkmale, die auf einem Foto
 * sehr wohl zu sehen sind und hier nichts verloren haben.
 */

import { EQUIPMENT_DB } from '../lib/equipmentDatabase';
import { ABFRAGE, ABFRAGE_IDS } from '../lib/ausstattungAbfrage';

const ALLE = new Map<string, string>();
for (const kategorie of EQUIPMENT_DB) {
  for (const posten of kategorie.items) ALLE.set(posten.id, posten.label);
}

let fehler = 0;

console.log('── Gibt es jede ID wirklich? ───────────────────────────');
for (const gruppe of ABFRAGE) {
  const unbekannt = gruppe.ids.filter(id => !ALLE.has(id));
  if (unbekannt.length === 0) {
    console.log(`OK    ${gruppe.titel} (${gruppe.ids.length})`);
  } else {
    console.log(`FEHLER ${gruppe.titel}: ${unbekannt.join(', ')} steht nicht in EQUIPMENT_DB`);
    fehler += unbekannt.length;
  }
}

console.log('\n── Nichts doppelt? ─────────────────────────────────────');
const gesehen = new Set<string>();
const doppelt: string[] = [];
for (const id of ABFRAGE_IDS) {
  if (gesehen.has(id)) doppelt.push(id);
  gesehen.add(id);
}
if (doppelt.length === 0) console.log(`OK    ${ABFRAGE_IDS.length} Merkmale, jedes einmal`);
else { console.log(`FEHLER doppelt: ${doppelt.join(', ')}`); fehler += doppelt.length; }

console.log('\n── Nichts dabei, was man fotografieren kann? ───────────');
/*
 * Diese Merkmale erkennt entweder die Fotoerkennung (detect-equipment)
 * oder die Nahaufnahme (lib/ausstattungStellen.ts) mit Beleg. Sie in
 * die Abfrage zu nehmen hiesse, den Haendler nach etwas zu fragen, was
 * die Software schon belegt weiss — das verlaengert die Liste und
 * macht sie unglaubwuerdig.
 */
const SICHTBAR = [
  'dach_panorama', 'schiebedach', 'alu', 'alu_17', 'alu_18', 'alu_19', 'alu_20', 'alu_21',
  'dachreling', 'leder', 'rueckfahrkamera', 'kamera_360', 'sitzheizung',
  'einparkhilfe_h', 'einparkhilfe_v', 'einparkhilfe_360',
  'klima', 'klima_auto', 'multilenk', 'lederlenkrad', 'schaltwippen',
  'el_fensterheber', 'spiegel_anklappbar', 'navi', 'touchscreen',
];
const falschDrin = ABFRAGE_IDS.filter(id => SICHTBAR.includes(id));
if (falschDrin.length === 0) console.log('OK    nur Unsichtbares');
else { console.log(`FEHLER sichtbar, gehoert nicht hierher: ${falschDrin.join(', ')}`); fehler += falschDrin.length; }

console.log('\n── Wie lange dauert das Durchgehen? ────────────────────');
console.log(`      ${ABFRAGE.length} Gruppen, ${ABFRAGE_IDS.length} Zeilen`);
if (ABFRAGE_IDS.length > 60) {
  console.log('FEHLER zu lang. Ueber 60 Zeilen geht niemand durch, dann bleibt die Liste leer.');
  fehler++;
} else {
  console.log('OK    kurz genug, um es wirklich zu tun');
}

console.log('\n── Die Bezeichnungen, wie sie erscheinen ───────────────');
for (const gruppe of ABFRAGE) {
  console.log(`\n  ${gruppe.titel}`);
  for (const id of gruppe.ids) console.log(`    ${ALLE.get(id) ?? '??? ' + id}`);
}

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
