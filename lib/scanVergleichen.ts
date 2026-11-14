/**
 * Zwei Lesungen desselben Fahrzeugscheins vergleichen.
 *
 * ── Warum es das gibt ──────────────────────────────────────────────
 *
 * Gemessen am 14. November 2026: Derselbe Golf, dasselbe Foto, zwei
 * Läufe — einmal 77 kW, einmal 71 kW. Also 105 PS gegen 97 PS. Die
 * Leistung steht im Inserat, ist preisrelevant, und der Händler haftet
 * dafür.
 *
 * Der übliche Hebel dagegen wäre `temperature: 0`. Den gibt es bei
 * Opus 4.8 nicht mehr — Anthropic hat die Sampling-Parameter entfernt,
 * ein Aufruf damit wird abgelehnt. Die Schwankung lässt sich also nicht
 * wegstellen, nur sichtbar machen.
 *
 * Deshalb: zweimal lesen. Was beide Lesungen übereinstimmend sagen,
 * geht ins Formular. Was abweicht, bleibt leer und wird benannt.
 *
 * ── Die unbequeme Regel ────────────────────────────────────────────
 *
 * Ein Feld, das nur EINE der beiden Lesungen gefunden hat, gilt
 * ebenfalls als unsicher und bleibt leer. Das ist strenger als nötig
 * wirkt, aber es ist dieselbe Regel wie überall sonst im Projekt:
 * ablesen, nicht ableiten, im Zweifel weglassen. Wenn ein Lauf das Feld
 * nicht findet, ist es nicht eindeutig lesbar — und ein Händler, der
 * ein leeres Feld ausfüllt, weiß, was er tut. Einer, der eine Zahl
 * bestätigt, die nur einmal von zwei Malen erschien, weiß es nicht.
 *
 * ── Was es kostet ──────────────────────────────────────────────────
 *
 * Ungefähr das Doppelte eines Scans, rund 4 Cent zusätzlich je Inserat.
 * Bei 2,39 EUR Einkauf und 7,50 EUR Erlös ist das nicht die Frage. Die
 * Frage ist, was eine falsche Leistungsangabe kostet, wenn der Käufer
 * sie bemerkt.
 */

/**
 * Felder, bei denen eine Abweichung das Feld leert.
 *
 * `equipment` steht bewusst NICHT hier: Eine Ausstattungsliste weicht
 * fast immer in einer Kleinigkeit ab, und das ganze Feld deswegen zu
 * leeren wäre unbrauchbar. Dafür gilt die Schnittmenge — siehe unten.
 */
export const VERGLICHENE_FELDER: Record<string, string> = {
  brand:                    'Marke',
  model:                    'Modell',
  vin:                      'FIN',
  firstRegistration:        'Erstzulassung',
  powerKw:                  'Leistung (kW)',
  displacementCcm:          'Hubraum',
  fuelType:                 'Kraftstoff',
  color:                    'Farbe',
  seats:                    'Sitzplätze',
  doors:                    'Türen',
  leermasseKg:              'Leermasse',
  emissionClass:            'Schadstoffklasse',
  driveType:                'Antriebsart',
  aufbau:                   'Aufbau',
  anhaengelastGebremstKg:   'Anhängelast gebremst',
  anhaengelastUngebremstKg: 'Anhängelast ungebremst',
  /*
   * Auch die Werte aus den Bemerkungen werden verglichen. Sie gehen
   * nicht ins Inserat, aber sie entscheiden darueber, ob das Feld
   * daneben leer bleibt (lib/anhaengelast.ts). Ein Wert, der nur einer
   * der beiden Lesungen aufgefallen ist, darf diese Entscheidung nicht
   * treffen.
   */
  anhaengelastGebremstBemerkungKg:   'Anhängelast gebremst (Bemerkung)',
  anhaengelastUngebremstBemerkungKg: 'Anhängelast ungebremst (Bemerkung)',
};

const leer = (w: unknown): boolean =>
  w === null || w === undefined || String(w).trim() === '';

/**
 * Vergleichsform: Gross- und Kleinschreibung, Satzzeichen und doppelte
 * Abstaende duerfen keinen Unterschied machen. "VOLKSWAGEN" und
 * "Volkswagen" sind dieselbe Lesung, "77" und "71" nicht.
 */
const gleich = (a: unknown, b: unknown): boolean => {
  const za = Number(a), zb = Number(b);
  if (Number.isFinite(za) && Number.isFinite(zb)) return za === zb;
  const norm = (x: unknown) =>
    String(x ?? '').toLowerCase().replace(/[.,;:!?/_-]/g, ' ').replace(/\s+/g, ' ').trim();
  return norm(a) === norm(b);
};

export type Vergleich = {
  /** Die Felder, auf die sich beide Lesungen geeinigt haben. */
  ergebnis: Record<string, unknown>;
  /** Anzeigenamen der Felder, die abwichen und deshalb leer bleiben. */
  unsicher: string[];
};

/**
 * Fuehrt zwei Lesungen zusammen. Was nicht uebereinstimmt, faellt weg.
 */
export function scanVergleichen(
  a: Record<string, unknown>,
  b: Record<string, unknown> | null,
): Vergleich {
  /* Ohne zweite Lesung bleibt die erste, wie sie ist. */
  if (!b) return { ergebnis: { ...a }, unsicher: [] };

  const ergebnis: Record<string, unknown> = { ...a };
  const unsicher: string[] = [];

  for (const [feld, name] of Object.entries(VERGLICHENE_FELDER)) {
    const wa = a[feld], wb = b[feld];
    if (leer(wa) && leer(wb)) { delete ergebnis[feld]; continue; }
    if (leer(wa) || leer(wb) || !gleich(wa, wb)) {
      delete ergebnis[feld];
      unsicher.push(name);
      continue;
    }
    /* Einig: die Fassung der ersten Lesung behalten. */
    ergebnis[feld] = wa;
  }

  /*
   * Ausstattung: die Schnittmenge, nicht die Vereinigung.
   *
   * Ein Merkmal, das nur eine der beiden Lesungen im Feld 22 gesehen
   * hat, ist kein abgelesenes Merkmal. Die Vereinigung waere die
   * bequeme Wahl und genau die falsche — sie sammelt die Fehler beider
   * Laeufe ein statt sie gegeneinander zu pruefen.
   */
  const alsListe = (w: unknown): string[] =>
    Array.isArray(w) ? w.map((x) => String(x).trim()).filter(Boolean) : [];
  const la = alsListe(a.equipment), lb = alsListe(b.equipment);
  if (la.length || lb.length) {
    const schnitt = la.filter((m) => lb.some((n) => gleich(m, n)));
    ergebnis.equipment = schnitt;
    const verworfen = (la.length - schnitt.length) + (lb.length - schnitt.length);
    if (verworfen > 0) unsicher.push(`${verworfen} Ausstattungsmerkmale nur einmal gelesen`);
  }

  return { ergebnis, unsicher };
}
