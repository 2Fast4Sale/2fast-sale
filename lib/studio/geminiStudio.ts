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

/*
 * Nano Banana 2. Das kleinere "lite" stand hier als Voreinstellung, und
 * genau daran lag es: In der Vorschau hielt sich das kleine Modell nicht
 * an die Anweisung — Kennzeichen nicht ueberdeckt, Scheiben nicht
 * gesaeubert. Dieselben Texte mit dem grossen Modell liefen sauber.
 */
const MODELL = process.env.GEMINI_BILD_MODELL || 'gemini-3.1-flash-image';
/*
 * 35 statt 60 Sekunden: Auf dem Hobby-Tarif bricht Vercel eine Funktion
 * nach 60 Sekunden hart ab. Dann kaeme gar keine Antwort beim Haendler
 * an — mit dem kuerzeren Limit bleibt Zeit, wenigstens das eigene Bild
 * zurueckzugeben.
 */
const ZEITLIMIT_MS = 35_000;

/**
 * Wie aehnlich das Fahrzeug dem Original mindestens bleiben muss, 0 bis 1.
 *
 * Verglichen werden Graustufen-Miniaturen des Fahrzeugbereichs. Ein
 * anderer Hintergrund und ein neuer Schatten aendern den Wert kaum, ein
 * neu erfundenes Auto sehr wohl.
 */
/*
 * Nur noch eine Notbremse, keine Qualitaetspruefung.
 *
 * Solange der eigene Kompositor das Bild baute, war 0,82 sinnvoll: Dort
 * durfte sich am Fahrzeug fast nichts aendern. Jetzt macht Gemini alles
 * — freistellen, einsetzen, Schatten — und dabei aendert sich naturgemaess
 * viel. Eine strenge Schwelle wuerde genau die Arbeit verwerfen, die
 * gewuenscht ist.
 *
 * 0,55 faengt nur noch den Fall ab, dass ein voellig anderes Bild
 * zurueckkommt. Wer strenger pruefen will, setzt GEMINI_AEHNLICH_MIN.
 */
const AEHNLICH_MIN = Number(process.env.GEMINI_AEHNLICH_MIN || '0.55');

/*
 * Die gesamte Arbeit steht in diesem Text.
 *
 * Auf ausdruecklichen Wunsch macht Gemini alles: freistellen, in den
 * Raum setzen, Groesse waehlen, auf den Boden stellen, Schatten, Licht,
 * Scheiben und das Haendlerschild. Daneben laeuft kein eigener
 * Rechenschritt mehr, der etwas davon korrigiert.
 *
 * Damit haengt das Ergebnis vollstaendig an diesen Saetzen. Sie sind
 * nach Aufgaben geordnet und nennen Zahlen, wo Zahlen moeglich sind:
 * Ein Modell haelt sich eher an "etwa die Haelfte der Bildbreite" als
 * an "nicht zu gross".
 */
const anweisung = (firma?: string | null) =>
  'You are preparing a photograph for a professional car dealership listing. '
  + 'Image 1 is the original photograph of a car, taken outdoors or in a yard. Image 2 is the empty showroom the car must end up in. '
  + 'Produce one single photorealistic image: the car from image 1, standing inside the showroom from image 2, looking as if it had really been photographed there. '
  + 'First cut the car out of image 1 completely and cleanly. '
  + 'Follow its real outline: mirrors, antenna, spoiler, tow bar and the gap under the bumpers belong to the car, the ground under the tyres does not. '
  + 'Nothing of the original surroundings may survive anywhere in the result: no asphalt, no kerb, no grass, no buildings, no other cars, no people, not even as a thin edge along the body. '
  + 'Place the car on the floor of the showroom with every visible wheel resting exactly on the ground, so that it neither floats above the floor nor sinks into it. '
  + 'You may move, scale and very slightly rotate the car to achieve that, but never mirror it: the side facing the camera in image 1 must face the camera in the result, and the steering wheel stays on the same side. '
  + 'You are free to move the car anywhere on the floor and to make it larger or smaller as much as you need: keeping its original size matters far less than standing correctly in the room. '
  + 'Size the car so that it covers about half of the image width and never more than 60 percent, and leave clear empty floor in front of it, behind it and on both sides. '
  + 'The car must stand level on the floor: its wheel contact points must follow the perspective of that floor, so the car looks neither tilted to one side nor leaning forwards or backwards, and the line between floor and wall must run behind the car, never through it. '
  + 'Think of the floor as a flat horizontal plane that continues under the whole car; place all four wheels on that same plane, not one wheel higher than the other. '
  + 'Keep the room exactly as it is in image 2: same walls, same floor, same lights, same camera position, same framing, and do not make the hall look smaller or narrower. '
  + 'The whole car must be inside the picture with clear margin to every edge, and the roof must stay below the middle height of the picture. '
  + 'Add a realistic soft ground shadow under the car, darkest directly under the tyres and the underbody, fading out softly a short distance beyond the outline, lying only on the floor and never on the walls. '
  + 'Match brightness, contrast and white balance of the car to the light of this hall, without repainting the car. '
  + 'The finished picture must be at least as bright as image 2: do not darken the room, not even slightly, because a dark showroom looks cheap in a listing. '
  + 'Look carefully through the windscreen, the side windows and the rear window. '
  + 'Everything visible through that glass belongs to the place where the car was photographed, so every other car, fence, tree, building, street and person behind the glass must be painted over with the calm reflections and surfaces of this showroom. '
  + 'Keep the glass as glass: transparent where it was transparent, the seats and the interior still visible, and the tint exactly as dark as in image 1. '
  + (firma
    ? `Cover the number plate completely with a plain dark rectangular dealer sign, in the same place, at the same angle and with the same size and shape as the plate, so that not one character of the original plate stays readable. `
      + `On that sign write this text and nothing else, in clean white letters, centred: "${firma}". `
      + `Spell it exactly like this, letter by letter, with no letter added, removed or exchanged: ${[...firma].map((z) => (z === ' ' ? 'SPACE' : z)).join('-')}. `
      + `Read your own result back before you finish and compare it letter by letter with that spelling; a dealer name with one wrong letter would stand on every photo of the listing. `
    : 'Cover the number plate completely with a plain dark rectangular sign, in the same place and at the same angle as the plate, so that not one character of it stays readable, and write no text on that sign. ')
  + 'The car itself must stay exactly as photographed: same shape, same colour, same wheels, same rims, same badges, same trim, same mirrors, same windows. '
  + 'Never hide, smooth or repair a scratch, a dent, rust, dirt, a sticker, a chip or a crack, neither in the paint nor in the glass, because the dealer is liable for every defect that a listing conceals. '
  + 'Do not add parts the car does not have, and do not add people, other vehicles, plants, text, logos or watermarks anywhere in the image. '
  + 'Before you finish, check your result once more: does every visible wheel touch the floor, is the whole car inside the picture, is any piece of the old surroundings still visible anywhere including through the glass, and is the dealer name spelled exactly as given? '
  + 'Correct whatever fails that check, then return exactly one photorealistic image with the same dimensions as image 2.';

function mitZeitlimit<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), ms))]);
}

/** Anteil deutlich veraenderter Bildpunkte in Prozent, an 256er-Miniaturen. */
async function anteilGeaendert(a: Buffer, b: Buffer): Promise<number> {
  const masse = { width: 256, height: 256, fit: 'fill' as const };
  const [ga, gb] = await Promise.all([
    sharp(a).flatten({ background: '#808080' }).resize(masse).greyscale().raw().toBuffer(),
    sharp(b).flatten({ background: '#808080' }).resize(masse).greyscale().raw().toBuffer(),
  ]);
  let zaehler = 0;
  for (let i = 0; i < ga.length; i++) if (Math.abs(ga[i] - gb[i]) > 25) zaehler++;
  return (zaehler / ga.length) * 100;
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
  /**
   * Anteil der Bildpunkte, die sich deutlich geaendert haben, in Prozent.
   *
   * Die Aehnlichkeit allein sagt zu wenig: Ein Bild, an dem Gemini nur
   * die Scheiben gesaeubert hat, und ein Bild, das es unveraendert
   * zurueckschickt, liegen beide bei 0,98. Dieser Wert unterscheidet
   * beide Faelle — bei einer echten Aenderung liegt er ueber 1 Prozent,
   * bei einer blossen Rueckgabe nahe null.
   */
  geaendert: number;
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
  letzterGrund = '';
  if (!key) { letzterGrund = 'kein Schluessel'; return null; }

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
      letzterGrund = `verworfen, Fahrzeug weicht zu stark ab (${aehnlich.toFixed(3)} unter ${AEHNLICH_MIN})`;
      console.warn('[gemini-studio]', letzterGrund);
      return null;
    }
    return { bild, aehnlich, geaendert: await anteilGeaendert(foto, bild) };
  } catch (err) {
    letzterGrund = 'Fehler: ' + (err instanceof Error ? err.message : String(err));
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

/*
 * Wie viel Prozent des Bildes Gemini mindestens angefasst haben muss.
 *
 * Ein Modell, das die Aufgabe ueberspringt, schickt das Eingabebild
 * beinahe unveraendert zurueck. Die Aehnlichkeit liegt dann bei 0,98 —
 * genau wie bei einer gelungenen Verfeinerung, denn auch die aendert nur
 * Scheiben, Schatten und Licht. Nur der Anteil geaenderter Bildpunkte
 * trennt beide Faelle: gemessen 4,9 Prozent bei echter Arbeit, nahe null
 * bei blosser Rueckgabe.
 */
const GEAENDERT_MIN = Number(process.env.GEMINI_GEAENDERT_MIN || '0.8');

const verfeinernText = (firma?: string | null) =>
  'Image 1 shows a car that has already been placed into a showroom at exactly the right size and position, but it still looks pasted in. '
  + 'Your MOST IMPORTANT task is the glass: look carefully through the windscreen, the side windows and the rear window of the car. '
  + 'Whatever is visible through that glass comes from the place where the car was originally photographed, so every other car, fence, tree, building, street, sky and person behind the glass must be painted over. '
  + 'Replace all of it with the calm, plain reflections and surfaces of this showroom, so that only this hall can be seen in the glass. '
  + 'Keep the glass as glass: it stays transparent where it was transparent, the seats, the steering wheel and the interior stay visible, and the tint stays exactly as dark as it is now. '
  + 'Your second task is the ground shadow: add a realistic soft shadow under the car, darkest under the tyres and the underbody, fading out softly, lying only on the floor and never on the walls. '
  + 'Your third task is the light: match brightness, contrast and white balance of the car to the light of this hall, without repainting the car. '
  + 'Keep the picture exactly as bright as image 1: wall, floor and empty space must keep their brightness, and you must not darken the room, not even slightly — a dark showroom looks cheap in a listing. '
  + 'Everything else must stay exactly as it is. '
  + 'Keep the car exactly where it is and exactly as large as it is: do not move it, do not scale it, do not rotate it, do not mirror it and do not re-frame the picture. '
  + 'Keep the room exactly as it is: same walls, same floor, same ceiling lights, same camera, same framing. '
  + 'The car itself must stay exactly as photographed: same shape, same colour, same wheels, same badges, same trim, same mirrors. '
  + (firma
    ? `Your fourth task is the number plate: cover it completely with a plain dark rectangular dealer sign, in the same place, at the same angle and with the same size and shape as the plate, so that not one character of the original plate stays readable. `
      + `On that sign write this text and nothing else, in clean white letters, centred: "${firma}". `
      + `Spell it exactly like this, letter by letter, with no letter added, removed or exchanged: ${[...firma].map((z) => (z === ' ' ? 'SPACE' : z)).join('-')}. `
      + `Read your own result back before you finish and compare it letter by letter with that spelling; a dealer name with one wrong letter is worse than no sign at all, because it would stand on every photo of the listing. `
    : 'Your fourth task is the number plate: cover it completely with a plain dark rectangular sign, in the same place and at the same angle as the plate, so that not one character of it stays readable, and write no text on that sign. ')
  + 'Do not add people, other vehicles, plants, text, logos or watermarks, and return exactly one photorealistic image with the same dimensions as image 1. '
  + 'Before you finish, check the result once more: is any car, fence, tree, building, street or sky still visible through the windscreen, a side window or the rear window? '
  + 'If anything like that is still there, paint it over with the plain surfaces of this hall, because a showroom photograph in which the old surroundings show through the glass is the one mistake you must not make.';

/**
 * Nimmt das fertig zusammengesetzte Studiobild und laesst Gemini nur
 * Schatten, Licht und Scheiben verbessern.
 *
 * null heisst: nicht verwendbar — dann bleibt das Bild des Kompositors.
 */
/**
 * Warum eine Verfeinerung nicht benutzt wurde. Steht in der Antwort und
 * damit in der Konsole des Browsers — sonst raet man beim Testen, ob
 * Gemini lief, verworfen wurde oder gar nicht erst antwortete.
 */
export let letzterGrund = '';

/** Welches Modell tatsaechlich gefragt wurde — zur Anzeige im Browser. */
export const GENUTZTES_MODELL = MODELL;

/**
 * Anteil geaenderter Bildpunkte in einem Ausschnitt, in Prozent.
 *
 * Gebraucht fuer die obere Haelfte des Fahrzeugs: Dort sitzen die
 * Scheiben. Ein Schatten auf dem Boden aendert das Gesamtbild, laesst
 * diesen Ausschnitt aber unberuehrt — nur so ist zu erkennen, ob Gemini
 * die Spiegelungen wirklich angefasst hat.
 */
export async function anteilGeaendertImKasten(
  a: Buffer,
  b: Buffer,
  kasten: { left: number; top: number; width: number; height: number },
): Promise<number> {
  const schneiden = (bild: Buffer) =>
    sharp(bild).extract(kasten).resize(192, 192, { fit: 'fill' }).greyscale().raw().toBuffer();
  const [ga, gb] = await Promise.all([schneiden(a), schneiden(b)]);
  let zaehler = 0;
  for (let i = 0; i < ga.length; i++) if (Math.abs(ga[i] - gb[i]) > 25) zaehler++;
  return (zaehler / ga.length) * 100;
}

export async function studioVerfeinernMitGemini(
  komponiert: Buffer,
  /** Name fuers Haendlerschild, nur zur Information fuer das Modell. */
  firma?: string | null,
): Promise<StudioErgebnis | null> {
  letzterGrund = '';
  const key = process.env.GEMINI_API_KEY;
  if (!key) { letzterGrund = 'kein Schluessel'; return null; }

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
      letzterGrund = antwort ? `Gemini antwortete ${antwort.status}` : 'Zeitlimit';
      console.warn('[gemini-verfeinern] Antwort nicht brauchbar:', antwort?.status);
      return null;
    }

    const daten = await antwort.json();
    const teile = daten?.candidates?.[0]?.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teil = teile.find((p: any) => p.inline_data?.data || p.inlineData?.data);
    const b64 = teil?.inline_data?.data ?? teil?.inlineData?.data;
    if (!b64) { letzterGrund = 'Gemini schickte kein Bild'; return null; }

    const masse = await sharp(komponiert).metadata();
    const bild = await sharp(Buffer.from(b64, 'base64'))
      .resize(masse.width, masse.height, { fit: 'fill' })
      .jpeg({ quality: 92 })
      .toBuffer();

    const aehnlich = await aehnlichkeit(komponiert, bild);
    const geaendert = await anteilGeaendert(komponiert, bild);
    console.info('[gemini-verfeinern] fertig in', Date.now() - start, 'ms, Aehnlichkeit', aehnlich.toFixed(3),
      'geaendert', geaendert.toFixed(1) + '%');
    if (geaendert < GEAENDERT_MIN) {
      letzterGrund = 'Gemini gab das Bild unveraendert zurueck ('
        + geaendert.toFixed(1) + '% statt mindestens ' + GEAENDERT_MIN + '%)';
      console.warn('[gemini-verfeinern]', letzterGrund);
      return null;
    }
    if (aehnlich < VERFEINERN_MIN) {
      letzterGrund = `verworfen, Aehnlichkeit ${aehnlich.toFixed(3)} unter ${VERFEINERN_MIN}`;
      console.warn('[gemini-verfeinern] verworfen: Bild weicht zu stark ab');
      return null;
    }
    return { bild, aehnlich, geaendert };
  } catch (err) {
    letzterGrund = 'Fehler: ' + (err instanceof Error ? err.message : String(err));
    console.error('[gemini-verfeinern] fehlgeschlagen:', err);
    return null;
  }
}
