/**
 * Prueft und berichtigt die Fahrzeug-Identifizierungsnummer.
 *
 * -- Warum es das gibt ----------------------------------------------
 *
 * Die FIN stand ungeprueft so im Inserat, wie das Modell sie gelesen
 * hat. Bei einer 17-stelligen Zeichenkette aus Grossbuchstaben und
 * Ziffern ist genau ein Fehler wahrscheinlich, und er ist es immer: die
 * Verwechslung von O und 0, von I und 1.
 *
 * Dagegen gibt es eine Regel, die nicht geschaetzt ist. Die ISO 3779
 * schliesst die Buchstaben I, O und Q aus der FIN aus, weil sie den
 * Ziffern zu aehnlich sehen. Steht an einer Stelle ein O, dann ist es
 * eine Null -- das ist kein Ableiten, sondern Ablesen mit Kenntnis des
 * Zeichenvorrats. Dasselbe gilt fuer I und 1.
 *
 * Alles andere bleibt streng: Was nicht genau 17 Zeichen hat, wird
 * nicht berichtigt, sondern verworfen. Eine FIN mit 16 Zeichen ist
 * keine FIN, und welches Zeichen fehlt, weiss niemand.
 *
 * Warum das wichtiger ist als es aussieht: Ueber die FIN bestellt der
 * Kaeufer das Ersatzteil und prueft der Gutachter die Historie. Eine
 * FIN mit einem Dreher ist nicht ungenau, sie gehoert zu einem anderen
 * Auto oder zu keinem.
 */

/** Zeichen, die es in einer FIN nicht gibt, und wofuer sie stehen. */
const VERWECHSELT: Record<string, string> = { I: '1', O: '0', Q: '0' };

export type FinErgebnis = {
  /** Die berichtigte FIN, oder null, wenn sie nicht brauchbar ist. */
  fin: string | null;
  /** Was geaendert wurde — fuer das Protokoll, nicht fuer den Haendler. */
  berichtigt: string[];
  /** Warum sie verworfen wurde, wenn fin null ist. */
  grund: string | null;
};

export function finPruefen(roh: unknown): FinErgebnis {
  const text = String(roh ?? '').toUpperCase().replace(/[\s.-]/g, '');
  if (!text) return { fin: null, berichtigt: [], grund: 'leer' };

  if (!/^[A-Z0-9]+$/.test(text)) {
    return { fin: null, berichtigt: [], grund: 'enthaelt Zeichen, die keine FIN hat' };
  }
  if (text.length !== 17) {
    return { fin: null, berichtigt: [], grund: `${text.length} Zeichen statt 17` };
  }

  const berichtigt: string[] = [];
  const fin = [...text].map((z, i) => {
    const ersatz = VERWECHSELT[z];
    if (!ersatz) return z;
    berichtigt.push(`Stelle ${i + 1}: ${z} ist in einer FIN nicht zulaessig, gelesen als ${ersatz}`);
    return ersatz;
  }).join('');

  return { fin, berichtigt, grund: null };
}
