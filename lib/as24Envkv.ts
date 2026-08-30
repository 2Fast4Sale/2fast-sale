/**
 * Setzt die EnVKV-Angaben in die Struktur um, die AutoScout24
 * erwartet.
 *
 * Gegenstueck zu mobileEnvkv.ts, und die beiden Portale sind sich hier
 * so unaehnlich wie sonst nirgends:
 *
 *   mobile.de     emissions.combined.co2 = 122,  co2Class = "D"
 *   AutoScout24   wltp.co2EmissionsCombined = 122,  wltp.co2Class = 40
 *
 * Die CO2-Klasse ist bei AutoScout24 eine ZAHL, nicht der Buchstabe:
 * A ist die 10, B die 20, bis G als 70. Steht so in der Referenzliste
 * Co2Class und wird von dort geholt statt hier hingeschrieben.
 *
 * Alles liegt unter `wltp`. Das ist wichtig, denn die Beschreibung
 * sagt zu jedem dieser Felder: "Forbidden if NEDC consumption values
 * are set". Man darf also nicht beides mischen — wir schicken
 * ausschliesslich WLTP, weil das Formular nur WLTP erfasst.
 */

import { drivetrainFromFuel, co2Class, type EnvkvData } from './envkv';
import { AS24_REFERENZEN } from './as24Referenzen';

const z = (v: number | null | undefined): number | undefined =>
  v === null || v === undefined || Number.isNaN(v) ? undefined : v;

/** Buchstabe der CO2-Klasse -> Kennung bei AutoScout24 (A = 10 … G = 70). */
function as24Co2Klasse(gPerKm: number): number | undefined {
  const buchstabe = co2Class(gPerKm);
  const treffer = AS24_REFERENZEN.Co2Class?.find(([, name]) => name === buchstabe);
  return treffer ? Number(treffer[0]) : undefined;
}

export function as24Envkv(daten: EnvkvData, fuelType: string): Record<string, unknown> {
  const antrieb = drivetrainFromFuel(fuelType);
  const feld: Record<string, unknown> = {};
  const wltp: Record<string, unknown> = {};

  const co2 = z(daten.co2Combined);
  const sprit = z(daten.consumptionCombined);
  const strom = z(daten.powerConsumptionCombined);
  const co2Leer = z(daten.co2CombinedDischarged);
  const reichweite = z(daten.electricRangeKm);

  /* Beim reinen Elektrofahrzeug ist der CO2-Ausstoss im Betrieb null —
     dasselbe wie bei mobile.de. */
  const co2Wert = antrieb === 'elektro' ? (co2 ?? 0) : co2;

  if (co2Wert !== undefined) {
    /*
     * Der Mindestwert des Feldes ist 1, nicht 0. Bei einem
     * Elektrofahrzeug waere 0 also unzulaessig — dort bleibt der Wert
     * weg, die Klasse aber wird gesetzt. Die Klasse ist das, was das
     * Gesetz verlangt.
     */
    if (co2Wert >= 1) wltp.co2EmissionsCombined = co2Wert;
    const klasse = as24Co2Klasse(co2Wert);
    if (klasse !== undefined) wltp.co2Class = klasse;
  }

  if (sprit !== undefined) {
    wltp.consumptionCombined = sprit;
    wltp.consumptionCombinedUnit = 'l/100km';
  }
  if (strom !== undefined) {
    wltp.consumptionElectricCombined = strom;
    wltp.consumptionElectricCombinedUnit = 'kWh/100km';
  }

  /* Plug-in-Hybrid: zusaetzlich die gewichteten Werte und die zweite
     Klasse fuer den Zustand mit leerer Batterie. */
  if (antrieb === 'plugin_hybrid') {
    if (sprit !== undefined) {
      wltp.consumptionCombinedWeighted = sprit;
      wltp.consumptionCombinedWeightedUnit = 'l/100km';
    }
    if (strom !== undefined) {
      wltp.consumptionElectricCombinedWeighted = strom;
      wltp.consumptionElectricCombinedWeightedUnit = 'kWh/100km';
    }
    if (co2Wert !== undefined && co2Wert >= 1) wltp.co2EmissionsCombinedWeighted = co2Wert;
    if (co2Leer !== undefined) {
      const klasseLeer = as24Co2Klasse(co2Leer);
      if (klasseLeer !== undefined) wltp.co2ClassDischarged = klasseLeer;
    }
  }

  if (Object.keys(wltp).length > 0) feld.wltp = wltp;

  /*
   * Die elektrische Reichweite haengt NICHT unter wltp, sondern direkt
   * am Inserat — und heisst dort fuer beide Antriebsarten gleich,
   * anders als bei mobile.de mit range und
   * equivalentAllElectricRange.
   */
  if (reichweite !== undefined && antrieb !== 'verbrenner') {
    feld.electricRange = reichweite;
  }

  return feld;
}
