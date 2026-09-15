/**
 * Web Worker: BiRefNet im Hintergrund des Browsers.
 *
 * Zwei Gruende fuer den Worker, beide aus dem ersten echten Test:
 *
 * 1. Auf dem Prozessor (WASM) blockierte das Freistellen die ganze Seite.
 *    Die Fortschrittsanzeige haette stillgestanden, der Browser meldete die
 *    Seite als "reagiert nicht". Im Worker bleibt die Seite bedienbar.
 *
 * 2. Eine Grafikkarte kann WebGPU melden, das Modell laden — und erst beim
 *    Rechnen abbrechen. Im Test: "Too many storage buffers in shader.
 *    Current: 17, Max is 16", typisch fuer eingebaute Grafikchips. Das
 *    faellt erst beim ersten Bild auf. Deshalb wird hier bei einem Fehler
 *    auf der Grafikkarte dasselbe Bild auf dem Prozessor wiederholt, und
 *    alle weiteren Bilder bleiben dort.
 */

import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

/*
 * ormbg statt BiRefNet lite — Apache-2.0, kommerziell erlaubt.
 *
 * BiRefNet lite scheiterte im echten Browser-Test an beiden Wegen: Auf der
 * Grafikkarte "Too many storage buffers in shader" (Limit des Chips), auf
 * dem Prozessor "std::bad_alloc" (der Browser gibt der Seite nicht genug
 * Speicher fuer ein Modell dieser Groesse). ormbg in 8 Bit ist 42 MB gross
 * statt 224 MB und lief im selben Browser durch: Urus 1600x1067 in 17 s,
 * Modell danach aus dem Cache in unter einer Sekunde.
 *
 * Bekannter Makel: Unter den Raedern bleibt manchmal ein grauer Rest vom
 * Schatten des Originalbodens stehen.
 */
const MODELL = 'onnx-community/ormbg-ONNX';

type Anfrage = { id: number; foto: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let verarbeiter: any = null;
let geraet: 'webgpu' | 'wasm' | null = null;

const dateien = new Map<string, { geladen: number; gesamt: number }>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fortschritt(info: any): void {
  if (info?.status !== 'progress' || !info.file) return;
  dateien.set(info.file, { geladen: info.loaded ?? 0, gesamt: info.total ?? 0 });
  let geladen = 0, gesamt = 0;
  for (const d of dateien.values()) { geladen += d.geladen; gesamt += d.gesamt; }
  postMessage({ art: 'download', geladen, gesamt });
}

async function aufProzessor(): Promise<void> {
  dateien.clear();
  verarbeiter = await pipeline('background-removal', MODELL,
    { device: 'wasm', dtype: 'q8', progress_callback: fortschritt });
  geraet = 'wasm';
}

async function bereit(): Promise<void> {
  if (verarbeiter) return;
  /*
   * Bewusst nur der Prozessor. Die Grafikkarte waere auf manchen Geraeten
   * schneller, bricht aber auf anderen erst beim Rechnen ab — und ein
   * Haendler, bei dem jedes zweite Geraet anders reagiert, verliert das
   * Vertrauen schneller, als er Zeit spart. Der Wechsel bei Fehlern in
   * rechnen() bleibt fuer den Fall, dass hier spaeter WebGPU dazukommt.
   */
  await aufProzessor();
}

async function rechnen(foto: string): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ausgabe: any;
  try {
    ausgabe = await verarbeiter(foto);
  } catch (err) {
    if (geraet !== 'webgpu') throw err;
    console.warn('[freistellen] Grafikkarte scheitert beim Rechnen, wechsle auf Prozessor:', err);
    postMessage({ art: 'geraet', geraet: 'wasm' });
    await aufProzessor();
    ausgabe = await verarbeiter(foto);
  }
  const bild = Array.isArray(ausgabe) ? ausgabe[0] : ausgabe;
  const leinwand = bild.toCanvas() as OffscreenCanvas;
  // PNG: verlustfrei mit Transparenz. Verkleinert und nach WebP gewandelt
  // wird im Hauptfenster, wo die Zielgroesse bekannt ist.
  return leinwand.convertToBlob({ type: 'image/png' });
}

self.onmessage = async (e: MessageEvent<Anfrage>) => {
  const { id, foto } = e.data;
  try {
    await bereit();
    postMessage({ art: 'geraet', geraet });
    const blob = await rechnen(foto);
    postMessage({ art: 'fertig', id, blob });
  } catch (err) {
    postMessage({ art: 'fehler', id, meldung: String((err as Error)?.message ?? err) });
  }
};
