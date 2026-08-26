/**
 * Holt die Fahrzeug-Referenzdaten von AutoScout24 und schreibt sie als
 * TypeScript-Datei ins Projekt.
 *
 * Gegenstueck zu refdaten-holen.mjs, das dasselbe fuer mobile.de tut.
 * Der Unterschied zwischen den beiden Portalen ist der ganze Grund,
 * warum es diese Dateien gibt:
 *
 *   mobile.de will   "make": "VW"
 *   AutoScout24 will "make": 13
 *
 * Die Endpunkte /makes und /references brauchen keine Anmeldung — das
 * steht so in der Dokumentation und ist geprueft. Alles andere an der
 * API braucht Zugangsdaten, die AutoScout24 anlegen muss.
 *
 * Aufruf:  node as24-refdaten-holen.mjs
 */

import { writeFileSync } from 'node:fs';

const BASIS = 'https://listing-creation.api.autoscout24.com';

/*
 * Nur Personenwagen. Die API fuehrt auch Motorraeder, Wohnmobile,
 * Anhaenger und Boote; die Marken- und Modellisten sind je Fahrzeugart
 * verschieden. 2Fast4Sale ist ein Werkzeug fuer Autohaendler, also
 * bleibt der Rest draussen — er wuerde die Datei nur aufblaehen.
 */
const AUTO = 'C';

async function hole(pfad) {
  for (let versuch = 1; versuch <= 3; versuch++) {
    try {
      const antwort = await fetch(BASIS + pfad, { signal: AbortSignal.timeout(30_000) });
      if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
      return await antwort.json();
    } catch (fehler) {
      if (versuch === 3) throw new Error(`${pfad}: ${fehler.message}`);
      await new Promise(r => setTimeout(r, 500 * versuch));
    }
  }
}

const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

console.log('Hole Marken …');
const alleMarken = (await hole('/makes')).makes;
console.log('Hole Referenzen …');
const alleReferenzen = (await hole('/references')).references;

const marken = alleMarken
  .filter(m => m.vehicleTypes.includes(AUTO))
  .map(m => ({
    id: m.id,
    name: m.name,
    modelle: m.models
      .filter(x => x.vehicleType === AUTO)
      .map(x => ({ id: x.id, name: x.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de')),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'de'));

const modellZahl = marken.reduce((s, m) => s + m.modelle.length, 0);

/* Referenzen nach Typ buendeln, aber nur die fuer Autos gueltigen. */
const nachTyp = {};
for (const r of alleReferenzen) {
  if (Array.isArray(r.vehicleType) && !r.vehicleType.includes(AUTO)) continue;
  (nachTyp[r.referenceType] ??= []).push({ id: String(r.id), name: r.name });
}
for (const liste of Object.values(nachTyp)) {
  liste.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
const typen = Object.keys(nachTyp).sort();

const markenZeilen = marken.map(m => {
  const modelle = m.modelle.map(x => `      [${x.id}, ${q(x.name)}],`).join('\n');
  return `  {
    id: ${m.id},
    name: ${q(m.name)},
    modelle: [
${modelle}
    ],
  },`;
});

const referenzZeilen = typen.map(t => {
  const werte = nachTyp[t].map(v => `    [${q(v.id)}, ${q(v.name)}],`).join('\n');
  return `  ${q(t)}: [
${werte}
  ],`;
});

const datei = `/**
 * Marken, Modelle und Referenzwerte, wie AutoScout24 sie fuehrt.
 *
 * NICHT VON HAND AENDERN — erzeugt von as24-refdaten-holen.mjs.
 * Stand: ${new Date().toISOString().slice(0, 10)}
 * Quelle: https://listing-creation.api.autoscout24.com/makes
 *         https://listing-creation.api.autoscout24.com/references
 *
 * AutoScout24 spricht in Zahlen, nicht in Namen. Ein Audi ist die 13,
 * ein A4 die 1641, und "Kombi" ist irgendeine Nummer aus der Liste
 * BodyType. Wer die Namen schickt, bekommt einen Fehler.
 *
 * Deshalb dieselbe Trennung wie bei mobile.de: Der Haendler waehlt
 * einen Namen, diese Datei liefert die Zahl dazu.
 *
 * Nur Personenwagen (vehicleType "C"). Motorraeder, Wohnmobile und
 * Anhaenger haben eigene Marken- und Modellisten; die braucht ein
 * Werkzeug fuer Autohaendler nicht.
 *
 * ${marken.length} Marken, ${modellZahl} Modelle, ${typen.length} Referenzlisten.
 */

/** [id, name] */
export type As24Wert = [number, string];
/** [id, name] — Referenz-Kennungen sind Zeichenketten, nicht Zahlen */
export type As24Referenz = [string, string];

export interface As24Marke {
  id: number;
  name: string;
  modelle: As24Wert[];
}

export const AS24_MARKEN: As24Marke[] = [
${markenZeilen.join('\n')}
];

/**
 * Referenzlisten nach Typ.
 *
 * Die Kennungen sind Zeichenketten, weil die API sie so liefert —
 * auch wenn sie wie Zahlen aussehen. Beim Senden erwartet die
 * Auflistung sie je nach Feld als Zahl; die Umwandlung passiert
 * dort, wo die Nutzlast gebaut wird.
 */
export const AS24_REFERENZEN: Record<string, As24Referenz[]> = {
${referenzZeilen.join('\n')}
};
`;

writeFileSync(new URL('./lib/as24Referenzen.ts', import.meta.url), datei, 'utf8');
console.log('\nGeschrieben: lib/as24Referenzen.ts');
console.log(`${marken.length} Marken, ${modellZahl} Modelle, ${typen.length} Referenzlisten`);
console.log(`Referenzlisten: ${typen.join(', ')}`);
process.exit(0);
