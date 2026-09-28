/*
 * Alle Hintergruende naeher heranholen und aufhellen.
 *
 * ── Warum Zuschnitt und nicht "Auto kleiner" ──────────────────────
 *
 * Die Raeume wirkten eng und die Fahrzeuge zu gross. Das Fahrzeug
 * kleiner zu rechnen waere der falsche Hebel: Dann steht ein winziges
 * Auto in einem winzigen Raum, das Verhaeltnis bleibt gleich.
 *
 * Ein Zuschnitt dreht das Verhaeltnis wirklich um. Wird aus dem Bild
 * ein Ausschnitt von 80 Prozent herausgeschnitten und wieder auf die
 * volle Groesse gezogen, wachsen Wand, Boden und Leuchten um ein
 * Viertel — das Fahrzeug aber nicht. Es wirkt dadurch kleiner, und der
 * Raum groesser.
 *
 * ── Warum die .json mitwandern muss ───────────────────────────────
 *
 * Neben jedem Raum stehen Horizont und Wandlinie als Anteil der
 * Bildhoehe. Nach einem Zuschnitt stimmen diese Anteile nicht mehr:
 * Was vorher bei 46 Prozent lag, liegt im Ausschnitt woanders. Ohne
 * Umrechnung wuerde der Kompositor das Fahrzeug an der falschen Stelle
 * absetzen — es stuende in der Wand oder schwebte.
 *
 * Aufruf:
 *   npx tsx scripts/raeume-zoomen.ts [anteil] [helligkeit]
 *   npx tsx scripts/raeume-zoomen.ts 0.8 1.08
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

sharp.concurrency(1);

const ORDNER = 'public/backgrounds/raum';
const SICHERUNG = 'tools/proben/raeume_original';

/** Rechnet einen Anteil der Bildhoehe auf den Ausschnitt um. */
function imAusschnitt(wert: number, anteil: number): number {
  const rand = (1 - anteil) / 2;
  return Math.max(0, Math.min(1, (wert - rand) / anteil));
}

async function main() {
  const anteil = Number(process.argv[2] ?? '0.8');
  const helligkeit = Number(process.argv[3] ?? '1.08');
  if (anteil <= 0.3 || anteil > 1) throw new Error('Anteil muss zwischen 0,3 und 1 liegen');

  fs.mkdirSync(SICHERUNG, { recursive: true });
  const dateien = fs.readdirSync(ORDNER).filter((d) => d.endsWith('.jpg'));

  for (const datei of dateien) {
    const quelle = path.join(ORDNER, datei);
    const sicher = path.join(SICHERUNG, datei);
    /* Nur beim ersten Lauf sichern, sonst waere die Sicherung selbst zugeschnitten. */
    if (!fs.existsSync(sicher)) fs.copyFileSync(quelle, sicher);

    const roh = fs.readFileSync(sicher);
    const meta = await sharp(roh).metadata();
    const b = meta.width ?? 0, h = meta.height ?? 0;
    if (!b || !h) { console.log('uebersprungen (keine Masse):', datei); continue; }

    const nb = Math.round(b * anteil), nh = Math.round(h * anteil);
    const neu = await sharp(roh)
      .extract({ left: Math.round((b - nb) / 2), top: Math.round((h - nh) / 2), width: nb, height: nh })
      .resize(b, h, { fit: 'fill' })
      .modulate({ brightness: helligkeit })
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
      .toBuffer();
    fs.writeFileSync(quelle, neu);

    /* Horizont und Wandlinie mitziehen. */
    const jsonPfad = quelle.replace(/\.jpg$/, '.json');
    const jsonSicher = sicher.replace(/\.jpg$/, '.json');
    if (fs.existsSync(jsonPfad)) {
      if (!fs.existsSync(jsonSicher)) fs.copyFileSync(jsonPfad, jsonSicher);
      const daten = JSON.parse(fs.readFileSync(jsonSicher, 'utf8'));
      if (typeof daten.horizont === 'number') daten.horizont = Number(imAusschnitt(daten.horizont, anteil).toFixed(4));
      if (typeof daten.wandlinie === 'number') daten.wandlinie = Number(imAusschnitt(daten.wandlinie, anteil).toFixed(4));
      daten.zuschnitt = anteil;
      fs.writeFileSync(jsonPfad, JSON.stringify(daten, null, 2));
    }
    console.log('fertig:', datei);
  }
  console.log(`\n${dateien.length} Raeume auf ${Math.round(anteil * 100)} % zugeschnitten, Helligkeit ${helligkeit}`);
}

main();
