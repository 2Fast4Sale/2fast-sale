/**
 * Freistellen ohne Anbieter — BiRefNet auf dem eigenen Rechner.
 *
 *   npx tsx scripts/freistellen-eigen.ts <foto.jpg> <ziel.png>
 *
 * ── Warum ──────────────────────────────────────────────────────────
 *
 * Freistellen ist der einzige Schritt im Studio, der noch Geld kostet:
 * PhotoRoom Basic, 0,02 EUR je Bild, 0,24 EUR je Inserat. Wenig, aber
 * es ist auch eine Abhaengigkeit — Konto, Kontingent, Preisliste, und
 * die kann sich aendern.
 *
 * BiRefNet ist ein trainiertes Modell fuer genau diese Aufgabe und
 * steht unter der MIT-Lizenz; kommerzielle Nutzung ist erlaubt
 * (github.com/ZhengPeng7/BiRefNet, geprueft 10.09.2026). Es laeuft
 * hier ueber ONNX Runtime direkt in Node — kein Dienst, keine Rechnung,
 * kein Kontingent.
 *
 * ACHTUNG bei der Modellwahl: RMBG-2.0 benutzt dieselbe Architektur,
 * ist aber von BRIA trainiert und in der kostenlosen Fassung NUR fuer
 * nicht-kommerzielle Nutzung freigegeben. Das waere fuer 2Fast4Sale
 * dieselbe Falle wie ein fremdes Hintergrundbild. Hier laeuft die
 * lite-Fassung der Originalgewichte.
 *
 * Das Modell liegt unter tools/modelle und ist NICHT im Repository —
 * 224 MB, jederzeit neu ladbar.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import * as ort from 'onnxruntime-node';

const MODELL = path.join(process.cwd(), 'tools', 'modelle', 'birefnet_lite.onnx');

/**
 * Kantenlaenge, mit der gerechnet wird.
 *
 * Dieser Export ist auf 1024x1024 FESTGELEGT — 512 wird mit
 * "Got invalid dimensions for input" abgelehnt. Wer kleiner rechnen
 * will (und damit ein Viertel der Zeit braucht), muss den Export
 * BiRefNet_dynamic-1024x1024-ONNX nehmen, der freie Groessen zulaesst.
 */
const KANTE = 1024;

// ImageNet-Werte. Das Modell erwartet genau diese Normierung; mit
// anderen Zahlen kommt eine unbrauchbare Maske heraus, ohne Fehler.
const MITTEL = [0.485, 0.456, 0.406];
const STREUUNG = [0.229, 0.224, 0.225];

export async function freistellen(fotoPfad: string): Promise<Buffer> {
  if (!fs.existsSync(MODELL)) {
    throw new Error(`Modell fehlt: ${MODELL}\nHolen mit: siehe Kopf dieser Datei`);
  }

  const roh = fs.readFileSync(fotoPfad);
  const meta = await sharp(roh).metadata();
  const oBreite = meta.width!, oHoehe = meta.height!;

  /* ── Vorbereiten: 1024x1024, normiert, NCHW ── */
  const { data } = await sharp(roh)
    .resize(KANTE, KANTE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const eingabe = new Float32Array(3 * KANTE * KANTE);
  const flaeche = KANTE * KANTE;
  for (let i = 0; i < flaeche; i++) {
    for (let k = 0; k < 3; k++) {
      eingabe[k * flaeche + i] = (data[i * 3 + k] / 255 - MITTEL[k]) / STREUUNG[k];
    }
  }

  /* ── Rechnen ── */
  /*
   * Alle Kerne benutzen. Ohne diese Angabe rechnet ONNX Runtime hier
   * deutlich langsamer, als die Maschine koennte — der erste Durchlauf
   * brauchte 126 Sekunden fuer ein Bild.
   */
  const sitzung = await ort.InferenceSession.create(MODELL, {
    intraOpNumThreads: Number(process.env.BIREFNET_KERNE || String(os.cpus().length)),
    graphOptimizationLevel: 'all',
    executionMode: 'sequential',
  });
  const name = sitzung.inputNames[0];
  const start = Date.now();
  const ergebnis = await sitzung.run({
    [name]: new ort.Tensor('float32', eingabe, [1, 3, KANTE, KANTE]),
  });
  const dauer = Date.now() - start;

  // Der Export gibt mehrere Zwischenstaende aus; der letzte ist die
  // fertige Maske.
  const ausgabe = ergebnis[sitzung.outputNames[sitzung.outputNames.length - 1]];
  const werte = ausgabe.data as Float32Array;

  /*
   * Ob am Ende schon ein Sigmoid sitzt, ist von Export zu Export
   * verschieden. Statt es zu raten: nachsehen. Liegt alles zwischen 0
   * und 1, ist es fertig; sonst wird das Sigmoid hier angewandt.
   */
  let min = Infinity, max = -Infinity;
  for (const v of werte) { if (v < min) min = v; if (v > max) max = v; }
  const brauchtSigmoid = min < -0.01 || max > 1.01;

  const maske = Buffer.alloc(flaeche);
  for (let i = 0; i < flaeche; i++) {
    const v = brauchtSigmoid ? 1 / (1 + Math.exp(-werte[i])) : werte[i];
    maske[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }

  console.log(`  Modell: ${dauer} ms, Ausgabe ${min.toFixed(2)} bis ${max.toFixed(2)}`
            + `${brauchtSigmoid ? ' (Sigmoid ergaenzt)' : ' (schon 0..1)'}`);

  /* ── Maske als Alphakanal auf das Originalbild ── */
  const alpha = await sharp(maske, { raw: { width: KANTE, height: KANTE, channels: 1 } })
    .resize(oBreite, oHoehe, { fit: 'fill' })
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  const farbe = await sharp(roh).removeAlpha().raw().toBuffer();

  return sharp(farbe, { raw: { width: oBreite, height: oHoehe, channels: 3 } })
    .joinChannel(alpha, { raw: { width: oBreite, height: oHoehe, channels: 1 } })
    .png()
    .toBuffer();
}

if (process.argv[1]?.includes('freistellen-eigen')) {
  const [quelle, ziel] = process.argv.slice(2);
  if (!quelle || !ziel) {
    console.error('Aufruf: freistellen-eigen.ts <foto.jpg> <ziel.png>');
    process.exit(1);
  }
  freistellen(quelle)
    .then((b) => { fs.writeFileSync(ziel, b); console.log('freigestellt →', ziel); })
    .catch((e) => { console.error(e); process.exit(1); });
}
