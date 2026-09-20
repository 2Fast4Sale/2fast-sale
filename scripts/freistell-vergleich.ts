/**
 * Vergleicht Freistellverfahren am selben Fotostapel.
 *
 *   npx tsx scripts/freistell-vergleich.ts <ordner> [ziel] [verfahren...]
 *
 * Verfahren: ormbg (Standard, laeuft auch im Browser des Haendlers),
 *            birefnet (gross, sauberere Kanten, viel langsamer)
 *
 *   npx tsx scripts/freistell-vergleich.ts tools/proben/eingang \
 *       tools/proben/vergleich ormbg birefnet
 *
 * ── Warum ──────────────────────────────────────────────────────────
 *
 * "Sieht besser aus" ist kein Befund. Im Stapel ueber 64 Fotos waren
 * rund 20 kaputt, fast immer wegen des Freistellens — aber ob ein
 * anderes Modell oder eine Nachbearbeitung das wirklich behebt, sieht
 * man erst an denselben Fotos mit denselben Zahlen.
 *
 * Gemessen wird je Foto und Verfahren:
 *   deckung     Anteil deckender Pixel am Bild
 *   rechteckig  wie gut die Flaeche ihr Rechteck ausfuellt
 *   randVoll    Anteil deckender Pixel auf der Randlinie — verraet
 *               stehengebliebenen Hintergrund
 *   loecher     Anteil eingeschlossener Loecher in der Maske
 *   saum        Anteil halbdurchsichtiger Pixel (ausgefranste Kante)
 *   sekunden    Rechenzeit
 *
 * ── Schonend fuer den Rechner ──────────────────────────────────────
 *
 * Laeuft bewusst nacheinander und mit EINEM Rechenkern, Standard.
 * Mit KERNE=2 laesst sich das aufheben. Der Rechner des Entwicklers hat
 * zwei Kerne; ein Stapellauf mit allen Kernen macht ihn unbenutzbar —
 * genau das ist schon einmal passiert.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { freistellGuete } from '../lib/studio/freistellGuete';

const [ordner, ziel = 'tools/proben/vergleich', ...gewaehlt] = process.argv.slice(2);
if (!ordner) {
  console.error('Aufruf: freistell-vergleich.ts <ordner> [ziel] [ormbg|birefnet ...]');
  process.exit(1);
}
const VERFAHREN = gewaehlt.length ? gewaehlt : ['ormbg'];

process.env.OMP_NUM_THREADS ??= process.env.KERNE ?? '1';
process.env.ONNX_NUM_THREADS ??= process.env.KERNE ?? '1';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ormbgPipe: any = null;

async function freistellenOrmbg(pfad: string): Promise<Buffer> {
  const { pipeline, RawImage } = await import('@huggingface/transformers');
  if (!ormbgPipe) {
    ormbgPipe = await pipeline('background-removal', 'onnx-community/ormbg-ONNX', { dtype: 'q8' });
  }
  const jpg = await sharp(pfad).resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 }).toBuffer();
  const bild = await RawImage.fromBlob(new Blob([new Uint8Array(jpg)], { type: 'image/jpeg' }));
  const aus = await ormbgPipe(bild);
  const r = Array.isArray(aus) ? aus[0] : aus;
  return sharp(Buffer.from(r.data), { raw: { width: r.width, height: r.height, channels: r.channels } })
    .png().toBuffer();
}

async function freistellenBiRefNet(pfad: string): Promise<Buffer> {
  const { freistellen } = await import('./freistellen-eigen');
  return freistellen(pfad);
}

/** Zusatzmasse, die freistellGuete nicht liefert: Loecher und Saum. */
async function maskenMasse(frei: Buffer) {
  const { data, info } = await sharp(frei).ensureAlpha().extractChannel(3)
    .resize(300, 300, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  const b = info.width, h = info.height;

  let deckend = 0, saum = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] >= 128) deckend++;
    else if (data[i] > 24) saum++;     // halbdurchsichtig: ausgefranst
  }

  /*
   * Loecher: durchsichtige Flaechen, die NICHT mit dem Bildrand
   * verbunden sind. Ein sauber freigestelltes Auto hat wenige (Fenster
   * zaehlen nicht, die sind deckend). Viele Loecher heissen: Die Maske
   * ist loechrig, das Bild wird spaeter fleckig.
   */
  const gesehen = new Uint8Array(b * h);
  const stapel: number[] = [];
  const anstossen = (p: number) => {
    if (gesehen[p] || data[p] >= 128) return;
    gesehen[p] = 1; stapel.push(p);
  };
  for (let x = 0; x < b; x++) { anstossen(x); anstossen((h - 1) * b + x); }
  for (let y = 0; y < h; y++) { anstossen(y * b); anstossen(y * b + b - 1); }
  while (stapel.length) {
    const p = stapel.pop()!;
    const x = p % b, y = (p - x) / b;
    if (x > 0) anstossen(p - 1);
    if (x < b - 1) anstossen(p + 1);
    if (y > 0) anstossen(p - b);
    if (y < h - 1) anstossen(p + b);
  }
  let loecher = 0;
  for (let p = 0; p < b * h; p++) if (data[p] < 128 && !gesehen[p]) loecher++;

  const flaeche = b * h;
  return { loecher: loecher / flaeche, saum: saum / flaeche, deckendRoh: deckend / flaeche };
}

async function main() {
  fs.mkdirSync(ziel, { recursive: true });
  const fotos = fs.readdirSync(ordner)
    .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
    .sort();
  console.log(`${fotos.length} Fotos, Verfahren: ${VERFAHREN.join(', ')}\n`);

  const zeilen: string[] = ['datei;verfahren;deckung;rechteckig;rand_voll;loecher;saum;brauchbar;sekunden'];
  const summe: Record<string, { n: number; brauchbar: number; sek: number; saum: number; loecher: number }> = {};

  for (const [i, datei] of fotos.entries()) {
    for (const verfahren of VERFAHREN) {
      const start = Date.now();
      try {
        const frei = verfahren === 'birefnet'
          ? await freistellenBiRefNet(path.join(ordner, datei))
          : await freistellenOrmbg(path.join(ordner, datei));
        const g = await freistellGuete(frei);
        const m = await maskenMasse(frei);
        const sek = (Date.now() - start) / 1000;

        summe[verfahren] ??= { n: 0, brauchbar: 0, sek: 0, saum: 0, loecher: 0 };
        summe[verfahren].n++;
        if (g.brauchbar) summe[verfahren].brauchbar++;
        summe[verfahren].sek += sek;
        summe[verfahren].saum += m.saum;
        summe[verfahren].loecher += m.loecher;

        zeilen.push([datei, verfahren, g.deckung.toFixed(3), g.rechteckig.toFixed(3),
          g.randVoll.toFixed(3), m.loecher.toFixed(4), m.saum.toFixed(4),
          g.brauchbar ? 'ja' : 'nein', sek.toFixed(1)].join(';'));

        // Nur die auffaelligen speichern — sonst laeuft die Platte voll.
        if (!g.brauchbar) {
          await sharp(frei).flatten({ background: '#ff00ff' }).resize(700)
            .jpeg({ quality: 80 })
            .toFile(path.join(ziel, `${verfahren}_${datei.replace(/\.\w+$/, '')}.jpg`));
        }
        console.log(`${String(i + 1).padStart(3)}/${fotos.length} ${datei.padEnd(28).slice(0, 28)} ${verfahren.padEnd(9)} ${sek.toFixed(1).padStart(5)} s  ${g.brauchbar ? 'ok  ' : 'KAPUTT'} rand ${g.randVoll.toFixed(2)} saum ${m.saum.toFixed(3)}`);
      } catch (err) {
        zeilen.push([datei, verfahren, '', '', '', '', '', 'fehler', ''].join(';'));
        console.log(`${String(i + 1).padStart(3)}/${fotos.length} ${datei} ${verfahren}: FEHLER ${String((err as Error)?.message).slice(0, 80)}`);
      }
    }
  }

  fs.writeFileSync(path.join(ziel, 'vergleich.csv'), zeilen.join('\n'), 'utf8');

  console.log('\n── Vergleich ──');
  for (const [v, s] of Object.entries(summe)) {
    console.log(
      `${v.padEnd(10)} brauchbar ${s.brauchbar}/${s.n} (${Math.round((s.brauchbar / s.n) * 100)} %)` +
      `  Saum ${(s.saum / s.n).toFixed(4)}  Loecher ${(s.loecher / s.n).toFixed(4)}` +
      `  ${(s.sek / s.n).toFixed(1)} s je Foto`,
    );
  }
  console.log(`\n→ ${path.join(ziel, 'vergleich.csv')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
