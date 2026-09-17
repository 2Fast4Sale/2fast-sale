/**
 * Probiert den Gemini-Schatten in mehreren Raeumen aus.
 *
 *   GEMINI_API_KEY=... npx tsx scripts/gemini-schatten-probe.ts <auto.png> <ordner> raum1 raum2 ...
 *
 * Legt je Raum drei Bilder ab: ohne Schatten (das geht an Gemini), mit
 * eigenem Schatten und mit Gemini-Schatten — zum direkten Vergleich.
 */

import fs from 'node:fs';
import path from 'node:path';
import { komponieren, STANDARD } from '../lib/studio/kompositor';
import { raum, raumBild } from '../lib/studio/raeume';
import { schattenMitGemini } from '../lib/studio/geminiSchatten';

const [autoPfad, ordner, ...raeume] = process.argv.slice(2);
if (!autoPfad || !ordner || raeume.length === 0 || !process.env.GEMINI_API_KEY) {
  console.error('Aufruf: GEMINI_API_KEY=... gemini-schatten-probe.ts <auto.png> <ordner> <raum> [...]');
  process.exit(1);
}

async function main() {
  fs.mkdirSync(ordner, { recursive: true });
  const auto = fs.readFileSync(autoPfad);

  for (const name of raeume) {
    const halle = raum(name);
    if (!halle) { console.error('Raum nicht gefunden:', name); continue; }
    const werte = { ...STANDARD, horizont: halle.horizont, kameraHoehe: halle.kameraHoehe, brennweite: halle.brennweite };

    const eigen = await komponieren(auto, raumBild(halle), werte);
    const ohne = await komponieren(auto, raumBild(halle), {
      ...werte, schattenStaerke: 0, kontaktStaerke: 0, spiegelungStaerke: 0,
    });
    fs.writeFileSync(path.join(ordner, `${name}_eigen.jpg`), eigen.bild);
    fs.writeFileSync(path.join(ordner, `${name}_ohne.jpg`), ohne.bild);

    const start = Date.now();
    const ki = await schattenMitGemini(ohne.bild, ohne.fahrzeugEbene, ohne.breite, ohne.hoehe);
    const sek = ((Date.now() - start) / 1000).toFixed(1);
    if (ki) {
      fs.writeFileSync(path.join(ordner, `${name}_gemini.jpg`), ki);
      console.log(`${name.padEnd(18)} Gemini ok in ${sek} s`);
    } else {
      console.log(`${name.padEnd(18)} Gemini FEHLGESCHLAGEN nach ${sek} s`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
