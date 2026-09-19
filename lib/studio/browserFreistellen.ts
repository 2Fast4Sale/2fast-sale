'use client';

/**
 * Freistellen direkt im Browser des Haendlers — ormbg ueber Transformers.js.
 *
 * (Zuerst BiRefNet lite; das passte im Browser weder auf die Grafikkarte
 * noch in den Speicher. Einzelheiten in freistellWorker.ts.)
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
 * Gerechnet wird in einem Web Worker (freistellWorker.ts) — dort steht auch,
 * warum: Die Seite fror sonst ein, und Grafikkarten scheitern teils erst
 * beim Rechnen.
 */

const MAX_BREITE = 1600;   // Vercel nimmt hoechstens 4,5 MB je Anfrage an

type LadeHoerer = (geladenBytes: number, gesamtBytes: number) => void;
let ladeHoerer: LadeHoerer | null = null;

/** Download-Fortschritt des Modells beim ersten Foto. */
export function beiModellDownload(hoerer: LadeHoerer | null): void {
  ladeHoerer = hoerer;
}

let worker: Worker | null = null;
let naechsteId = 1;
/** Kasten um das Kennzeichen, relativ zur Bildgroesse (0 bis 1). */
export type KennzeichenKasten = { x0: number; y0: number; x1: number; y1: number };
type Ergebnis = { blob: Blob; kennzeichen: KennzeichenKasten | null };
const offen = new Map<number, { fertig: (e: Ergebnis) => void; fehler: (e: Error) => void }>();

function holeWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./freistellWorker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent) => {
    const d = e.data;
    if (d.art === 'download') ladeHoerer?.(d.geladen, d.gesamt);
    else if (d.art === 'geraet') console.info('[freistellen] rechnet auf:', d.geraet);
    else if (d.art === 'fertig') { offen.get(d.id)?.fertig({ blob: d.blob, kennzeichen: d.kennzeichen ?? null }); offen.delete(d.id); }
    else if (d.art === 'fehler') { offen.get(d.id)?.fehler(new Error(d.meldung)); offen.delete(d.id); }
  };
  worker.onerror = (e) => {
    // Ein abgestuerzter Worker nimmt alle wartenden Fotos mit — die sollen
    // einen Fehler sehen, statt ewig zu warten. Der naechste Aufruf startet neu.
    for (const w of offen.values()) w.fehler(new Error(e.message || 'Freistell-Worker abgestuerzt'));
    offen.clear();
    worker = null;
  };
  return worker;
}

/** Startet den Worker schon vorab, z.B. sobald Schritt 2 geoeffnet wird. */
export function freistellerVorwaermen(): void {
  holeWorker();
}

/**
 * Nimmt ein Foto als Data-URL und gibt das freigestellte Fahrzeug als
 * Data-URL (WebP mit Transparenz, hoechstens 1600 px breit) zurueck.
 */
export async function freistellenImBrowser(foto: string): Promise<string> {
  return (await freistellenMitKennzeichen(foto)).bild;
}

/**
 * Wie freistellenImBrowser, liefert zusaetzlich den Kasten um das
 * Kennzeichen (oder null). Der Kasten ist relativ angegeben und gilt
 * damit auch fuer das verkleinerte Ergebnis.
 */
export async function freistellenMitKennzeichen(
  foto: string,
): Promise<{ bild: string; kennzeichen: KennzeichenKasten | null }> {
  const id = naechsteId++;
  const { blob, kennzeichen } = await new Promise<Ergebnis>((fertig, fehler) => {
    offen.set(id, { fertig, fehler });
    holeWorker().postMessage({ id, foto });
  });

  const bitmap = await createImageBitmap(blob);
  const faktor = Math.min(1, MAX_BREITE / bitmap.width);
  const b = Math.round(bitmap.width * faktor);
  const h = Math.round(bitmap.height * faktor);
  const leinwand = document.createElement('canvas');
  leinwand.width = b;
  leinwand.height = h;
  const ctx = leinwand.getContext('2d');
  if (!ctx) throw new Error('Canvas nicht verfuegbar');
  ctx.drawImage(bitmap, 0, 0, b, h);
  bitmap.close();

  const webp = leinwand.toDataURL('image/webp', 0.9);
  const bild = webp.startsWith('data:image/webp') ? webp : leinwand.toDataURL('image/png');
  return { bild, kennzeichen };
}
