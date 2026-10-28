/**
 * Innenraumfotos: weichzeichnen, was durch die Scheiben zu sehen ist.
 *
 * ── Worum es geht ──────────────────────────────────────────────────
 *
 * Ein Innenraumfoto laeuft nicht durchs Studio — es gibt nichts
 * freizustellen, das Auto ist ja ringsum. Durch die Frontscheibe sieht
 * man trotzdem den ganzen Hof: fremde Fahrzeuge mit lesbaren
 * Kennzeichen, Anhaenger, das Firmenschild des Nachbarn mit Anschrift
 * und Telefonnummer, manchmal Leute.
 *
 * Fuer das Inserat ist das zweierlei. Erstens unruhig: Der Blick geht
 * an der Mittelkonsole vorbei nach draussen. Zweitens heikel: Ein
 * lesbares fremdes Kennzeichen ist ein personenbezogenes Datum, und
 * die Anschrift eines anderen Betriebs hat in der Anzeige dieses
 * Haendlers nichts zu suchen.
 *
 * ── Wie es geloest ist ─────────────────────────────────────────────
 *
 * Genau wie beim Freisteller: Gemini sagt nur, WO etwas ist. Es gibt
 * das Bild in derselben Groesse zurueck und malt alles, was durch
 * eine Scheibe nach draussen zeigt, in reinem Magenta.
 *
 * Daraus wird eine Maske gelesen. Veraendert wird dann nur, was diese
 * Maske trifft, und zwar durch Weichzeichnen des ORIGINALS — kein
 * Pixel wird neu gemalt. Das Armaturenbrett, die Sitze, das Lenkrad,
 * der Tacho und jeder Kratzer darauf bleiben unangetastet. Der Blick
 * nach draussen bleibt als heller Fleck erkennbar, nur eben ohne
 * lesbare Einzelheiten.
 *
 * Weichzeichnen und nicht zumalen ist Absicht: Eine milchige Scheibe
 * sieht aus wie ein Foto gegen die Sonne. Eine zugemalte Scheibe sieht
 * aus, als haette jemand etwas zu verbergen.
 */

import sharp from 'sharp';

const MODELL = process.env.GEMINI_BILD_MODELL || 'gemini-3.1-flash-image';
const ZEITLIMIT_MS = 35_000;

export type Bildzaehler = (anzahl: number) => void | Promise<void>;

let letzterGrund = '';
export const scheibenGrund = () => letzterGrund;

const ANWEISUNG =
  'This is a photograph taken inside a car: dashboard, steering wheel, seats, centre console. I need a mask of the OUTSIDE WORLD seen through the windows, nothing else.\n\n'

  + 'Return the image again with exactly the same dimensions, the same framing and the same orientation as the image I gave you. Do not move anything, do not crop, do not rotate, do not rescale.\n\n'

  + 'In that returned image:\n'
  + 'Every pixel that shows something OUTSIDE the car, seen through the windscreen, the side windows, the rear window, a sunroof or an open door, is replaced by pure magenta, RGB 255 0 255, flat and even.\n'
  + 'Every other pixel keeps its original colour, completely unchanged.\n\n'

  + 'Outside, and therefore magenta: other cars, vans, trailers and lorries in the yard, buildings, walls, roofs, company signs and their lettering, phone numbers, number plates of other vehicles, fences, poles, bins, trees, hedges, grass, tarmac, parked bicycles, people, the sky and the horizon.\n\n'

  + 'Inside, and therefore untouched: the dashboard, the instrument cluster and everything on its screens, the steering wheel and its buttons, the gear lever, the handbrake, the centre console, the radio and climate controls, the air vents, the seats, the seat belts, the door panels, the door handles, the pillars, the roof lining, the sun visors, the rear-view mirror housing, the keys in the ignition, and anything lying in the car.\n\n'

  + 'Two things need care, because they are the ones that go wrong:\n'
  + 'The glass itself stays untouched where it is just glass: dirt, water spots, scratches, the inspection sticker and the dark band at the top of the windscreen belong to the car. Only what you can SEE THROUGH the glass becomes magenta.\n'
  + 'The rear-view mirror shows the outside as well. Paint the image inside the mirror magenta, but not the mirror housing around it.\n\n'

  + 'Follow the edges of the window openings precisely: the magenta ends exactly where the pillar, the dashboard, the door frame or the mirror housing begins. No magenta on the bodywork, no strip of the yard left along a pillar.\n\n'

  + 'If this photograph is not taken inside a car, or if no window shows anything of the outside, return the image completely unchanged, without any magenta.\n\n'

  + 'Return exactly one image. No text, no border, no second version.';

function mitZeitlimit<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), ms))]);
}

/**
 * Zeichnet weich, was durch die Scheiben zu sehen ist.
 *
 * Gibt das fertige JPEG zurueck, oder null, wenn kein Schluessel
 * gesetzt ist, Gemini nichts liefert oder die Maske unbrauchbar
 * aussieht. Der Aufrufer behaelt dann das Originalfoto.
 */
export async function scheibenSaeubern(
  foto: Buffer,
  gezaehlt?: Bildzaehler,
): Promise<{ bild: Buffer; anteil: number } | null> {
  letzterGrund = '';
  const key = process.env.GEMINI_API_KEY;
  if (!key) { letzterGrund = 'kein Schluessel'; return null; }

  const meta = await sharp(foto).metadata();
  const breite = meta.width ?? 0;
  const hoehe = meta.height ?? 0;
  if (!breite || !hoehe) { letzterGrund = 'Foto nicht lesbar'; return null; }

  try {
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
      console.error('[scheiben] ', antwort.status, (await antwort.text()).slice(0, 300));
      return null;
    }

    await gezaehlt?.(1);
    const daten = await antwort.json();
    const teile: Array<{ inlineData?: { data?: string } }> = daten?.candidates?.[0]?.content?.parts ?? [];
    const bildTeil = teile.find((t) => t.inlineData?.data);
    if (!bildTeil?.inlineData?.data) { letzterGrund = 'kein Bild in der Antwort'; return null; }

    const roh = await sharp(Buffer.from(bildTeil.inlineData.data, 'base64'))
      .resize(breite, hoehe, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer();

    const punkte = breite * hoehe;
    const maske = Buffer.alloc(punkte);
    let draussen = 0;
    for (let i = 0, p = 0; p < punkte; i += 3, p++) {
      const r = roh[i], g = roh[i + 1], b = roh[i + 2];
      if (r > 150 && b > 150 && g < 110 && (r - g) > 60 && (b - g) > 60) {
        maske[p] = 255;
        draussen++;
      }
    }

    const anteil = draussen / punkte;
    /*
     * Unter einem halben Prozent ist nichts gefunden worden — dann ist
     * entweder kein Fenster im Bild oder das Modell hat die Aufgabe
     * nicht verstanden. Ueber drei Vierteln kann es kein Innenraumfoto
     * sein; dann waere der halbe Wagen weichgezeichnet. Beides gibt
     * das Originalfoto zurueck.
     */
    if (anteil < 0.005) { letzterGrund = `nichts gefunden (${(anteil * 100).toFixed(1)} %)`; return null; }
    if (anteil > 0.75) { letzterGrund = `zu viel markiert (${(anteil * 100).toFixed(0)} %)`; return null; }

    /*
     * Die Kante weich halten. Anders als beim Freisteller wird hier
     * nichts ausgeschnitten, sondern ueberblendet — ein harter Rand um
     * die Scheibe saehe aus wie ein aufgeklebtes Rechteck.
     */
    const kante = await sharp(maske, { raw: { width: breite, height: hoehe, channels: 1 } })
      .blur(2.5)
      .toColourspace('b-w')
      .raw()
      .toBuffer();

    /*
     * Wie stark weichgezeichnet wird, haengt an der Bildgroesse: Ein
     * Kennzeichen im Hof ist bei 3000 Punkten Breite groesser als bei
     * 900, und unlesbar soll es in beiden Faellen sein.
     */
    const staerke = Math.max(8, Math.round(breite / 55));
    const weich = await sharp(foto).removeAlpha().blur(staerke).raw().toBuffer();

    const rgba = Buffer.alloc(punkte * 4);
    for (let p = 0, q = 0, o = 0; p < punkte; p++, q += 4, o += 3) {
      rgba[q] = weich[o];
      rgba[q + 1] = weich[o + 1];
      rgba[q + 2] = weich[o + 2];
      rgba[q + 3] = kante[p];
    }

    const ebene = await sharp(rgba, { raw: { width: breite, height: hoehe, channels: 4 } })
      .png()
      .toBuffer();

    const fertig = await sharp(foto)
      .composite([{ input: ebene, left: 0, top: 0 }])
      /*
       * 95 und nicht 92: Das ganze Foto wird beim Zusammensetzen neu
       * kodiert, auch der Teil, den niemand angefasst hat. Gemessen
       * (scripts/scheiben-probe.ts): bei 92 weichen Punkte im
       * Armaturenbrett um bis zu 11 Stufen ab, bei 95 nur noch um 5 —
       * unsichtbar, aber das Foto des Haendlers soll so wenig wie
       * moeglich leiden.
       */
      .jpeg({ quality: 95 })
      .toBuffer();

    return { bild: fertig, anteil };
  } catch (fehler) {
    letzterGrund = fehler instanceof Error ? fehler.message : 'unbekannter Fehler';
    console.error('[scheiben]', fehler);
    return null;
  }
}
