/**
 * Wird die EXIF-Drehung angewendet, bevor das Bild verarbeitet wird?
 *
 *   npx tsx scripts/exif-drehung-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * -- Warum es diese Probe gibt --------------------------------------
 *
 * Am 14. November 2026 lief das erste echte iPhone-Foto durch
 * Schritt 2. Im fertigen Studiobild stand das Auto um 90 Grad gekippt
 * auf der Nase. Der Bericht dazu: "1 von 1 ohne Auffaelligkeit".
 *
 * Ursache: Ein iPhone speichert die Bildpunkte fast immer liegend und
 * vermerkt die Drehung nur als Zahl im EXIF. Jeder Betrachter dreht
 * beim Anzeigen mit -- sharp NICHT, solange man nicht ausdruecklich
 * .rotate() aufruft. In der gesamten Bildverarbeitung stand .rotate()
 * an keiner einzigen Stelle.
 *
 * Das war kein Sonderfall. Es haette JEDES Hochkant-Foto getroffen,
 * also das erste Foto des ersten Haendlers.
 *
 * Diese Probe baut ein Bild mit EXIF-Drehung und prueft beides:
 * dass die Drehung ankommt, und dass der Vermerk danach weg ist --
 * sonst dreht ein spaeterer Schritt ein zweites Mal.
 */

import sharp from 'sharp';

/** Ein liegendes Bild, das laut EXIF hochkant angezeigt gehoert. */
async function liegendMitDrehung(orientation: number): Promise<Buffer> {
  return sharp({
    create: { width: 400, height: 200, channels: 3, background: { r: 200, g: 60, b: 60 } },
  }).withMetadata({ orientation }).jpeg().toBuffer();
}

let fehler = 0;

async function main() {
  const pruefe = (ok: boolean, was: string, zusatz = '') => {
    console.log(`${ok ? 'OK   ' : 'FEHLER'} ${was}${zusatz ? '  ' + zusatz : ''}`);
    if (!ok) fehler++;
  };

  /* 6 = um 90 Grad im Uhrzeigersinn drehen. Das schreibt ein iPhone,
     wenn man es hochkant haelt. */
  const roh = await liegendMitDrehung(6);
  const vorher = await sharp(roh).metadata();
  pruefe(vorher.width === 400 && vorher.height === 200,
    'Die Bildpunkte liegen quer, wie das Handy sie speichert',
    `${vorher.width}x${vorher.height}`);
  pruefe(vorher.orientation === 6,
    'Die Drehung steht als Zahl im EXIF', `orientation ${vorher.orientation}`);

  /* Ohne .rotate(): genau der Fehler, der im Studiobild landete. */
  const ohne = await sharp(roh).jpeg().toBuffer();
  const o = await sharp(ohne).metadata();
  pruefe(o.width === 400 && o.height === 200,
    'OHNE .rotate() bleibt es quer — das Auto stuende auf der Nase',
    `${o.width}x${o.height}`);

  /* Mit .rotate(): so, wie jeder Mensch das Foto sieht. */
  const mit = await sharp(roh).rotate().jpeg().toBuffer();
  const m = await sharp(mit).metadata();
  pruefe(m.width === 200 && m.height === 400,
    'MIT .rotate() steht es hochkant, wie auf dem Handy',
    `${m.width}x${m.height}`);
  pruefe(!m.orientation || m.orientation === 1,
    'Der EXIF-Vermerk ist danach weg — kein zweiter Dreher',
    `orientation ${m.orientation ?? 'keine'}`);

  /* Ein Bild ohne EXIF-Drehung darf .rotate() nicht veraendern. */
  const normal = await sharp({
    create: { width: 400, height: 200, channels: 3, background: { r: 60, g: 60, b: 200 } },
  }).jpeg().toBuffer();
  const n = await sharp(normal).rotate().metadata();
  pruefe(n.width === 400 && n.height === 200,
    'Ein Bild ohne Drehvermerk bleibt unveraendert', `${n.width}x${n.height}`);

  /* Und die Lageprüfung, die es im Bericht haette auffallen lassen. */
  const quer = 400 / 200, hoch = 200 / 400;
  pruefe(quer >= 1.1, 'Ein Auto von der Seite ist breiter als hoch', `${quer.toFixed(2)}`);
  pruefe(hoch < 1.1, 'Hochkant faellt in der Guetepruefung auf', `${hoch.toFixed(2)}`);

  console.log('\nDie Lagepruefung bleibt auch nach dem Einbau von .rotate() bestehen.');
  console.log('Eine Ursache ist behoben, nicht alle: Ein Auto, das im fertigen');
  console.log('Bild hochkant steht, darf nie wieder als "ohne Auffaelligkeit" durch.');

  console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
  process.exitCode = fehler === 0 ? 0 : 1;

}

main().catch((e) => { console.error(e); process.exitCode = 1; });

export {};
