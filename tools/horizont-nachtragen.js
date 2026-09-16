/**
 * Traegt in allen Raum-.json die richtige Fluchtlinie nach.
 *
 *   node tools/horizont-nachtragen.js [--schreiben]
 *
 * In `horizont` stand bisher die Kante zwischen Boden und Rueckwand. Der
 * Kompositor braucht dort aber die Fluchtlinie der Bodenebene, also die
 * Augenhoehe der Kamera im Bild — sonst stimmt die Entfernungsrechnung
 * nicht und der Schatten liegt daneben.
 *
 * Neu rendern muss man dafuer nichts: Die Fluchtlinie folgt allein aus
 * Kamerastandpunkt, Blickziel und Brennweite, und die sind in
 * tools/raum_render.py feste Zahlen.
 *
 *   Fluchtlinie = 0,5 + Neigung / senkrechter Bildwinkel
 *
 * Die alte Wandkante bleibt als `wandlinie` erhalten.
 */

const fs = require('fs');
const path = require('path');

const ORDNER = path.join(__dirname, '..', 'public', 'backgrounds', 'raum');
const SENSOR_HOCH = 24;   // mm, Kleinbild

// Kamera und Blickziel aus raum_render.py, je Bauart.
const AUFBAU = {
  galerie: { pos: [0, -9, 1.55], ziel: [0, 6, 1.35] },
  sonst:   { pos: [0, -9, 1.55], ziel: [0, 0.5, 0.55] },
};

const grad = (x) => (x * 180) / Math.PI;

let geaendert = 0;
for (const datei of fs.readdirSync(ORDNER).filter((f) => f.endsWith('.json'))) {
  const pfad = path.join(ORDNER, datei);
  const j = JSON.parse(fs.readFileSync(pfad, 'utf8').replace(/^﻿/, ''));
  const a = AUFBAU[j.bauart === 'galerie' ? 'galerie' : 'sonst'];

  const weite = Math.hypot(a.ziel[0] - a.pos[0], a.ziel[1] - a.pos[1]);
  const neigung = grad(Math.atan2(a.pos[2] - a.ziel[2], weite));   // Blick nach unten
  const bildwinkel = grad(2 * Math.atan(SENSOR_HOCH / 2 / (j.brennweite || 55)));
  /*
   * MINUS, nicht plus. Schaut die Kamera nach unten, wandert die
   * Fluchtlinie im Bild nach OBEN — der Boden laeuft ja nach oben auf sie
   * zu. Mit plus lag sie im weissen Raum bei 0,744 und damit mitten in den
   * Raedern, obwohl der Boden schon bei 0,496 an der Wand endet. Ein
   * Bodenpunkt kann nie oberhalb der Fluchtlinie liegen; genau daran war
   * der Fehler zu erkennen.
   */
  const flucht = Number((0.5 - neigung / bildwinkel).toFixed(4));

  if (j.wandlinie === undefined) j.wandlinie = j.horizont;
  const alt = j.horizont;
  j.horizont = flucht;

  console.log(
    datei.padEnd(24),
    `${j.brennweite} mm`.padStart(7),
    'Wandkante', String(j.wandlinie).padEnd(7),
    '→ Fluchtlinie', String(flucht),
    alt === flucht ? '(unveraendert)' : '',
  );

  if (process.argv.includes('--schreiben')) {
    fs.writeFileSync(pfad, JSON.stringify(j, null, 2), 'utf8');
    geaendert++;
  }
}
console.log(process.argv.includes('--schreiben')
  ? `${geaendert} Dateien geschrieben.`
  : 'Nur angezeigt. Mit --schreiben wird es uebernommen.');
