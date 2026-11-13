/**
 * Getriebe aus der Handelsbezeichnung lesen.
 *
 * ── Warum ─────────────────────────────────────────────────────────
 *
 * Das Getriebe ist bei mobile.de Pflicht, steht aber NICHT in der
 * Zulassungsbescheinigung Teil I. Es war damit eines von vier Feldern,
 * die der Händler bei jedem Fahrzeug von Hand setzen musste
 * (lib/felderHerkunft.ts).
 *
 * In Feld D.3, der Handelsbezeichnung, steht es aber sehr oft mit
 * drin: "Golf VII 2.0 TDI DSG", "A4 Avant 2.0 TDI S tronic",
 * "320d Steptronic", "E 220 d 9G-TRONIC". Das ist kein Ableiten, das
 * ist Ablesen — der Name des Getriebes steht da.
 *
 * ── Die drei Regeln, die das sicher machen ────────────────────────
 *
 * 1. **Nur Automatik wird erkannt, niemals Manuell.** Für
 *    Handschaltung gibt es kein Kürzel; ein Schaltwagen heißt einfach
 *    "2.0 TDI". Aus dem FEHLEN eines Kürzels auf Handschaltung zu
 *    schließen wäre genau das verbotene Ableiten — und bei einem Auto
 *    mit Wandlerautomatik ohne Namenszusatz wäre es falsch.
 *    Kein Treffer heißt: Feld bleibt leer, der Händler entscheidet.
 *
 * 2. **Allradkürzel dürfen nicht mitgerissen werden.** "quattro",
 *    "4MATIC", "xDrive", "4motion", "AWD" sind Antrieb, nicht
 *    Getriebe. Sie stehen oft direkt neben dem Getriebenamen und
 *    wären der naheliegendste Fehler.
 *
 * 3. **Wortgrenzen.** "DSG" darf nicht in einem längeren Wort
 *    anschlagen, und "Automatik" nicht in "Klimaautomatik" — sonst
 *    macht ein Klimafeature aus einem Schaltwagen einen Automatik.
 */

/**
 * Eindeutige Automatik-Bezeichnungen der Hersteller.
 *
 * Aufgenommen ist nur, was ausschliesslich Automatik bedeutet.
 * Halbautomatiken wie "Easytronic", "Dualogic" oder "ASG" fehlen mit
 * Absicht: Sie sind automatisierte Schaltgetriebe, und mobile.de kennt
 * dafuer nur "Automatik" oder "Manuell" — beide Antworten waeren eine
 * halbe Luege. Die bleiben Handarbeit.
 */
const AUTOMATIK = [
  'dsg', 's tronic', 's-tronic', 'stronic',
  'tiptronic', 'multitronic', 'steptronic',
  'pdk', 'dct', 'tct', 'edc', 'powershift',
  'g-tronic', 'g tronic', '7g-tronic', '9g-tronic', '5g-tronic',
  '7g-dct', 'speedshift', 'drivelogic',
  'cvt', 'xtronic', 'x-tronic', 'multidrive', 'q-tronic',
  'automatik', 'automatic', 'automaat',
  'wandlerautomatik', 'doppelkupplung', 'doppelkupplungsgetriebe',
  'dkg', '8hp', 'zf-8hp',
];

/**
 * Was NICHT als Getriebe gelten darf, obwohl es daneben steht oder
 * eine der Zeichenfolgen oben enthaelt.
 */
const NIEMALS = [
  'klimaautomatik', 'start-stopp-automatik', 'start-stop-automatik',
  'einparkhilfe automatik', 'abblendautomatik', 'lichtautomatik',
  'quattro', '4matic', 'xdrive', '4motion', 'awd', '4wd', '4x4',
  'allrad', 'sdrive',
];

/**
 * Liest das Getriebe aus einem freien Text (Handelsbezeichnung,
 * Modellname, Variante).
 *
 * @returns 'Automatik', oder null wenn nichts Eindeutiges dasteht.
 */
export function getriebeAusText(text: string): 'Automatik' | null {
  const roh = (text || '').toLowerCase();
  if (!roh.trim()) return null;

  /*
   * Erst die Ausnahmen entfernen, dann suchen. Sonst findet
   * "klimaautomatik" das Wort "automatik" — und aus einem Schaltwagen
   * mit Klimaautomatik wuerde ein Automatikfahrzeug.
   */
  let rest = roh;
  for (const aus of NIEMALS) rest = rest.split(aus).join(' ');

  for (const marke of AUTOMATIK) {
    /*
     * Wortgrenzen selbst gebaut statt \b: Die Kuerzel enthalten
     * Bindestriche und Ziffern ("9g-tronic", "8hp"), und \b verhaelt
     * sich dort nicht so, wie man es erwartet.
     */
    const i = rest.indexOf(marke);
    if (i === -1) continue;
    const davor = i === 0 ? ' ' : rest[i - 1];
    const danach = i + marke.length >= rest.length ? ' ' : rest[i + marke.length];
    const grenze = (c: string) => /[^a-z0-9]/.test(c);
    if (grenze(davor) && grenze(danach)) return 'Automatik';
  }
  return null;
}
