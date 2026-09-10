/**
 * Misst, wie ein Bodenschatten verlaeuft — Zeile fuer Zeile.
 *
 *   node tools/schatten-messen.js <bild.jpg> <xVon> <xBis> <yVon> <yBis>
 *
 * Gibt fuer jede Zeile die mittlere und die dunkelste Helligkeit im
 * angegebenen Streifen aus. Damit laesst sich beantworten, was man mit
 * blossem Auge nur ahnt: Wie dunkel wird es unter dem Fahrzeug, und
 * ueber wie viele Pixel laeuft der Schatten aus.
 */

const sharp = require('sharp');

const [datei, xVon, xBis, yVon, yBis] = process.argv.slice(2);

(async () => {
  const { data, info } = await sharp(datei).greyscale().raw().toBuffer({ resolveWithObject: true });
  const x0 = Number(xVon), x1 = Number(xBis);

  for (let y = Number(yVon); y <= Number(yBis); y += 10) {
    let summe = 0, n = 0, min = 255;
    for (let x = x0; x < x1; x++) {
      const v = data[y * info.width + x];
      summe += v; n++;
      if (v < min) min = v;
    }
    const mittel = Math.round(summe / n);
    // Balken zum Mitlesen: je dunkler, desto laenger.
    const balken = '#'.repeat(Math.round((255 - mittel) / 6));
    console.log(String(y).padStart(5), 'Mittel', String(mittel).padStart(3),
                'dunkelster', String(min).padStart(3), balken);
  }
})();
