/**
 * Trennt der Fahrzeugkasten Innenraum von Aussenaufnahme?
 *
 *   npx tsx scripts/innenraum-probe.ts <foto> [<foto> ...]
 *
 * Hintergrund: Die erste Fassung der Sperre fragte nur, OB ein Fahrzeug
 * gefunden wird. Auf einem Innenraumfoto wird eines gefunden — man
 * sitzt ja darin, und der Erkenner legt den Kasten ueber das ganze
 * Bild. Genau daran ist die Sperre im Live-Test vorbeigelaufen.
 *
 * Der brauchbare Unterschied ist die GROESSE des Kastens. Dieses
 * Skript misst sie an echten Fotos, damit die Schwelle nicht geraten
 * ist.
 */
import { readFileSync } from 'node:fs';
import { fahrzeugKastenFinden } from '../lib/studio/kennzeichenModell';

const SCHWELLE = 0.92;

async function main() {
  const dateien = process.argv.slice(2);
  if (dateien.length === 0) {
    console.log('Bitte Fotos angeben: npx tsx scripts/innenraum-probe.ts bild1.jpg bild2.jpg');
    return;
  }
  for (const datei of dateien) {
    const kasten = await fahrzeugKastenFinden(readFileSync(datei));
    const name = datei.split(/[\/]/).pop();
    if (!kasten || kasten === 'keins') {
      console.log(`${name}: kein Fahrzeug  →  kein Studio`);
      continue;
    }
    const b = kasten.x1 - kasten.x0, h = kasten.y1 - kasten.y0;
    const randlos = b > SCHWELLE && h > SCHWELLE;
    console.log(
      `${name}: Kasten ${b.toFixed(2)} breit x ${h.toFixed(2)} hoch  →  `
      + (randlos ? 'INNENRAUM, kein Studio' : 'Aussenaufnahme, ab ins Studio'),
    );
  }
}

main().catch(e => { console.error(e); process.exit(1); });
