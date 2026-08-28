/**
 * Uebersetzt die Angaben aus dem Formular in die Werte, die mobile.de
 * erwartet.
 *
 * Gegenstueck zu as24Uebersetzung.ts. Marke und Modell stehen nicht
 * hier, sondern in carDatabase.ts (mobileMarkenWert, mobileModellWert)
 * -- die kommen aus derselben Liste, aus der die Auswahlfelder
 * gefuellt werden, und gehoeren deshalb dorthin.
 *
 * Alle Werte hier stammen aus den Referenzdaten von mobile.de:
 * https://services.mobile.de/refdata/...
 * Sie brauchen keine Anmeldung und sind am 2026-08-27 geprueft.
 */

const gleich = (s: string): string => (s || '').trim().toLowerCase();

/**
 * Karosserieform.
 *
 * mobile.de kennt fuer Autos acht Kategorien. "Transporter" ist
 * keine davon -- ein echter Transporter waere bei mobile.de eine
 * andere Fahrzeugklasse (VanUpTo7500), nicht Car. Solange das
 * Werkzeug nur Autos kann, landet er auf "Van/Minibus"; das ist
 * naeher an der Wahrheit als "Andere".
 */
const KATEGORIE: Record<string, string> = {
  'limousine':          'Limousine',
  'kombi':              'EstateCar',
  'suv / geländewagen': 'OffRoad',
  'kleinwagen':         'SmallCar',
  'cabrio / roadster':  'Cabrio',
  'coupé':              'SportsCar',
  'van / kleinbus':     'Van',
  'transporter':        'Van',
};

export function mobileKategorie(form: string): string | undefined {
  return KATEGORIE[gleich(form)];
}

const KRAFTSTOFF: Record<string, string> = {
  'benzin':         'PETROL',
  'diesel':         'DIESEL',
  'elektro':        'ELECTRICITY',
  'lpg':            'LPG',
  'cng':            'CNG',
  'hybrid':         'HYBRID',
  'plug-in hybrid': 'HYBRID',
};

export function mobileKraftstoff(art: string): string | undefined {
  return KRAFTSTOFF[gleich(art)];
}

const GETRIEBE: Record<string, string> = {
  'automatik': 'AUTOMATIC_GEAR',
  'manuell':   'MANUAL_GEAR',
};

export function mobileGetriebe(g: string): string | undefined {
  return GETRIEBE[gleich(g)];
}

const FARBE: Record<string, string> = {
  'schwarz': 'BLACK', 'grau': 'GREY',   'beige': 'BEIGE',  'braun': 'BROWN',
  'rot':     'RED',   'grün': 'GREEN',  'gruen': 'GREEN',  'blau':  'BLUE',
  'violett': 'PURPLE','gold':  'GOLD',  'weiß':  'WHITE',  'weiss': 'WHITE',
  'orange':  'ORANGE','silber':'SILVER','gelb':  'YELLOW',
};

export function mobileFarbe(f: string): string | undefined {
  return FARBE[gleich(f)];
}

/** "Euro 6d-Temp" -> "EURO6D_TEMP" */
export function mobileEuronorm(norm: string): string | undefined {
  const k = gleich(norm).replace(/\s+/g, '');
  const tabelle: Record<string, string> = {
    'euro1': 'EURO1', 'euro2': 'EURO2', 'euro3': 'EURO3', 'euro4': 'EURO4',
    'euro5': 'EURO5', 'euro6': 'EURO6', 'euro6c': 'EURO6C',
    'euro6d-temp': 'EURO6D_TEMP', 'euro6d': 'EURO6D',
    'euro6e': 'EURO6E', 'euro7': 'EURO7',
  };
  return tabelle[k];
}

/** Tuerenzahl: mobile.de fasst zu Paaren zusammen. */
export function mobileTueren(anzahl: number): string | undefined {
  if (anzahl === 2 || anzahl === 3) return 'TWO_OR_THREE';
  if (anzahl === 4 || anzahl === 5) return 'FOUR_OR_FIVE';
  if (anzahl === 6 || anzahl === 7) return 'SIX_OR_SEVEN';
  return undefined;
}

/**
 * Umsatzsteuer.
 *
 * Das Feld vatRate ist keine blosse Zahl: Laut Dokumentation gilt ein
 * Fahrzeug als vorsteuerabzugsfaehig, sobald es gesetzt ist. Bei
 * einem differenzbesteuerten Auto nach § 25a UStG darf es deshalb
 * NICHT gesetzt werden -- sonst steht im Inserat, der Kaeufer koenne
 * die Umsatzsteuer ziehen, was nicht stimmt.
 *
 * Vorher stand hier fest "19.00", unabhaengig davon, was der Haendler
 * ausgewaehlt hatte.
 */
export function mobileUmsatzsteuer(vatType: string): { vatRate?: string } {
  return gleich(vatType) === 'ausweisbar' ? { vatRate: '19.00' } : {};
}
