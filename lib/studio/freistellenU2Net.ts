/**
 * Freistellen mit U-2-Net — kostenlos, auf unserem Server.
 *
 * ── Warum dieses Modell ────────────────────────────────────────────
 *
 * Bis hierher lief das Freistellen mit ormbg im Browser des Haendlers.
 * ormbg ist gut, aber fuer die falsche Aufgabe gebaut: Die Modellkarte
 * sagt woertlich "optimized for images with humans" und nennt als
 * Trainingsdaten P3M-10K, AIM-500 und PPM-100 — alles Personenfotos.
 * Im Stapeltest ueber 64 echte Fahrzeugfotos blieb deshalb bei rund
 * einem Drittel ein Stueck Untergrund stehen oder es wurde nur ein
 * Bruchstueck des Autos erkannt. Kein Schwellenwert-Problem, sondern
 * das falsche Modell.
 *
 * U-2-Net (Xuebin Qin u.a., Apache-2.0) ist auf beliebige
 * Vordergrundobjekte trainiert und damit fuer Fahrzeuge geeignet.
 *
 * ── Warum hier und nicht im Browser ────────────────────────────────
 *
 * Gemessen an denselben Fotos (ein Rechenkern):
 *
 *   ormbg (Browser)      alle Fotos, aber ein Drittel unbrauchbar
 *   BiRefNet lite 1024   sehr sauber, 40 s je Foto, 2,3 GB Speicher
 *   U-2-Net 320          sauber, 6 s je Foto, 0,9 GB Speicher
 *
 * BiRefNet waere das beste Modell, sprengt aber den Speicher einer
 * Vercel-Funktion (2 GB) — und im Browser laeuft es gar nicht: Der
 * WASM-Rechenkern kennt den DeformConv-Schritt nicht ("Could not find
 * an implementation for DeformConv(19)"). Dasselbe gilt fuer die
 * Kennzeichenerkennung; deshalb liegt beides auf dem Server.
 *
 * ── Modelldatei ────────────────────────────────────────────────────
 *
 * 176 MB, deshalb NICHT im Repository. Beim ersten Aufruf wird sie
 * geladen und liegt danach im Zwischenspeicher der Funktion. Lokal
 * reicht tools/modelle/u2net.onnx.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

/** U-2-Net rechnet auf 320 x 320. Andere Groessen bringen nichts. */
const KANTE = 320;
const MITTEL = [0.485, 0.456, 0.406];
const STREUUNG = [0.229, 0.224, 0.225];

const QUELLE = process.env.U2NET_URL
  || 'https://huggingface.co/BritishWerewolf/U-2-Net/resolve/main/onnx/model.onnx';

/** Auf Vercel ist nur /tmp beschreibbar. */
function modellPfad(): string {
  const eigen = path.join(process.cwd(), 'tools', 'modelle', 'u2net.onnx');
  if (fs.existsSync(eigen)) return eigen;
  return path.join(process.env.VERCEL ? '/tmp' : os.tmpdir(), 'u2net.onnx');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sitzungVersprechen: Promise<any> | null = null;

async function sitzung() {
  if (!sitzungVersprechen) {
    sitzungVersprechen = (async () => {
      const ziel = modellPfad();
      if (!fs.existsSync(ziel)) {
        const t = Date.now();
        const antwort = await fetch(QUELLE);
        if (!antwort.ok) throw new Error(`Modell nicht ladbar: HTTP ${antwort.status}`);
        await fsp.writeFile(ziel, Buffer.from(await antwort.arrayBuffer()));
        console.info('[freistellen] Modell geladen nach', ziel, `${Date.now() - t} ms`);
      }
      const ort = await import('onnxruntime-node');
      return ort.InferenceSession.create(ziel, {
        // Auf Vercel gibt es wenige Kerne; mehr Threads bringen dort
        // nichts und kosten Speicher.
        intraOpNumThreads: Math.max(1, Number(process.env.U2NET_KERNE) || 1),
        graphOptimizationLevel: 'all',
        executionMode: 'sequential',
      });
    })();
    // Scheitert das Laden, beim naechsten Aufruf neu versuchen.
    sitzungVersprechen.catch(() => { sitzungVersprechen = null; });
  }
  return sitzungVersprechen;
}

/**
 * Stellt ein Fahrzeugfoto frei und liefert ein PNG mit Alphakanal in der
 * Groesse des Eingangsbildes.
 */
export async function freistellenU2Net(foto: Buffer): Promise<Buffer> {
  const ort = await import('onnxruntime-node');
  const meta = await sharp(foto).metadata();
  const breite = meta.width ?? 0, hoehe = meta.height ?? 0;
  if (!breite || !hoehe) throw new Error('Bild ohne Groessenangabe');

  const { data } = await sharp(foto)
    .resize(KANTE, KANTE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const flaeche = KANTE * KANTE;
  const eingabe = new Float32Array(3 * flaeche);
  for (let i = 0; i < flaeche; i++) {
    for (let k = 0; k < 3; k++) {
      eingabe[k * flaeche + i] = (data[i * 3 + k] / 255 - MITTEL[k]) / STREUUNG[k];
    }
  }

  const s = await sitzung();
  const ergebnis = await s.run({
    [s.inputNames[0]]: new ort.Tensor('float32', eingabe, [1, 3, KANTE, KANTE]),
  });
  const roh = ergebnis[s.outputNames[0]].data as Float32Array;

  /*
   * Auf die volle Spanne ziehen, wie es auch rembg macht. Ohne das
   * liegt die Maske je nach Bild in einem engen Wertebereich und der
   * Wagen wird entweder halbdurchsichtig oder der Hintergrund bleibt
   * grau stehen.
   */
  let min = Infinity, max = -Infinity;
  for (const w of roh) { if (w < min) min = w; if (w > max) max = w; }
  const spanne = Math.max(1e-6, max - min);

  const maske = Buffer.alloc(flaeche);
  for (let i = 0; i < flaeche; i++) {
    maske[i] = Math.max(0, Math.min(255, Math.round(((roh[i] - min) / spanne) * 255)));
  }

  const alpha = await sharp(maske, { raw: { width: KANTE, height: KANTE, channels: 1 } })
    .resize(breite, hoehe, { fit: 'fill' })
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  const farbe = await sharp(foto).removeAlpha().toBuffer();
  return sharp(farbe)
    .joinChannel(alpha, { raw: { width: breite, height: hoehe, channels: 1 } })
    .png()
    .toBuffer();
}
