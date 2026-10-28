/**
 * Faengt die neue Pruefung ein Bild ohne Fahrzeug ab?
 *
 *   npx tsx scripts/leerer-raum-probe.ts
 *
 * Im Live-Test kamen Studiobilder zurueck, auf denen nur die leere
 * Halle zu sehen war. Die Aehnlichkeitspruefung liess sie durch, weil
 * sie gegen das ORIGINALFOTO vergleicht. Diese Probe misst, was die
 * neue Pruefung misst: den Unterschied zur leeren Halle.
 */
import sharp from 'sharp';

const B = 1920, H = 1280;

async function halle(): Promise<Buffer> {
  const d = Buffer.alloc(B * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    const i = (y * B + x) * 3;
    const boden = y > H * 0.52;
    const v = boden ? 42 + ((x * 3 + y * 5) % 7) : 150 + ((x * 2 + y * 3) % 9);
    d[i] = v; d[i + 1] = v; d[i + 2] = v;
  }
  return sharp(d, { raw: { width: B, height: H, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
}

/** Dieselbe Halle mit einem dunklen Block als "Auto", `anteil` der Bildbreite. */
async function mitAuto(anteil: number): Promise<Buffer> {
  const d = Buffer.alloc(B * H * 3);
  const w = Math.round(B * anteil), h = Math.round(w * 0.42);
  const x0 = Math.round((B - w) / 2), y0 = Math.round(H * 0.52) - Math.round(h * 0.75);
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    const i = (y * B + x) * 3;
    const imAuto = x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
    const boden = y > H * 0.52;
    const v = imAuto ? 190 : boden ? 42 + ((x * 3 + y * 5) % 7) : 150 + ((x * 2 + y * 3) % 9);
    d[i] = v; d[i + 1] = v; d[i + 2] = v;
  }
  return sharp(d, { raw: { width: B, height: H, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
}

/* Dieselbe Rechnung wie anteilGeaendert() in geminiStudio.ts. */
async function anteilGeaendert(a: Buffer, b: Buffer): Promise<number> {
  const masse = { width: 256, height: 256, fit: 'fill' as const };
  const [ga, gb] = await Promise.all([
    sharp(a).flatten({ background: '#808080' }).resize(masse).greyscale().raw().toBuffer(),
    sharp(b).flatten({ background: '#808080' }).resize(masse).greyscale().raw().toBuffer(),
  ]);
  let n = 0;
  for (let i = 0; i < ga.length; i++) if (Math.abs(ga[i] - gb[i]) > 25) n++;
  return (n / ga.length) * 100;
}

async function main() {
  const raum = await halle();
  const SCHWELLE = 5;
  console.log(`Schwelle: ${SCHWELLE} % Unterschied zur leeren Halle\n`);

  const leer = await anteilGeaendert(raum, raum);
  console.log(`leere Halle zurueckbekommen   ${leer.toFixed(1).padStart(5)} %  →  ${leer < SCHWELLE ? 'VERWORFEN (richtig)' : 'durchgelassen (falsch!)'}`);

  for (const anteil of [0.20, 0.30, 0.40, 0.50, 0.60]) {
    const v = await anteilGeaendert(raum, await mitAuto(anteil));
    console.log(`Fahrzeug ueber ${(anteil * 100).toFixed(0)} % der Breite ${v.toFixed(1).padStart(5)} %  →  ${v < SCHWELLE ? 'VERWORFEN (falsch!)' : 'durchgelassen (richtig)'}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
