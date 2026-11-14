/**
 * Anhängelast: Feld O.1/O.2 gegen die Bemerkungen in Feld 22.
 *
 * ── Warum das eine eigene Entscheidung braucht ─────────────────────
 *
 * Gefunden an einem echten Schein (Golf VII, 01.11.2016): In Feld O.1
 * steht `01500`. In den Bemerkungen steht
 *
 *     B.ANHÄNGEBETRIEB*O.1:1800
 *
 * Derselbe Schein nennt zwei verschiedene Anhängelasten. Die Bemerkung
 * hebt den Wert an, aber unter Bedingungen — "bei 8 % Steigung", "bei
 * werkseitig montierter AHK", teils mit einer eigenen
 * Geschwindigkeitsgrenze.
 *
 * Der Scan las die Bemerkung, ein Mensch las das Feld. Beide hatten
 * recht, und genau das ist das Problem: Welcher Wert im Inserat
 * stehen darf, hängt davon ab, ob die Bedingung am konkreten Fahrzeug
 * erfüllt ist. Das steht in keinem Feld und kann die Software nicht
 * wissen.
 *
 * Also: Stimmen beide überein, wird der Wert übernommen. Steht nur
 * einer da, wird dieser übernommen. Widersprechen sie sich, bleibt das
 * Feld LEER und der Händler entscheidet — er sieht das Fahrzeug, er
 * weiß, ob eine Werks-AHK dran ist, und er haftet für die Angabe.
 *
 * Entschieden am 14. November 2026 von Fabian, nicht von mir: Er ist
 * KFZ-Mechatroniker, ich habe die Frage gestellt.
 *
 * Das Modell liest beide Stellen ab und rechnet nichts zusammen —
 * ablesen, nicht ableiten. Die Entscheidung trifft dieser Code, damit
 * sie nachlesbar und mit einer Probe belegt ist.
 */

export type Anhaengelast = {
  /** Der Wert fürs Inserat, oder null. */
  wert: number | null;
  /** Gesetzt, wenn die zwei Stellen sich widersprechen. */
  widerspruch: string | null;
};

const zahl = (w: unknown): number | null => {
  if (w === null || w === undefined || String(w).trim() === '') return null;
  const n = Number(w);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * @param feld      Wert aus O.1 bzw. O.2, wie abgedruckt.
 * @param bemerkung Wert aus den Bemerkungen in Feld 22, falls dort einer steht.
 * @param name      Anzeigename für die Meldung an den Händler.
 */
export function anhaengelastEntscheiden(
  feld: unknown,
  bemerkung: unknown,
  name: string,
): Anhaengelast {
  const a = zahl(feld);
  const b = zahl(bemerkung);

  if (a === null && b === null) return { wert: null, widerspruch: null };
  if (b === null) return { wert: a, widerspruch: null };
  if (a === null) {
    /*
     * Nur eine Bemerkung, kein Feldwert: Das ist kein Widerspruch,
     * sondern die einzige Angabe. Sie wird uebernommen.
     */
    return { wert: b, widerspruch: null };
  }
  if (a === b) return { wert: a, widerspruch: null };

  return {
    wert: null,
    widerspruch: `${name}: Feld sagt ${a} kg, Bemerkung sagt ${b} kg`,
  };
}

/**
 * Sucht O.1 und O.2 im Bemerkungstext.
 *
 * ── Warum als Suche im Text und nicht als Frage ans Modell ─────────
 *
 * Zuerst stand im Prompt: "Schreibe den Wert aus den Bemerkungen NICHT
 * in anhaengelastGebremstKg, sondern in ein eigenes Feld." Das hielt
 * nicht. An demselben Schein kam in drei Läufen zweimal 1800 im
 * falschen Feld heraus und einmal richtig getrennt.
 *
 * Eine Anweisung, die in zwei von drei Fällen befolgt wird, ist keine
 * Sicherung. Also macht das Modell jetzt nur noch, was es gut kann —
 * den Text abschreiben — und die Entscheidung trifft eine Suche, die
 * jedes Mal dasselbe tut.
 *
 * Das Muster ist absichtlich eng. Im Bemerkungsfeld desselben Scheins
 * stehen weitere Zahlen, die NICHT gemeint sind:
 *
 *     TECHN.ZUL.GES-MASSE D.ZUGKOMBINATION:3370
 *     BIS 8% STEIG.:3670
 *
 * Nur "O.1:" bzw. "O.2:" mit folgender Zahl zählt.
 */
export function anhaengelastAusBemerkung(text: unknown): {
  gebremst: number | null;
  ungebremst: number | null;
} {
  const t = String(text ?? '');
  const such = (ziffer: '1' | '2'): number | null => {
    /*
     * String.raw, weil das Muster Backslashes enthaelt. In einer
     * normalen Zeichenkette verschluckt JavaScript sie still: aus \s
     * wird s, und das Muster sucht dann nach dem Buchstaben s statt
     * nach einem Leerzeichen. Genau das ist beim ersten Versuch
     * passiert -- gefunden von scripts/fin-probe.ts... nein, von
     * scripts/anhaengelast-probe.ts, und zwar bevor es jemand merkte.
     */
    const muster = String.raw`O\s*[.,]?\s*` + ziffer + String.raw`\s*[:=]\s*0*(\d{2,5})`;
    const treffer = t.match(new RegExp(muster, 'i'));
    if (!treffer) return null;
    const n = Number(treffer[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return { gebremst: such('1'), ungebremst: such('2') };
}
