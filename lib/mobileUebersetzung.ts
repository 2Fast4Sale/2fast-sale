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
  return istAusgewiesen(vatType) ? { vatRate: '19.00' } : {};
}

/**
 * Regelbesteuert (Umsatzsteuer ausweisbar) oder nicht?
 *
 * Der gespeicherte Wert heisst 'ausgewiesen'. Im Formular steht
 * daneben "ausweisbar" — das ist die Beschriftung, nicht der Wert.
 * Beim ersten Anlauf habe ich auf die Beschriftung geprueft; damit
 * traf die Bedingung nie zu und jedes Fahrzeug waere als
 * differenzbesteuert ins Inserat gegangen.
 *
 * Deshalb steht der Vergleich an genau einer Stelle, und beide
 * Schreibweisen zaehlen -- falls doch einmal die Beschriftung
 * durchgereicht wird, ist das Ergebnis dasselbe statt still falsch.
 */
export function istAusgewiesen(vatType: string): boolean {
  const k = gleich(vatType);
  return k === 'ausgewiesen' || k === 'ausweisbar';
}

/** Polsterung: "Teilleder" -> "PARTIAL_LEATHER" */
const POLSTER: Record<string, string> = {
  'stoff':     'FABRIC',
  'teilleder': 'PARTIAL_LEATHER',
  'leder':     'LEATHER',
  'velour':    'VELOUR',
  'alcantara': 'ALCANTARA',
};

export function mobilePolsterung(p: string): string | undefined {
  return POLSTER[gleich(p)];
}

/** Innenfarbe: "Schwarz" -> "BLACK" */
const INNENFARBE: Record<string, string> = {
  'schwarz': 'BLACK', 'grau': 'GREY', 'beige': 'BEIGE',
  'braun':   'BROWN', 'rot':  'RED',  'blau':  'BLUE',
  'andere':  'OTHER_INTERIOR_COLOR',
};

export function mobileInnenfarbe(f: string): string | undefined {
  return INNENFARBE[gleich(f)];
}

/** Antriebsart: "Allrad" -> "ALL_WHEEL" */
const ANTRIEB: Record<string, string> = {
  'frontantrieb': 'FRONT',
  'heckantrieb':  'REAR',
  'allrad':       'ALL_WHEEL',
};

export function mobileAntrieb(a: string): string | undefined {
  return ANTRIEB[gleich(a)];
}

/**
 * Hauptuntersuchung: "MM/JJJJ" -> "JJJJMM".
 *
 * Das Formular fragt Monat und Jahr, weil auf der Pruefplakette nichts
 * anderes steht. mobile.de will dasselbe in seiner eigenen
 * Schreibweise.
 */
export function mobileHu(huUntil: string): string | undefined {
  const s = (huUntil || '').trim();
  const mmJJJJ = s.match(/^(\d{1,2})\s*[\/.]\s*(\d{4})$/);
  if (mmJJJJ) return `${mmJJJJ[2]}${mmJJJJ[1].padStart(2, '0')}`;
  if (/^\d{6}$/.test(s)) return s;
  return undefined;
}

/**
 * Laenderversion: fuer welchen Markt das Fahrzeug gebaut wurde.
 *
 * Bei mobile.de PFLICHT fuer Neuwagen ("countryversion-missing"), bei
 * Gebrauchtwagen freiwillig. Beide Portale nennen das Feld gleich und
 * wollen den ISO-Code, also reicht eine Tabelle fuer beide.
 *
 * Acht Laender, nicht 254: Das sind die, aus denen im deutschen
 * Gebrauchtwagenhandel tatsaechlich importiert wird. Wer einen Wagen
 * aus Japan stehen hat, laesst das Feld leer — bei einem
 * Gebrauchtwagen ist es ohnehin freiwillig, und eine Auswahlliste mit
 * 254 Eintraegen wuerde die Seite fuer alle anderen unbenutzbar
 * machen.
 */
export const LAENDER: Record<string, string> = {
  'Deutschland':  'DE',
  'Österreich':   'AT',
  'Schweiz':      'CH',
  'Italien':      'IT',
  'Frankreich':   'FR',
  'Niederlande':  'NL',
  'Spanien':      'ES',
  'Polen':        'PL',
};

export function laenderCode(name: string): string | undefined {
  const treffer = Object.entries(LAENDER)
    .find(([n]) => gleich(n) === gleich(name));
  return treffer?.[1];
}
