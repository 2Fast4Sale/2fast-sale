/**
 * Schneidet aus mehreren Bildern denselben Bereich heraus und legt sie
 * untereinander — zum Vergleichen von Kanten und Details.
 *
 *   node tools/ausschnitt.js <ziel.jpg> <x> <y> <b> <h> <grund> <bild1> <text1> ...
 *
 * `grund` ist die Farbe hinter durchsichtigen Stellen, z.B. "#d000d0".
 * Magenta, weil jeder Rest vom alten Hintergrund und jede zu weiche
 * Kante darauf sofort ins Auge springt.
 */

const sharp = require('sharp');

const [ziel, x, y, b, h, grund, ...rest] = process.argv.slice(2);
const paare = [];
for (let i = 0; i < rest.length; i += 2) paare.push([rest[i], rest[i + 1] ?? '']);

const KOPF = 30;

(async () => {
  const teile = [];
  const B = Number(b), H = Number(h);
  let oben = 0;
  for (const [datei, text] of paare) {
    const schnitt = await sharp(datei)
      .extract({ left: Number(x), top: Number(y), width: B, height: H })
      .png().toBuffer();
    const auf = await sharp({ create: { width: B, height: H, channels: 3, background: grund } })
      .composite([{ input: schnitt }]).png().toBuffer();
    teile.push({
      input: Buffer.from(
        `<svg width="${B}" height="${KOPF}"><rect width="${B}" height="${KOPF}" fill="#111"/>` +
        `<text x="10" y="21" font-family="sans-serif" font-size="16" fill="#fff">${text}</text></svg>`,
      ),
      left: 0, top: oben,
    });
    teile.push({ input: auf, left: 0, top: oben + KOPF });
    oben += KOPF + H;
  }

  await sharp({ create: { width: B, height: oben, channels: 3, background: '#111' } })
    .composite(teile).jpeg({ quality: 94 }).toFile(ziel);
  console.log('geschrieben:', ziel);
})();
