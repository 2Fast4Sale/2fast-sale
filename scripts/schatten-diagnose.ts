/**
 * Zeichnet die Schattenrechnung ins Bild.
 *
 *   npx tsx scripts/schatten-diagnose.ts <auto.png> <raum> [ziel.jpg]
 *
 * Nach Augenmaß zu justieren hat beim Schatten mehrfach in die Irre
 * gefuehrt: Man sieht, DASS er falsch liegt, aber nicht, WELCHE Zahl
 * daneben ist. Dieses Bild zeigt jede Zwischengroesse an ihrem Platz:
 *
 *   rot      Fluchtlinie der Bodenebene (aus der .json des Raums)
 *   gelb     Standlinie durch die beiden erkannten Radaufstandspunkte
 *   gruen    die erkannten Radaufstandspunkte
 *   blau     Unterkante des Fahrzeugs, wie der Kompositor sie setzt
 *
 * Liegt die gelbe Linie nicht an den Reifen, stimmt die Erkennung nicht.
 * Liegt sie richtig und der Schatten trotzdem daneben, stimmt die
 * Umrechnung in Bodenkoordinaten nicht.
 */

import fs from 'node:fs';
import sharp from 'sharp';
import { komponieren, STANDARD, radaufstand } from '../lib/studio/kompositor';
import { raum, raumBild } from '../lib/studio/raeume';

const [autoPfad, raumName, zielPfad] = process.argv.slice(2);
if (!autoPfad || !raumName) {
  console.error('Aufruf: schatten-diagnose.ts <auto.png> <raum> [ziel.jpg]');
  process.exit(1);
}

async function main() {
  const halle = raum(raumName);
  if (!halle) throw new Error('Raum nicht gefunden: ' + raumName);

  const auto = fs.readFileSync(autoPfad);
  const ergebnis = await komponieren(auto, raumBild(halle), {
    ...STANDARD,
    horizont: halle.horizont,
    kameraHoehe: halle.kameraHoehe,
    brennweite: halle.brennweite,
    spiegelungStaerke: 0,          // Spiegelung stoert die Beurteilung
  });

  const { breite: B, hoehe: H, messwerte: m } = ergebnis;

  /*
   * Dieselben Groessen wie im Kompositor, hier nur noch einmal
   * ausgerechnet, um sie zeichnen zu koennen.
   */
  const hY = H * halle.horizont;
  const fBreite = m.fahrzeugBreite;
  const fHoehe = m.fahrzeugHoehe;
  const bodenY = Math.round(H * (1 - STANDARD.bodenabstand));
  const fahrzeugX = Math.round((B - fBreite) * STANDARD.ausrichtung);
  const fahrzeugY = bodenY - fHoehe;

  /*
   * Radaufstandspunkte — mit DERSELBEN Funktion wie der Kompositor. Eine
   * eigene Kopie hatte hier zuerst andere Punkte gefunden als der
   * Kompositor tatsaechlich benutzt; damit zeigt ein Diagnosebild etwas an,
   * das es so gar nicht gibt.
   *
   * Zuerst auf das Fahrzeug zuschneiden, dann skalieren — sonst rechnet man
   * mit den leeren Raendern des PNG.
   */
  const roh = await sharp(auto).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let oben = roh.info.height, links = roh.info.width, rechts = -1, unter = -1;
  for (let y = 0; y < roh.info.height; y++) {
    for (let x = 0; x < roh.info.width; x++) {
      if (roh.data[(y * roh.info.width + x) * roh.info.channels + 3] > 8) {
        if (y < oben) oben = y;
        if (y > unter) unter = y;
        if (x < links) links = x;
        if (x > rechts) rechts = x;
      }
    }
  }
  const skaliert = await sharp(auto).ensureAlpha()
    .extract({ left: links, top: oben, width: rechts - links + 1, height: unter - oben + 1 })
    .resize(fBreite, fHoehe, { fit: 'fill' })
    .png().toBuffer();

  const kontakt = await radaufstand(skaliert, fBreite, fHoehe);
  if (!kontakt) throw new Error('Keine Radaufstandspunkte gefunden');
  const { unten, radA, radB } = kontakt;
  const ax = fahrzeugX + radA, ay = fahrzeugY + unten[radA];
  const bx = fahrzeugX + radB, by = fahrzeugY + unten[radB];

  const linie = (x1: number, y1: number, x2: number, y2: number, farbe: string) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${farbe}" stroke-width="3"/>`;

  const svg = Buffer.from(
    `<svg width="${B}" height="${H}" xmlns="http://www.w3.org/2000/svg">
       ${linie(0, hY, B, hY, '#ff2d2d')}
       <text x="12" y="${hY - 10}" fill="#ff2d2d" font-size="26" font-family="sans-serif">Fluchtlinie ${halle.horizont}</text>
       ${linie(0, ay + (0 - ax) * (by - ay) / (bx - ax), B, ay + (B - ax) * (by - ay) / (bx - ax), '#ffd400')}
       ${linie(0, bodenY, B, bodenY, '#3a86ff')}
       <text x="12" y="${bodenY - 10}" fill="#3a86ff" font-size="26" font-family="sans-serif">Unterkante Fahrzeug</text>
       <circle cx="${ax}" cy="${ay}" r="12" fill="none" stroke="#25d366" stroke-width="4"/>
       <circle cx="${bx}" cy="${by}" r="12" fill="none" stroke="#25d366" stroke-width="4"/>
     </svg>`,
  );

  const ziel = zielPfad || `tools/proben/diagnose_${raumName}.jpg`;
  await sharp(ergebnis.bild).composite([{ input: svg }]).jpeg({ quality: 92 }).toFile(ziel);

  console.log(`Raum ${halle.titel}: Fluchtlinie ${Math.round(hY)} px, Unterkante ${bodenY} px`);
  console.log(`Radaufstand links ${ax}/${ay}, rechts ${bx}/${by}`);
  console.log(`Fahrzeug ${fBreite}x${fHoehe} px bei ${fahrzeugX}/${fahrzeugY}`);
  console.log('→', ziel);
}

main().catch((e) => { console.error(e); process.exit(1); });
