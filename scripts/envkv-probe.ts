/**
 * Prueft die EnVKV-Angaben fuer alle Antriebsarten gegen beide Portale.
 *
 *   npx tsx scripts/envkv-probe.ts
 *
 * Warum: Von allen Feldern eines Inserats sind das die einzigen, bei
 * denen ein Fehler nicht nur ein schlechtes Inserat ergibt, sondern eine
 * Abmahnung. Die Pkw-EnVKV schreibt vor, WAS genannt werden muss, und
 * die beiden Portale wollen es in verschiedenen Formen:
 *
 *   mobile.de    verschachtelt, mit CO2-Klasse je Wert
 *   AutoScout24  flach, und es ergaenzt fehlende Werte selbst aus der
 *                Fahrgestellnummer — oder laesst das Inserat inaktiv
 *
 * Geprueft wird deshalb je Antriebsart: Kommt aus einer vollstaendigen
 * Eingabe auch eine vollstaendige Ausgabe? Und bleibt eine unvollstaendige
 * Eingabe erkennbar unvollstaendig, statt still durchzurutschen?
 */

import { mobileEnvkv } from '../lib/mobileEnvkv';
import { as24Envkv } from '../lib/as24Envkv';
import { validateEnvkv, type EnvkvData, type VehicleKind } from '../lib/envkv';

interface Fall {
  name: string;
  kraftstoff: string;
  art: VehicleKind;
  daten: EnvkvData;
}

const leer: EnvkvData = {
  vehicleKind: 'neuwagen',
  consumptionCombined: null,
  powerConsumptionCombined: null,
  co2Combined: null,
  co2CombinedDischarged: null,
  electricRangeKm: null,
};

const FAELLE: Fall[] = [
  {
    name: 'Diesel, vollstaendig', kraftstoff: 'Diesel', art: 'neuwagen',
    daten: { ...leer, consumptionCombined: 4.9, co2Combined: 129 },
  },
  {
    name: 'Benzin, vollstaendig', kraftstoff: 'Benzin', art: 'neuwagen',
    daten: { ...leer, consumptionCombined: 6.2, co2Combined: 141 },
  },
  {
    name: 'Elektro, vollstaendig', kraftstoff: 'Elektro', art: 'neuwagen',
    daten: { ...leer, powerConsumptionCombined: 16.5, electricRangeKm: 420 },
  },
  {
    name: 'Plug-in, vollstaendig', kraftstoff: 'Plug-in Hybrid', art: 'neuwagen',
    daten: {
      ...leer, consumptionCombined: 1.4, powerConsumptionCombined: 15.2,
      co2Combined: 32, co2CombinedDischarged: 148, electricRangeKm: 62,
    },
  },
  {
    name: 'Hybrid, vollstaendig', kraftstoff: 'Hybrid', art: 'neuwagen',
    daten: { ...leer, consumptionCombined: 4.4, co2Combined: 100 },
  },
  {
    name: 'Diesel, CO2 fehlt', kraftstoff: 'Diesel', art: 'neuwagen',
    daten: { ...leer, consumptionCombined: 4.9 },
  },
  {
    name: 'Elektro, Reichweite fehlt', kraftstoff: 'Elektro', art: 'neuwagen',
    daten: { ...leer, powerConsumptionCombined: 16.5 },
  },
  {
    name: 'Gebrauchtwagen ohne Werte', kraftstoff: 'Diesel', art: 'gebrauchtwagen',
    daten: { ...leer, vehicleKind: 'gebrauchtwagen' },
  },
  {
    name: 'Gebrauchtwagen, halbe Angabe', kraftstoff: 'Diesel', art: 'gebrauchtwagen',
    daten: { ...leer, vehicleKind: 'gebrauchtwagen', consumptionCombined: 4.9 },
  },
];

const auffaellig: string[] = [];

for (const fall of FAELLE) {
  const daten = { ...fall.daten, vehicleKind: fall.art };
  const pruefung = validateEnvkv(daten, fall.kraftstoff);
  const m = mobileEnvkv(daten, fall.kraftstoff);
  const a = as24Envkv(daten, fall.kraftstoff);

  console.log(`\n── ${fall.name} (${fall.kraftstoff}, ${fall.art}) ──`);
  console.log(`  Pruefung: ${pruefung.complete ? 'vollstaendig' : 'fehlt: ' + pruefung.missing.join(', ')}`);
  console.log(`  mobile.de:   ${JSON.stringify(m)}`);
  console.log(`  AutoScout24: ${JSON.stringify(a)}`);

  /*
   * Der Fall, der wehtut: Die Pruefung sagt "vollstaendig", aber beim
   * Portal kommt nichts oder zu wenig an. Dann steht im Inserat keine
   * Verbrauchsangabe, obwohl das Formular gruen war.
   */
  if (pruefung.complete && Object.keys(m).length === 0) {
    auffaellig.push(`${fall.name}: Pruefung gruen, mobile.de bekommt NICHTS`);
  }
  if (pruefung.complete && Object.keys(a).length === 0 && fall.art !== 'gebrauchtwagen') {
    auffaellig.push(`${fall.name}: Pruefung gruen, AutoScout24 bekommt NICHTS`);
  }
  if (!pruefung.complete && Object.keys(m).length > 0) {
    /*
     * Umgekehrt ist es nicht automatisch falsch — Teilangaben darf man
     * senden —, aber es gehoert angesehen: Eine halbe Verbrauchsangabe
     * ist nach Paragraf 5 UWG irrefuehrend.
     */
    auffaellig.push(`${fall.name}: unvollstaendig, aber mobile.de bekommt ${Object.keys(m).join(', ')}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
if (auffaellig.length === 0) {
  console.log('Nichts Auffaelliges.');
} else {
  console.log(`${auffaellig.length} Punkte zum Ansehen:\n`);
  for (const a of auffaellig) console.log('  • ' + a);
}
