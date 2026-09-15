'use client';

/**
 * Freistellen direkt im Browser des Haendlers — BiRefNet ueber Transformers.js.
 *
 * ── Warum im Browser ───────────────────────────────────────────────
 *
 * Die kostenlosen PhotoRoom-Bilder sind verbraucht, ein Bezahltarif geht
 * erst ab Oktober. Ein eigener Freistell-Server (server/freisteller) waere
 * die bessere Loesung, aber Hugging Face verlangt fuer Docker-Spaces
 * inzwischen ebenfalls einen bezahlten Plan, und die Gratis-Anbieter geben
 * zu wenig Arbeitsspeicher fuer das Modell.
 *
 * Im Browser kostet es nichts: dasselbe Modell (BiRefNet lite, MIT-Lizenz),
 * gerechnet auf dem Geraet des Haendlers. Beim ersten Foto laedt der
 * Browser das Modell herunter; danach liegt es im Cache.
 *
 * Mit Grafikkarte (WebGPU) wird die halbe Genauigkeit genommen — halb so
 * gross, deutlich schneller, fuer eine Maske ohne sichtbaren Unterschied.
 * Ohne WebGPU (viele Handys, aeltere Browser) laeuft die volle Fassung auf
 * dem Prozessor. Das ist langsam, aber es funktioniert.
 */

const MODELL = 'onnx-community/BiRefNet_lite-ONNX';
const MAX_BREITE = 2000;   // mehr braucht der Kompositor nicht

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let geladen: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function laden(): Promise<any> {
  if (geladen) return geladen;
  geladen = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false;

    const webgpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
    if (webgpu) {
      try {
        return await pipeline('background-removal', MODELL, { device: 'webgpu', dtype: 'fp16' });
      } catch (err) {
        // WebGPU gemeldet, aber nicht nutzbar (Treiber, Energiesparmodus):
        // auf den Prozessor ausweichen statt aufzugeben.
        console.warn('[freistellen] WebGPU nicht nutzbar, nehme Prozessor:', err);
      }
    }
    return pipeline('background-removal', MODELL, { device: 'wasm', dtype: 'fp32' });
  })();
  // Ein Fehler beim Laden darf nicht fuer immer haengen bleiben —
  // beim naechsten Foto wird es neu versucht.
  geladen.catch(() => { geladen = null; });
  return geladen;
}

/** Laedt das Modell schon vorab, z.B. sobald Schritt 2 geoeffnet wird. */
export function freistellerVorwaermen(): void {
  laden().catch(() => {});
}

/**
 * Nimmt ein Foto als Data-URL und gibt das freigestellte Fahrzeug als
 * Data-URL (WebP mit Transparenz) zurueck.
 */
export async function freistellenImBrowser(foto: string): Promise<string> {
  const verarbeiter = await laden();
  const ausgabe = await verarbeiter(foto);
  const bild = Array.isArray(ausgabe) ? ausgabe[0] : ausgabe;

  // RawImage → Canvas. Je nach Umgebung ein OffscreenCanvas oder ein
  // normales Canvas-Element; beide werden unten gleich behandelt.
  const quelle = bild.toCanvas() as HTMLCanvasElement | OffscreenCanvas;

  const faktor = Math.min(1, MAX_BREITE / quelle.width);
  const b = Math.round(quelle.width * faktor);
  const h = Math.round(quelle.height * faktor);
  const ziel = document.createElement('canvas');
  ziel.width = b;
  ziel.height = h;
  const ctx = ziel.getContext('2d');
  if (!ctx) throw new Error('Canvas nicht verfuegbar');
  ctx.drawImage(quelle as CanvasImageSource, 0, 0, b, h);

  // WebP haelt die Transparenz und ist deutlich kleiner als PNG — wichtig,
  // weil das Bild danach als JSON an die Website geht.
  const webp = ziel.toDataURL('image/webp', 0.92);
  return webp.startsWith('data:image/webp') ? webp : ziel.toDataURL('image/png');
}
