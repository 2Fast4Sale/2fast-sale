/**
 * Uebersetzt die Angaben aus dem Formular in die Werte, die
 * AutoScout24 erwartet.
 *
 * Gegenstueck zu mobileMarkenWert()/mobileModellWert() in
 * carDatabase.ts. Beide Portale bekommen dieselben Eingaben des
 * Haendlers und machen etwas voellig anderes daraus:
 *
 *   Haendler waehlt   mobile.de will   AutoScout24 will
 *   ---------------   --------------   ----------------
 *   Volkswagen        "VW"             74
 *   Golf              "Golf"           1642
 *   Kombi             "EstateCar"      5
 *   Diesel            "DIESEL"         7
 *
 * Deshalb bleibt im Formular alles im Klartext und die Umsetzung
 * passiert hier — sonst muesste man bei einem dritten Portal jede
 * Zeile der Oberflaeche anfassen.
 */

import { AS24_MARKEN, AS24_REFERENZEN } from './as24Referenzen';

/**
 * Vergleichsform: klein, ohne Betonungszeichen, ohne Bindestriche.
 *
 * AutoScout24 fuehrt "Citroen", mobile.de "Citroën". Ohne diese
 * Angleichung faende die Marke sich nicht wieder und das Inserat ginge
 * ohne Marke raus.
 */
const gleichform = (s: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[-\s]+/g, ' ')
    .trim()
    .toLowerCase();

/** Sucht in einer Referenzliste nach dem Namen und gibt die Kennung. */
function referenz(typ: string, name: string): string | undefined {
  const liste = AS24_REFERENZEN[typ];
  if (!liste) return undefined;
  const k = gleichform(name);
  return liste.find(([, n]) => gleichform(n) === k)?.[0];
}

/** Marken-Kennung zum Anzeigenamen, z.B. "Volkswagen" -> 74 */
export function as24MarkenId(marke: string): number | undefined {
  const k = gleichform(marke);
  if (!k) return undefined;
  return AS24_MARKEN.find(m => gleichform(m.name) === k)?.id;
}

/** Modell-Kennung, z.B. ("Volkswagen", "Golf") -> 1642 */
export function as24ModellId(marke: string, modell: string): number | undefined {
  const k = gleichform(modell);
  if (!k) return undefined;
  const m = AS24_MARKEN.find(x => gleichform(x.name) === gleichform(marke));
  return m?.modelle.find(([, n]) => gleichform(n) === k)?.[0];
}

/**
 * Karosserieform.
 *
 * Die Namen der Oberflaeche sind deutsch und teilweise
 * zusammengefasst; AutoScout24 fuehrt englische Bezeichnungen und
 * kennt nur neun Formen fuer Autos. "Kleinwagen" und "Kompakt"
 * landen beide auf "Compact" — das ist keine Ungenauigkeit, sondern
 * die feinste Unterscheidung, die das Portal anbietet.
 */
const KAROSSERIE_AS24: Record<string, string> = {
  'Limousine':          'Sedan',
  'Kombi':              'Station Wagon',
  'SUV / Geländewagen': 'SUV/Off-Road/Pick-Up',
  'Kleinwagen':         'Compact',
  'Cabrio / Roadster':  'Convertible',
  'Coupé':              'Coupe',
  'Van / Kleinbus':     'Van',
  'Transporter':        'Transporter',
};

export function as24KarosserieId(form: string): number | undefined {
  const name = KAROSSERIE_AS24[form];
  const id = name ? referenz('BodyType', name) : undefined;
  return id ? Number(id) : undefined;
}

/**
 * Kraftstoff.
 *
 * AutoScout24 kennt keinen Wert "Hybrid" — ein Hybrid wird ueber die
 * Kombination aus primaryFuelType, additionalFuelTypes und
 * fuelCategory beschrieben. Deshalb liefert diese Funktion beides:
 * den Hauptkraftstoff und die Kategorie.
 *
 * Bei Benzin faellt die Wahl auf "Super 95" (2) und nicht auf
 * "Regular/Benzine 91" (1). 91 Oktan gibt es an deutschen Tankstellen
 * seit Jahren nicht mehr; wer "Benzin" ankreuzt, meint Super.
 */
export interface As24Kraftstoff {
  primaryFuelType: number;
  fuelCategory: string;
  additionalFuelTypes?: number[];
  isPluginHybrid?: boolean;
}

export function as24Kraftstoff(art: string): As24Kraftstoff | undefined {
  const benzin = Number(referenz('FuelType', 'Super 95'));
  const diesel = Number(referenz('FuelType', 'Diesel'));
  const strom  = Number(referenz('FuelType', 'Electricity'));

  switch (gleichform(art)) {
    case 'benzin':
      return { primaryFuelType: benzin, fuelCategory: 'B' };
    case 'diesel':
      return { primaryFuelType: diesel, fuelCategory: 'D' };
    case 'elektro':
      return { primaryFuelType: strom, fuelCategory: 'E' };
    case 'lpg':
      return { primaryFuelType: Number(referenz('FuelType', 'Liquid petroleum gas (LPG)')), fuelCategory: 'L' };
    case 'cng':
      return { primaryFuelType: Number(referenz('FuelType', 'Biogas')), fuelCategory: 'C' };
    /*
     * Hybrid ohne Zusatz: Benzin als Hauptantrieb, Strom daneben.
     * Das ist die haeufigere Bauart. Ein Diesel-Hybrid muesste der
     * Haendler nachtragen — dafuer fehlt dem Formular bisher das Feld.
     */
    case 'hybrid':
      return { primaryFuelType: benzin, fuelCategory: '2', additionalFuelTypes: [strom] };
    case 'plug in hybrid':
      return { primaryFuelType: benzin, fuelCategory: '2', additionalFuelTypes: [strom], isPluginHybrid: true };
    default:
      return undefined;
  }
}

/** Getriebe: "Automatik" -> "A", "Manuell" -> "M" */
export function as24Getriebe(getriebe: string): string | undefined {
  switch (gleichform(getriebe)) {
    case 'automatik': return 'A';
    case 'manuell':   return 'M';
    default:          return undefined;
  }
}

/** Aussenfarbe, z.B. "Schwarz" -> Kennung aus BodyColor. */
const FARBE_AS24: Record<string, string> = {
  'schwarz': 'Black',  'weiss': 'White',  'weiß': 'White',
  'grau':    'Grey',   'silber': 'Silver', 'blau': 'Blue',
  'rot':     'Red',    'grun':  'Green',  'grün': 'Green',
  'braun':   'Brown',  'beige': 'Beige',  'gelb': 'Yellow',
  'orange':  'Orange', 'gold':  'Gold',   'violett': 'Violet',
  'bronze':  'Bronze',
};

export function as24FarbeId(farbe: string): string | undefined {
  const englisch = FARBE_AS24[gleichform(farbe)];
  return englisch ? referenz('BodyColor', englisch) : undefined;
}

/** Schadstoffklasse, z.B. "Euro 6d" -> Kennung aus EuEmissionStandard. */
export function as24EuronormId(norm: string): string | undefined {
  return referenz('EuEmissionStandard', norm)
      ?? referenz('EuEmissionStandard', norm.replace(/\s+/g, ''));
}
