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
const anweisung = (firma?: string | null) =>
  'You are preparing a photograph for a professional car dealership listing. '
  + 'Image 1 is the original photograph of the car, and image 2 is the empty showroom it must be placed into. '
  + 'Your task is to place the car from image 1 into the showroom from image 2 so that it looks like the car was really photographed in that room. '
  + 'You ARE allowed to move the car within the room, to shift it left, right, up or down, to scale it larger or smaller, and to rotate it very slightly, so that it is positioned perfectly on the floor. '
  + 'Every wheel that is visible must rest exactly on the floor surface, with the tyre contact patch touching the ground, so the car neither floats above the floor nor sinks into it. '
  + 'The whole car must stand on the floor area of the room and must never cross or overlap the edge where the floor meets the back wall. '
  + 'The room must keep exactly the size it has in image 2: do not move the walls closer, do not lower the ceiling, do not zoom in, and keep the ceiling lights, the wall edges and the floor pattern at the same size and in the same place as in image 2. '
  + 'Treat image 2 as a finished photograph of a room that you are not allowed to change: keep its camera position, its field of view and its framing exactly, and only paste the car into it. '
  + 'Size the car so that it covers about 55 percent of the image width and never more than 65 percent, measured from its rearmost point to its foremost point. '
  + 'Leave a wide empty margin around the car: at least 15 percent of the image width of bare floor between the car and the left edge, the same on the right, and the highest point of the roof must stay below the middle height of the picture. '
  + 'Do not zoom in on the car, do not crop the room, and do not make the hall look small or narrow: a viewer must see a small car standing in a big empty hall. '
  + 'Respect real proportions: a passenger car is about 1.5 metres high and the hall is about 3 metres high, so the empty space above the roof of the car must be roughly as tall as the car itself. '
  + 'Never crop the car: the whole vehicle, including both bumpers and all wheels, must be inside the picture with clear margin to every edge. '
  + 'Keep the camera angle and the perspective of the car itself exactly as in image 1; you may only translate, scale and very slightly rotate it, never re-photograph it from a different side. '
  + 'Never mirror or flip the car: the side of the car that faces the camera in image 1 must face the camera in the result, the steering wheel must stay on the same side, and the car must keep pointing in the same direction. '
  + 'Align the car so that its ground plane matches the floor plane of the room, so the perspective of the car and the perspective of the room agree. '
  + 'Add a realistic soft ambient-occlusion shadow on the floor beneath the car, darkest directly under the tyres and the underbody and fading out softly a short distance beyond the outline of the car. '
  + 'The shadow must lie only on the floor and must never be cast onto the walls or the ceiling. '
  + 'Match the brightness, contrast and white balance of the car to the lighting of the showroom, without repainting the car. '
  + 'The windows of the car currently reflect the place where the photo was taken, for example trees, fences, sky, buildings or other cars, and these outdoor reflections must be replaced by the calm, soft reflections of the showroom itself. '
  + 'Keep the glass as glass: it must stay transparent where it was transparent, the interior of the car must remain visible through it, and the tint of the windows must stay as dark or as light as in the original photograph. '
  + (firma
    ? `Cover the number plate of the car completely with a plain dark rectangular dealer sign, in the same place, at the same angle and with the same size and shape as the plate, so that not a single character of the original plate stays readable. `
      + `On that sign write exactly this text in clean white letters, centred, spelled character for character: "${firma}". `
      + `Write nothing else on the sign, add no logo, no border, no second line and no other text anywhere in the image. `
    : 'Cover the number plate of the car completely with a plain dark rectangular sign, in the same place and at the same angle as the plate, so that not a single character of the original plate stays readable, and write no text on it. ')
  + 'Cut the car out cleanly and completely: no part of the original surroundings may survive anywhere in the image, including through the windows, so no other vehicle, no fence, no tree, no building and no person may remain visible through the windscreen, the side windows or the rear window. '
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
  /** Name fuers Haendlerschild. Leer: nur ein dunkles Schild ohne Text. */
  firma?: string | null,
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
              { text: anweisung(firma) },
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

/*
 * ── Zweiter Weg: Gemini verfeinert nur ─────────────────────────────
 *
 * Warum es diesen Weg gibt: Gemini haelt sich nicht an Groessenangaben.
 * Zwei Versuche mit klaren Zahlen im Text ("etwa 55 Prozent der
 * Bildbreite, hoechstens 65", "mindestens 15 Prozent freier Boden an
 * jeder Seite") aenderten nichts — das Auto fuellte weiter fast das
 * ganze Bild, und die Halle wirkte wie eine Garage.
 *
 * Also bestimmt der Kompositor die Groesse, und Gemini bekommt das
 * fertig zusammengesetzte Bild. Es darf dann nur noch das tun, was es
 * wirklich besser kann als eine Rechnung: Schatten, Licht und die
 * Spiegelungen in den Scheiben.
 *
 * Weil Lage und Groesse festliegen, vergleicht die Pruefung hier das
 * GANZE Bild und darf streng sein.
 */
const VERFEINERN_MIN = Number(process.env.GEMINI_VERFEINERN_MIN || '0.90');

const verfeinernText = (firma?: string | null) =>
  'Image 1 shows a car that has already been placed into a showroom at exactly the right size and position, but it still looks pasted in. '
  + 'Your MOST IMPORTANT task is the glass: look carefully through the windscreen, the side windows and the rear window of the car. '
  + 'Whatever is visible through that glass comes from the place where the car was originally photographed, so every other car, fence, tree, building, street, sky and person behind the glass must be painted over. '
  + 'Replace all of it with the calm, plain reflections and surfaces of this showroom, so that only this hall can be seen in the glass. '
  + 'Keep the glass as glass: it stays transparent where it was transparent, the seats, the steering wheel and the interior stay visible, and the tint stays exactly as dark as it is now. '
  + 'Your second task is the ground shadow: add a realistic soft shadow under the car, darkest under the tyres and the underbody, fading out softly, lying only on the floor and never on the walls. '
  + 'Your third task is the light: match brightness, contrast and white balance of the car to the light of this hall, without repainting the car. '
  + 'Everything else must stay exactly as it is. '
  + 'Keep the car exactly where it is and exactly as large as it is: do not move it, do not scale it, do not rotate it, do not mirror it and do not re-frame the picture. '
  + 'Keep the room exactly as it is: same walls, same floor, same ceiling lights, same camera, same framing. '
  + 'The car itself must stay exactly as photographed: same shape, same colour, same wheels, same badges, same trim, same mirrors. '
  + (firma
    ? `Your fourth task is the number plate: cover it completely with a plain dark rectangular dealer sign, in the same place, at the same angle and with the same size and shape as the plate, so that not one character of the original plate stays readable. `
      + `On that sign write this text and nothing else, in clean white letters, centred, spelled character for character exactly as given here: "${firma}". `
      + `Check the spelling of that text letter by letter before you finish, because a misspelled dealer name is worse than no sign at all, and write no other text anywhere in the image. `
    : 'Your fourth task is the number plate: cover it completely with a plain dark rectangular sign, in the same place and at the same angle as the plate, so that not one character stays readable, and write no text on it. ')
  + 'Never hide, smooth or repair a scratch, a dent, rust, dirt, a sticker or any damage, neither in the paint nor in the glass. '
  + 'Do not add people, other vehicles, plants, text, logos or watermarks, and return exactly one photorealistic image with the same dimensions as image 1. '
  + 'Before you finish, check the result once more: is any car, fence, tree, building, street or sky still visible through the windscreen, a side window or the rear window? '
  + 'If anything like that is still there, paint it over with the plain surfaces of this hall, because a showroom photograph in which the old surroundings show through the glass is the one mistake you must not make.';

/**
 * Nimmt das fertig zusammengesetzte Studiobild und laesst Gemini nur
 * Schatten, Licht und Scheiben verbessern.
 *
 * null heisst: nicht verwendbar — dann bleibt das Bild des Kompositors.
 */
export async function studioVerfeinernMitGemini(
  komponiert: Buffer,
  /** Name fuers Haendlerschild. Gemini setzt das Schild selbst. */
  firma?: string | null,
): Promise<StudioErgebnis | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const start = Date.now();
  try {
    const eingabe = await sharp(komponiert).resize(1536, 1536, { fit: 'inside' })
      .jpeg({ quality: 92 }).toBuffer();

    const antwort = await mitZeitlimit(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: verfeinernText(firma) },
              { inline_data: { mime_type: 'image/jpeg', data: eingabe.toString('base64') } },
            ],
          }],
        }),
      },
    ), ZEITLIMIT_MS);

    if (!antwort || !antwort.ok) {
      console.warn('[gemini-verfeinern] Antwort nicht brauchbar:', antwort?.status);
      return null;
    }

    const daten = await antwort.json();
    const teile = daten?.candidates?.[0]?.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teil = teile.find((p: any) => p.inline_data?.data || p.inlineData?.data);
    const b64 = teil?.inline_data?.data ?? teil?.inlineData?.data;
    if (!b64) return null;

    const masse = await sharp(komponiert).metadata();
    const bild = await sharp(Buffer.from(b64, 'base64'))
      .resize(masse.width, masse.height, { fit: 'fill' })
      .jpeg({ quality: 92 })
      .toBuffer();

    const aehnlich = await aehnlichkeit(komponiert, bild);
    console.info('[gemini-verfeinern] fertig in', Date.now() - start, 'ms, Aehnlichkeit', aehnlich.toFixed(3));
    if (aehnlich < VERFEINERN_MIN) {
      console.warn('[gemini-verfeinern] verworfen: Bild weicht zu stark ab');
      return null;
    }
    return { bild, aehnlich };
  } catch (err) {
    console.error('[gemini-verfeinern] fehlgeschlagen:', err);
    return null;
  }
}
