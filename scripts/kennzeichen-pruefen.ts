/**
 * Prueft die Kennzeichenerkennung an einem Bild.
 *
 *   npx tsx scripts/kennzeichen-pruefen.ts <bild.jpg> [ziel.jpg] [Firmenname]
 *
 * Ohne Argumente baut es sich einen Testfall selbst: Es klebt ein
 * kuenstliches deutsches Kennzeichen auf ein Foto und prueft, ob die
 * Erkennung es an genau der Stelle wiederfindet. Das ist noetig, weil
 * hier kein Foto mit echtem Kennzeichen liegt — und ein Verfahren, das
 * nur an einem einzigen Bild geprueft wurde, ist nicht geprueft.
 */

import fs from 'node:fs';
import sharp from 'sharp';
import { findeKennzeichen, ersetzeKennzeichen } from '../lib/studio/kennzeichen';

/** Malt ein deutsches Kennzeichen als SVG. */
function schildSvg(breite: number, hoehe: number, text = 'NE BW 7122'): Buffer {
  const blau = Math.round(breite * (40 / 520));
  return Buffer.from(
    `<svg width="${breite}" height="${hoehe}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${breite}" height="${hoehe}" rx="${hoehe * 0.1}" fill="#f2f2f0" stroke="#111" stroke-width="${hoehe * 0.04}"/>
       <rect width="${blau}" height="${hoehe}" rx="${hoehe * 0.1}" fill="#0b3ea8"/>
       <text x="${blau / 2}" y="${hoehe * 0.82}" fill="#f5d020" font-family="Arial"
             font-size="${hoehe * 0.22}" text-anchor="middle">D</text>
       <text x="${blau + (breite - blau) / 2}" y="${hoehe * 0.72}" fill="#111"
             font-family="Arial" font-weight="700" font-size="${hoehe * 0.62}"
             text-anchor="middle">${text}</text>
     </svg>`,
  );
}

async function main() {
  const [quelle, ziel, firma] = process.argv.slice(2);

  let bild: Buffer;
  let erwartet: { links: number; oben: number; breite: number } | null = null;

  /*
   * "-" statt eines leeren Arguments: PowerShell laesst leere
   * Zeichenketten beim Aufruf externer Programme einfach weg, dadurch
   * rutschten die folgenden Argumente eine Stelle nach vorn und der
   * Zielpfad landete als Quelle.
   */
  if (quelle && quelle !== '-') {
    bild = fs.readFileSync(quelle);
  } else {
    // Testfall selbst bauen.
    const basis = 'tools/proben/urus.jpg';
    const m = await sharp(basis).metadata();
    const w = Math.round(m.width! * 0.16);
    const hh = Math.round(w / (520 / 110));
    const x = Math.round(m.width! * 0.10), y = Math.round(m.height! * 0.62);
    bild = await sharp(basis)
      .composite([{ input: await sharp(schildSvg(w, hh)).png().toBuffer(), left: x, top: y }])
      .jpeg({ quality: 94 })
      .toBuffer();
    erwartet = { links: x, oben: y, breite: w };
    console.log(`Testschild gesetzt bei ${x}/${y}, ${w}x${hh}`);
  }

  const fund = await findeKennzeichen(bild);
  if (!fund) {
    console.log('Kein Kennzeichen gefunden.');
  } else {
    console.log(`Gefunden: ${fund.links}/${fund.oben}, ${fund.breite}x${fund.hoehe}, `
              + `Guete ${fund.guete.toFixed(2)}`);
    if (erwartet) {
      const dx = Math.abs(fund.links - erwartet.links);
      const dy = Math.abs(fund.oben - erwartet.oben);
      const db = Math.abs(fund.breite - erwartet.breite);
      console.log(`Abweichung: x ${dx} px, y ${dy} px, Breite ${db} px`);
      console.log(dx <= 6 && dy <= 6 && db <= erwartet.breite * 0.12
        ? 'BESTANDEN' : 'DANEBEN');
    }
  }

  const r = await ersetzeKennzeichen(bild, firma ?? 'AUTOHAUS MUSTER');
  const datei = ziel || 'tools/proben/kennzeichen_test.jpg';
  fs.writeFileSync(datei, r.bild);
  console.log(`${r.ersetzt ? 'ersetzt' : 'unveraendert'} → ${datei}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
