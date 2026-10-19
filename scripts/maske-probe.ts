/**
 * Prueft die Maskenrechnung des Gemini-Freistellers OHNE Gemini.
 *
 *   npx tsx scripts/maske-probe.ts
 *
 * Der Freisteller schickt ein Foto weg und bekommt dasselbe Bild mit
 * magentafarbenem Hintergrund zurueck. Was danach passiert — Magenta
 * erkennen, Kante einziehen, Alphakanal auf das ORIGINAL legen — ist
 * reine Rechnung und laesst sich hier mit einer selbst gebauten
 * Antwort pruefen. Das spart den Schluessel, das Geld und die Wartezeit,
 * und es prueft genau den Teil, der schiefgehen kann.
 *
 * Gemessen wird das, worauf es ankommt:
 *   1. Bleibt die Farbe des Fahrzeugs unveraendert? (Sie muss aus dem
 *      Original kommen, nicht aus der Antwort.)
 *   2. Verschwindet der Hintergrund vollstaendig?
 *   3. Ueberlebt ein verrutschter Rand, wie ihn Gemini erzeugt, ohne
 *      dass ein Saum des alten Hintergrunds stehen bleibt?
 */

import sharp from 'sharp';

const B = 600, H = 400;

/** Ein "Foto": blauer Himmel, gruene Hecke, grauer Wagen in der Mitte. */
async function foto(): Promise<Buffer> {
  const d = Buffer.alloc(B * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < B; x++) {
      const i = (y * B + x) * 3;
      const imWagen = x >= 150 && x < 450 && y >= 150 && y < 320;
      if (imWagen) { d[i] = 150; d[i + 1] = 148; d[i + 2] = 140; }      // Nardograu
      else if (y > 300) { d[i] = 60; d[i + 1] = 120; d[i + 2] = 50; }   // Hecke
      else { d[i] = 120; d[i + 1] = 170; d[i + 2] = 230; }              // Himmel
    }
  }
  return sharp(d, { raw: { width: B, height: H, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
}

/**
 * Die Antwort, wie Gemini sie liefert: Hintergrund magenta, Fahrzeug
 * leicht verschoben (`versatz`) und in der Farbe leicht daneben — denn
 * das Modell zeichnet beim Antworten neu.
 */
async function antwort(versatz: number): Promise<Buffer> {
  const d = Buffer.alloc(B * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < B; x++) {
      const i = (y * B + x) * 3;
      const imWagen = x >= 150 + versatz && x < 450 + versatz
        && y >= 150 + versatz && y < 320 + versatz;
      if (imWagen) { d[i] = 171; d[i + 1] = 169; d[i + 2] = 160; }  // nachgemalt, zu hell
      else { d[i] = 255; d[i + 1] = 0; d[i + 2] = 255; }
    }
  }
  return sharp(d, { raw: { width: B, height: H, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
}

/* Dieselbe Rechnung wie in lib/studio/geminiFreisteller.ts. */
async function maskeAnwenden(original: Buffer, geminiAntwort: Buffer): Promise<Buffer> {
  const roh = await sharp(geminiAntwort).resize(B, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const punkte = B * H;
  const maske = Buffer.alloc(punkte);
  for (let i = 0, p = 0; p < punkte; i += 3, p++) {
    const r = roh[i], g = roh[i + 1], b = roh[i + 2];
    const istMagenta = r > 150 && b > 150 && g < 110 && (r - g) > 60 && (b - g) > 60;
    if (!istMagenta) maske[p] = 255;
  }
  const kante = await sharp(maske, { raw: { width: B, height: H, channels: 1 } })
    .blur(2.2).threshold(240).blur(0.5).toColourspace('b-w').raw().toBuffer();

  const quelle = await sharp(original).removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(punkte * 4);
  for (let p = 0, q = 0, o = 0; p < punkte; p++, q += 4, o += 3) {
    rgba[q] = quelle[o]; rgba[q + 1] = quelle[o + 1]; rgba[q + 2] = quelle[o + 2];
    rgba[q + 3] = kante[p];
  }
  return sharp(rgba, { raw: { width: B, height: H, channels: 4 } }).png().toBuffer();
}

async function main() {
  const f = await foto();

  for (const versatz of [0, 2, 4]) {
    const ergebnis = await maskeAnwenden(f, await antwort(versatz));
    const d = await sharp(ergebnis).raw().toBuffer();

    let sichtbar = 0, hintergrundSichtbar = 0, farbfehler = 0, fahrzeugSichtbar = 0;
    for (let p = 0, q = 0; p < B * H; p++, q += 4) {
      const x = p % B, y = Math.floor(p / B);
      const a = d[q + 3];
      if (a < 24) continue;
      sichtbar++;
      const imWagen = x >= 150 && x < 450 && y >= 150 && y < 320;
      if (!imWagen) hintergrundSichtbar++;
      else {
        fahrzeugSichtbar++;
        /* Die Farbe MUSS die des Originals sein (150/148/140), nicht die
           nachgemalte (171/169/160). JPEG erlaubt ein paar Stufen. */
        if (Math.abs(d[q] - 150) > 6) farbfehler++;
      }
    }

    const flaeche = 300 * 170;
    console.log(
      `Versatz ${versatz} Punkte: ` +
      `${(fahrzeugSichtbar / flaeche * 100).toFixed(1)} % des Fahrzeugs sichtbar, ` +
      `${hintergrundSichtbar} Punkte Hintergrund (Saum), ` +
      `${farbfehler} Punkte mit falscher Farbe`,
    );
  }

  console.log('\nGut ist: Fahrzeug nahe 100 %, Saum 0, falsche Farbe 0.');
}

main().catch((e) => { console.error(e); process.exit(1); });
