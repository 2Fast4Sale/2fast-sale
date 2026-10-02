/**
 * Fahrzeugdatenbank — Marken und Modelle.
 *
 * Die Daten selbst stehen in mobileMarken.ts und kommen von mobile.de.
 * Diese Datei ist nur die Hülle darum: sie stellt die Listen bereit, die
 * das Formular braucht, und übersetzt zwischen dem, was der Händler
 * liest, und dem, was mobile.de beim Hochladen erwartet.
 *
 * Vorher war die Liste von Hand zusammengetragen — 121 Marken, 1050
 * Modelle. Sie war nicht falsch, aber sie war eine Behauptung: Ob
 * "Volkswagen Golf" beim Hochladen durchgeht, wusste niemand, denn
 * mobile.de führt die Marke als "VW". Jetzt kommt die Liste von dort,
 * wo sie geprüft wird — 182 Marken, 2664 Modelle, mit dem Wert für den
 * Upload gleich daneben.
 */

import { MOBILE_MARKEN, type MobileMarke } from './mobileMarken';

export interface CarBrand {
  /** Anzeigename, z.B. "Volkswagen" */
  name: string;
  /** Modellnamen zur Anzeige, alphabetisch */
  models: string[];
}

/** Anzeigename eines Modelleintrags — Zeichenkette oder [Name, Wert]. */
const modellName = (m: string | [string, string]): string =>
  typeof m === 'string' ? m : m[0];

/** Hochladewert eines Modelleintrags. */
const modellWert = (m: string | [string, string]): string =>
  typeof m === 'string' ? m : m[1];

export const CAR_DATABASE: CarBrand[] = MOBILE_MARKEN.map(m => ({
  name: m.name,
  models: m.modelle.map(modellName),
}));

/** Nur die Markennamen als sortierte Liste */
export const BRAND_NAMES: string[] = CAR_DATABASE.map(b => b.name);

/**
 * Vergleichsform eines Namens: klein, ohne Satzzeichen, einfache Abstaende.
 *
 * Grund: Der Fahrzeugschein schreibt die Marke in Feld D.1 mit
 * nachgestelltem Komma ("VOLKSWAGEN,"). Der Scan uebernimmt das, und
 * danach fand markeFinden die Marke nicht mehr — gesendet wurde dann der
 * Rohwert, und mobile.de antwortete mit invalid-reference-data-value.
 * Ein Komma darf nicht der Grund sein, warum ein Inserat abgelehnt wird.
 */
const vergleichsform = (w: string): string =>
  (w || '').toLowerCase().replace(/[.,;:!?]/g, ' ').replace(/\s+/g, ' ').trim();

/** Findet den Rohdatensatz zu einem Anzeigenamen, Hochladewert oder Alias. */
function markeFinden(marke: string): MobileMarke | undefined {
  const k = vergleichsform(marke);
  if (!k) return undefined;
  const direkt = MOBILE_MARKEN.find(
    m => vergleichsform(m.name) === k || vergleichsform(m.wert) === k,
  );
  if (direkt) return direkt;

  /*
   * Erst jetzt die Aliase. Sie standen bisher NUR in splitBrandModel —
   * wer "Mercedes" im Formular stehen hatte, bekam hier kein Ergebnis,
   * obwohl die Zerlegung es gekonnt haette.
   */
  const ziel = MARKEN_ALIASE[k];
  if (!ziel) return undefined;
  return MOBILE_MARKEN.find(m => vergleichsform(m.name) === vergleichsform(ziel));
}

/** Modelle für eine bestimmte Marke */
export function getModels(brand: string): string[] {
  const eintrag = markeFinden(brand);
  return eintrag ? eintrag.modelle.map(modellName) : [];
}

/** Suche: Marke + Modell gleichzeitig filtern */
export function searchBrands(query: string): CarBrand[] {
  const q = query.toLowerCase().trim();
  if (!q) return CAR_DATABASE;
  return CAR_DATABASE.filter(
    b =>
      b.name.toLowerCase().includes(q) ||
      b.models.some(m => m.toLowerCase().includes(q)),
  );
}

/**
 * Der Wert, den die Seller-API im Feld `make` erwartet.
 *
 * Der Händler sieht "Volkswagen", mobile.de will "VW". Wer eine
 * unbekannte Marke einträgt, bekommt sie in Grossbuchstaben zurück —
 * dann lehnt mobile.de sie zwar ab, aber mit einer verständlichen
 * Meldung statt mit einem leeren Feld.
 */
export function mobileMarkenWert(marke: string): string {
  return mobileMarkenWertOderNull(marke) ?? (marke || '').trim().toUpperCase();
}

/**
 * Dasselbe für das Feld `model`.
 *
 * Zwei Dinge kommen aus dem Fahrzeugschein, die vorher nicht passten:
 *
 *   - Feld D.3 wiederholt oft die Marke: "VW GOLF". Gesucht wurde dann
 *     nach einem Modell namens "vw golf", das es nicht gibt.
 *   - Verglichen wurde nur der Anzeigename, nicht der Hochladewert.
 */
export function mobileModellWert(marke: string, modell: string): string {
  return mobileModellWertOderNull(marke, modell) ?? (modell || '').trim();
}

/**
 * Der Hochladewert, oder `null` wenn mobile.de die Marke nicht kennt.
 *
 * Die Routen brauchen diese Unterscheidung: Einen unbekannten Wert
 * einfach mitzuschicken heisst, dass mobile.de das ganze Inserat mit
 * invalid-reference-data-value ablehnt — und der Haendler sieht nur
 * "abgelehnt (400)". Besser: "Marke X ist bei mobile.de unbekannt",
 * bevor etwas rausgeht.
 */
export function mobileMarkenWertOderNull(marke: string): string | null {
  return markeFinden(marke)?.wert ?? null;
}

/**
 * Marke und Modell in sauberer Schreibweise, fuer Titel und Anzeige.
 *
 * Grund: Aus dem Fahrzeugschein kommt "VOLKSWAGEN," und "VW GOLF". Als
 * Ueberschrift eines Inserats steht da dann "VOLKSWAGEN, VW GOLF" — mit
 * Komma und doppelter Marke. Gefunden heisst hier: Anzeigename aus der
 * Liste. Nicht gefunden heisst: unveraendert lassen, denn Erfinden ist
 * schlimmer als eine ungewohnte Schreibweise.
 */
export function markeModellAnzeige(marke: string, modell: string): { marke: string; modell: string } {
  const eintrag = markeFinden(marke);
  const rohModell = (modell || '').trim();
  if (!eintrag) return { marke: (marke || '').trim(), modell: rohModell };

  const wert = mobileModellWertOderNull(marke, modell);
  const treffer = wert
    ? eintrag.modelle.find(m => modellWert(m) === wert)
    : undefined;

  return {
    marke: eintrag.name,
    modell: treffer ? modellName(treffer) : rohModell,
  };
}

/** Wie oben, fuer das Modell. */
export function mobileModellWertOderNull(marke: string, modell: string): string | null {
  const eintrag = markeFinden(marke);
  if (!eintrag) return null;

  const kandidaten = [modell];
  /* "VW GOLF" → auch "GOLF" versuchen: Feld D.3 wiederholt die Marke. */
  for (const vorsatz of [eintrag.name, eintrag.wert]) {
    const v = vergleichsform(vorsatz);
    const m = vergleichsform(modell);
    if (v && m.startsWith(v + ' ')) kandidaten.push(m.slice(v.length + 1));
  }

  for (const kandidat of kandidaten) {
    const k = vergleichsform(kandidat);
    if (!k) continue;
    const treffer = eintrag.modelle.find(
      m => vergleichsform(modellName(m)) === k || vergleichsform(modellWert(m)) === k,
    );
    if (treffer) return modellWert(treffer);
  }
  return null;
}

/**
 * Schreibweisen, die im Fahrzeugschein (Feld D.1) und bei VIN-Decodern
 * vorkommen, aber nicht dem Anzeigenamen entsprechen.
 *
 * Die Hochladewerte von mobile.de ("VW", "SKODA") stehen hier nicht
 * mehr drin — die findet `markeFinden` von sich aus, weil es beide
 * Felder prüft.
 */
const MARKEN_ALIASE: Record<string, string> = {
  'vw nutzfahrzeuge': 'Volkswagen',
  'mercedes':         'Mercedes-Benz',
  'mercedes benz':    'Mercedes-Benz',
  'mb':               'Mercedes-Benz',
  'land-rover':       'Land Rover',
  'range rover':      'Land Rover',
  'alfa':             'Alfa Romeo',
  'citroen':          'Citroën',
  'škoda':            'Skoda',
};

/**
 * Zerlegt eine zusammenhängende Fahrzeugbezeichnung in Marke und Modell.
 *
 * Der Fahrzeugschein-Scan und der VIN-Decoder liefern beides in einem String,
 * etwa "Volkswagen Golf 2.0 TDI" oder "VW Golf GTI". Das Formular hat dafür
 * zwei Felder mit Auswahllisten. Ohne Zerlegung landete der ganze String im
 * Markenfeld und das Modell blieb leer — der Händler musste beides von Hand
 * nachtragen, obwohl es erkannt worden war.
 *
 * Die Marke wird auf den Anzeigenamen normalisiert, damit sie zum
 * Auswahlfeld passt: "VW" wird zu "Volkswagen", "mercedes" zu
 * "Mercedes-Benz".
 */
export function splitBrandModel(bezeichnung: string): { brand: string; model: string } {
  const roh = (bezeichnung || '').trim().replace(/\s+/g, ' ');
  if (!roh) return { brand: '', model: '' };
  const klein = roh.toLowerCase();

  /** Findet das passende Modell im Rest, sonst eine brauchbare Näherung. */
  const modellAus = (marke: MobileMarke, rest: string): string => {
    if (!rest) return '';
    const kleinRest = rest.toLowerCase();
    // Längstes bekanntes Modell zuerst: "3er Gran Turismo" soll nicht bei "3er" enden
    const treffer = marke.modelle
      .map(modellName)
      .sort((a, b) => b.length - a.length)
      .find(m => kleinRest === m.toLowerCase() || kleinRest.startsWith(m.toLowerCase() + ' '));
    if (treffer) return treffer;

    // Unbekanntes Modell: erstes Wort. Bei sehr kurzen Bezeichnern wie "C 200"
    // oder "A 45" das zweite mitnehmen — "C" allein wäre wertlos.
    const worte = rest.split(' ');
    return worte[0].length <= 2 && worte[1] ? `${worte[0]} ${worte[1]}` : worte[0];
  };

  /*
   * Kandidaten sammeln: echte Markennamen, Hochladewerte und Aliase
   * gemeinsam, dann nach Länge des gefundenen Präfixes entscheiden.
   * Bewusst ohne Rekursion — ein Alias wie "alfa" ist ein Präfix seines
   * eigenen Ziels "Alfa Romeo", ein erneuter Durchlauf würde endlos
   * "Alfa Romeo Romeo ..." erzeugen.
   */
  const kandidaten: { praefix: string; marke: MobileMarke }[] = [];

  for (const marke of MOBILE_MARKEN) {
    for (const schreibweise of [marke.name, marke.wert]) {
      const s = schreibweise.toLowerCase();
      if (klein === s || klein.startsWith(s + ' ')) {
        kandidaten.push({ praefix: roh.slice(0, schreibweise.length), marke });
      }
    }
  }
  for (const [alias, ziel] of Object.entries(MARKEN_ALIASE)) {
    if (klein !== alias && !klein.startsWith(alias + ' ')) continue;
    const marke = markeFinden(ziel);
    if (marke) kandidaten.push({ praefix: roh.slice(0, alias.length), marke });
  }

  if (kandidaten.length > 0) {
    // Längster Treffer gewinnt: "Alfa Romeo" schlägt den Alias "alfa",
    // "Land Rover" schlägt "Land".
    kandidaten.sort((a, b) => b.praefix.length - a.praefix.length);
    const { praefix, marke } = kandidaten[0];
    return { brand: marke.name, model: modellAus(marke, roh.slice(praefix.length).trim()) };
  }

  // Unbekannte Marke — erstes Wort als Marke, Rest als Modell.
  const teile = roh.split(' ');
  return { brand: teile[0], model: teile.slice(1).join(' ') };
}
