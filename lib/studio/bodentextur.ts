/**
 * Legt eine Materialkachel perspektivisch auf den Boden.
 *
 * Der Vorgaenger dieser Datei hat Boeden gezeichnet — Fugen, Splitter,
 * Maserung, alles aus Linien und Ellipsen. Das Ergebnis war erkennbar
 * konstruiert. Echte Materialstruktur ist fotografiert, nicht
 * gerechnet; also wird sie eingekauft (CC0, siehe HERKUNFT.md) und
 * hier nur noch richtig hingelegt.
 *
 * ── Warum in Baendern ──────────────────────────────────────────────
 *
 * Eine Kachel flach ueber den Boden zu legen sieht sofort falsch aus:
 * Die Fugen blieben bis zum Horizont gleich gross. Richtig waere eine
 * echte perspektivische Verzerrung, die sharp nicht kann — es
 * beherrscht affine Abbildungen, aber keine projektiven.
 *
 * Der Weg hier: Der Boden wird in waagerechte Baender zerlegt. Fuer
 * jedes Band wird ein Ausschnitt aus einer grossen, vorgekachelten
 * Flaeche entnommen und auf die Bandbreite gezogen. Weiter hinten ist
 * der entnommene Ausschnitt groesser — dadurch erscheint das Material
 * kleiner und dichter, so wie es soll.
 *
 * Die Entnahmestelle wandert dabei fortlaufend nach unten. Ohne das
 * begaenne jedes Band wieder am selben Punkt der Kachel, und der Boden
 * bekaeme waagerechte Streifen.
 */

import sharp from 'sharp';

/** Wie viele Baender. Mehr ist weicher und langsamer. */
const BAENDER = 16;

/**
 * Wie stark der Ausschnitt in dieser Tiefe vergroessert wird.
 *
 * `t` = 0 am Horizont, 1 an der Bildunterkante. Vorn wird ein kleiner
 * Ausschnitt gross gezogen (Material erscheint gross), hinten ein
 * grosser Ausschnitt klein (Material erscheint fein).
 */
function massstab(t: number): number {
  /*
   * Der Bereich war zuerst 1/(0.16 + t*1.5), also 6,2-fach am Horizont
   * bis 0,6-fach vorn. Das ist perspektivisch richtig und im Ergebnis
   * unbrauchbar: Ein sechsfach hoeherer Ausschnitt, auf ein paar Pixel
   * zusammengezogen, ergibt nur noch Durchschnittsfarbe. Im Test war
   * von Terrazzo und Holz keine Struktur mehr uebrig, nur ein
   * Farbverlauf.
   *
   * Jetzt 2,2-fach bis 0,8-fach. Die Perspektive ist schwaecher, das
   * Material dafuer sichtbar — und ein sichtbarer Boden mit etwas zu
   * flacher Flucht ist besser als eine korrekte Flucht ohne Boden.
   */
  return 1 / (0.45 + t * 0.8);
}

export interface TexturOptionen {
  /** Wie oft die Kachel vorn ueber die Bildbreite passt. */
  wiederholungen: number;
  /** Deckkraft, 0 bis 1. */
  staerke: number;
  /** Wie stark das Material zum Horizont hin verblasst, 0 bis 1. */
  dunst: number;
}

/**
 * Erzeugt die Bodenflaeche als RGBA-Bild in Originalgroesse des
 * Hintergrunds. Oberhalb des Horizonts ist alles durchsichtig.
 */
export async function bodenTextur(
  kachel: Buffer,
  breite: number,
  hoehe: number,
  hY: number,
  o: TexturOptionen,
): Promise<Buffer | null> {
  const tiefe = hoehe - hY;
  if (tiefe < 8 || o.staerke <= 0) return null;

  /*
   * Vorgekachelte Flaeche. Sie muss deutlich groesser sein als das
   * Zielbild, weil die hinteren Baender Ausschnitte bis zum
   * Fuenffachen entnehmen.
   */
  const kachelGroesse = Math.max(24, Math.round(breite / Math.max(1, o.wiederholungen)));
  const kleineKachel = await sharp(kachel)
    .resize(kachelGroesse, kachelGroesse, { fit: 'cover' })
    .toBuffer();

  const flaecheB = breite * 6;
  const flaecheH = Math.max(tiefe * 6, kachelGroesse * 6);
  const flaeche = await sharp({
    create: { width: flaecheB, height: Math.round(flaecheH), channels: 3, background: '#808080' },
  })
    .composite([{ input: kleineKachel, tile: true, blend: 'over' }])
    .png()
    .toBuffer();

  const teile: sharp.OverlayOptions[] = [];
  let quelleY = 0;

  for (let i = 0; i < BAENDER; i++) {
    const t0 = i / BAENDER;
    const t1 = (i + 1) / BAENDER;
    const y0 = Math.round(hY + tiefe * Math.pow(t0, 1.9));
    const y1 = Math.round(hY + tiefe * Math.pow(t1, 1.9));
    const bandH = Math.max(1, y1 - y0);

    const m = massstab((t0 + t1) / 2);
    const quelleB = Math.min(flaecheB, Math.round(breite * m));
    const quelleH = Math.min(
      Math.round(flaecheH) - 1,
      Math.max(1, Math.round(bandH * m)),
    );

    // Am Ende der Flaeche wieder von oben beginnen — die Kachelung ist
    // nahtlos, der Sprung faellt nicht auf.
    if (quelleY + quelleH >= flaecheH) quelleY = 0;

    const streifen = await sharp(flaeche)
      .extract({
        left: Math.max(0, Math.round((flaecheB - quelleB) / 2)),
        top: Math.round(quelleY),
        width: quelleB,
        height: quelleH,
      })
      .resize(breite, bandH, { fit: 'fill' })
      .png()
      .toBuffer();

    /*
     * Dunst: Je weiter hinten, desto blasser. Ohne das klebt das
     * Material bis zum Horizont in voller Staerke und der Boden wirkt
     * flach — Luft zwischen Auge und Flaeche gehoert zur Tiefe.
     */
    const naehe = (t0 + t1) / 2;
    const deckung = o.staerke * (1 - o.dunst * (1 - naehe));

    const mitAlpha = await sharp(streifen)
      .ensureAlpha(Math.max(0, Math.min(1, deckung)))
      .png()
      .toBuffer();

    teile.push({ input: mitAlpha, left: 0, top: y0 });
    quelleY += quelleH;
  }

  return sharp({
    create: { width: breite, height: hoehe, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(teile)
    .png()
    .toBuffer();
}
