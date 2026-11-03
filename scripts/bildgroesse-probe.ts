/**
 * Welche Groesse liefert Gemini wirklich zurueck?
 *
 *   npx tsx scripts/bildgroesse-probe.ts
 *
 * Hintergrund: Das Studiobild wird im Browser mit bis zu 2000 Punkten
 * Breite angezeigt, Gemini liefert ohne weitere Angabe aber nur 1K,
 * also etwa 1024 Punkte. Der Rest ist hochgerechnet — und genau das
 * sieht man: weiche Lackflaechen, verwaschene Spaltmasse, unscharfe
 * Embleme. Ein hochgerechnetes Bild wirkt "fake", auch wenn das Modell
 * alles richtig gemacht hat.
 *
 * Diese Probe stellt deshalb drei Fragen, und zwar an die echte
 * Schnittstelle, weil die Unterlagen zwei verschiedene Schreibweisen
 * nennen:
 *   1. Nimmt die API imageSize innerhalb von generationConfig an?
 *   2. Oder nur das neuere response_format auf oberster Ebene?
 *   3. Wie breit ist das Bild, das wirklich ankommt?
 *
 * Kostet je angenommener Variante ein Bild. Ein abgelehnter Aufruf
 * (HTTP 400) kostet nichts, weil Google dann nichts berechnet.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const KEY = process.env.GEMINI_API_KEY;
const MODELL = process.env.GEMINI_BILD_MODELL || 'gemini-3.1-flash-image';
const WURZEL = path.resolve(__dirname, '..');

const TEXT =
  'Put the car from image 1 into the showroom from image 2. Return one photorealistic image. '
  + 'Keep the car exactly as photographed, stand it on the floor with a dark contact shadow under the tyres.';

type Variante = { name: string; koerper: (a: string, b: string) => unknown };

const VARIANTEN: Variante[] = [
  {
    name: 'generationConfig.imageConfig.imageSize = 2K',
    koerper: (a, b) => ({
      contents: [{ parts: [
        { text: TEXT },
        { inline_data: { mime_type: 'image/jpeg', data: a } },
        { inline_data: { mime_type: 'image/jpeg', data: b } },
      ] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:2', imageSize: '2K' } },
    }),
  },
  {
    name: 'response_format.image_size = 2K',
    koerper: (a, b) => ({
      contents: [{ parts: [
        { text: TEXT },
        { inline_data: { mime_type: 'image/jpeg', data: a } },
        { inline_data: { mime_type: 'image/jpeg', data: b } },
      ] }],
      response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '3:2', image_size: '2K' },
    }),
  },
];

async function main() {
  if (!KEY) { console.error('Kein GEMINI_API_KEY gesetzt.'); process.exit(1); }

  const auto = (await sharp(path.join(WURZEL, 'tools/proben/golf.jpg'))
    .resize(1536, 1536, { fit: 'inside' }).jpeg({ quality: 90 }).toBuffer()).toString('base64');
  const halle = (await sharp(path.join(WURZEL, 'public/backgrounds/raum/showroom_hell.jpg'))
    .resize(1536, 1536, { fit: 'inside' }).jpeg({ quality: 85 }).toBuffer()).toString('base64');

  /* Mit einem Argument laeuft nur die Variante, deren Name es enthaelt —
     jedes erzeugte Bild kostet, also nicht mehr als noetig. */
  const nur = process.argv[2];
  for (const v of VARIANTEN.filter((x) => !nur || x.name.includes(nur))) {
    process.stdout.write(`\n${v.name}\n`);
    const start = Date.now();
    const antwort = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify(v.koerper(auto, halle)),
      },
    );

    if (!antwort.ok) {
      console.log(`  abgelehnt, HTTP ${antwort.status}: ${(await antwort.text()).replace(/\s+/g, ' ').slice(0, 260)}`);
      continue;
    }

    const daten = await antwort.json();
    const teile = daten?.candidates?.[0]?.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teil = teile.find((p: any) => p.inline_data?.data || p.inlineData?.data);
    const b64 = teil?.inline_data?.data ?? teil?.inlineData?.data;
    if (!b64) { console.log('  angenommen, aber kein Bild in der Antwort'); continue; }

    const bild = Buffer.from(b64, 'base64');
    const masse = await sharp(bild).metadata();
    const ziel = path.join(WURZEL, 'tools/proben', `groesse_${v.name.includes('response_format') ? 'rf' : 'gc'}.jpg`);
    fs.writeFileSync(ziel, bild);
    console.log(`  angenommen: ${masse.width} x ${masse.height} Punkte, ${(bild.length / 1024).toFixed(0)} kB,`
      + ` ${((Date.now() - start) / 1000).toFixed(1)} s`);
    console.log(`  gespeichert: ${ziel}`);
  }

  console.log('\nGut ist eine Breite um 2048. Kommen 1024 zurueck, wurde die');
  console.log('Angabe stillschweigend ignoriert — dann hilft nur die andere Schreibweise.');
}

main().catch((e) => { console.error(e); process.exit(1); });
