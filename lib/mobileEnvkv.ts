/**
 * Setzt die EnVKV-Angaben in die Struktur um, die mobile.de erwartet.
 *
 * Das Formular erfasst sie seit Langem, die Uebertragung fehlte — die
 * Route meldete stattdessen "EnVKV-Angaben fuer Neuwagen (noch nicht
 * angebunden)" und lehnte damit JEDEN Neuwagen ab.
 *
 * mobile.de ordnet dieselben Zahlen anders an als wir:
 *
 *   wir                        mobile.de
 *   ------------------------   ---------------------------------
 *   co2Combined                emissions.combined.co2
 *   (berechnete Klasse)        emissions.combined.co2Class
 *   consumptionCombined        consumptions.fuel.combined
 *   powerConsumptionCombined   consumptions.power.combined
 *   co2CombinedDischarged      emissions.discharged.co2
 *   electricRangeKm            range  bzw.  equivalentAllElectricRange
 *
 * Die CO2-Klasse steht in keinem Formularfeld. Sie ergibt sich aus dem
 * CO2-Wert nach einer festen Tabelle, und genau das tut co2Class() in
 * envkv.ts. Ausrechnen ist hier richtig, nicht raten: Die Zuordnung ist
 * gesetzlich festgelegt, es gibt nichts zu schaetzen.
 */

import { co2Class, drivetrainFromFuel, type EnvkvData } from './envkv';

/** Zahl oder undefined — null und NaN gelten als "nicht angegeben". */
const z = (v: number | null | undefined): number | undefined =>
  v === null || v === undefined || Number.isNaN(v) ? undefined : v;

export function mobileEnvkv(daten: EnvkvData, fuelType: string): Record<string, unknown> {
  const antrieb = drivetrainFromFuel(fuelType);
  const feld: Record<string, unknown> = {};

  const co2 = z(daten.co2Combined);
  const sprit = z(daten.consumptionCombined);
  const strom = z(daten.powerConsumptionCombined);
  const co2Leer = z(daten.co2CombinedDischarged);
  const reichweite = z(daten.electricRangeKm);

  /*
   * Bei einem reinen Elektrofahrzeug ist der CO2-Ausstoss im Betrieb
   * null. Das Formular fragt ihn deshalb nicht ab (siehe
   * validateEnvkv), mobile.de verlangt ihn aber auch dort — also hier
   * setzen statt den Haendler danach zu fragen.
   */
  const co2Wert = antrieb === 'elektro' ? (co2 ?? 0) : co2;

  if (co2Wert !== undefined) {
    const emissionen: Record<string, unknown> = {
      combined: { co2: co2Wert, co2Class: co2Class(co2Wert) },
    };
    /*
     * "discharged" heisst: mit leerer Batterie. Nur beim
     * Plug-in-Hybrid, und dort verlangt mobile.de die Klasse
     * ausdruecklich.
     */
    if (antrieb === 'plugin_hybrid' && co2Leer !== undefined) {
      emissionen.discharged = { co2: co2Leer, co2Class: co2Class(co2Leer) };
    }
    feld.emissions = emissionen;
  }

  const verbrauch: Record<string, unknown> = {};
  if (sprit !== undefined) verbrauch.fuel = { combined: sprit };
  if (strom !== undefined) verbrauch.power = { combined: strom };
  /*
   * Beim Plug-in-Hybrid verlangt mobile.de zusaetzlich die
   * "gewichteten kombinierten" Werte. Das sind bei WLTP genau die
   * kombinierten Werte eines Plug-in-Hybrids — dieselbe Zahl, anderer
   * Name. Deshalb hier doppelt gesetzt und nicht neu erfragt.
   */
  if (antrieb === 'plugin_hybrid') {
    if (sprit !== undefined) verbrauch.weightedCombinedFuel = sprit;
    if (strom !== undefined) verbrauch.weightedCombinedPower = strom;
  }
  if (Object.keys(verbrauch).length > 0) feld.consumptions = verbrauch;

  if (reichweite !== undefined) {
    /*
     * Zwei verschiedene Felder fuer dieselbe Angabe: Beim reinen
     * Elektrofahrzeug ist es die Reichweite (`range`), beim Plug-in
     * die rein elektrische Reichweite (`equivalentAllElectricRange`).
     */
    if (antrieb === 'elektro') feld.range = reichweite;
    else if (antrieb === 'plugin_hybrid') feld.equivalentAllElectricRange = reichweite;
  }

  if (antrieb === 'plugin_hybrid') feld.hybridPlugin = true;

  return feld;
}
