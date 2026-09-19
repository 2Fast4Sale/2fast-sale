/**
 * Bilder fuer ein Beispiel-Inserat — ohne Schatten, fuer die Nachbearbeitung
 * mit Gemini im Browser.
 *
 *   npx tsx scripts/demo-bilder.ts <foto.jpg> <freigestellt.png> <firma> <ordner> <raum> [...]
 *
 * Solange kein bezahlter Zugang zur Bild-API besteht, macht Gemini den
 * Schatten von Hand im Browser: Diese Bilder zieht man dort hinein. Damit
 * die KI nur den Schatten malt, wird das Auto hier absichtlich OHNE
 * Schatten und ohne Spiegelung in den Raum gesetzt.
 *
 * Das Kennzeichen wird am Originalfoto ersetzt, nicht am Ergebnis — dort
 * ist es groesser und sicherer zu finden.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { komponieren, STANDARD } from '../lib/studio/kompositor';
import { raum, raumBild } from '../lib/studio/raeume';
import { ersetzeKennzeichen } from '../lib/studio/kennzeichen';

const [fotoPfad, freiPfad, firma, ordner, ...raeume] = process.argv.slice(2);
if (!fotoPfad || !freiPfad || !firma || !ordner || raeume.length === 0) {
  console.error('Aufruf: demo-bilder.ts <foto.jpg> <freigestellt.png> <firma> <ordner> <raum> [...]');
  process.exit(1);
}

async function main() {
  fs.mkdirSync(ordner, { recursive: true });

  /*
   * Kennzeichen am freigestellten Bild: Das Original wird hier nicht mehr
   * gebraucht, und der Ersatz muss auf dem Bild sitzen, das auch in den
   * Raum kommt.
   */
  let auto: Buffer = fs.readFileSync(freiPfad);
  /*
   * "keine" ueberspringt den Kennzeichenersatz. Am Golf-Testfoto steht das
   * Schild stark schraeg; die Erkennung setzt das Haendlerschild dort
   * versetzt. Lieber gar kein Ersatz als einer an der falschen Stelle —
   * das Kennzeichen wird dann im Gemini-Schritt unlesbar gemacht.
   */
  if (firma === 'keine') {
    console.log('Kennzeichenersatz uebersprungen.');
  } else try {
    const kz = await ersetzeKennzeichen(auto, firma);
    auto = kz.bild;
    console.log(kz.ersetzt ? 'Kennzeichen ersetzt.' : 'Kein Kennzeichen gefunden — bleibt stehen.');
  } catch (err) {
    console.error('Kennzeichenersatz fehlgeschlagen:', err);
  }
  fs.writeFileSync(path.join(ordner, 'auto_freigestellt.png'), auto);

  for (const name of raeume) {
    const halle = raum(name);
    if (!halle) { console.error('Raum nicht gefunden:', name); continue; }

    const werte = {
      ...STANDARD,
      horizont: halle.horizont,
      kameraHoehe: halle.kameraHoehe,
      brennweite: halle.brennweite,
    };

    const ohne = await komponieren(auto, raumBild(halle), {
      ...werte, schattenStaerke: 0, kontaktStaerke: 0, spiegelungStaerke: 0,
    });
    const mit = await komponieren(auto, raumBild(halle), werte);

    const zielOhne = path.join(ordner, `${name}_ohne_schatten.jpg`);
    fs.writeFileSync(zielOhne, ohne.bild);
    fs.writeFileSync(path.join(ordner, `${name}_eigener_schatten.jpg`), mit.bild);
    console.log(`${name.padEnd(16)} → ${zielOhne}`);
  }

  // Groesse der Dateien: Gemini im Browser nimmt Bilder bis einige MB an.
  for (const f of fs.readdirSync(ordner)) {
    const kb = Math.round(fs.statSync(path.join(ordner, f)).size / 1024);
    const m = await sharp(path.join(ordner, f)).metadata();
    console.log(`  ${f.padEnd(34)} ${String(kb).padStart(5)} kB  ${m.width}x${m.height}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
