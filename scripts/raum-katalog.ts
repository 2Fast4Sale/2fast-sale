/**
 * Setzt EIN Fahrzeug in ALLE gerenderten Raeume und legt zusaetzlich
 * eine Uebersicht an.
 *
 *   npx tsx scripts/raum-katalog.ts <auto.png> [ordner] [ziel]
 *
 * Ohne Uebersicht muesste man acht Bilder nacheinander oeffnen und sich
 * das vorige merken. Nebeneinander sieht man in zwei Sekunden, welcher
 * Raum trägt und welcher nicht — und darum geht es hier: Die Auswahl
 * trifft ein Mensch, das Rechnen macht die Maschine.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { komponieren, STANDARD } from '../lib/studio/kompositor';

const auto   = process.argv[2];
const ordner = process.argv[3] ?? 'public/backgrounds/raum';
const ziel   = process.argv[4] ?? 'public/backgrounds/raum/katalog';

if (!auto) {
  console.error('Aufruf: raum-katalog.ts <auto.png> [ordner] [ziel]');
  process.exit(1);
}

/** Breite einer Kachel in der Uebersicht. */
const KACHEL = 640;
const SPALTEN = 2;

async function main() {
  const fahrzeug = fs.readFileSync(auto);

  // Nur Raeume mit Nebendatei. Ohne .json fehlen Horizont und Glanz —
  // dann waere es ein gefundenes Bild und kein gerenderter Raum.
  const raeume = fs.readdirSync(ordner)
    .filter((f) => /\.jpe?g$/i.test(f))
    .filter((f) => fs.existsSync(path.join(ordner, f.replace(/\.jpe?g$/i, '.json'))))
    .sort();

  if (raeume.length === 0) throw new Error(`Keine Raeume in ${ordner}`);
  fs.mkdirSync(ziel, { recursive: true });

  const kacheln: { name: string; bild: Buffer }[] = [];

  for (const datei of raeume) {
    const name = datei.replace(/\.jpe?g$/i, '');
    const hintergrund = fs.readFileSync(path.join(ordner, datei));
    const m = JSON.parse(
      fs.readFileSync(path.join(ordner, `${name}.json`), 'utf-8'),
    );

    const r = await komponieren(fahrzeug, hintergrund, {
      ...STANDARD,
      // Der Boden bestimmt die Spiegelung, nicht der Kompositor.
      ...(typeof m.bodenglanz === 'number' ? { spiegelungStaerke: m.bodenglanz } : {}),
      // Und der Horizont bestimmt die Perspektive des Schattens.
      ...(typeof m.horizont === 'number' ? { horizont: m.horizont } : {}),
      ...(typeof m.kameraHoehe === 'number' ? { kameraHoehe: m.kameraHoehe } : {}),
      ...(typeof m.brennweite === 'number' ? { brennweite: m.brennweite } : {}),
    });

    fs.writeFileSync(path.join(ziel, `${name}.jpg`), r.bild);
    console.log(`${name.padEnd(18)} Glanz ${String(m.bodenglanz ?? '—').padEnd(5)} → ${ziel}/${name}.jpg`);

    kacheln.push({ name, bild: r.bild });
  }

  /* ── Uebersicht ── */
  const kachelH = Math.round(KACHEL / 1.5);
  const zeilen = Math.ceil(kacheln.length / SPALTEN);
  const beschriftung = 26;

  const teile: sharp.OverlayOptions[] = [];
  for (let i = 0; i < kacheln.length; i++) {
    const sx = (i % SPALTEN) * KACHEL;
    const sy = Math.floor(i / SPALTEN) * (kachelH + beschriftung);

    teile.push({
      input: await sharp(kacheln[i].bild).resize(KACHEL, kachelH, { fit: 'fill' }).png().toBuffer(),
      left: sx, top: sy + beschriftung,
    });
    teile.push({
      input: Buffer.from(
        `<svg width="${KACHEL}" height="${beschriftung}">
           <rect width="${KACHEL}" height="${beschriftung}" fill="#111"/>
           <text x="10" y="18" font-family="sans-serif" font-size="15" fill="#fff">${kacheln[i].name}</text>
         </svg>`,
      ),
      left: sx, top: sy,
    });
  }

  const uebersicht = path.join(ziel, '_uebersicht.jpg');
  await sharp({
    create: {
      width: SPALTEN * KACHEL,
      height: zeilen * (kachelH + beschriftung),
      channels: 3,
      background: '#111',
    },
  })
    .composite(teile)
    .jpeg({ quality: 88 })
    .toFile(uebersicht);

  console.log('Uebersicht →', uebersicht);
}

main().catch((e) => { console.error(e); process.exit(1); });
