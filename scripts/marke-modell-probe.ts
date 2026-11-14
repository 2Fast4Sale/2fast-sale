/**
 * Werden Marke und Modell sauber getrennt?
 *
 *   npx tsx scripts/marke-modell-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * -- Warum es diese Probe gibt --------------------------------------
 *
 * Gefunden an zwei echten Fahrzeugscheinen am 14. November 2026. Feld
 * D.1 nennt den Hersteller ZWEIMAL, getrennt durch ein Komma:
 * "VOLKSWAGEN, VW". Die Zerlegung verglich mit dem Rohtext, das Komma
 * verhinderte den Treffer, und heraus kam:
 *
 *   brand = "VOLKSWAGEN,"     model = "VW POLO"
 *
 * Beide Werte kennt weder mobile.de noch AutoScout24. Der Export --
 * der Schritt, auf dem das ganze Produkt steht -- waere bei JEDEM
 * Fahrzeug gescheitert, dessen Schein den Hersteller amtlich schreibt.
 * Also bei fast allen.
 *
 * Besonders auf die Faelle achten, die NICHT gekuerzt werden duerfen:
 * "Range Rover" ist zugleich Alias der Marke Land Rover und Name eines
 * Modells, "Adam" ist ein Opel-Modell und der Vorname des Gruenders.
 * Eine Zerlegung, die hier zu gierig ist, loescht echte Modellnamen.
 */

import { splitBrandModel, markeModellAusScan } from '../lib/carDatabase';

type Fall = { ein: string; marke: string; modell: string; warum: string };

/* -- Ein String, wie ihn alte Entwuerfe und VIN-Decoder liefern ----- */
const ZUSAMMEN: Fall[] = [
  { ein: 'VOLKSWAGEN, VW POLO', marke: 'Volkswagen', modell: 'Polo', warum: 'echter Schein IMG_4132' },
  { ein: 'VOLKSWAGEN, VW GOLF', marke: 'Volkswagen', modell: 'Golf', warum: 'echter Schein IMG_4133' },
  { ein: 'Volkswagen Golf', marke: 'Volkswagen', modell: 'Golf', warum: 'ohne Wiederholung' },
  { ein: 'Volkswagen Golf 2.0 TDI', marke: 'Volkswagen', modell: 'Golf', warum: 'Variante faellt weg' },
  { ein: 'VW Golf GTI', marke: 'Volkswagen', modell: 'Golf', warum: 'Kuerzel als Marke' },
  { ein: 'MERCEDES-BENZ, DAIMLER AG C 200', marke: 'Mercedes-Benz', modell: 'C 200', warum: 'Firmenname faellt weg' },
  { ein: 'BMW, BAYERISCHE MOTOREN WERKE 320D', marke: 'BMW', modell: '320D', warum: 'langer Firmenname' },
  { ein: 'AUDI, AUDI AG A4 AVANT', marke: 'Audi', modell: 'A4', warum: 'Rechtsform faellt weg' },
  { ein: 'SKODA, SKODA AUTO OCTAVIA', marke: 'Skoda', modell: 'Octavia', warum: 'Firmenname gleich Marke' },
  { ein: 'FORD, FORD WERKE FIESTA', marke: 'Ford', modell: 'Fiesta', warum: 'Werke-Zusatz' },
  { ein: 'PEUGEOT, AUTOMOBILES PEUGEOT 208', marke: 'Peugeot', modell: '208', warum: 'Firma vor der Marke' },

  /* -- Darf NICHT gekuerzt werden ---------------------------------- */
  { ein: 'Land Rover Range Rover Sport', marke: 'Land Rover', modell: 'Range Rover Sport',
    warum: 'Range Rover ist Alias UND Modell — darf nicht weg' },
  { ein: 'OPEL, ADAM OPEL CORSA', marke: 'Opel', modell: 'Corsa',
    warum: 'Adam ist hier der Gruender, nicht das Modell' },
  { ein: 'Opel Adam', marke: 'Opel', modell: 'Adam',
    warum: 'Adam ist hier das Modell — danach kommt keine Marke mehr' },
];

/* -- Zwei getrennte Felder, wie scan-doc sie jetzt liefert ---------- */
const GETRENNT: Array<{ b: string; m: string } & Omit<Fall, 'ein'>> = [
  { b: 'VOLKSWAGEN', m: 'POLO', marke: 'Volkswagen', modell: 'Polo', warum: 'D.1 und D.3 sauber' },
  { b: 'VOLKSWAGEN', m: 'VW GOLF', marke: 'Volkswagen', modell: 'Golf', warum: 'D.3 wiederholt die Marke' },
  { b: 'MERCEDES-BENZ', m: 'C 200', marke: 'Mercedes-Benz', modell: 'C 200', warum: 'getrennt, bekannt' },
  { b: 'VOLKSWAGEN', m: '', marke: 'Volkswagen', modell: '', warum: 'D.3 unleserlich — Marke bleibt' },
  { b: 'EINHORN', m: 'PEGASUS', marke: 'EINHORN', modell: 'PEGASUS', warum: 'unbekannt — Rohwerte bleiben stehen' },
];

let fehler = 0;
const zeig = (ok: boolean, was: string, ist: { brand: string; model: string }, f: { marke: string; modell: string; warum: string }) => {
  console.log(`${ok ? 'OK   ' : 'FEHLER'} ${was.padEnd(36)} -> ${ist.brand} | ${ist.model}`);
  if (!ok) { console.log(`       erwartet: ${f.marke} | ${f.modell}  (${f.warum})`); fehler++; }
};

console.log('-- Ein String (alte Entwuerfe, VIN-Decoder) --');
for (const f of ZUSAMMEN) {
  const ist = splitBrandModel(f.ein);
  zeig(ist.brand === f.marke && ist.model === f.modell, JSON.stringify(f.ein), ist, f);
}

console.log('\n-- Zwei Felder (scan-doc seit 14.11.2026) --');
for (const f of GETRENNT) {
  const ist = markeModellAusScan(f.b, f.m);
  zeig(ist.brand === f.marke && ist.model === f.modell, `${f.b} / ${f.m || '(leer)'}`, ist, f);
}

console.log(`\n${ZUSAMMEN.length + GETRENNT.length} Faelle. Drei davon duerfen NICHT gekuerzt werden —`);
console.log('eine zu gierige Zerlegung loescht echte Modellnamen.');
console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
