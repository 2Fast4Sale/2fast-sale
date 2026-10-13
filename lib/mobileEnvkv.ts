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

  const spritLeer = z(daten.consumptionCombinedDischarged);

  /*
   * ── Was in welches Feld gehoert, steht in ihrer Doku ──────────────
   *
   * Woertlich aus dem Handbuch der Seller-API:
   *
   *   fuel   "WLTP fuel consumption values. In case of plugin hybrid,
   *           it is the fuel consumption when battery is discharged."
   *   power  "For plugin hybrid, electrical power consumption in pure
   *           electric mode."
   *
   * Beim Plug-in-Hybrid ist consumptions.fuel.combined also der
   * Verbrauch bei LEERER Batterie — nicht der gewichtete. Der
   * gewichtete steht in weightedCombinedFuel.
   *
   * Hier stand bisher in beiden Feldern derselbe Wert, naemlich der
   * gewichtete. Im Inserat haette dann gestanden, ein Plug-in-Hybrid
   * verbrauche mit leerer Batterie 1,4 l/100 km. Das ist keine
   * Kleinigkeit: Der Verbrauch mit leerer Batterie ist der Wert, der
   * den Kaeufer im Alltag betrifft, und er ist eine Pflichtangabe.
   */
  const verbrauch: Record<string, unknown> = {};

  if (antrieb === 'plugin_hybrid') {
    if (spritLeer !== undefined) verbrauch.fuel = { combined: spritLeer };
    if (strom !== undefined) verbrauch.power = { combined: strom };
    /* Pflicht beim Plug-in laut Anforderungstabelle der Doku. */
    if (sprit !== undefined) verbrauch.weightedCombinedFuel = sprit;
    if (strom !== undefined) verbrauch.weightedCombinedPower = strom;
  } else {
    if (sprit !== undefined) verbrauch.fuel = { combined: sprit };
    if (strom !== undefined) verbrauch.power = { combined: strom };
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
