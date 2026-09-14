/**
 * Senkrechtes Helligkeitsprofil an einer Stelle.
 *
 *   node tools/spalte-messen.js <bild.jpg> <x> <yVon> <yBis>
 *
 * Beantwortet die Frage, die man an einem Bild nicht sicher sieht: Klafft
 * zwischen Reifen und Schatten eine helle Luecke? Eine Luecke waere eine
 * Zeile, die deutlich HELLER ist als die Zeilen darueber UND darunter.
 */

const sharp = require('sharp');
const [datei, x, yVon, yBis] = process.argv.slice(2);

(async () => {
  const { data, info } = await sharp(datei).greyscale().raw().toBuffer({ resolveWithObject: true });
  const spalte = Number(x);
  const werte = [];
  for (let y = Number(yVon); y <= Number(yBis); y++) werte.push(data[y * info.width + spalte]);

  let luecke = null;
  for (let i = 2; i < werte.length - 2; i++) {
    if (werte[i] > werte[i - 2] + 18 && werte[i] > werte[i + 2] + 18) {
      luecke = Number(yVon) + i;
      break;
    }
  }

  for (let i = 0; i < werte.length; i += 2) {
    const y = Number(yVon) + i;
    console.log(String(y).padStart(5), String(werte[i]).padStart(3), '#'.repeat(Math.round((255 - werte[i]) / 6)));
  }
  console.log(luecke === null
    ? '\nKeine helle Luecke gefunden - Reifen und Schatten haengen zusammen.'
    : `\nHelle Luecke bei Zeile ${luecke}.`);
})();
