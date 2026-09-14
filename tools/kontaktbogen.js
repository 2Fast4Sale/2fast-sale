/**
 * Kontaktbogen: viele Bilder als kleine, beschriftete Kacheln auf einem Blatt.
 *
 *   node tools/kontaktbogen.js <ordner> <ziel.jpg> [spalten]
 *
 * Zum Aussortieren. Wer vierzig Hallenfotos einzeln oeffnet, weiss beim
 * zwanzigsten nicht mehr, wie das dritte aussah.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const [ordner, ziel, spaltenArg] = process.argv.slice(2);
const SPALTEN = Number(spaltenArg || 5);
const B = 360, H = 240, KOPF = 22;

(async () => {
  const dateien = fs.readdirSync(ordner).filter((f) => /\.jpe?g$/i.test(f)).sort();
  const teile = [];
  for (let i = 0; i < dateien.length; i++) {
    const x = (i % SPALTEN) * B, y = Math.floor(i / SPALTEN) * (H + KOPF);
    try {
      teile.push({
        input: await sharp(path.join(ordner, dateien[i])).resize(B, H, { fit: 'cover' }).png().toBuffer(),
        left: x, top: y + KOPF,
      });
    } catch { continue; }
    const text = `${i + 1}  ${dateien[i]}`.slice(0, 48).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    teile.push({
      input: Buffer.from(`<svg width="${B}" height="${KOPF}"><rect width="${B}" height="${KOPF}" fill="#111"/>` +
        `<text x="6" y="15" font-family="sans-serif" font-size="11" fill="#fff">${text}</text></svg>`),
      left: x, top: y,
    });
  }
  const zeilen = Math.ceil(dateien.length / SPALTEN);
  await sharp({ create: { width: SPALTEN * B, height: zeilen * (H + KOPF), channels: 3, background: '#222' } })
    .composite(teile).jpeg({ quality: 82 }).toFile(ziel);
  console.log(`${dateien.length} Bilder → ${ziel}`);
})();
