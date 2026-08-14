/**
 * Erzeugt Vorschaubilder für die Hintergrund-Auswahl.
 *
 * Warum es das braucht: Hintergründe sind Beschreibungen, keine Dateien —
 * die PhotoRoom-API kann einen Hintergrund nicht allein erzeugen, sie braucht
 * immer ein Motiv. Die Auswahlseite hätte sonst nichts zu zeigen.
 *
 * Dieses Skript schickt EIN Referenzfahrzeug durch jeden Hintergrund und legt
 * das Ergebnis als Vorschau ab. Danach zeigen die Kacheln echte Bilder statt
 * einer Farbandeutung.
 *
 * Aufruf:
 *   node --env-file=.env.local scripts/vorschauen-erzeugen.mjs
 *   node --env-file=.env.local scripts/vorschauen-erzeugen.mjs studio_dark
 *
 * Kosten: ein API-Bild je Hintergrund, also zehn insgesamt.
 * Danach entstehen keine weiteren Kosten — die Vorschauen sind Dateien.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const KEY = process.env.PHOTOROOM_API_KEY;
if (!KEY) {
  console.error('PHOTOROOM_API_KEY fehlt. Aufruf mit: node --env-file=.env.local ...');
  process.exit(1);
}

/** Referenzfahrzeug. Eigenes Foto bevorzugt, sonst ein neutrales aus dem Netz. */
const EIGENES = join(process.cwd(), 'scripts', 'referenz-auto.jpg');
const FALLBACK = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1600&q=85';

async function referenzBild() {
  if (existsSync(EIGENES)) {
    console.log('Referenzfahrzeug: scripts/referenz-auto.jpg');
    return readFileSync(EIGENES);
  }
  console.log('Referenzfahrzeug: Standardbild (eigenes unter scripts/referenz-auto.jpg ablegen)');
  const res = await fetch(FALLBACK);
  return Buffer.from(await res.arrayBuffer());
}

/** Liest die Hintergründe aus lib/backgrounds.ts, ohne TypeScript zu laden. */
function hintergruendeLesen() {
  const src = readFileSync(join(process.cwd(), 'lib', 'backgrounds.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const BACKGROUNDS'), src.indexOf('];', src.indexOf('export const BACKGROUNDS')));
  const eintraege = [];
  for (const teil of block.split(/\n  \{/).slice(1)) {
    const id     = teil.match(/id: '([^']+)'/)?.[1];
    const label  = teil.match(/label: '([^']+)'/)?.[1];
    const seed   = teil.match(/seed: ([\d_]+)/)?.[1]?.replace(/_/g, '');
    const prompt = [...teil.matchAll(/'([^']*)'/g)].map(m => m[1])
      .filter(s => s.length > 40).join('');
    if (id && prompt) eintraege.push({ id, label, seed, prompt });
  }
  return eintraege;
}

const nurDieser = process.argv[2];
const auto = await referenzBild();
const alle = hintergruendeLesen();
const liste = nurDieser ? alle.filter(b => b.id === nurDieser) : alle;

if (liste.length === 0) {
  console.error(nurDieser ? `Kein Hintergrund mit der Kennung "${nurDieser}".` : 'Keine Hintergründe gefunden.');
  process.exit(1);
}

console.log(`\n${liste.length} Vorschau(en) werden erzeugt.\n`);
let ok = 0, fehler = 0;

for (const bg of liste) {
  const fd = new FormData();
  fd.append('imageFile', new Blob([auto], { type: 'image/jpeg' }), 'car.jpg');
  fd.append('background.prompt', bg.prompt);
  if (bg.seed) fd.append('background.seed', bg.seed);
  fd.append('shadow.mode', 'ai.soft');
  // Kleiner als die Ausgabe im Betrieb — für eine Kachel reicht das,
  // und es haelt die Dateien im Projekt klein.
  fd.append('outputSize', '900x600');

  const res = await fetch('https://image-api.photoroom.com/v2/edit', {
    method: 'POST', headers: { 'x-api-key': KEY }, body: fd,
  });

  if (!res.ok) {
    console.log(`  ✗ ${bg.label.padEnd(22)} HTTP ${res.status}  ${(await res.text()).slice(0, 90)}`);
    fehler++;
    continue;
  }

  const datei = `preview_${bg.id}.jpg`;
  writeFileSync(join(process.cwd(), 'public', 'backgrounds', datei), Buffer.from(await res.arrayBuffer()));
  console.log(`  ✓ ${bg.label.padEnd(22)} → public/backgrounds/${datei}`);
  ok++;
}

console.log(`\n${ok} erzeugt, ${fehler} fehlgeschlagen.`);
if (ok > 0) {
  console.log('\nJetzt in lib/backgrounds.ts bei jedem Eintrag ergaenzen:');
  console.log("  preview: 'preview_<id>.jpg',");
  console.log('\nDanach zeigen die Kacheln echte Bilder.');
}
