/**
 * Karosserieform aus Feld 4 des Fahrzeugscheins.
 *
 * -- Warum nur vier Faelle -----------------------------------------
 *
 * Der Fahrzeugschein kennt die EU-Aufbauarten AA bis AG. Sie sind
 * groeber als die Kategorien der Verkaufsportale, und an einer Stelle
 * gehen sie gar nicht auf: Ein SUV hat keinen eigenen Code. Ein Tiguan
 * ist als AC (Kombi) oder AF (Mehrzweckfahrzeug) eingetragen — genau
 * wie ein Passat Variant oder ein Touran.
 *
 * Deshalb werden nur die eindeutigen Faelle uebernommen. Bei AB, AC und
 * AF bleibt das Feld leer und der Haendler waehlt selbst. Das ist
 * unbequemer als eine Vorbelegung, aber eine falsche Karosserieform im
 * Inserat faellt niemandem auf und steht am Ende trotzdem drin.
 *
 * Steht hier und nicht in der Route, damit scripts/aufbau-probe.ts
 * jeden Fall ohne Modellaufruf durchspielen kann.
 */

/*
 * `\bAA\d*\b` statt `\bAA\b`: In Feld 4 steht der Code oft mit
 * angehaengter Ziffernfolge ("AA0002"). Zwischen Buchstabe und Ziffer
 * liegt keine Wortgrenze, ein blosses `\bAA\b` findet ihn dort nicht.
 *
 * "Pritsche" steht bewusst nicht dabei, obwohl es zu AG passt: Ein
 * Pritschenwagen ist im Verkauf eher ein Transporter als ein
 * Gelaendewagen. Im Zweifel lieber leer.
 *
 * "PERSONENKRAFTWAGEN OFFEN" kam von einem echten Schein, der durch
 * scan-doc lief: Feld 4 stand ausgeschrieben da, nicht als Code, und
 * keines der Muster traf. Das Feld blieb leer, obwohl ein Cabrio
 * eindeutig erkennbar war. "offen" allein waere falsch — ein OFFENER
 * KASTENWAGEN ist eine Pritsche und damit ein Transporter. Deshalb nur
 * zusammen mit Personenkraftwagen oder PKW.
 */
export const AUFBAU: Array<[RegExp, string]> = [
  [/\bAE\d*\b|kabrio|cabrio|roadster|(?:personenkraftwagen|pkw)[\s.-]+offen/i, 'Cabrio / Roadster'],
  [/\bAD\d*\b|coup[ée]/i,                       'Coupé'],
  [/\bAG\d*\b|pick.?up/i,                       'SUV / Geländewagen'],
  [/\bAA\d*\b|stufenheck|(?<!kombi)limousine/i, 'Limousine'],
];

/**
 * Gibt die Karosserieform zurueck, oder null, wenn Feld 4 nicht
 * eindeutig ist. null heisst: Der Haendler waehlt selbst.
 */
export function aufbauZuordnen(feld4: unknown): string | null {
  const text = typeof feld4 === 'string' ? feld4.trim() : '';
  if (!text) return null;
  const treffer = AUFBAU.find(([muster]) => muster.test(text));
  return treffer ? treffer[1] : null;
}
