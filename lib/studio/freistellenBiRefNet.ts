/**
 * Freistellen mit BiRefNet lite — für Fahrzeuge, nicht für Menschen.
 *
 * ── Warum das gebraucht wird ───────────────────────────────────────
 *
 * Bis hierher lief das Freistellen mit ormbg im Browser des Haendlers.
 * ormbg ist ein sehr gutes Modell — fuer die falsche Aufgabe: Die
 * Modellkarte sagt woertlich "optimized for images with humans",
 * trainiert auf P3M-10K, AIM-500 und PPM-100, also auf Personenfotos.
 *
 * Genau daher kommen die zwei Fehlerbilder aus dem Stapeltest ueber 64
 * echte Fahrzeugfotos: Bei rund einem Drittel blieb ein rechteckiges
 * Stueck Untergrund stehen oder es wurde nur ein Bruchstueck des Autos
 * erkannt. Das war nie ein Schwellenwert-Problem, sondern das falsche
 * Modell.
 *
 * BiRefNet lite (ZhengPeng7, Gewichte MIT) ist auf DIS5K/HRSOD
 * trainiert, also auf beliebige Vordergrundobjekte.
 *
 * ── Warum der neue Export ──────────────────────────────────────────
 *
 * tools/modelle/birefnet_lite.onnx ist der Standard-Export: Er baut
 * deform_conv2d als entrollten Graphen nach und braucht dadurch auf
 * einem Zweikerner rund 100 Sekunden je Foto. Der dynamische Export
 * (senty-au/BiRefNet_lite-ONNX-dynamic, MIT, native DeformConv,
 * opset 19) rechnet dieselbe Maske in Sekunden.
 *
 * Seitenlaengen muessen Vielfache von 64 sein; andere Werte brechen im
 * Modell ab, statt still eine falsche Maske zu liefern.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** ImageNet-Normierung — das Modell erwartet genau diese Werte. */
const MITTEL = [0.485, 0.456, 0.406];
const STREUUNG = [0.229, 0.224, 0.225];

const MODELL_DATEI = process.env.BIREFNET_MODELL
  || path.join(process.cwd(), 'tools', 'modelle', 'birefnet_lite_dyn.onnx');

/**
 * Rechenkantenlaenge. Vielfaches von 64.
 *
 * 1024 ist die Messlatte des Autors (IoU 0,999 gegenueber PyTorch), 512
 * ist schneller und genuegsamer (rund 1,3 GB Spitzenspeicher), verliert
 * aber an duennen Teilen wie Antenne und Aussenspiegel.
 */
const KANTE = Math.max(64, Math.round((Number(process.env.BIREFNET_KANTE) || 1024) / 64) * 64);

/*
 * Standardmaessig EIN Rechenkern.
 *
 * Der Entwicklerrechner hat zwei; ein Stapellauf mit allen Kernen hat
 * ihn schon einmal unbenutzbar gemacht. Ueber BIREFNET_KERNE anhebbar.
 */
const KERNE = Math.max(1, Number(process.env.BIREFNET_KERNE) || 1);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sitzung: any = null;

async function modell() {
  if (sitzung) return sitzung;
  if (!fs.existsSync(MODELL_DATEI)) {
    throw new Error(`Modell fehlt: ${MODELL_DATEI}`);
  }
  const ort = await import('onnxruntime-node');
  sitzung = await ort.InferenceSession.create(MODELL_DATEI, {
    intraOpNumThreads: KERNE,
    graphOptimizationLevel: 'all',
    executionMode: 'sequential',
  });
  return sitzung;
}

/**
 * Stellt ein Fahrzeugfoto frei und gibt ein PNG mit Alphakanal zurueck.
 *
 * Die Maske wird auf der Originalgroesse ausgegeben, damit nichts an
 * Schaerfe verloren geht, was der Kompositor spaeter noch braucht.
 */
export async function freistellenBiRefNet(foto: Buffer): Promise<Buffer> {
  const ort = await import('onnxruntime-node');
  const meta = await sharp(foto).metadata();
  const oBreite = meta.width ?? 0, oHoehe = meta.height ?? 0;
  if (!oBreite || !oHoehe) throw new Error('Bild ohne Groessenangabe');

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

  const s = await modell();
  const name = s.inputNames[0];
  const ergebnis = await s.run({
    [name]: new ort.Tensor('float32', eingabe, [1, 3, KANTE, KANTE]),
  });
  const roh = ergebnis[s.outputNames[0]].data as Float32Array;

  /*
   * Der Ausgang sind Logits. Sigmoid muss hier passieren — ohne das
   * kommt eine Maske heraus, die ueberall fast deckend ist, und zwar
   * ohne Fehlermeldung.
   */
  const maske = Buffer.alloc(flaeche);
  for (let i = 0; i < flaeche; i++) {
    const w = 1 / (1 + Math.exp(-roh[i]));
    maske[i] = Math.max(0, Math.min(255, Math.round(w * 255)));
  }

  const alpha = await sharp(maske, { raw: { width: KANTE, height: KANTE, channels: 1 } })
    .resize(oBreite, oHoehe, { fit: 'fill' })
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  const farbe = await sharp(foto).removeAlpha().toBuffer();
  return sharp(farbe)
    .joinChannel(alpha, { raw: { width: oBreite, height: oHoehe, channels: 1 } })
    .png()
    .toBuffer();
}

/** Nur fuer Messungen: verwendete Kantenlaenge und Kernzahl. */
export const birefnetEinstellungen = { kante: KANTE, kerne: KERNE, datei: MODELL_DATEI };
