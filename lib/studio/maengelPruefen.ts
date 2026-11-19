/**
 * Haelt das Studiobild dem Originalfoto stand -- oder ist ein Mangel
 * verschwunden?
 *
 * ── Warum es diese Datei gibt ──────────────────────────────────────
 *
 * In der Bildanweisung steht dreimal, dass jeder Kratzer, jede Delle
 * und jeder Wasserfleck stehen bleiben muss: Schritt 2, Schritt 2b und
 * Punkt 1 der Schlusspruefung. Im Lauf vom 19.11.2026 waren die
 * Wasserflecken auf der Motorhaube trotzdem weg, bei ueber 70 Prozent
 * neu gemalter Flaeche.
 *
 * Der naechste Versuch war, das Bildmodell seine Arbeit selbst
 * beschreiben zu lassen -- zwei Zeilen "BEFUNDE" und "ERHALTEN" am Ende
 * der Anweisung, dazu responseModalities ['IMAGE','TEXT']. Zweimal
 * gemessen, zweimal null Zeichen Text: `gemini-3.1-flash-image` gibt
 * Bilder aus und sonst nichts. Der Weg ist damit geprueft und tot.
 *
 * Also fragt hier ein ZWEITES Modell -- eines, das lesen und schreiben
 * kann -- und bekommt beide Bilder nebeneinander. Das ist ohnehin die
 * bessere Anordnung: Ein Modell, das seine eigene Arbeit benotet, sagt
 * zuverlaessig, dass sie gut war.
 *
 * ── Was das Ergebnis wert ist ──────────────────────────────────────
 *
 * Es ist eine Aussage eines Modells, kein Beweis. Es ersetzt den Blick
 * des Haendlers nicht. Aber es ist nachpruefbar: Der Haendler kennt
 * sein Auto, liest die Liste und sieht, ob sie stimmt. Vorher gab es
 * ueberhaupt nichts zu lesen.
 *
 * Darum wird hier auch kein Bild verworfen. Die Liste wird gezeigt.
 */

const MODELL = process.env.GEMINI_TEXT_MODELL || 'gemini-3.8-flash';
const ZEITLIMIT_MS = Number(process.env.GEMINI_TEXT_ZEITLIMIT_MS || '60000');

export interface Maengelbericht {
  /** Was im Originalfoto zu sehen war, je ein kurzer Eintrag. */
  gefunden: string[];
  /** Davon im Studiobild verschwunden -- das ist die Haftungsfrage. */
  verschwunden: string[];
  /** Modellname, damit im Bericht steht, wer das gesagt hat. */
  modell: string;
}

const ANWEISUNG =
  'You are checking a retouched car photograph for a used-car dealer who is legally liable for what his listing photos show.\n\n'
  + 'Image 1 is the original photograph of the car, taken outdoors.\n'
  + 'Image 2 is the same car after retouching, standing in a showroom.\n\n'
  + 'Look at image 1 and list every flaw, mark and trace of use you can see ON THE CAR: scratches, scuffs, dents, creases, stone chips, rust, flaking paint, kerbed or scratched rims, cracked or chipped glass, faded or cloudy headlights, dirt, dust, water spots, bird droppings, stickers and window adverts, worn tyres, missing wheel caps, a cracked mirror.\n'
  + 'Then look at image 2 and decide, for each one, whether it is still visible there.\n\n'
  + 'Rules:\n'
  + '- Only list what you actually see in image 1. Never invent damage.\n'
  + '- Ignore anything that is not part of the car: the yard, the ground, other vehicles, the weather.\n'
  + '- The car is smaller and lit differently in image 2. A flaw counts as still visible if you can make it out at all.\n'
  + '- Name each flaw in German, as briefly as a mechanic writes it on a job card, with the part it is on. For example "Wasserflecken Motorhaube" or "Felge vorne rechts Bordsteinschaden".\n\n'
  + 'Answer with nothing but JSON in exactly this shape:\n'
  + '{"gefunden":["..."],"verschwunden":["..."]}\n'
  + '"gefunden" lists everything you saw in image 1. "verschwunden" lists only those entries that are no longer visible in image 2, spelled exactly as in "gefunden". If the car has no visible flaws at all, return empty lists.';

function mitZeitlimit<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), ms))]);
}

/**
 * Gibt null zurueck, wenn kein Schluessel gesetzt ist oder die Anfrage
 * scheitert. Ein Fehler hier darf nie ein Bild kosten -- dann gibt es
 * eben keine Liste.
 */
export async function maengelVergleichen(original: Buffer, ergebnis: Buffer): Promise<Maengelbericht | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const sharp = (await import('sharp')).default;
    /* Beide Bilder gleich gross in die Anfrage, damit das Modell nicht
       schon an der Aufloesung erkennt, welches das "schoene" ist.
       1024 reicht: Es soll Flecken sehen, keine Spaltmasse messen. */
    const [a, b] = await Promise.all([
      sharp(original).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 92 }).toBuffer(),
      sharp(ergebnis).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 92 }).toBuffer(),
    ]);

    const antwort = await mitZeitlimit(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: ANWEISUNG },
              { inline_data: { mime_type: 'image/jpeg', data: a.toString('base64') } },
              { inline_data: { mime_type: 'image/jpeg', data: b.toString('base64') } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    ), ZEITLIMIT_MS);

    if (!antwort) { console.warn('[maengel] Zeitlimit'); return null; }
    if (!antwort.ok) {
      console.warn('[maengel] HTTP', antwort.status, (await antwort.text()).slice(0, 200));
      return null;
    }

    const daten = await antwort.json();
    const teile: Array<{ text?: string }> = daten?.candidates?.[0]?.content?.parts ?? [];
    const text = teile.map((t) => t.text ?? '').join('');
    if (!text.trim()) { console.warn('[maengel] leere Antwort'); return null; }

    const roh = JSON.parse(text) as { gefunden?: unknown; verschwunden?: unknown };
    const liste = (x: unknown): string[] =>
      Array.isArray(x) ? x.filter((e): e is string => typeof e === 'string' && e.trim().length > 0).map((e) => e.trim()) : [];

    return { gefunden: liste(roh.gefunden), verschwunden: liste(roh.verschwunden), modell: MODELL };
  } catch (err) {
    console.warn('[maengel] fehlgeschlagen:', err instanceof Error ? err.message : err);
    return null;
  }
}
