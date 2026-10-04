/**
 * Herstellerfarbe auf eine Grundfarbe bringen.
 *
 * ── Warum ───────────────────────────────────────────────────────────
 *
 * Das Farbfeld in Schritt 1 ist frei, mit dem Platzhalter
 * "Tiefschwarz" — und so tippt es der Händler auch, denn so steht es im
 * Fahrzeugschein und im Verkaufsgespräch. Beide Portale wollen aber eine
 * ihrer rund zwölf Grundfarben. "Tiefschwarz", "Reflexsilber",
 * "Uranograu", "Tornadorot" kannte keine der beiden Übersetzungen: Das
 * Fahrzeug ging ohne Farbe raus, und nach Farbe wird auf beiden Börsen
 * gefiltert.
 *
 * ── Wie ─────────────────────────────────────────────────────────────
 *
 * Fast jeder Herstellername enthält das Grundfarbwort: TiefSCHWARZ,
 * ReflexSILBER, UranoGRAU, TornadoROT, AtlantikBLAU. Es genügt also, im
 * Namen nach diesen Wörtern zu suchen — und zwar nach dem längsten
 * zuerst, sonst gewinnt "rot" in "Karottrot-Metallic" gegen nichts, aber
 * "grau" in "Blaugrau" gegen "blau".
 *
 * Was keine Grundfarbe enthält ("Mokka", "Champagner"), bleibt leer.
 * Raten wäre hier eine erfundene Angabe im Inserat — und die Farbe ist
 * das Erste, was ein Käufer auf dem Foto nachprüft.
 */

export type Grundfarbe =
  | 'Schwarz' | 'Weiß' | 'Grau' | 'Silber' | 'Blau' | 'Rot' | 'Grün'
  | 'Gelb' | 'Braun' | 'Beige' | 'Orange' | 'Gold' | 'Violett';

/**
 * Suchwörter je Grundfarbe.
 *
 * Mehrere Schreibweisen, weil der Händler tippt, was er gewohnt ist:
 * "weiss" und "weiß", "gruen" und "grün". Umlaute werden zusätzlich
 * normalisiert, aber ue/ae/oe-Schreibungen fallen da nicht hinein.
 */
const WOERTER: Array<[Grundfarbe, string[]]> = [
  ['Schwarz', ['schwarz', 'black']],
  ['Silber',  ['silber', 'silver', 'alu']],
  ['Grau',    ['grau', 'grey', 'gray', 'anthrazit', 'graphit']],
  ['Weiß',    ['weiss', 'weiß', 'white', 'perlmutt']],
  ['Blau',    ['blau', 'blue', 'marine', 'azur', 'indigo', 'petrol']],
  ['Rot',     ['rot', 'red', 'bordeaux', 'burgund', 'magenta', 'weinrot']],
  ['Grün',    ['gruen', 'grün', 'green', 'oliv']],
  ['Gelb',    ['gelb', 'yellow']],
  ['Braun',   ['braun', 'brown', 'mokka', 'schoko', 'bronze', 'kupfer']],
  ['Beige',   ['beige', 'sand', 'creme', 'cream', 'elfenbein', 'champagner']],
  ['Orange',  ['orange', 'kupferorange']],
  ['Gold',    ['gold']],
  ['Violett', ['violett', 'lila', 'purple', 'flieder']],
];

const vergleich = (w: string): string =>
  (w || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^a-z]/g, '');

/**
 * Die Grundfarbe zu einem freien Farbnamen, oder `null`.
 *
 * `null` heisst ausdrücklich "nicht erkannt" und nicht "keine Farbe" —
 * der Aufrufer soll dann das Feld weglassen, nicht raten.
 */
export function grundfarbe(roh: string): Grundfarbe | null {
  const k = vergleich(roh);
  if (!k) return null;

  /*
   * Längstes Suchwort zuerst. "blaugrau" enthält beide Wörter; gewinnen
   * soll das längere und damit speziellere — bei gleicher Länge die
   * Reihenfolge oben, in der Schwarz und Silber vor Grau stehen.
   */
  const treffer = WOERTER
    .flatMap(([farbe, woerter]) => woerter.map(w => ({ farbe, wort: vergleich(w) })))
    .filter(({ wort }) => wort && k.includes(wort))
    .sort((a, b) => b.wort.length - a.wort.length);

  return treffer[0]?.farbe ?? null;
}

/**
 * Ist der eingegebene Name mehr als die blosse Grundfarbe?
 *
 * "Tiefschwarz" ja, "Schwarz" nein. Danach entscheidet sich, ob der
 * Name zusätzlich als Herstellerfarbe ins Inserat gehört — mobile.de hat
 * dafür ein eigenes Feld, und dort steht dann genau das, was auch im
 * Fahrzeugschein steht.
 */
export function istHerstellerName(roh: string): boolean {
  const g = grundfarbe(roh);
  if (!g) return false;
  return vergleich(roh) !== vergleich(g);
}
