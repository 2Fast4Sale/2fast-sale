/**
 * Legt die Schattenmaske allein auf Weiss, damit man sie sehen kann.
 *
 *   npx tsx scripts/schatten-pruefen.ts <auto.png> <ziel.jpg>
 *
 * Im fertigen Bild ist ein zu schwacher Schatten nicht von einem
 * fehlenden zu unterscheiden. Hier ist er es.
 */

import fs from 'node:fs';
import sharp from 'sharp';
import { komponieren, STANDARD } from '../lib/studio/kompositor';

const [auto, ziel] = process.argv.slice(2);

async function main() {
  const fahrzeug = fs.readFileSync(auto);

  const weiss = await sharp({
    create: { width: 1920, height: 1280, channels: 3, background: '#ffffff' },
  }).jpeg().toBuffer();

  // Ohne Spiegelung und ohne Angleichung — es geht nur um den Schatten.
  const r = await komponieren(fahrzeug, weiss, {
    ...STANDARD, spiegelungStaerke: 0, angleichung: 0,
  });
  fs.writeFileSync(ziel, r.bild);

  // Wie dunkel wird es unter dem Fahrzeug ueberhaupt?
  const { data, info } = await sharp(r.bild).greyscale().raw().toBuffer({ resolveWithObject: true });
  const bodenY = Math.round(info.height * (1 - STANDARD.bodenabstand));
  for (const dy of [-20, -8, 0, 8, 20, 40]) {
    const y = bodenY + dy;
    let min = 255;
    for (let x = 0; x < info.width; x++) min = Math.min(min, data[y * info.width + x]);
    console.log(`Zeile ${String(dy).padStart(4)} unter der Standlinie: dunkelster Wert ${min}`);
  }
  console.log('Messwerte:', r.messwerte);
}

main().catch((e) => { console.error(e); process.exit(1); });
