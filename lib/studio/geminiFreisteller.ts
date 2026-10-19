/**
 * Freistellen mit Gemini — aber das Fahrzeug bleibt das Originalfoto.
 *
 * ── Das Problem, das dieser Weg loest ──────────────────────────────
 *
 * `geminiStudio.ts` laesst Gemini das ganze Bild neu malen: freistellen,
 * in die Halle setzen, Schatten, Licht. Das Ergebnis sitzt sauber im
 * Raum — aber das Auto darin ist nicht mehr das fotografierte Auto. Es
 * ist eine Nachzeichnung davon. Deshalb sieht es "fake" aus, und zwar
 * zu Recht: Der Lack ist nachgerechnet, die Felgen sind nachgerechnet,
 * die Spiegelungen sind erfunden.
 *
 * Fuer ein Verkaufsinserat ist das zusaetzlich das falsche Werkzeug am
 * falschen Ort. Der Haendler haftet fuer das, was das Foto zeigt. Ein
 * neu gemaltes Auto kann einen Kratzer verlieren, ohne dass es jemandem
 * auffaellt — und genau dann faellt es auf, wenn der Kaeufer davorsteht.
 *
 * ── Der Weg hier ──────────────────────────────────────────────────
 *
 * Gemini bekommt nur noch EINE Aufgabe, und es ist die, die es gut kann
 * und die kein Modell im Browser schafft: zu erkennen, welche Bildpunkte
 * zum Fahrzeug gehoeren. Es soll das Bild in derselben Groesse und
 * demselben Ausschnitt zurueckgeben, mit allem ausserhalb des Fahrzeugs
 * in reinem Magenta.
 *
 * Aus dieser Antwort wird NUR die Maske gelesen. Die Farbe kommt aus dem
 * Originalfoto, in voller Aufloesung, Bildpunkt fuer Bildpunkt. Was am
 * Ende in der Halle steht, ist damit das Auto des Haendlers und nicht
 * seine Nachzeichnung.
 *
 * Hinstellen, Schatten und Spiegelung macht danach `komponieren()` aus
 * kompositor.ts — der rechnet mit den Kameradaten des Raums statt zu
 * raten.
 *
 * ── Warum Magenta ─────────────────────────────────────────────────
 *
 * Es muss eine Farbe sein, die an einem Auto nicht vorkommt. Weiss,
 * Schwarz und Grau scheiden aus (Lack), Gruen und Blau ebenso
 * (Lack, Scheiben). Magenta kommt auf keinem Fahrzeug vor, das ein
 * Haendler verkauft, und liegt weit von jedem Grauton entfernt.
 */

import sharp from 'sharp';

const MODELL = process.env.GEMINI_BILD_MODELL || 'gemini-3.1-flash-image';
const ZEITLIMIT_MS = 35_000;

/** Wird nach jedem Bild aufgerufen, das Google berechnet hat. */
export type Bildzaehler = (anzahl: number) => void | Promise<void>;

let letzterGrund = '';
export const freistellGrund = () => letzterGrund;

const ANWEISUNG =
  'This is a photograph of one car, taken by a car dealer. I need a precise cut-out mask of that car, nothing else.\n\n'

  + 'Return the image again with exactly the same dimensions, the same framing and the same orientation as the image I gave you. '
  + 'Do not move the car, do not scale it, do not rotate it, do not crop the image and do not change its aspect ratio: every pixel of the car must stay at exactly the same position as in the image I gave you.\n\n'

  + 'In that returned image:\n'
  + 'Every pixel that belongs to the car keeps its original colour, completely unchanged. Do not repaint, relight, sharpen, smooth, clean or improve the car in any way. Leave its scratches, dents, dirt, dust, rust, stickers and reflections exactly as they are.\n'
  + 'Every pixel that does not belong to the car is replaced by pure magenta, RGB 255 0 255, a flat even colour with no shading, no gradient and no texture.\n\n'

  + 'What belongs to the car: the body, the glass including everything seen through it, the wheels and tyres, the wing mirrors and their arms, the roof aerial however thin, roof rails, roof boxes, spoilers, mud flaps, side steps, wiper arms, the number plate and its frame, the tow bar with its ball head, and the exhaust tips.\n'
  + 'What does not belong to the car: the ground under the tyres, the shadow the car casts, kerbs, drain covers, painted parking lines, grass, gravel, soil, snow, puddles, fences, hedges, trees, walls, buildings, other cars, bicycles, people, animals, bins, cones, signs, poles, cables and the sky.\n\n'

  + 'Be exact at the places where this usually goes wrong: fill the gaps between the spokes of the wheels with magenta, the gap between a roof rail and the roof, the hollow underneath the wing mirrors, the gap between tyre and wheel arch, and the dark area under the bumpers down to the ground. '
  + 'Follow the true outline of the body closely: no magenta biting into the paint, and no ring, fringe or halo of the old background left around the car, not even one pixel wide.\n\n'

  + 'If this photograph does not show a car at all — if it shows a person, an interior, a close-up of a wheel or an engine, a document, a screen or anything else — then fill the whole image with magenta and nothing else. Do not try to find something car-shaped in it.\n\n'

  + 'Return exactly one image. No text, no border, no second version, no transparent background: the area around the car is filled magenta.';

function mitZeitlimit<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), ms))]);
}

/**
 * Stellt das Fahrzeug frei und gibt das ORIGINALFOTO mit Alphakanal
 * zurueck (PNG). null, wenn kein Schluessel gesetzt ist, Gemini nichts
 * liefert oder die Maske unbrauchbar aussieht.
 */
export async function freistellenMitGemini(
  foto: Buffer,
  gezaehlt?: Bildzaehler,
): Promise<Buffer | null> {
  letzterGrund = '';
  const key = process.env.GEMINI_API_KEY;
  if (!key) { letzterGrund = 'kein Schluessel'; return null; }

  const meta = await sharp(foto).metadata();
  const breite = meta.width ?? 0;
  const hoehe = meta.height ?? 0;
  if (!breite || !hoehe) { letzterGrund = 'Foto nicht lesbar'; return null; }

  try {
    /*
     * Hochgeschickt wird eine kleinere Fassung: Die Maske braucht keine
     * volle Aufloesung, sie wird ohnehin wieder hochgezogen. Die FARBE
     * kommt spaeter aus dem Original, nicht hieraus.
     */
    const klein = await sharp(foto).resize(1536, 1536, { fit: 'inside' }).jpeg({ quality: 92 }).toBuffer();

    const antwort = await mitZeitlimit(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: ANWEISUNG },
              { inline_data: { mime_type: 'image/jpeg', data: klein.toString('base64') } },
            ],
          }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      },
    ), ZEITLIMIT_MS);

    if (!antwort) { letzterGrund = 'Zeitlimit'; return null; }
    if (!antwort.ok) {
      letzterGrund = `HTTP ${antwort.status}`;
      console.error('[gemini-freisteller]', antwort.status, (await antwort.text()).slice(0, 300));
      return null;
    }

    await gezaehlt?.(1);
    const daten = await antwort.json();
    const teile: Array<{ inlineData?: { data?: string } }> = daten?.candidates?.[0]?.content?.parts ?? [];
    const bildTeil = teile.find((t) => t.inlineData?.data);
    if (!bildTeil?.inlineData?.data) { letzterGrund = 'kein Bild in der Antwort'; return null; }

    /*
     * Die Antwort auf die Groesse des Originals ziehen. Gemini liefert
     * nicht zwingend dieselben Masze zurueck — fuer eine Maske ist das
     * verschmerzbar, fuer die Farbe waere es das nicht. Deshalb wird aus
     * dieser Antwort auch nur die Maske gelesen.
     */
    const roh = await sharp(Buffer.from(bildTeil.inlineData.data, 'base64'))
      .resize(breite, hoehe, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer();

    const punkte = breite * hoehe;
    const maske = Buffer.alloc(punkte);
    let fahrzeug = 0;
    for (let i = 0, p = 0; p < punkte; i += 3, p++) {
      const r = roh[i], g = roh[i + 1], b = roh[i + 2];
      /*
       * Magenta grosszuegig erkennen: Die Antwort ist durch JPEG
       * gelaufen, an den Kanten liegen Mischfarben. Rot und Blau hoch,
       * Gruen deutlich darunter — das trifft kein Lack und keine
       * Scheibe.
       */
      const istMagenta = r > 150 && b > 150 && g < 110 && (r - g) > 60 && (b - g) > 60;
      if (!istMagenta) { maske[p] = 255; fahrzeug++; }
    }

    const anteil = fahrzeug / punkte;
    /*
     * Zwei Arten, auf die diese Antwort unbrauchbar ist, und beide sind
     * schon vorgekommen: Das Modell malt gar kein Magenta (dann ist
     * alles "Fahrzeug"), oder es malt das ganze Bild zu (dann bleibt
     * nichts). Beides faellt hier durch, und der Aufrufer nimmt den
     * anderen Weg, statt ein Bild ohne Auto auszuliefern.
     *
     * Das ganz zugemalte Bild ist dabei kein Fehler, sondern eine
     * Antwort: Die Anweisung verlangt es ausdruecklich, wenn auf dem
     * Foto kein Auto ist. Dann greift weiter unten die Pruefung, die
     * dem Haendler sagt, dass er das falsche Bild hochgeladen hat —
     * statt ihm einen Mann im Poloshirt in die Halle zu stellen.
     */
    if (anteil > 0.92) { letzterGrund = `kein Hintergrund erkannt (${(anteil * 100).toFixed(0)} % Fahrzeug)`; return null; }
    if (anteil < 0.04) { letzterGrund = `fast nichts uebrig (${(anteil * 100).toFixed(1)} % Fahrzeug)`; return null; }

    /*
     * Die Maske um ein bis zwei Bildpunkte einziehen.
     *
     * Gemini zeichnet das Auto beim Antworten neu, auch wenn es die
     * Farbe behalten soll — die Kante kann dadurch um ein, zwei Punkte
     * verrutschen. Nimmt man die Maske dann unveraendert auf das
     * Original, steht ringsum ein feiner Saum des alten Hintergrunds.
     * Genau dieser Saum ist das, woran man ein bearbeitetes Inseratfoto
     * sofort erkennt.
     *
     * Weichzeichnen und hoch abschneiden zieht die Kante nach innen;
     * das zweite, schwaechere Weichzeichnen danach gibt ihr den weichen
     * Uebergang zurueck, den ein Objektiv auch hat.
     */
    const kante = await sharp(maske, { raw: { width: breite, height: hoehe, channels: 1 } })
      .blur(2.2)
      .threshold(240)
      .blur(0.5)
      /*
       * Ohne diese Zeile gibt sharp die Maske mit DREI Kanaelen zurueck:
       * Weichzeichnen hebt das Bild nach sRGB. Der Alphakanal wurde dann
       * aus jedem dritten Byte gelesen, die Maske war voellig verschoben,
       * und heraus kam ein leeres Bild. Die Probe in scripts/maske-probe.ts
       * hat genau das gezeigt: 0,0 Prozent des Fahrzeugs sichtbar.
       */
      .toColourspace('b-w')
      .raw()
      .toBuffer();

    const original = await sharp(foto).removeAlpha().raw().toBuffer();
    const rgba = Buffer.alloc(punkte * 4);
    for (let p = 0, q = 0, o = 0; p < punkte; p++, q += 4, o += 3) {
      rgba[q] = original[o];
      rgba[q + 1] = original[o + 1];
      rgba[q + 2] = original[o + 2];
      rgba[q + 3] = kante[p];
    }

    return await sharp(rgba, { raw: { width: breite, height: hoehe, channels: 4 } })
      .png()
      .toBuffer();
  } catch (fehler) {
    letzterGrund = fehler instanceof Error ? fehler.message : 'unbekannter Fehler';
    console.error('[gemini-freisteller]', fehler);
    return null;
  }
}
