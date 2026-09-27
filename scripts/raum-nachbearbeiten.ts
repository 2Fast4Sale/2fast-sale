/*
 * Kameraeffekte auf einen gerenderten Raum legen.
 *
 * Ein Render ist mathematisch sauber: gleichmaessig hell bis in die
 * Ecken, jede Leuchte hart begrenzt, kein Korn. Genau daran erkennt man
 * ihn, noch bevor man sagen kann warum. Eine echte Aufnahme hat drei
 * Dinge, die hier nachgetragen werden:
 *
 *   1. Glanzhoefe   — Licht streut im Objektiv, helle Leuchten blueh en aus.
 *   2. Randabfall   — zum Bildrand hin verliert jede Optik Licht.
 *   3. Korn         — jeder Sensor rauscht, und sei es schwach.
 *
 * Aufruf:
 *   npx tsx scripts/raum-nachbearbeiten.ts eingang.jpg ausgang.jpg [staerke]
 */
import fs from 'fs';
import sharp from 'sharp';

sharp.concurrency(1);

async function main() {
  const [ein, aus, staerkeRoh] = process.argv.slice(2);
  if (!ein || !aus) {
    console.error('Aufruf: raum-nachbearbeiten.ts <ein.jpg> <aus.jpg> [staerke]');
    process.exit(1);
  }
  const staerke = Number(staerkeRoh ?? '1');

  const quelle = sharp(fs.readFileSync(ein));
  const { width: b = 0, height: h = 0 } = await quelle.metadata();
  if (!b || !h) throw new Error('Bild ohne Masse');

  const grund = await quelle.clone().removeAlpha().raw().toBuffer();

  /* 1. Glanzhoefe: nur die hellsten Stellen, stark weichgezeichnet. */
  const hell = Buffer.alloc(grund.length);
  for (let i = 0; i < grund.length; i++) {
    const v = grund[i];
    hell[i] = v > 205 ? Math.min(255, (v - 205) * 3) : 0;
  }
  const schein = await sharp(hell, { raw: { width: b, height: h, channels: 3 } })
    .blur(Math.max(8, b / 90))
    .raw()
    .toBuffer();

  /* 2. Randabfall: Abstand zur Mitte, weich ansteigend. */
  const mx = b / 2, my = h / 2;
  const maxR = Math.hypot(mx, my);

  /* 3. Korn: gleichmaessig verteiltes, feines Rauschen. */
  const ergebnis = Buffer.alloc(grund.length);
  let zufall = 20260927;
  const naechste = () => {
    zufall = (zufall * 1103515245 + 12345) & 0x7fffffff;
    return zufall / 0x7fffffff;
  };

  for (let y = 0; y < h; y++) {
    const dy = (y - my) / maxR;
    for (let x = 0; x < b; x++) {
      const dx = (x - mx) / maxR;
      const r = Math.sqrt(dx * dx + dy * dy);
      /* Bis 55 Prozent Radius nichts, danach weich bis 22 Prozent Abfall. */
      const rand = 1 - 0.22 * staerke * Math.pow(Math.max(0, (r - 0.55) / 0.45), 1.6);
      const korn = (naechste() - 0.5) * 4.5 * staerke;
      const p = (y * b + x) * 3;
      for (let k = 0; k < 3; k++) {
        const wert = grund[p + k] + schein[p + k] * 0.5 * staerke;
        ergebnis[p + k] = Math.max(0, Math.min(255, Math.round(wert * rand + korn)));
      }
    }
  }

  await sharp(ergebnis, { raw: { width: b, height: h, channels: 3 } })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(aus);
  console.log('fertig:', aus);
}

main();
