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

  const spritLeer = z(daten.consumptionCombinedDischarged);

  /*
   * ── Die Regeln von AutoScout24, nicht meine ───────────────────────
   *
   * Nachgelesen in ihrer Dokumentation (consumption-and-emission.md),
   * gueltig fuer deutsche Haendler, Fahrzeugart C und ein Fahrzeug, das
   * als neu gilt. Jedes Feld ist fuer bestimmte Antriebsarten PFLICHT
   * und fuer andere VERBOTEN:
   *
   *   co2EmissionsCombined            Pflicht ICE, EV   verboten PHEV
   *   co2EmissionsCombinedWeighted    Pflicht PHEV      verboten ICE, EV
   *   consumptionCombined             Pflicht ICE       verboten EV, PHEV
   *   consumptionElectricCombined     Pflicht EV        verboten ICE, PHEV
   *   consumptionCombinedWeighted     Pflicht PHEV      verboten ICE, EV
   *   consumptionElectricCombinedWtd  Pflicht PHEV      verboten ICE, EV
   *   consumptionCombinedDischarged   Pflicht PHEV      verboten ICE, EV
   *   co2ClassDischarged              Pflicht PHEV      verboten ICE, EV
   *   co2Class                        immer Pflicht
   *
   * Vorher schickte diese Funktion beim Plug-in-Hybrid DREI verbotene
   * Felder mit: co2EmissionsCombined, consumptionCombined und
   * consumptionElectricCombined — zusaetzlich zu den gewichteten. Und
   * beim Elektrofahrzeug fehlte co2EmissionsCombined, das dort Pflicht
   * ist (0 ist ausdruecklich erlaubt, anders als der Mindestwert 1 im
   * allgemeinen Teil der Doku nahelegt).
   *
   * Getestet hat das nie jemand, weil AutoScout24 bis heute keinen
   * Zugang freigeschaltet hat. Der erste Plug-in-Hybrid eines echten
   * Haendlers waere abgewiesen worden.
   */
  const istPhev = antrieb === 'plugin_hybrid';
  const istEv = antrieb === 'elektro';

  /* Die Klasse braucht jedes Fahrzeug — sie kommt aus dem Wert, der
     fuer die jeweilige Antriebsart der massgebliche ist. */
  const co2Massgeblich = istEv ? (co2 ?? 0) : co2;
  if (co2Massgeblich !== undefined) {
    const klasse = as24Co2Klasse(co2Massgeblich);
    if (klasse !== undefined) wltp.co2Class = klasse;
  }

  if (istPhev) {
    /* Gewichtete Werte — und NUR sie. */
    if (sprit !== undefined) {
      wltp.consumptionCombinedWeighted = sprit;
      wltp.consumptionCombinedWeightedUnit = 'l/100km';
    }
    if (strom !== undefined) {
      wltp.consumptionElectricCombinedWeighted = strom;
      wltp.consumptionElectricCombinedWeightedUnit = 'kWh/100km';
    }
    if (co2 !== undefined && co2 >= 1) wltp.co2EmissionsCombinedWeighted = co2;
    if (spritLeer !== undefined) {
      wltp.consumptionCombinedDischarged = spritLeer;
      wltp.consumptionCombinedDischargedUnit = 'l/100km';
    }
    if (co2Leer !== undefined) {
      const klasseLeer = as24Co2Klasse(co2Leer);
      if (klasseLeer !== undefined) wltp.co2ClassDischarged = klasseLeer;
    }
  } else if (istEv) {
    /* Null ist hier erlaubt und ist die Wahrheit: kein Auspuff. */
    wltp.co2EmissionsCombined = co2 ?? 0;
    if (strom !== undefined) {
      wltp.consumptionElectricCombined = strom;
      wltp.consumptionElectricCombinedUnit = 'kWh/100km';
    }
  } else {
    if (co2 !== undefined) wltp.co2EmissionsCombined = co2;
    if (sprit !== undefined) {
      wltp.consumptionCombined = sprit;
      wltp.consumptionCombinedUnit = 'l/100km';
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
