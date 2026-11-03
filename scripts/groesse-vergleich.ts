/**
 * 1K gegen 2K am selben Foto, am selben Raum, mit derselben Anweisung.
 *
 *   npx tsx scripts/groesse-vergleich.ts
 *
 * Erzeugt ein Bild in 1K und eines in 2K, rechnet beide auf die
 * Anzeigebreite des Studios (2000 Punkte) und legt denselben Ausschnitt
 * nebeneinander. Damit ist zu sehen, was die Zahl im Programm wirklich
 * bedeutet — und nicht nur behauptet wird.
 *
 * Kostet zwei Bilder.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const KEY = process.env.GEMINI_API_KEY;
const MODELL = process.env.GEMINI_BILD_MODELL || 'gemini-3.1-flash-image';
const WURZEL = path.resolve(__dirname, '..');
const AUS = path.join(WURZEL, 'tools/proben/groessenvergleich');
/** So breit zeigt die Oberflaeche das fertige Studiobild. */
const ANZEIGE = 2000;

const TEXT =
  'Put the car from image 1 into the showroom from image 2 and return one photorealistic image. '
  + 'Cut the car out cleanly with nothing of its old surroundings left. '
  + 'Stand it on the floor so every wheel touches the ground, with a dark contact shadow under the tyres. '
  + 'Let it cover about half the image width and keep the room exactly as it is. '
  + 'Keep the car exactly as photographed: same colour, same wheels, same badges, every scratch and dirty patch stays.';

async function einBild(groesse: string, auto: string, halle: string): Promise<Buffer | null> {
  const start = Date.now();
  const antwort = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY as string },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: TEXT },
          { inline_data: { mime_type: 'image/jpeg', data: auto } },
          { inline_data: { mime_type: 'image/jpeg', data: halle } },
        ] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:2', imageSize: groesse } },
      }),
    },
  ).catch((e) => e as Error);

  if (antwort instanceof Error) { console.log(`${groesse}: Netzfehler ${antwort.message}`); return null; }
  if (!antwort.ok) { console.log(`${groesse}: HTTP ${antwort.status}`); return null; }

  const daten = await antwort.json();
  const teile = daten?.candidates?.[0]?.content?.parts ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teil = teile.find((p: any) => p.inline_data?.data || p.inlineData?.data);
  const b64 = teil?.inline_data?.data ?? teil?.inlineData?.data;
  if (!b64) { console.log(`${groesse}: kein Bild in der Antwort`); return null; }

  const bild = Buffer.from(b64, 'base64');
  const masse = await sharp(bild).metadata();
  console.log(`${groesse}: ${masse.width} x ${masse.height}, ${((Date.now() - start) / 1000).toFixed(1)} s`);
  return bild;
}

/**
 * Schaerfe als Zahl: mittlere Helligkeitsaenderung zwischen Nachbarn.
 *
 * Ein hochgerechnetes Bild hat weiche Uebergaenge und damit einen
 * niedrigen Wert; ein echt gerechnetes hat harte Kanten an Spaltmassen,
 * Felgen und Schrift und damit einen hoeheren.
 */
async function schaerfe(bild: Buffer): Promise<number> {
  const b = 1000, h = Math.round(b / 1.5);
  const d = await sharp(bild).resize(b, h, { fit: 'fill' }).greyscale().raw().toBuffer();
  let summe = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < b - 1; x++) {
      const i = y * b + x;
      summe += Math.abs(d[i] - d[i + 1]) + Math.abs(d[i] - d[i + b]);
      n += 2;
    }
  }
  return summe / n;
}

async function main() {
  if (!KEY) { console.error('Kein GEMINI_API_KEY gesetzt.'); process.exit(1); }
  fs.mkdirSync(AUS, { recursive: true });

  const auto = (await sharp(path.join(WURZEL, 'tools/proben/golf.jpg'))
    .resize(2048, 2048, { fit: 'inside' }).jpeg({ quality: 94 }).toBuffer()).toString('base64');
  const halle = (await sharp(path.join(WURZEL, 'public/backgrounds/raum/showroom_hell.jpg'))
    .resize(1536, 1536, { fit: 'inside' }).jpeg({ quality: 85 }).toBuffer()).toString('base64');

  for (const groesse of ['1K', '2K']) {
    const bild = await einBild(groesse, auto, halle);
    if (!bild) continue;

    /* So, wie es im Inserat landet: auf die Anzeigebreite gebracht. */
    const gezeigt = await sharp(bild).resize(ANZEIGE, Math.round(ANZEIGE / 1.5), { fit: 'fill' })
      .jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
    fs.writeFileSync(path.join(AUS, `${groesse}.jpg`), gezeigt);
    console.log(`  Schaerfe nach dem Anzeigen: ${(await schaerfe(gezeigt)).toFixed(2)}`);

    /* Derselbe Ausschnitt aus der Bildmitte, 1:1, damit man es sieht. */
    const m = await sharp(gezeigt).metadata();
    const w = 700, hh = 460;
    fs.writeFileSync(
      path.join(AUS, `${groesse}_ausschnitt.jpg`),
      await sharp(gezeigt).extract({
        left: Math.round(((m.width ?? ANZEIGE) - w) / 2),
        top: Math.round(((m.height ?? 0) - hh) / 2),
        width: w, height: hh,
      }).jpeg({ quality: 95 }).toBuffer(),
    );
  }

  console.log(`\nFertig: ${AUS}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
