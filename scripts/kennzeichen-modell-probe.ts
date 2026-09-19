/**
 * Probiert OWL-ViT als Kennzeichen-Erkennung aus.
 *
 *   npx tsx scripts/kennzeichen-modell-probe.ts <bild> [modell]
 *
 * OWL-ViT (Google, Apache-2.0) findet Objekte nach einer Beschreibung in
 * Worten — hier "license plate". Die Lizenz erlaubt kommerzielle Nutzung,
 * anders als die fertigen YOLOv9-Kennzeichenmodelle, deren Gewichte mit
 * GPL-Code trainiert wurden und keine klare Lizenz tragen.
 */

import fs from 'node:fs';
import sharp from 'sharp';
import { pipeline, RawImage } from '@huggingface/transformers';

const [bildPfad, modell = 'Xenova/owlvit-base-patch32'] = process.argv.slice(2);

async function main() {
  const t0 = Date.now();
  const erkenner = await pipeline('zero-shot-object-detection', modell, { dtype: 'q8' });
  console.log(`Modell geladen in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  // Ohne Alpha, sonst sieht das Modell die freigestellten Raender schwarz.
  const jpg = await sharp(fs.readFileSync(bildPfad)).flatten({ background: '#808080' }).jpeg().toBuffer();
  const bild = await RawImage.fromBlob(new Blob([new Uint8Array(jpg)], { type: 'image/jpeg' }));

  const t1 = Date.now();
  const funde = await erkenner(bild, ['a license plate', 'a car number plate'], { threshold: 0.05, top_k: 5 }) as
    Array<{ score: number; label: string; box: { xmin: number; ymin: number; xmax: number; ymax: number } }>;
  console.log(`Erkennung in ${((Date.now() - t1) / 1000).toFixed(1)} s`);

  for (const f of funde) {
    const { xmin, ymin, xmax, ymax } = f.box;
    console.log(`${f.score.toFixed(3)}  ${f.label.padEnd(20)} ${Math.round(xmin)}/${Math.round(ymin)} – ${Math.round(xmax)}/${Math.round(ymax)}`);
  }

  if (funde[0]) {
    const { xmin, ymin, xmax, ymax } = funde[0].box;
    const svg = `<svg width="${bild.width}" height="${bild.height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${xmin}" y="${ymin}" width="${xmax - xmin}" height="${ymax - ymin}" fill="none" stroke="#ff2d2d" stroke-width="6"/></svg>`;
    await sharp(jpg).composite([{ input: Buffer.from(svg) }]).jpeg().toFile('tools/proben/kz_modell.jpg');
    console.log('→ tools/proben/kz_modell.jpg');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
