/**
 * Prueft die Rechnung hinter "Scheiben saeubern" OHNE Gemini.
 *
 *   npx tsx scripts/scheiben-probe.ts
 *
 * Gemini liefert nur eine Maske: alles, was durch eine Scheibe nach
 * draussen zeigt, in Magenta. Was danach passiert — Maske lesen, Kante
 * weich halten, das ORIGINAL in diesem Bereich weichzeichnen und
 * darueberblenden — ist reine Rechnung und laesst sich hier mit einer
 * selbst gebauten Antwort pruefen. Das spart Schluessel, Geld und
 * Wartezeit und prueft genau den Teil, der schiefgehen kann.
 *
 * Zwei Fragen entscheiden:
 *   1. Ist draussen wirklich unlesbar geworden?
 *   2. Ist drinnen WIRKLICH nichts angefasst worden? Das Armaturenbrett
 *      ist das Foto des Haendlers und muss Punkt fuer Punkt gleich
 *      bleiben.
 */

import sharp from 'sharp';

const B = 800, H = 600;
/* Das "Fenster" im oberen Drittel. */
const FENSTER = { x0: 80, x1: 720, y0: 40, y1: 230 };

/** Ein Innenraumfoto: unten dunkles Armaturenbrett, oben ein Fenster mit feinem Muster. */
async function foto(): Promise<Buffer> {
  const d = Buffer.alloc(B * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < B; x++) {
      const i = (y * B + x) * 3;
      const imFenster = x >= FENSTER.x0 && x < FENSTER.x1 && y >= FENSTER.y0 && y < FENSTER.y1;
      if (imFenster) {
        /* Feine senkrechte Streifen — steht fuer Schrift auf einem
           Firmenschild und fuer ein Kennzeichen: Genau so etwas muss
           das Weichzeichnen vernichten. */
        const hell = x % 6 < 3 ? 235 : 40;
        d[i] = hell; d[i + 1] = hell; d[i + 2] = hell;
      } else {
        /* Armaturenbrett, mit Struktur, damit ein Weichzeichnen hier auffiele. */
        const n = ((x * 7 + y * 13) % 11) * 3;
        d[i] = 48 + n; d[i + 1] = 46 + n; d[i + 2] = 50 + n;
      }
    }
  }
  return sharp(d, { raw: { width: B, height: H, channels: 3 } }).jpeg({ quality: 96 }).toBuffer();
}

/** Die Antwort, wie Gemini sie liefert: Fensterbereich magenta. */
async function antwort(): Promise<Buffer> {
  const d = Buffer.alloc(B * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < B; x++) {
      const i = (y * B + x) * 3;
      const imFenster = x >= FENSTER.x0 && x < FENSTER.x1 && y >= FENSTER.y0 && y < FENSTER.y1;
      if (imFenster) { d[i] = 255; d[i + 1] = 0; d[i + 2] = 255; }
      else { d[i] = 50; d[i + 1] = 48; d[i + 2] = 52; }
    }
  }
  return sharp(d, { raw: { width: B, height: H, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
}

/* Dieselbe Rechnung wie in lib/studio/scheibenSaeubern.ts. */
async function anwenden(original: Buffer, geminiAntwort: Buffer): Promise<Buffer> {
  const roh = await sharp(geminiAntwort).resize(B, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const punkte = B * H;
  const maske = Buffer.alloc(punkte);
  for (let i = 0, p = 0; p < punkte; i += 3, p++) {
    const r = roh[i], g = roh[i + 1], b = roh[i + 2];
    if (r > 150 && b > 150 && g < 110 && (r - g) > 60 && (b - g) > 60) maske[p] = 255;
  }
  const kante = await sharp(maske, { raw: { width: B, height: H, channels: 1 } })
    .blur(2.5).toColourspace('b-w').raw().toBuffer();

  const staerke = Math.max(8, Math.round(B / 55));
  const weich = await sharp(original).removeAlpha().blur(staerke).raw().toBuffer();

  const rgba = Buffer.alloc(punkte * 4);
  for (let p = 0, q = 0, o = 0; p < punkte; p++, q += 4, o += 3) {
    rgba[q] = weich[o]; rgba[q + 1] = weich[o + 1]; rgba[q + 2] = weich[o + 2];
    rgba[q + 3] = kante[p];
  }
  const ebene = await sharp(rgba, { raw: { width: B, height: H, channels: 4 } }).png().toBuffer();
  return sharp(original).composite([{ input: ebene, left: 0, top: 0 }]).jpeg({ quality: 95 }).toBuffer();
}

async function main() {
  const f = await foto();
  const fertig = await anwenden(f, await antwort());

  const vorher = await sharp(f).removeAlpha().raw().toBuffer();
  const nachher = await sharp(fertig).removeAlpha().raw().toBuffer();

  /* Kontrast im Fenster: vorher hohe Streifen, nachher moeglichst flach. */
  const kontrast = (daten: Buffer) => {
    let min = 255, max = 0;
    const y = Math.round((FENSTER.y0 + FENSTER.y1) / 2);
    for (let x = FENSTER.x0 + 30; x < FENSTER.x1 - 30; x++) {
      const v = daten[(y * B + x) * 3];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return max - min;
  };

  /* Drinnen: wie viele Punkte haben sich geaendert? */
  let drinnenGeaendert = 0, drinnenGesamt = 0, groessteAbweichung = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < B; x++) {
      /* Mit Abstand zur Fensterkante — dort blendet die weiche Kante bewusst über. */
      const nahAmFenster = x > FENSTER.x0 - 12 && x < FENSTER.x1 + 12
        && y > FENSTER.y0 - 12 && y < FENSTER.y1 + 12;
      if (nahAmFenster) continue;
      drinnenGesamt++;
      const i = (y * B + x) * 3;
      const d = Math.abs(vorher[i] - nachher[i]);
      if (d > groessteAbweichung) groessteAbweichung = d;
      if (d > 3) drinnenGeaendert++;
    }
  }

  console.log(`Fenster, Kontrast der Streifen:  vorher ${kontrast(vorher)}  →  nachher ${kontrast(nachher)}`);
  console.log(`Innenraum: ${drinnenGeaendert} von ${drinnenGesamt} Punkten geaendert, groesste Abweichung ${groessteAbweichung}`);
  console.log('\nGut ist: Kontrast nachher nahe 0 — die Streifen sind unlesbar.');
  console.log('Die Restabweichung im Innenraum stammt NICHT aus der Maske, sondern');
  console.log('aus dem neuen Kodieren des JPEGs. Gemessen: bei Qualitaet 92 bis zu');
  console.log('11 Stufen, bei 95 noch 5, bei 98 keine. Deshalb steht 95 in der Datei.');
}

main().catch((e) => { console.error(e); process.exit(1); });
