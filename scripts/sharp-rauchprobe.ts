/**
 * Laeuft sharp nach dem Sprung auf 0.35 ueberhaupt noch?
 *
 *   npx tsx scripts/sharp-rauchprobe.ts
 *
 * KOSTET NICHTS — rechnet nur mit erzeugten Bildern, kein Modellaufruf.
 *
 * ── Warum es diese Probe gibt ──────────────────────────────────────
 *
 * sharp 0.35 hat die Typen umgestellt: Den Namensraum `sharp` gibt es
 * nicht mehr, die Typen sind benannte Exporte. Das war ein reiner
 * Typfehler und sofort zu sehen.
 *
 * Gefaehrlicher ist, was man NICHT sieht: Ein Sprung ueber eine
 * Nebenversion kann Verhalten aendern, und die ganze Bildverarbeitung
 * haengt daran — Freistellen, Komposition, Schatten, Boden. Ein
 * Build, der durchlaeuft, beweist davon nichts.
 *
 * Geprueft wird deshalb das, was der Studio-Weg wirklich tut:
 * zusammensetzen mit OverlayOptions, Alphakanal behalten, skalieren,
 * zuschneiden, drehen und als JPEG ausgeben. Jeder Schritt mit einer
 * Zahl, die stimmen muss — nicht nur "keine Ausnahme geflogen".
 */

import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';

let fehler = 0;

function pruefen(was: string, ist: unknown, soll: unknown) {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  console.log(`${ok ? 'OK   ' : 'FEHLER'} ${was}`);
  if (!ok) {
    console.log(`       erwartet: ${JSON.stringify(soll)}`);
    console.log(`       bekommen: ${JSON.stringify(ist)}`);
    fehler++;
  }
}

async function main() {
  console.log(`sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}\n`);

  /* Ein roter Grund und ein halbdurchsichtiges blaues Quadrat. */
  const grund = await sharp({
    create: { width: 200, height: 100, channels: 4, background: { r: 200, g: 0, b: 0, alpha: 1 } },
  }).png().toBuffer();

  const fleck = await sharp({
    create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 0, b: 200, alpha: 0.5 } },
  }).png().toBuffer();

  /* Genau der Aufruf, der in kompositor, hintergrund und bodentextur
     steckt: eine Liste von OverlayOptions in composite. */
  const ebenen: OverlayOptions[] = [{ input: fleck, left: 10, top: 20 }];
  const zusammen = await sharp(grund).composite(ebenen).png().toBuffer();

  const m = await sharp(zusammen).metadata();
  pruefen('Zusammensetzen behaelt Groesse', [m.width, m.height], [200, 100]);
  pruefen('Zusammensetzen behaelt den Alphakanal', m.channels, 4);

  /* Liegt der Fleck wirklich an der angegebenen Stelle? Ein composite,
     das still nichts tut, waere der schlimmste Fall — es faellt
     nirgends auf und jedes Studiobild waere leer. */
  const roh = await sharp(zusammen).raw().toBuffer({ resolveWithObject: true });
  const bei = (x: number, y: number) => {
    const k = (y * roh.info.width + x) * roh.info.channels;
    return [roh.data[k], roh.data[k + 1], roh.data[k + 2]];
  };
  const drin = bei(30, 40);
  const draussen = bei(150, 80);
  pruefen('Ausserhalb des Flecks ist der Grund rot', draussen, [200, 0, 0]);
  console.log(`${drin[2] > 60 && drin[0] < 200 ? 'OK   ' : 'FEHLER'} Im Fleck ist Blau angekommen (${drin.join(',')})`);
  if (!(drin[2] > 60 && drin[0] < 200)) fehler++;

  /* Skalieren mit fit:inside — so rechnet die Route die Zielbreite. */
  const klein = await sharp(grund).resize(100, 100, { fit: 'inside' }).jpeg({ quality: 90 }).toBuffer();
  const mk = await sharp(klein).metadata();
  pruefen('fit:inside behaelt das Seitenverhaeltnis', [mk.width, mk.height], [100, 50]);
  pruefen('JPEG-Ausgabe kommt als JPEG', mk.format, 'jpeg');

  /* Zuschneiden und Drehen — beides im Studio-Weg in Gebrauch. */
  const schnitt = await sharp(grund).extract({ left: 10, top: 10, width: 60, height: 40 }).png().toBuffer();
  const ms = await sharp(schnitt).metadata();
  pruefen('Zuschneiden trifft die Groesse', [ms.width, ms.height], [60, 40]);

  const gedreht = await sharp(grund).rotate(90).png().toBuffer();
  const mg = await sharp(gedreht).metadata();
  pruefen('Drehen um 90 Grad tauscht die Seiten', [mg.width, mg.height], [100, 200]);

  /* Die Schaerfe-Messung der Proben haengt an raw() mit Graustufen. */
  const grau = await sharp(grund).greyscale().raw().toBuffer({ resolveWithObject: true });
  pruefen('Graustufen haben einen Kanal', grau.info.channels, 1);

  console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
  process.exitCode = fehler === 0 ? 0 : 1;
}

main().catch(e => { console.error(e); process.exit(1); });

export {};
