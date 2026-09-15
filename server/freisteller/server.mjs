/**
 * Freistell-Server fuer 2Fast4Sale.
 *
 * Nimmt ein Fahrzeugfoto entgegen und gibt das freigestellte Fahrzeug als
 * WebP mit Alphakanal zurueck. Sonst nichts — Raum, Schatten und
 * Kennzeichen macht weiterhin die Website.
 *
 *   POST /freistellen   Rumpf: das Foto (JPEG, PNG oder WebP)
 *                       Antwort: image/webp mit Transparenz
 *   GET  /              Lebenszeichen
 *
 * Warum ein eigener Server: Die kostenlosen PhotoRoom-Bilder sind
 * verbraucht. BiRefNet (MIT-Lizenz) stellt mindestens so gut frei und
 * kostet je Bild nichts, braucht aber mehr Rechenzeit, als eine
 * Vercel-Funktion haben darf. Deshalb laeuft es hier, und der Browser des
 * Haendlers spricht diesen Server direkt an.
 *
 * Laeuft auf Hugging Face Spaces (kostenlos, 2 Kerne) und spaeter
 * unveraendert auf jedem bezahlten Server mit Docker.
 */

import http from 'node:http';
import os from 'node:os';
import sharp from 'sharp';
import * as ort from 'onnxruntime-node';

const PORT = Number(process.env.PORT || 7860);
const MODELL = process.env.MODELL || '/app/model.onnx';
const KANTE = 1024;                        // dieser Export ist auf 1024 festgelegt
const MAX_BYTES = 15 * 1024 * 1024;
const ZIEL_BREITE = 2000;                  // mehr braucht der Kompositor nicht

/*
 * Nur die eigene Website darf anfragen. Ohne diese Liste koennte jede
 * fremde Seite den Server als kostenlosen Freisteller benutzen und ihn
 * lahmlegen. Mehrere Adressen durch Komma getrennt.
 */
const ERLAUBT = (process.env.ERLAUBTE_HERKUNFT || 'https://2fast4sale.com,https://www.2fast4sale.com')
  .split(',').map((s) => s.trim()).filter(Boolean);

const MITTEL = [0.485, 0.456, 0.406];
const STREUUNG = [0.229, 0.224, 0.225];

console.log('[freisteller] lade Modell', MODELL);
const sitzung = await ort.InferenceSession.create(MODELL, {
  intraOpNumThreads: os.cpus().length,
  graphOptimizationLevel: 'all',
});
console.log('[freisteller] bereit auf Port', PORT, 'mit', os.cpus().length, 'Kernen');

/*
 * Immer nur ein Bild zur Zeit. Zwei parallel auf zwei Kernen sind nicht
 * schneller, verdoppeln aber den Speicher — und 16 GB sind schnell voll.
 */
let kette = Promise.resolve();
const nacheinander = (arbeit) => {
  const ergebnis = kette.then(arbeit, arbeit);
  kette = ergebnis.catch(() => {});
  return ergebnis;
};

async function freistellen(roh) {
  const meta = await sharp(roh).rotate().metadata();
  // Hochformat-Handyfotos kommen mit EXIF-Drehung; rotate() legt sie richtig.
  const gedreht = await sharp(roh).rotate().toBuffer();
  const breite = meta.orientation && meta.orientation >= 5 ? meta.height : meta.width;
  const hoehe  = meta.orientation && meta.orientation >= 5 ? meta.width  : meta.height;

  const { data } = await sharp(gedreht).resize(KANTE, KANTE, { fit: 'fill' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const flaeche = KANTE * KANTE;
  const eingabe = new Float32Array(3 * flaeche);
  for (let i = 0; i < flaeche; i++) {
    for (let k = 0; k < 3; k++) {
      eingabe[k * flaeche + i] = (data[i * 3 + k] / 255 - MITTEL[k]) / STREUUNG[k];
    }
  }

  const start = Date.now();
  const aus = await sitzung.run({
    [sitzung.inputNames[0]]: new ort.Tensor('float32', eingabe, [1, 3, KANTE, KANTE]),
  });
  const werte = aus[sitzung.outputNames[sitzung.outputNames.length - 1]].data;

  let min = Infinity, max = -Infinity;
  for (const v of werte) { if (v < min) min = v; if (v > max) max = v; }
  const sigmoid = min < -0.01 || max > 1.01;
  const maske = Buffer.alloc(flaeche);
  for (let i = 0; i < flaeche; i++) {
    const v = sigmoid ? 1 / (1 + Math.exp(-werte[i])) : werte[i];
    maske[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }

  const alpha = await sharp(maske, { raw: { width: KANTE, height: KANTE, channels: 1 } })
    .resize(breite, hoehe, { fit: 'fill' }).toColourspace('b-w').raw().toBuffer();
  const farbe = await sharp(gedreht).removeAlpha().raw().toBuffer();

  const webp = await sharp(farbe, { raw: { width: breite, height: hoehe, channels: 3 } })
    .joinChannel(alpha, { raw: { width: breite, height: hoehe, channels: 1 } })
    .resize({ width: Math.min(breite, ZIEL_BREITE), withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer();

  console.log(`[freisteller] ${breite}x${hoehe} in ${Date.now() - start} ms, ${Math.round(webp.length / 1024)} KB`);
  return webp;
}

function cors(req, res) {
  const herkunft = req.headers.origin;
  if (herkunft && ERLAUBT.includes(herkunft)) {
    res.setHeader('Access-Control-Allow-Origin', herkunft);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  return !herkunft || ERLAUBT.includes(herkunft);
}

http.createServer(async (req, res) => {
  const erlaubt = cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(erlaubt ? 204 : 403); return res.end(); }
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('2Fast4Sale Freisteller laeuft');
  }
  if (req.method !== 'POST' || req.url !== '/freistellen') { res.writeHead(404); return res.end(); }
  if (!erlaubt) { res.writeHead(403); return res.end('Herkunft nicht erlaubt'); }

  const teile = [];
  let laenge = 0;
  for await (const stueck of req) {
    laenge += stueck.length;
    if (laenge > MAX_BYTES) { res.writeHead(413); return res.end('Bild zu gross'); }
    teile.push(stueck);
  }

  try {
    const webp = await nacheinander(() => freistellen(Buffer.concat(teile)));
    res.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store' });
    res.end(webp);
  } catch (err) {
    console.error('[freisteller] Fehler:', err);
    res.writeHead(422, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bild konnte nicht verarbeitet werden');
  }
}).listen(PORT);
