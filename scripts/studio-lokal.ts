/**
 * Ein Foto zum fertigen Studiobild — komplett auf diesem Rechner.
 *
 *   npx tsx scripts/studio-lokal.ts <foto.jpg> [raum] [Firmenname]
 *
 * Beispiel:
 *   npx tsx scripts/studio-lokal.ts C:\Users\admin\Desktop\golf.jpg galerie_dunkel "Autohaus Muster"
 *
 * Warum es das gibt: Die zehn kostenlosen PhotoRoom-Bilder sind
 * verbraucht, und ein Bezahltarif ist vor Oktober nicht moeglich. Ohne
 * Freistellung steht Schritt 2 still — und damit auch jeder Test, ob
 * Raum und Schatten gut genug sind.
 *
 * Hier uebernimmt BiRefNet das Freistellen (MIT-Lizenz, laeuft lokal,
 * kostet nichts). Danach dieselbe Kette wie im Betrieb: Kennzeichen
 * ersetzen, freistellen, in den Raum setzen, Schatten rechnen. Das
 * Ergebnis landet neben dem Foto als <name>_studio.jpg.
 *
 * Langsam: rund anderthalb Minuten je Bild auf zwei Kernen. Fuer Tests
 * reicht das.
 */

import fs from 'node:fs';
import path from 'node:path';
import { freistellen } from './freistellen-eigen';
import { komponieren, STANDARD } from '../lib/studio/kompositor';
import { raum, raumBild, raeume } from '../lib/studio/raeume';
import { ersetzeKennzeichen } from '../lib/studio/kennzeichen';

async function main() {
  const [foto, raumName, firma] = process.argv.slice(2);
  if (!foto || !fs.existsSync(foto)) {
    console.error('Aufruf: studio-lokal.ts <foto.jpg> [raum] [Firmenname]');
    console.error('Raeume:', raeume().map((r) => r.name).join(', '));
    process.exit(1);
  }

  const halle = raum(raumName);
  if (!halle) throw new Error('Keine Raeume gefunden');
  console.log(`Raum: ${halle.titel}`);

  // 1. Kennzeichen am Originalfoto ersetzen — genau wie im Betrieb.
  const kz = await ersetzeKennzeichen(fs.readFileSync(foto), firma ?? null);
  console.log(kz.ersetzt ? 'Kennzeichen ersetzt' : 'Kein Kennzeichen erkannt');
  const zwischen = path.join(path.dirname(foto), `.${path.parse(foto).name}_kz.jpg`);
  fs.writeFileSync(zwischen, kz.bild);

  // 2. Freistellen mit BiRefNet.
  console.log('Freistellen (dauert etwa anderthalb Minuten) …');
  const frei = await freistellen(zwischen);
  fs.unlinkSync(zwischen);

  // 3. In den Raum setzen.
  const ergebnis = await komponieren(frei, raumBild(halle), {
    ...STANDARD,
    horizont: halle.horizont,
    kameraHoehe: halle.kameraHoehe,
    brennweite: halle.brennweite,
    spiegelungStaerke: halle.bodenglanz,
  });

  const ziel = path.join(path.dirname(foto), `${path.parse(foto).name}_studio.jpg`);
  fs.writeFileSync(ziel, ergebnis.bild);
  console.log('fertig →', ziel);
}

main().catch((e) => { console.error(String(e)); process.exit(1); });
