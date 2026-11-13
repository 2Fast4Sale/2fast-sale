/**
 * Welche Stellen im Fahrzeug fotografiert werden — und was dort
 * tatsaechlich ABLESBAR ist.
 *
 * Diese Liste ist der Kern der Sicherung, nicht die Anweisung an das
 * Modell. Ein Merkmal darf nur dort gefunden werden, wo es an einer
 * Beschriftung, einem Tastensymbol oder einem Bildschirminhalt zu
 * lesen ist. Wer kein Klimabedienteil fotografiert, bekommt keine
 * Klimaautomatik — unabhaengig davon, was das Modell antwortet.
 *
 * Deshalb liegt die Liste hier und nicht in der Route: Die Oberflaeche
 * zeigt dieselben Stellen und Hinweise an, die die Route zulaesst.
 * Zwei Fassungen wuerden auseinanderlaufen, und dann stuende in der
 * Oberflaeche eine Stelle, deren Merkmale serverseitig verworfen
 * werden.
 *
 * Warum der Katalog hier groesser ist als in detect-equipment: Dort
 * werden acht Bilder aus dem Inseratsstapel angeschaut, also
 * Aussenansichten und weite Innenraumbilder. Klimaautomatik,
 * Einparkhilfe oder Tempomat sind darauf nicht zu sehen, sondern nur
 * zu vermuten — zu Recht verboten. Auf einer Nahaufnahme der richtigen
 * Stelle sind sie lesbar.
 */

export type Stelle = {
  titel: string;
  hinweis: string;
  merkmale: string[];
};

export const STELLEN: Record<string, Stelle> = {
  mittelkonsole: {
    titel: 'Tastenleiste / Mittelkonsole',
    hinweis: 'Die Schalterreihe unter oder neben dem Bildschirm, nah und scharf.',
    merkmale: [
      'Sitzheizung vorn',
      'Sitzbelüftung',
      'Lenkradheizung',
      'Einparkhilfe',
      'Rückfahrkamera',
      'Start-Stopp-Automatik',
      'ESP abschaltbar',
      'Fahrprofilauswahl',
      'Head-up Display',
      'Standheizung',
      'Anhängerkupplung elektrisch ausklappbar',
    ],
  },
  klimabedienteil: {
    titel: 'Klimabedienteil',
    hinweis: 'Die Regler und Anzeigen der Heizung. Die Beschriftung muss lesbar sein.',
    merkmale: [
      'Klimaanlage',
      'Klimaautomatik',
      '2-Zonen-Klimaautomatik',
      '3-Zonen-Klimaautomatik',
      'Sitzheizung vorn',
      'Sitzbelüftung',
    ],
  },
  lenkrad: {
    titel: 'Lenkrad',
    hinweis: 'Von vorne, sodass die Tasten und der Bereich dahinter zu sehen sind.',
    merkmale: [
      'Multifunktionslenkrad',
      'Lederlenkrad',
      'Schaltwippen am Lenkrad',
      'Tempomat',
      'Abstandsregeltempomat',
      'Lenkradheizung',
    ],
  },
  bildschirm: {
    titel: 'Bildschirm, eingeschaltet',
    hinweis: 'Zündung an, am besten das Hauptmenü. Ein schwarzer Bildschirm sagt nichts.',
    merkmale: [
      'Navigationssystem',
      'Rückfahrkamera',
      '360-Grad-Kamera',
      'Apple CarPlay',
      'Android Auto',
      'DAB-Radio',
      'Bluetooth-Freisprecheinrichtung',
    ],
  },
  fahrertuer: {
    titel: 'Schalter in der Fahrertür',
    hinweis: 'Fensterheber, Spiegelschalter und der Bereich mit den Memory-Tasten.',
    merkmale: [
      'Memory-Sitze',
      'Elektrische Fensterheber',
      'Elektrisch anklappbare Außenspiegel',
      'Elektrische Sitzeinstellung',
    ],
  },
  kombiinstrument: {
    titel: 'Kombiinstrument',
    hinweis: 'Die Anzeigen hinter dem Lenkrad, Zündung an.',
    merkmale: [
      'Digitales Kombiinstrument',
      'Head-up Display',
    ],
  },
  datentraeger: {
    titel: 'Fahrzeugdatenträger',
    hinweis: 'Der Aufkleber mit den Werkscodes — meist im Serviceheft oder in der Reserveradmulde.',
    /*
     * Leer mit Absicht. Von hier werden nur die Codes abgeschrieben,
     * niemals uebersetzt: "4A3" als Sitzheizung auszuschreiben waere
     * geraten, und die Zuordnungstabelle hat niemand hier. Die Codes
     * bekommt der Haendler zum Nachschlagen — ins Inserat kommt davon
     * nichts.
     */
    merkmale: [],
  },
};

/** Reihenfolge in der Oberflaeche: das Ergiebigste zuerst. */
export const STELLEN_REIHE = [
  'mittelkonsole',
  'klimabedienteil',
  'bildschirm',
  'lenkrad',
  'fahrertuer',
  'kombiinstrument',
  'datentraeger',
] as const;

/* ────────────────────────────────────────────────────────────────────
 * Die Nachkontrolle.
 *
 * Die Anweisung an das Modell verbietet Raten. Eine Anweisung ist aber
 * keine Garantie, und diese Pruefung kostet nichts. Sie steht hier und
 * nicht in der Route, damit eine Probe sie ohne Modellaufruf und ohne
 * Geld durchspielen kann — scripts/nahaufnahme-probe.ts.
 * ──────────────────────────────────────────────────────────────────── */

export type Beleg = { merkmal: string; beleg: string; stelle: string };

/*
 * Woerter, die keinen Beleg ergeben, sondern eine Vermutung beschreiben.
 * "Ist bei diesem Modell üblich" ist genau das, was nicht ins Inserat
 * darf — es klingt wie eine Begruendung und ist eine Ableitung.
 */
const FLOSKELN = /üblich|wahrscheinlich|vermutlich|dürfte|scheint|typisch|anzunehmen|erkennbar vorhanden|standard bei|serienmäßig bei|gehört zur/i;

/** Ein Beleg muss etwas Sichtbares nennen, nicht nur das Merkmal wiederholen. */
const MINDESTLAENGE = 12;

/**
 * Behaelt nur, was alle vier Bedingungen erfuellt:
 *   1. Die Stelle wurde wirklich fotografiert.
 *   2. Das Merkmal steht im Katalog GENAU DIESER Stelle.
 *   3. Es gibt einen Beleg, und er ist keine Floskel.
 *   4. Kein Merkmal zweimal.
 */
export function belegePruefen(roh: unknown, fotografiert: string[]): Beleg[] {
  const erlaubt = new Map<string, Set<string>>();
  for (const stelle of fotografiert) {
    if (STELLEN[stelle]) erlaubt.set(stelle, new Set(STELLEN[stelle].merkmale));
  }
  const heraus: Beleg[] = [];
  for (const e of (Array.isArray(roh) ? roh : [])) {
    const merkmal = typeof (e as any)?.merkmal === 'string' ? (e as any).merkmal.trim() : '';
    const beleg   = typeof (e as any)?.beleg   === 'string' ? (e as any).beleg.trim()   : '';
    const stelle  = typeof (e as any)?.stelle  === 'string' ? (e as any).stelle.trim()  : '';
    if (!erlaubt.get(stelle)?.has(merkmal)) continue;
    if (beleg.length < MINDESTLAENGE || FLOSKELN.test(beleg)) continue;
    if (heraus.some(t => t.merkmal === merkmal)) continue;
    heraus.push({ merkmal, beleg, stelle });
  }
  return heraus;
}

/**
 * Werkscodes: nur abschreiben. Ein ganzer Satz ist kein Code, und
 * uebersetzt wird nichts — siehe Kommentar bei `datentraeger`.
 */
export function codesPruefen(roh: unknown): string[] {
  return (Array.isArray(roh) ? roh : [])
    .filter((c: unknown): c is string => typeof c === 'string')
    .map(c => c.trim().toUpperCase())
    .filter(c => /^[A-Z0-9][A-Z0-9\- ]{1,11}$/.test(c))
    .filter((c, i, a) => a.indexOf(c) === i)
    .slice(0, 120);
}

/**
 * Welche Fotos gehen in die Anfrage, und welche fallen weg?
 *
 * Steht hier und nicht in der Route, weil daran die eigentliche
 * Zusicherung haengt: Erlaubt sind nur Merkmale von Stellen, deren Foto
 * TATSAECHLICH mitgeschickt wurde. Baut man den Bildblock erst beim
 * Zusammenstellen der Anfrage, faellt ein unlesbares Format (iPhone
 * liefert HEIC) still heraus — die Stelle bliebe aber erlaubt, und
 * damit waere fuer ein Bild etwas zugelassen, das das Modell nie
 * gesehen hat. Genau diese stille Luecke war der PDF-Fehler.
 *
 * `lesbar` entscheidet, ob das Format durchgeht. Je Stelle zaehlt das
 * erste Foto; mehr als `hoechstens` werden nicht geschickt, weil jedes
 * Bild bezahlt wird.
 */
export function fotosAuswaehlen<T>(
  bilder: { stelle: string; bild: string }[] | unknown,
  lesbar: (bild: string) => T | null,
  hoechstens = 8,
): { gueltig: { stelle: string; block: T }[]; uebersprungen: string[] } {
  const gueltig: { stelle: string; block: T }[] = [];
  const uebersprungen: string[] = [];
  for (const b of (Array.isArray(bilder) ? bilder : [])) {
    if (!b || typeof b.bild !== 'string' || !STELLEN[b.stelle]) continue;
    if (gueltig.some(g => g.stelle === b.stelle)) continue;
    if (gueltig.length >= hoechstens) break;
    const block = lesbar(b.bild);
    if (block === null) { uebersprungen.push(b.stelle); continue; }
    gueltig.push({ stelle: b.stelle, block });
  }
  return { gueltig, uebersprungen };
}
