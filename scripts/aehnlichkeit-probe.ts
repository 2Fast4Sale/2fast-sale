/**
 * Taugt die Aehnlichkeitspruefung als Sicherung?
 *
 *   npx tsx scripts/aehnlichkeit-probe.ts
 *
 * ── Die Frage ──────────────────────────────────────────────────────
 *
 * `geminiStudio.ts` verwirft ein Bild, wenn die Aehnlichkeit des
 * Fahrzeugs unter 0,55 liegt. Das ist die einzige automatische
 * Sicherung dagegen, dass Gemini ein ANDERES Auto zurueckschickt.
 *
 * Gemessen wird: Fahrzeug in beiden Bildern suchen, ausschneiden, auf
 * 96x96 Graustufen bringen, mittlere Abweichung. Das Studiobild kam
 * auf 0,711.
 *
 * Eine Schwelle ist nur dann eine Sicherung, wenn ein falsches Bild
 * sie REISST. Darum vergleicht diese Probe dasselbe Foto gegen das
 * Gemini-Ergebnis und gegen fremde Fahrzeuge. Liegt ein fremdes Auto
 * genauso hoch wie das eigene, sichert die Schwelle nichts -- dann
 * laesst sie eine Verwechslung durch, und der Haendler bekommt ein
 * Inserat mit einem Auto, das ihm nicht gehoert.
 *
 * Kostet nichts: nur sharp und der oertliche Fahrzeugerkenner.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const EIGEN = 'tools/proben/eingang/image0(1).jpeg';
const GEMINI = 'tools/proben/gemini/image0(1)_galerie_dunkel.jpg';
const FREMD_ORDNER = 'tools/proben/eingang';

/* Dieselbe Rechnung wie in lib/studio/geminiStudio.ts. Bewusst
   abgeschrieben statt importiert: dort ist sie nicht ausgefuehrt, und
   diese Probe soll zeigen, was die Schwelle im Betrieb wirklich tut. */
async function aehnlichkeit(a: Buffer, b: Buffer): Promise<number> {
  const masse = { width: 96, height: 96, fit: 'fill' as const };
  const [ga, gb] = await Promise.all([
    sharp(a).flatten({ background: '#808080' }).resize(masse).greyscale().raw().toBuffer(),
    sharp(b).flatten({ background: '#808080' }).resize(masse).greyscale().raw().toBuffer(),
  ]);
  let summe = 0;
  for (let i = 0; i < ga.length; i++) summe += Math.abs(ga[i] - gb[i]);
  return 1 - summe / (ga.length * 255);
}

async function ausschnitt(datei: string): Promise<Buffer | null> {
  const { fahrzeugKastenFinden } = await import('../lib/studio/kennzeichenModell');
  const bild = await sharp(fs.readFileSync(datei)).rotate().toBuffer();
  const kasten = await fahrzeugKastenFinden(bild);
  if (!kasten || kasten === 'keins') return null;
  const meta = await sharp(bild).metadata();
  const b = meta.width ?? 0, h = meta.height ?? 0;
  if (!b || !h) return null;
  const links = Math.max(0, Math.round(kasten.x0 * b));
  const oben = Math.max(0, Math.round(kasten.y0 * h));
  const breit = Math.min(b - links, Math.round((kasten.x1 - kasten.x0) * b));
  const hoch = Math.min(h - oben, Math.round((kasten.y1 - kasten.y0) * h));
  if (breit < 32 || hoch < 32) return null;
  return sharp(bild).extract({ left: links, top: oben, width: breit, height: hoch })
    .jpeg({ quality: 92 }).toBuffer();
}

/*
 * Zweiter Messwert zum Vergleich: die FARBE des Fahrzeugs.
 *
 * Die Graustufenrechnung oben wirft genau das weg, was ein Mensch
 * zuerst sieht. Ein grauer Q7 und ein roter Golf koennen in Graustufen
 * nahe beieinander liegen. Darum hier dasselbe noch einmal, aber ueber
 * die mittlere Farbe des Fahrzeugausschnitts -- abgeschnitten werden
 * die aeusseren Raender, damit nicht Hof oder Halle mitgemessen wird.
 */
async function farbe(bild: Buffer): Promise<[number, number, number]> {
  const meta = await sharp(bild).metadata();
  const b = meta.width ?? 0, h = meta.height ?? 0;
  const inner = await sharp(bild)
    .extract({ left: Math.round(b * 0.2), top: Math.round(h * 0.2), width: Math.round(b * 0.6), height: Math.round(h * 0.6) })
    .resize(32, 32, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = inner;
  let r = 0, g = 0, bl = 0, n = 0;
  for (let i = 0; i < data.length; i += info.channels) { r += data[i]; g += data[i + 1]; bl += data[i + 2]; n++; }
  return [r / n, g / n, bl / n];
}

/** Farbabstand 0 bis 1, 1 = gleiche Farbe. */
async function farbAehnlich(a: Buffer, b: Buffer): Promise<number> {
  const [fa, fb] = await Promise.all([farbe(a), farbe(b)]);
  const d = Math.sqrt((fa[0] - fb[0]) ** 2 + (fa[1] - fb[1]) ** 2 + (fa[2] - fb[2]) ** 2);
  return 1 - Math.min(1, d / (255 * Math.sqrt(3)));
}

const SCHWELLE = Number(process.env.GEMINI_AEHNLICH_MIN || '0.55');

async function main() {
  const eigen = await ausschnitt(EIGEN);
  const gemini = await ausschnitt(GEMINI);
  if (!eigen || !gemini) { console.error('Kein Fahrzeug gefunden -- Probe nicht moeglich.'); process.exit(1); }

  const zeilen: Array<{ was: string; wert: number; farbe: number; durch: boolean }> = [];

  const selbst = await aehnlichkeit(eigen, eigen);
  zeilen.push({ was: 'dasselbe Bild mit sich selbst', wert: selbst, farbe: await farbAehnlich(eigen, eigen), durch: selbst >= SCHWELLE });

  const echt = await aehnlichkeit(eigen, gemini);
  zeilen.push({ was: 'Original gegen Gemini-Ergebnis', wert: echt, farbe: await farbAehnlich(eigen, gemini), durch: echt >= SCHWELLE });

  /* Fremde Fahrzeuge. Wenn eines davon die Schwelle schafft, laesst
     sie eine Verwechslung durch. */
  const fremde = fs.readdirSync(FREMD_ORDNER)
    .filter((d) => /\.(jpe?g|png|webp)$/i.test(d) && !d.startsWith('image0(1)'))
    .slice(0, 8);

  for (const d of fremde) {
    const f = await ausschnitt(path.join(FREMD_ORDNER, d));
    if (!f) continue;
    const w = await aehnlichkeit(eigen, f);
    zeilen.push({ was: 'FREMDES Auto: ' + d, wert: w, farbe: await farbAehnlich(eigen, f), durch: w >= SCHWELLE });
  }

  console.log('');
  console.log('Schwelle: ' + SCHWELLE.toFixed(2) + ' -- darunter wird das Bild verworfen. Spalte Farbe zum Vergleich.');
  console.log('');
  for (const z of zeilen) {
    console.log((z.durch ? 'DURCH  ' : 'raus   ') + z.wert.toFixed(3) + '   Farbe ' + z.farbe.toFixed(3) + '  ' + z.was);
  }

  const fremdeDurch = zeilen.filter((z) => z.was.startsWith('FREMDES') && z.durch);
  const fremdeAlle = zeilen.filter((z) => z.was.startsWith('FREMDES'));
  console.log('');
  if (fremdeDurch.length > 0) {
    console.log('ERGEBNIS: Die Schwelle sichert nichts.');
    console.log(fremdeDurch.length + ' von ' + fremdeAlle.length + ' FREMDEN Fahrzeugen kommen durch.');
    console.log('Ein vertauschtes Auto wuerde im Inserat landen, ohne dass jemand gewarnt wird.');
    process.exit(1);
  }
  console.log('ERGEBNIS: Kein fremdes Fahrzeug kommt durch (' + fremdeAlle.length + ' geprueft).');
}

main().catch((err) => { console.error(err); process.exit(1); });
