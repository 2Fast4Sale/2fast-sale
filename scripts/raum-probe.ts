/**
 * Setzt ein freigestelltes Fahrzeug in einen gerenderten Raum — zum
 * Ansehen, nicht fuer den Betrieb.
 *
 *   npx tsx scripts/raum-probe.ts <auto.png> <raum.jpg> <ausgabe-ordner>
 *
 * Zweck: Ein Hintergrund laesst sich allein nicht beurteilen. Erst mit
 * Fahrzeug zeigt sich, ob Standlinie, Groesse und Schatten stimmen.
 */

import fs from 'node:fs';
import path from 'node:path';
import { komponieren, STANDARD } from '../lib/studio/kompositor';

const [auto, raum, ziel] = process.argv.slice(2);
if (!auto || !raum || !ziel) {
  console.error('Aufruf: raum-probe.ts <auto.png> <raum.jpg> <ordner>');
  process.exit(1);
}

/**
 * Drei Varianten, damit der Unterschied sichtbar wird statt beschrieben.
 * `bodenabstand` ist der Abstand der Standlinie zur Bildunterkante,
 * `breitenanteil` die Fahrzeugbreite als Anteil der Bildbreite.
 */
const VARIANTEN = {
  standard: {},
  ohne_kontakt: { kontaktStaerke: 0 },
  gross_vorn: { bodenabstand: 0.08, breitenanteil: 0.72 },
};

async function main() {
  const fahrzeug = fs.readFileSync(auto);
  const hintergrund = fs.readFileSync(raum);

  /*
   * Der Raum bringt seine eigenen Werte mit. Wichtig ist `bodenglanz`:
   * Wie stark sich das Fahrzeug spiegelt, haengt am Boden und nicht am
   * Kompositor — matter Estrich spiegelt anders als polierter Beton.
   */
  const daten = raum.replace(/\.jpe?g$/i, '.json');
  const ausRaum: Partial<typeof STANDARD> = {};
  if (fs.existsSync(daten)) {
    const m = JSON.parse(fs.readFileSync(daten, 'utf-8'));
    console.log(`Raum: Horizont bei ${(m.horizont * 100).toFixed(1)} % der Bildhoehe, `
              + `Kamera ${m.kameraHoehe} m, ${m.brennweite} mm, Glanz ${m.bodenglanz ?? '—'}`);
    if (typeof m.bodenglanz === 'number') ausRaum.spiegelungStaerke = m.bodenglanz;
  }

  fs.mkdirSync(ziel, { recursive: true });
  for (const [name, e] of Object.entries(VARIANTEN)) {
    const r = await komponieren(fahrzeug, hintergrund, { ...STANDARD, ...ausRaum, ...e });
    const datei = path.join(ziel, `probe_${name}.jpg`);
    fs.writeFileSync(datei, r.bild);
    console.log(name, '→', datei, r.messwerte);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
