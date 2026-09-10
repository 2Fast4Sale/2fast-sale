/**
 * Legt mehrere Bilder untereinander, jedes mit einer Beschriftung.
 *
 *   node tools/vergleich.js <ziel.jpg> <bild1> <text1> <bild2> <text2> ...
 *
 * Der Grund fuer diese Datei: Einzelbilder nacheinander zu schicken
 * taugt nicht zum Vergleichen. Man merkt sich das vorige nicht genau
 * genug, und Unterschiede, die beim Messen deutlich sind, verschwinden
 * dabei. Nebeneinander sieht man sie in zwei Sekunden.
 */

const sharp = require('sharp');

const [ziel, ...rest] = process.argv.slice(2);
const paare = [];
for (let i = 0; i < rest.length; i += 2) paare.push([rest[i], rest[i + 1] ?? '']);

const BREITE = 1300;
const KOPF = 32;

(async () => {
  const teile = [];
  let y = 0;
  for (const [datei, text] of paare) {
    const bild = await sharp(datei).resize(BREITE, null, { fit: 'inside' }).png().toBuffer();
    const m = await sharp(bild).metadata();
    teile.push({
      input: Buffer.from(
        `<svg width="${BREITE}" height="${KOPF}"><rect width="${BREITE}" height="${KOPF}" fill="#111"/>` +
        `<text x="12" y="22" font-family="sans-serif" font-size="17" fill="#fff">${text}</text></svg>`,
      ),
      left: 0, top: y,
    });
    teile.push({ input: bild, left: 0, top: y + KOPF });
    y += KOPF + m.height;
  }

  await sharp({ create: { width: BREITE, height: y, channels: 3, background: '#d000d0' } })
    .composite(teile)
    .jpeg({ quality: 92 })
    .toFile(ziel);
  console.log('geschrieben:', ziel);
})();
