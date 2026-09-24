/**
 * Schatten und Bodenlicht von Gemini — das Fahrzeug bleibt das Original.
 *
 * Der selbst gerechnete Schatten kam an Fotos von echten Haendlern nicht
 * heran. Eine Bild-KI kann das, malt aber das GANZE Bild neu: Felgen,
 * Embleme, Kratzer koennen sich dabei still veraendern. Bei einem Inserat
 * waere das eine falsche Angabe zum Fahrzeug, und dafuer haftet der
 * Haendler.
 *
 * Deshalb nur ein Teil des KI-Bildes: Gemini bekommt das zusammengesetzte
 * Bild OHNE eigenen Schatten und legt Schatten und Licht an. Danach wird
 * das Originalfahrzeug pixelgenau wieder obenauf gelegt. Uebrig bleibt vom
 * KI-Bild nur, was um das Auto herum liegt — Boden und Schatten.
 *
 * Schlaegt irgendetwas fehl, kommt `null` zurueck, und der Aufrufer nimmt
 * den eigenen Schatten. Ein Inserat darf an Gemini nie scheitern.
 */

import sharp from 'sharp';

const MODELL = process.env.GEMINI_BILD_MODELL || 'gemini-3.1-flash-image';
const ZEITLIMIT_MS = 45_000;

const ANWEISUNG =
  'This is a photo of a car composited into an empty indoor car showroom. '
  + 'The car currently has no shadow and looks pasted in. '
  + 'Add a realistic, soft ambient-occlusion ground shadow under the car, as in professional car dealer photos: '
  + 'darkest directly under the tires and the underbody, fading out softly a short distance beyond the car outline. '
  + 'Match the lighting of the room. '
  + 'Do NOT change the car in any way, do NOT move, resize or redraw it, do NOT change the room, walls, camera or framing, '
  + 'do NOT add any objects, people, text or reflections. Only add the shadow on the floor.';

export async function schattenMitGemini(
  ohneSchatten: Buffer,
  fahrzeug: { bild: Buffer; left: number; top: number },
  breite: number,
  hoehe: number,
): Promise<Buffer | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const abbruch = new AbortController();
  const timer = setTimeout(() => abbruch.abort(), ZEITLIMIT_MS);
  try {
    const eingabe = await sharp(ohneSchatten).resize(1536, 1024, { fit: 'fill' }).jpeg({ quality: 90 }).toBuffer();

    const antwort = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELL}:generateContent`,
      {
        method: 'POST',
        signal: abbruch.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: ANWEISUNG },
              { inline_data: { mime_type: 'image/jpeg', data: eingabe.toString('base64') } },
            ],
          }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '3:2' },
          },
        }),
      },
    );
    if (!antwort.ok) {
      console.error('[gemini-schatten] HTTP', antwort.status, (await antwort.text()).slice(0, 300));
      return null;
    }

    const daten = await antwort.json();
    const teile: Array<{ inlineData?: { data?: string } }> = daten?.candidates?.[0]?.content?.parts ?? [];
    const bildTeil = teile.find((t) => t.inlineData?.data);
    if (!bildTeil?.inlineData?.data) {
      console.error('[gemini-schatten] Kein Bild in der Antwort');
      return null;
    }

    const kiBild = await sharp(Buffer.from(bildTeil.inlineData.data, 'base64'))
      .resize(breite, hoehe, { fit: 'fill' })
      .toBuffer();

    // Das Original obenauf — ab hier stammt kein Pixel des Autos von der KI.
    return await sharp(kiBild)
      .composite([{ input: fahrzeug.bild, left: fahrzeug.left, top: fahrzeug.top }])
      .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
      .toBuffer();
  } catch (err) {
    console.error('[gemini-schatten] fehlgeschlagen:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
