/**
 * Kennzeichen-Erkennung auf dem Server — OWL-ViT (Google, Apache-2.0).
 *
 * ── Warum auf dem Server und nicht im Browser ──────────────────────
 *
 * Zuerst lief die Erkennung im Browser des Haendlers. Dort scheiterte sie
 * JEDES Mal, und zwar still: "Could not find an implementation for
 * Cast(13) node" — der Browser-Rechenkern (WASM) kann einen Schritt im
 * Modell nicht ausfuehren, in der 8-Bit- wie in der uint8-Fassung. Die
 * Seite fiel dann auf die Farbregel zurueck, und die setzte das
 * Haendlerschild am schraegen Golf versetzt. Gefunden erst mit einer
 * nachgebauten Testseite im Browser.
 *
 * Auf dem Server (onnxruntime-node) laeuft dasselbe Modell: am Golf in
 * 3,3 Sekunden, auf wenige Pixel genau. Das Modell (151 MB) wird beim
 * ersten Aufruf nach /tmp geladen und bleibt fuer die Lebensdauer der
 * Funktion im Speicher.
 *
 * ── Was hier nie passieren darf ────────────────────────────────────
 *
 * Ein Inserat darf an der Erkennung nicht scheitern. Jeder Fehler und
 * jede Zeitueberschreitung liefert null; dann nimmt der Aufrufer die
 * Farbregel.
 */

import sharp from 'sharp';
import type { KennzeichenKasten } from './kennzeichen';

const MODELL = 'Xenova/owlvit-base-patch32';
const SCHWELLE = 0.12;
const ZEITLIMIT_MS = 45_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let erkennerVersprechen: Promise<any> | null = null;

async function erkenner() {
  if (!erkennerVersprechen) {
    erkennerVersprechen = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      // Auf Vercel ist nur /tmp beschreibbar.
      if (process.env.VERCEL) env.cacheDir = '/tmp/hf-cache';
      return pipeline('zero-shot-object-detection', MODELL, { dtype: 'q8' });
    })();
    // Scheitert das Laden, beim naechsten Mal neu versuchen statt fuer
    // immer das kaputte Versprechen zu behalten.
    erkennerVersprechen.catch(() => { erkennerVersprechen = null; });
  }
  return erkennerVersprechen;
}

function mitZeitlimit<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), ms))]);
}

/**
 * Sucht das FAHRZEUG und liefert seinen Kasten, relativ (0 bis 1).
 *
 * Gebraucht, um misslungene Freistellungen zu retten: Bleibt ein Stueck
 * Pflaster oder Hauswand stehen, liegt es ausserhalb dieses Kastens und
 * laesst sich wegschneiden. Es ist dieselbe geladene Sitzung wie fuer das
 * Kennzeichen, kostet also nur die Rechenzeit einer weiteren Abfrage.
 *
 * null heisst: nichts gefunden oder Modell nicht verfuegbar — dann bleibt
 * das Bild unveraendert.
 */
export async function fahrzeugKastenFinden(bild: Buffer): Promise<KennzeichenKasten | 'keins' | null> {
  try {
    const ergebnis = await mitZeitlimit((async () => {
      const { RawImage } = await import('@huggingface/transformers');
      const jpg = await sharp(bild).flatten({ background: '#808080' })
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88 }).toBuffer();
      const roh = await RawImage.fromBlob(new Blob([new Uint8Array(jpg)], { type: 'image/jpeg' }));
      const e = await erkenner();
      return e(roh, ['a car'], { threshold: 0.08, top_k: 1, percentage: true });
    })(), ZEITLIMIT_MS);

    if (ergebnis === null) return null;                 // Zeitlimit
    const bester = Array.isArray(ergebnis) ? ergebnis[0] : null;
    if (!bester?.box) return 'keins';
    const { xmin, ymin, xmax, ymax } = bester.box;
    // Zu klein fuer ein Fahrzeug im Inseratfoto.
    if (xmax - xmin < 0.1 || ymax - ymin < 0.05) return 'keins';
    console.info('[freistellen] Fahrzeugkasten',
      Number(bester.score).toFixed(2),
      [xmin, ymin, xmax, ymax].map((n: number) => n.toFixed(2)).join(' '));
    return { x0: xmin, y0: ymin, x1: xmax, y1: ymax };
  } catch (err) {
    console.error('[freistellen] Fahrzeugsuche fehlgeschlagen:', err);
    return null;
  }
}

/**
 * Sucht das Kennzeichen.
 *
 *   Kasten   gefunden, relativ (0 bis 1)
 *   'keins'  Modell lief, fand aber kein glaubwuerdiges Kennzeichen —
 *            dann bleibt das Bild UNVERAENDERT
 *   null     Modell nicht verfuegbar (Fehler, Zeitlimit)
 *
 * Die Unterscheidung ist wichtig: Beim Urus (Haendlerschild ohne EU-Feld)
 * fand das Modell nichts, die Seite fiel auf die Farbregel zurueck — und
 * die klebte einen schwarzen Balken mitten auf den Kotfluegel.
 */
export async function kennzeichenAufServerFinden(bild: Buffer): Promise<KennzeichenKasten | 'keins' | null> {
  const start = Date.now();
  try {
    const ergebnis = await mitZeitlimit((async () => {
      const { RawImage } = await import('@huggingface/transformers');
      // Transparente Raender (freigestelltes Bild) auf Grau, sonst sieht
      // das Modell dort Schwarz.
      const jpg = await sharp(bild).flatten({ background: '#808080' })
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 }).toBuffer();
      const roh = await RawImage.fromBlob(new Blob([new Uint8Array(jpg)], { type: 'image/jpeg' }));
      const e = await erkenner();
      return e(roh, ['a license plate'], { threshold: SCHWELLE, top_k: 1, percentage: true });
    })(), ZEITLIMIT_MS);

    const bester = Array.isArray(ergebnis) ? ergebnis[0] : null;
    console.info('[kennzeichen] Server-Modell:',
      bester ? `Treffer ${Number(bester.score).toFixed(3)}` : (ergebnis === null ? 'Zeitlimit' : 'kein Treffer'),
      `${Date.now() - start} ms`);
    if (ergebnis === null) return null;          // Zeitlimit
    if (!bester?.box) return 'keins';

    const { xmin, ymin, xmax, ymax } = bester.box;
    const b = xmax - xmin, h = ymax - ymin;
    /*
     * Seitenverhaeltnis in PIXELN pruefen, nicht in Bildanteilen. Der
     * Kasten kommt relativ (0 bis 1); bei einem Foto im Format 2:1 sieht
     * ein Schild von 2,3 : 1 in Anteilen fast quadratisch aus (1,17 : 1)
     * — und wurde am Golf als unplausibel verworfen.
     */
    const meta = await sharp(bild).metadata();
    const bildVerhaeltnis = (meta.width ?? 1) / (meta.height ?? 1);
    const pixelVerhaeltnis = (b / h) * bildVerhaeltnis;
    /*
     * Plausibel? Ein Kennzeichen ist breiter als hoch und nimmt nur einen
     * kleinen Teil des Bildes ein. Ein Kasten ueber die halbe Front ist
     * eine Fehlerkennung — lieber kein Ersatz als ein Schild quer ueber
     * den Kuehlergrill.
     */
    if (b <= 0 || h <= 0 || pixelVerhaeltnis < 1.3 || b > 0.35 || h > 0.2) return 'keins';
    /*
     * Mindestgroesse. Ein Kennzeichen ist im Inseratfoto mindestens
     * etwa ein Zwanzigstel der Bildbreite breit (Golf: ein Achtel). Ein
     * kleiner Streifen an einer Zierleiste ist keins.
     */
    if (b < 0.045) return 'keins';
    return { x0: xmin, y0: ymin, x1: xmax, y1: ymax };
  } catch (err) {
    console.error('[kennzeichen] Server-Modell fehlgeschlagen:', err);
    return null;
  }
}
