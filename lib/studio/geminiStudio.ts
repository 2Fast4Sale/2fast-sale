/**
 * Das ganze Studiobild von Gemini — freistellen, Halle und Schatten in
 * einem Schritt.
 *
 * ── Warum ueberhaupt ───────────────────────────────────────────────
 *
 * Der eigene Weg scheitert an schwierigen Fotos: Das kostenlose
 * Freistellen im Browser laesst bei dunklen Autos auf dunklem Pflaster
 * ganze Stuecke Untergrund stehen (Live-Test, schwarzer Golf). Eine
 * Bild-KI hat dieses Problem nicht, weil sie das Bild versteht statt
 * Kanten zu suchen.
 *
 * ── Warum es trotzdem gefaehrlich ist ──────────────────────────────
 *
 * Eine Bild-KI malt das GANZE Bild neu, also auch das Fahrzeug. Dabei
 * verschwinden Kratzer und Dellen, Felgen bekommen andere Speichen,
 * Embleme veraendern sich. In einem Verkaufsinserat ist das eine falsche
 * Angabe zum Fahrzeug, und dafuer haftet der Haendler.
 *
 * Deshalb prueft diese Datei das Ergebnis nach: Das Fahrzeug im neuen
 * Bild wird mit dem Original verglichen. Weicht es zu stark ab, wird das
 * Bild verworfen und der Aufrufer nimmt den eigenen Weg. Lieber ein
 * schlichteres Bild als ein geschoentes Auto.
 *
 * NOCH NICHT AN ECHTEN FOTOS GEPRUEFT — es fehlt ein Gemini-Schluessel.
 * Die Schwelle in AEHNLICH_MIN muss am ersten Testlauf nachgezogen
 * werden.
 */

import sharp from 'sharp';

const MODELL = process.env.GEMINI_BILD_MODELL || 'gemini-3.1-flash-lite-image';
const ZEITLIMIT_MS = 60_000;

/**
 * Wie aehnlich das Fahrzeug dem Original mindestens bleiben muss, 0 bis 1.
 *
 * Verglichen werden Graustufen-Miniaturen des Fahrzeugbereichs. Ein
 * anderer Hintergrund und ein neuer Schatten aendern den Wert kaum, ein
 * neu erfundenes Auto sehr wohl.
 */
const AEHNLICH_MIN = Number(process.env.GEMINI_AEHNLICH_MIN || '0.82');

/*
 * Der Text, den Gemini mitbekommt. Fuenfzehn Saetze, in dieser Reihenfolge:
 * erst die Aufgabe, dann was erlaubt ist (verschieben, drehen, groesser
 * und kleiner machen, damit alle Raeder den Boden beruehren), dann was
 * verboten ist. Das Fahrzeug selbst bleibt tabu: kein Kratzer weg, kein
 * Zeichen am Kennzeichen anders. Haelt es sich nicht daran, faengt die
 * Aehnlichkeitspruefung weiter unten das Bild ab.
 */
const ANWEISUNG =
  'You are preparing a photograph for a professional car dealership listing. '
  + 'Image 1 is the original photograph of the car, and image 2 is the empty showroom it must be placed into. '
  + 'Your task is to place the car from image 1 into the showroom from image 2 so that it looks like the car was really photographed in that room. '
  + 'You ARE allowed to move the car within the room, to shift it left, right, up or down, to scale it larger or smaller, and to rotate it very slightly, so that it is positioned perfectly on the floor. '
  + 'Every wheel that is visible must rest exactly on the floor surface, with the tyre contact patch touching the ground, so the car neither floats above the floor nor sinks into it. '
  + 'The whole car must stand on the floor area of the room and must never cross or overlap the edge where the floor meets the back wall. '
  + 'Choose a size for the car that fits the room naturally, leaving clear floor space in front of it and around it. '
  + 'Keep the camera angle and the perspective of the car itself exactly as in image 1; you may only translate, scale and very slightly rotate it, never re-photograph it from a different side. '
  + 'Align the car so that its ground plane matches the floor plane of the room, so the perspective of the car and the perspective of the room agree. '
  + 'Add a realistic soft ambient-occlusion shadow on the floor beneath the car, darkest directly under the tyres and the underbody and fading out softly a short distance beyond the outline of the car. '
  + 'The shadow must lie only on the floor and must never be cast onto the walls or the ceiling. '
  + 'Match the brightness, contrast and white balance of the car to the lighting of the showroom, without repainting the car. '
  + 'The windows of the car currently reflect the place where the photo was taken, for example trees, fences, sky, buildings or other cars, and these outdoor reflections must be replaced by the calm, soft reflections of the showroom itself. '
  + 'Keep the glass as glass: it must stay transparent where it was transparent, the interior of the car must remain visible through it, and the tint of the windows must stay as dark or as light as in the original photograph. '
  + 'Never hide or repair damage in the glass: any chip, crack, scratch, sticker, inspection badge or sunshade that is visible in a window must remain clearly visible in the result. '
  + 'CRITICAL: the car itself must remain exactly as photographed, so do not change its shape, its colour, its wheels, its badges, its trim, its mirrors, its windows or the characters on its number plate. '
  + 'Do not remove, hide, smooth or repair any scratch, dent, rust, dirt, sticker or damage, and do not add any part that is not on the original car. '
  + 'Do not add people, other vehicles, plants, text, logos, watermarks or reflections, and return exactly one photorealistic image with the same dimensions as image 2.';

function mitZeitlimit<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), ms))]);
}

/** Mittlere Abweichung zweier Graustufen-Miniaturen, als Aehnlichkeit 0 bis 1. */
async function aehnlichkeit(a: Buffer, b: Buffer): Promise<number> {
  const masse = { width: 96, height: 96, fit: 'fill' as const };
  const [ga, gb] = await Promise.all([
    sharp(a).flatten({ background: '#808080' }).resize(masse).greyscale().raw().toBuffer(),
    sharp(b).flatten({ background: '#808080' }).resize(masse).greyscale().raw().toBuffer(),
  ]);
  let summe = 0;
  for (let i = 0; i < ga.length; i++) summe += Math.abs(ga[i] - gb[i]);
  return 1 - summe / (ga.length * 255);
}

/*
 * Aehnlichkeit NUR des Fahrzeugs, unabhaengig davon, wo es im Bild steht.
 *
 * Seit Gemini das Auto verschieben darf, taugt der Vergleich ganzer Bilder
 * nicht mehr: Ein gutes Ergebnis, bei dem nur die Lage anders ist, kam auf
 * 0,735 und waere abgelehnt worden. Deshalb wird in beiden Bildern das
 * Fahrzeug gesucht, ausgeschnitten und auf dieselbe Groesse gebracht.
 * Verglichen wird dann Blech mit Blech.
 *
 * Findet das Modell in einem der beiden Bilder kein Fahrzeug, gibt es
 * null zurueck — dann prueft der Aufrufer wie bisher das ganze Bild.
 * Lieber streng ablehnen als blind durchwinken.
 */
async function fahrzeugAusschnitt(bild: Buffer): Promise<Buffer | null> {
  const { fahrzeugKastenFinden } = await import('./kennzeichenModell');
  const kasten = await fahrzeugKastenFinden(bild);
  if (!kasten || kasten === 'keins') return null;

  const meta = await sharp(bild).metadata();
  const b = meta.width ?? 0, h = meta.height ?? 0;
  if (!b || !h) return null;

  const links = Math.max(0, Math.round(kasten.x0 * b));
  const oben  = Math.max(0, Math.round(kasten.y0 * h));
  const breit = Math.min(b - links, Math.round((kasten.x1 - kasten.x0) * b));
  const hoch  = Math.min(h - oben,  Math.round((kasten.y1 - kasten.y0) * h));
  if (breit < 32 || hoch < 32) return null;

  return sharp(bild).extract({ left: links, top: oben, width: breit, height: hoch })
    .jpeg({ quality: 92 }).toBuffer();
}

async function fahrzeugAehnlichkeit(a: Buffer, b: Buffer): Promise<number | null> {
  const [ca, cb] = await Promise.all([fahrzeugAusschnitt(a), fahrzeugAusschnitt(b)]);
  if (!ca || !cb) return null;
  return aehnlichkeit(ca, cb);
}

export interface StudioErgebnis {
  bild: Buffer;
  aehnlich: number;
}

/**
 * Baut das Studiobild. Gibt null zurueck, wenn kein Schluessel gesetzt
 * ist, etwas schiefgeht oder das Ergebnis dem Original zu unaehnlich ist.
 */
export async function studioBildMitGemini(
  foto: Buffer,
  raumBild: Buffer,
  zielBreite: number,
  zielHoehe: number,
): Promise<StudioErgebnis | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const start = Date.now();
  try {
    const anfrageSenden = async () => {
      const auto = await sharp(foto).resize(1536, 1536, { fit: 'inside' }).jpeg({ quality: 90 }).toBuffer();
      const halle = await sharp(raumBild).resize(1536, 1536, { fit: 'inside' }).jpeg({ quality: 85 }).toBuffer();

      return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: ANWEISUNG },
              { inline_data: { mime_type: 'image/jpeg', data: auto.toString('base64') } },
              { inline_data: { mime_type: 'image/jpeg', data: halle.toString('base64') } },
            ],
          }],
          generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:2' } },
        }),
      });
    };

    let antwort = await mitZeitlimit(anfrageSenden(), ZEITLIMIT_MS);

    if (!antwort) { console.error('[gemini-studio] Zeitlimit'); return null; }

    /*
     * 429 heisst bei Google nicht "kaputt", sondern "zu schnell": In Tier 1
     * gilt eine Ausgabenbremse von 10 $ je 10 Minuten, dazu Grenzen je
     * Minute. Ein kurzer Ausschlag ist nach ein paar Sekunden vorbei,
     * deshalb ein zweiter Versuch, bevor der eigene Weg genommen wird.
     * 503 ist dasselbe Spiel auf Googles Seite.
     */
    if (antwort.status === 429 || antwort.status === 503) {
      console.warn('[gemini-studio] HTTP', antwort.status, '— zweiter Versuch in 4 s');
      await new Promise((ok) => setTimeout(ok, 4000));
      const zweite = await mitZeitlimit(anfrageSenden(), ZEITLIMIT_MS);
      if (zweite && zweite.ok) {
        antwort = zweite;
      } else {
        console.error('[gemini-studio] auch der zweite Versuch scheiterte');
        return null;
      }
    } else if (!antwort.ok) {
      console.error('[gemini-studio] HTTP', antwort.status, (await antwort.text()).slice(0, 300));
      return null;
    }

    const daten = await antwort.json();
    const teile: Array<{ inlineData?: { data?: string } }> = daten?.candidates?.[0]?.content?.parts ?? [];
    const bildTeil = teile.find((t) => t.inlineData?.data);
    if (!bildTeil?.inlineData?.data) { console.error('[gemini-studio] Kein Bild in der Antwort'); return null; }

    const bild = await sharp(Buffer.from(bildTeil.inlineData.data, 'base64'))
      .resize(zielBreite, zielHoehe, { fit: 'fill' })
      .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
      .toBuffer();

    /*
     * Pruefung: Ist das noch dasselbe Auto?
     *
     * Verglichen wird grob ueber das ganze Bild. Das ist absichtlich
     * streng genug, um ein neu erfundenes Fahrzeug zu bemerken, und grob
     * genug, um einen anderen Hintergrund zu verzeihen.
     */
    /*
     * Erst Blech gegen Blech. Nur wenn das Fahrzeugmodell nicht laeuft,
     * wird ersatzweise das ganze Bild verglichen.
     */
    const nurAuto = await fahrzeugAehnlichkeit(foto, bild);
    const aehnlich = nurAuto ?? await aehnlichkeit(foto, bild);
    console.info('[gemini-studio] Vergleich',
      nurAuto === null ? 'ganzes Bild (Fahrzeugmodell lieferte nichts)' : 'nur Fahrzeug');
    console.info('[gemini-studio] fertig in', Date.now() - start, 'ms, Aehnlichkeit', aehnlich.toFixed(3));
    if (aehnlich < AEHNLICH_MIN) {
      console.warn('[gemini-studio] verworfen: Fahrzeug weicht zu stark ab');
      return null;
    }
    return { bild, aehnlich };
  } catch (err) {
    console.error('[gemini-studio] fehlgeschlagen:', err);
    return null;
  }
}
