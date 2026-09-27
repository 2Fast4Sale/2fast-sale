/*
 * Text als Vektorpfad, ohne Schriftarten auf dem System.
 *
 * ── Warum nicht einfach font-family im SVG ────────────────────────
 *
 * Genau das stand vorher drin: font-family="Arial, Helvetica,
 * sans-serif". Auf einem Windows-Rechner findet die Bildbibliothek
 * diese Schrift, auf einem Server nicht — dort ist keine einzige
 * Schriftart installiert. Im Inserat standen deshalb kleine Kaestchen
 * statt des Haendlernamens, und zwar auf jedem einzelnen Foto.
 *
 * Der Weg hier umgeht das Problem vollstaendig: Die Buchstaben werden
 * aus der mitgelieferten Schrift in Linien und Kurven uebersetzt. Ein
 * Pfad braucht keine Schriftart mehr, er ist nur noch Geometrie.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fontkit: any = require('fontkit');
import { INTER_BOLD_WOFF } from './schriftDatei';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let geladen: any = null;

function schrift() {
  if (!geladen) {
    const roh = Buffer.from(INTER_BOLD_WOFF, 'base64');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geladen = (fontkit as any).create(roh);
  }
  return geladen;
}

export interface TextPfad {
  /** Pfaddaten fuer <path d="…">, Ursprung links auf der Grundlinie. */
  d: string;
  /** Breite des Textes in Bildpunkten. */
  breite: number;
  /** Hoehe der Grossbuchstaben, fuer die senkrechte Ausrichtung. */
  versalhoehe: number;
}

/**
 * Wandelt Text in einen Pfad um.
 *
 * `groesse` ist die Schriftgroesse in Bildpunkten, wie bei font-size.
 */
export function textAlsPfad(text: string, groesse: number): TextPfad {
  const f = schrift();
  const massstab = groesse / f.unitsPerEm;
  const lauf = f.layout(text);

  let x = 0;
  const teile: string[] = [];
  for (let i = 0; i < lauf.glyphs.length; i++) {
    const glyph = lauf.glyphs[i];
    const vor = lauf.positions[i];
    /*
     * y wird gespiegelt: Schriften zaehlen nach oben, Bilder nach
     * unten. Ohne das Minus stuende der Name auf dem Kopf.
     */
    const d = glyph.path
      .scale(massstab, -massstab)
      .translate(x + (vor.xOffset ?? 0) * massstab, -(vor.yOffset ?? 0) * massstab)
      .toSVG();
    if (d) teile.push(d);
    x += (vor.xAdvance ?? 0) * massstab;
  }

  return {
    d: teile.join(' '),
    breite: x,
    versalhoehe: (f.capHeight ?? f.ascent) * massstab,
  };
}
