/**
 * Ersetzt das Kennzeichen im Fahrzeugfoto durch ein Haendlerschild.
 *
 * ── Warum das sein muss ────────────────────────────────────────────
 *
 * Ein Kennzeichen ist ein personenbezogenes Datum. Wer es im Inserat
 * stehen laesst, veroeffentlicht es — und zwar der Haendler, weil er
 * das Inserat einstellt. Wenn unser Werkzeug es stehen laesst, liefern
 * wir ihm das Problem mit. Deshalb wird es ersetzt und nicht nur
 * unscharf gemacht: Unschaerfe laesst sich in Grenzen zurueckrechnen,
 * ein ueberdecktes Schild nicht.
 *
 * Gleichzeitig ist es eine Gelegenheit. Haendler schrauben ohnehin ihr
 * eigenes Schild an — auf dem Urus im Test stand "RÖHRLE mobility".
 * Genau das bauen wir nach: der Firmenname des Haendlers auf dem
 * Schild, in den Massen eines echten Kennzeichens.
 *
 * ── Wie das Schild gefunden wird ───────────────────────────────────
 *
 * Nicht mit einem Modell, sondern ueber das blaue Feld am linken Rand.
 * Das EU-Feld hat eine Farbe, die sonst kaum an einem Auto vorkommt:
 * stark gesaettigtes Blau im Bereich 210 bis 245 Grad. Aus seiner Hoehe
 * folgt alles Weitere, denn ein deutsches Kennzeichen ist genormt —
 * 520 mal 110 Millimeter, das blaue Feld davon 40 Millimeter breit.
 *
 * Das ist bewusst ein zurueckhaltendes Verfahren: Es findet nicht jedes
 * Schild (verdreckt, stark schraeg, Wechselkennzeichen), aber es findet
 * fast nie etwas Falsches. Bei einem Fehlalarm wuerde mitten im Lack
 * ein Schild kleben, und das faellt mehr auf als ein Kennzeichen.
 */

import sharp from 'sharp';

/** Kennzeichen nach DIN 74069: 520 x 110 mm, blaues Feld 40 mm breit. */
const SCHILD_VERHAELTNIS = 520 / 110;
const BLAUFELD_ANTEIL = 40 / 520;

export interface Fund {
  links: number;
  oben: number;
  breite: number;
  hoehe: number;
  /** Wie sicher, 0 bis 1. Unter 0,35 wird nicht ersetzt. */
  guete: number;
}

/**
 * Sucht das blaue EU-Feld und leitet daraus das Schild ab.
 *
 * Gibt null zurueck, wenn nichts Plausibles gefunden wurde — dann
 * bleibt das Bild unveraendert. Lieber kein Ersatz als ein Schild an
 * der falschen Stelle.
 */
export async function findeKennzeichen(bild: Buffer): Promise<Fund | null> {
  const { data, info } = await sharp(bild)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: b, height: h, channels: k } = info;

  /*
   * Blaue Pixel markieren.
   *
   * Ueber HSV statt ueber RGB-Schwellen: Ein Kennzeichenblau im
   * Schatten hat voellig andere RGB-Werte als eines in der Sonne, aber
   * fast denselben Farbton. Gefordert sind ausserdem hohe Saettigung
   * und mittlere Helligkeit — damit fallen dunkle Fensterspalten und
   * heller Himmel heraus.
   */
  const blau = new Uint8Array(b * h);
  let anzahl = 0;
  for (let p = 0; p < b * h; p++) {
    const r = data[p * k] / 255, g = data[p * k + 1] / 255, bl = data[p * k + 2] / 255;
    const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
    if (max < 0.10 || max > 0.85) continue;
    const s = max === 0 ? 0 : (max - min) / max;
    if (s < 0.45) continue;
    if (max !== bl) continue;
    let ton = 60 * (4 + (r - g) / (max - min));
    if (ton < 0) ton += 360;
    if (ton < 205 || ton > 250) continue;
    blau[p] = 1;
    anzahl++;
  }
  if (anzahl < 20) return null;

  /* Zusammenhaengende blaue Flecken, Flutfuellung mit eigenem Stapel. */
  const marke = new Int32Array(b * h);
  const stapel = new Int32Array(b * h);
  let beste: Fund | null = null;
  let nummer = 0;

  for (let start = 0; start < b * h; start++) {
    if (marke[start] !== 0 || blau[start] === 0) continue;
    nummer++;
    let oben = 0, groesse = 0;
    let xMin = b, xMax = -1, yMin = h, yMax = -1;
    stapel[oben++] = start;
    marke[start] = nummer;

    while (oben > 0) {
      const p = stapel[--oben];
      groesse++;
      const x = p % b, y = (p - x) / b;
      if (x < xMin) xMin = x; if (x > xMax) xMax = x;
      if (y < yMin) yMin = y; if (y > yMax) yMax = y;

      if (x > 0)     { const q = p - 1; if (!marke[q] && blau[q]) { marke[q] = nummer; stapel[oben++] = q; } }
      if (x < b - 1) { const q = p + 1; if (!marke[q] && blau[q]) { marke[q] = nummer; stapel[oben++] = q; } }
      if (y > 0)     { const q = p - b; if (!marke[q] && blau[q]) { marke[q] = nummer; stapel[oben++] = q; } }
      if (y < h - 1) { const q = p + b; if (!marke[q] && blau[q]) { marke[q] = nummer; stapel[oben++] = q; } }
    }

    const fleckB = xMax - xMin + 1, fleckH = yMax - yMin + 1;
    if (fleckH < 6 || fleckB < 2) continue;

    /*
     * Pruefungen, die ein echtes EU-Feld bestehen muss. Jede einzelne
     * wirft mehr Fehlalarme weg, als sie echte Schilder kostet.
     */
    const hochkant = fleckH / fleckB;          // Das Feld ist deutlich hoeher als breit
    if (hochkant < 1.6 || hochkant > 6.0) continue;
    const fuellung = groesse / (fleckB * fleckH);
    if (fuellung < 0.55) continue;             // Ein Rechteck, kein Gekruemel
    if (yMin < h * 0.25) continue;             // Schilder haengen nicht im oberen Viertel
    const schildH = fleckH;
    if (schildH < h * 0.012 || schildH > h * 0.20) continue;

    const schildB = Math.round(schildH * SCHILD_VERHAELTNIS);
    if (xMin + schildB > b) continue;          // Es muss noch ins Bild passen

    const guete = Math.min(1, fuellung) * Math.min(1, groesse / 60);
    if (!beste || guete > beste.guete) {
      beste = { links: xMin, oben: yMin, breite: schildB, hoehe: schildH, guete };
    }
  }

  return beste && beste.guete >= 0.35 ? beste : null;
}

/**
 * Legt ein Haendlerschild ueber den gefundenen Bereich.
 *
 * `name` ist der Firmenname. Ohne Namen kommt ein neutrales dunkles
 * Schild — das ist immer noch besser als ein lesbares Kennzeichen.
 */
export async function ersetzeKennzeichen(
  bild: Buffer,
  name?: string | null,
): Promise<{ bild: Buffer; ersetzt: boolean }> {
  const fund = await findeKennzeichen(bild);
  if (!fund) return { bild, ersetzt: false };

  const { breite: w, hoehe: hh } = fund;
  const text = (name || '').trim().slice(0, 22);

  /*
   * Etwas groesser als der gefundene Bereich, damit auch die Schrauben
   * und der Rand des alten Schildes verschwinden. Ein Kennzeichen, von
   * dem noch ein Millimeter Rand stehen bleibt, ist weiterhin als
   * Kennzeichen zu erkennen.
   */
  const rand = Math.max(2, Math.round(hh * 0.10));
  const sw = w + rand * 2, sh = hh + rand * 2;
  const sx = Math.max(0, fund.links - rand), sy = Math.max(0, fund.oben - rand);

  const sicher = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /*
   * Schriftgroesse aus HOEHE UND BREITE.
   *
   * Nur aus der Hoehe gerechnet lief "AUTOHAUS MUSTER" links und rechts
   * aus dem Schild heraus — im Bild stand "UTOHAUS MUSTE". Ein Schild
   * ist knapp fuenfmal so breit wie hoch; ab etwa neun Zeichen ist die
   * Breite die engere Grenze.
   *
   * 0,60 ist die mittlere Zeichenbreite von Arial Bold im Verhaeltnis
   * zur Schriftgroesse. `textLength` sichert das Ergebnis zusaetzlich
   * ab, falls die tatsaechliche Schrift breiter laeuft als geschaetzt.
   */
  const nutzbar = sw * 0.86;
  const schrift = Math.max(
    6,
    Math.round(Math.min(sh * 0.46, sicher.length ? nutzbar / (sicher.length * 0.60) : sh * 0.46)),
  );
  const laenge = Math.min(nutzbar, sicher.length * schrift * 0.62);

  const svg = Buffer.from(
    `<svg width="${sw}" height="${sh}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="#26282c"/>
           <stop offset="100%" stop-color="#141619"/>
         </linearGradient>
       </defs>
       <rect width="${sw}" height="${sh}" rx="${Math.round(sh * 0.12)}" fill="url(#g)"/>
       <rect x="1" y="1" width="${sw - 2}" height="${sh - 2}"
             rx="${Math.round(sh * 0.11)}" fill="none" stroke="#4c5057" stroke-width="1"/>
       ${sicher ? `<text x="${sw / 2}" y="${sh / 2}" fill="#e8eaee"
             font-family="Arial, Helvetica, sans-serif" font-size="${schrift}"
             font-weight="600" textLength="${laenge.toFixed(1)}"
             lengthAdjust="spacingAndGlyphs"
             text-anchor="middle" dominant-baseline="central">${sicher}</text>` : ''}
     </svg>`,
  );

  const fertig = await sharp(bild)
    .composite([{ input: await sharp(svg).png().toBuffer(), left: sx, top: sy }])
    .toBuffer();

  return { bild: fertig, ersetzt: true };
}
