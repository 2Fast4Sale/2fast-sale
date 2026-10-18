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
  'You are a retoucher at a professional car dealership. You prepare the photographs that go into the dealer’s online listings on mobile.de and AutoScout24. '
  + 'A buyer decides from these pictures whether to drive across the country to see the car, and the dealer is legally liable for everything the pictures show or hide. Work accordingly: precise, sober, nothing invented, nothing beautified.\n\n'

  + 'YOU RECEIVE TWO IMAGES.\n'
  + 'Image 1: the dealer’s own photograph of one car, taken outdoors, in a yard, on a street or in a car park. It may be badly lit, crooked, cluttered with other cars, people, buildings, bins, fences or traffic signs.\n'
  + 'Image 2: an empty showroom, photographed with no car in it. This is the room the car must end up in.\n\n'

  + 'YOUR RESULT: exactly one photorealistic image, the same size and the same aspect ratio as image 2, showing the car from image 1 standing inside the showroom from image 2, so convincingly that nobody can tell the car was photographed anywhere else.\n\n'

  + 'STEP 0 — IS THIS A USABLE PHOTOGRAPH?\n'
  + 'Look at image 1 before you do anything else and decide what it shows.\n'
  + 'If it shows a complete car seen from outside — front, rear, side or three-quarter view — carry out every step below.\n'
  + 'If it does NOT show that — for example a person, a close-up of a wheel, a dashboard, a seat, an engine bay, a boot, a document, a registration paper, a screen, a key, a damaged part on its own, or a car so cut off that less than roughly two thirds of it is in frame — then do NOT place anything in the showroom. Return image 1 unchanged instead. A detail photograph belongs in the listing as it is; a detail pasted into an empty hall looks absurd and tells the buyer nothing.\n\n'

  + 'STEP 1 — CUT THE CAR OUT OF IMAGE 1.\n'
  + 'Separate the car from its surroundings completely and along its true outline.\n'
  + 'These belong to the car and must come with it: wing mirrors including their arms, the roof aerial however thin, roof rails and roof boxes, spoilers, the tow bar and its ball head, mud flaps, side steps, wiper arms, number plate and plate frame, exhaust tips, and the dark gap between the bottom of the bumpers and the ground.\n'
  + 'These do not belong to the car and must not come with it: the ground under the tyres, the shadow the car casts on that ground, kerbs, drain covers, painted parking lines, grass, gravel, snow, puddles, fences, hedges, walls, buildings, other cars, bicycles, people, animals, bins, cones, traffic signs, poles, cables, and the sky.\n'
  + 'Pay particular attention to the places where a cut-out usually fails: the gaps inside the wheels between the spokes, the hollow under the door mirrors, the space between a roof rail and the roof, the window openings, the gap between tyre and wheel arch, and the thin line between the bonnet and the windscreen.\n'
  + 'Not one pixel of the original surroundings may survive anywhere in the result, not even as a thin coloured fringe along the edge of the body, around the mirrors or between the spokes. A green fringe from a hedge or a grey fringe from asphalt is the single most common giveaway that a listing photo was edited.\n'
  + 'Do not cut into the car either: no clipped mirror, no sliced bumper corner, no missing piece of roof, no amputated aerial.\n\n'

  + 'STEP 2 — KEEP THE CAR EXACTLY AS IT WAS PHOTOGRAPHED.\n'
  + 'This is the most important rule of all, and it outranks every wish to make the picture look nicer.\n'
  + 'Same shape, same proportions, same body panels, same colour and the exact same shade of that colour, same metallic flake, same wheels, same rims down to the number of spokes, same tyres, same badges and lettering, same trim strips, same mirrors, same lights, same grille, same glass, same tint.\n'
  + 'Never remove, smooth, repair, lighten or hide: a scratch, a scuff, a dent, a crease, a chipped edge, rust, a rust bubble, flaking lacquer, a stone chip, a crack or chip in the glass, a missing wheel cap, a kerbed rim, a bald tyre, brake dust, a sticker, a window advert, an inspection badge, dirt, dust, water spots, bird droppings, or a faded headlight.\n'
  + 'Every one of those is a fact about this particular car. If the picture hides it, the dealer is liable for it. A listing photograph that flatters the car is worse than an ugly one.\n'
  + 'Do not add anything the car does not have either: no extra spoiler, no different rims, no sunroof, no badge, no roof rails, no chrome, no tinted glass, no fresh shine on dull paint.\n'
  + 'Keep the car as sharp and as detailed as it is in image 1. Do not smooth the paint, do not blur the panel gaps, do not give it a glossy plastic or rendered look, and do not apply any depth-of-field blur to any part of the car.\n'
  + 'Never mirror or flip the car: the side that faces the camera in image 1 must face the camera in the result, the steering wheel stays on the same side, and all lettering stays readable the right way round.\n'
  + 'Do not rotate the car to a different viewing angle. It stays photographed from the same angle it was photographed from; you may only straighten it by a degree or two to make it sit level.\n\n'

  + 'STEP 3 — PLACE IT IN THE ROOM.\n'
  + 'Keep the showroom exactly as it is in image 2: the same walls, the same floor and its texture, the same ceiling, the same lamps in the same places, the same windows, the same camera position, the same focal length, the same framing and the same brightness. Do not rebuild, extend, narrow, shorten or redecorate the hall, and do not add pillars, plants, banners, furniture, other cars, people or text to it.\n'
  + 'Treat the floor of that room as one flat horizontal plane that continues underneath the whole car.\n'
  + 'Stand the car on that plane so that every visible wheel touches it: no wheel floating above the floor, no wheel sunk into it, no wheel higher than another. The car must look neither tilted to one side nor leaning forwards or backwards.\n'
  + 'The contact points of the wheels must follow the perspective of that floor — the far wheels sit higher in the picture than the near wheels, by the amount the floor’s perspective demands.\n'
  + 'The line where the floor meets the back wall must run behind the car, never through it. No part of the car may stand in or behind that line, and no wheel may touch the wall.\n'
  + 'You may move the car anywhere on the floor and scale it as much as you need. Its original size in image 1 does not matter; standing correctly in the room matters.\n'
  + 'Size it so that the car covers roughly half the width of the picture and never more than sixty percent, with clearly visible empty floor in front of it, behind it and on both sides.\n'
  + 'The whole car must be inside the picture with a clear margin to all four edges. Nothing may be cut off, not a mirror, not a bumper corner, not a wheel.\n'
  + 'The roof of the car must stay below the middle height of the picture, so that the room is visible above it.\n\n'

  + 'STEP 4 — SHADOW.\n'
  + 'A car without a shadow floats, and that is the second most common giveaway after the fringe.\n'
  + 'Build the shadow from two parts.\n'
  + 'First the contact shadow: a narrow, clearly darker, fairly sharp dark area directly where each tyre meets the floor and in the shaded strip under the whole underbody between the wheels. This is what makes the car sit on the ground.\n'
  + 'Then the ambient shadow: a soft, much lighter shadow that spreads a short distance outwards beyond the outline of the car and fades out gradually.\n'
  + 'Its direction and length must match the lamps that are visible in image 2 — if the light comes mostly from above, the shadow stays close under the car.\n'
  + 'The shadow lies on the floor only. It never climbs the walls, never falls on the ceiling, and never appears on the car itself.\n'
  + 'If the floor in image 2 is glossy, add a faint, vertically stretched, blurred reflection of the car in it, directly below the car, clearly weaker than the car itself and fading out with distance. If the floor is matt, add no reflection at all. Never make the floor look wet.\n\n'

  + 'STEP 5 — LIGHT.\n'
  + 'Match the car to the light of the showroom without repainting it.\n'
  + 'Adjust its overall brightness, its contrast and its white balance to the room: a car photographed in blue evening light or under a yellow street lamp must lose that cast and take on the neutral light of the hall.\n'
  + 'Where the room has lamps above, the roof, the bonnet, the boot lid and the upper edges of the doors may carry soft highlights from them, and the shaded sides stay darker. Keep these highlights soft and plausible; do not paint hard white streaks onto the paint.\n'
  + 'The colour of the car must stay the colour of the car. Do not deepen it, do not saturate it, do not make a silver car white or a dark grey car black.\n'
  + 'The finished picture must be at least as bright as image 2. Do not darken the room, not even slightly: a dark showroom looks cheap in a listing.\n\n'

  + 'STEP 6 — THE GLASS.\n'
  + 'Look carefully through the windscreen, through every side window and through the rear window, and at the reflections lying on top of them.\n'
  + 'Everything visible through or reflected in that glass still belongs to the place where the car was photographed. Every other car, fence, tree, hedge, building, street, pole, sign, cloud and person behind or on the glass must be painted over with the calm surfaces and soft reflections of this showroom instead.\n'
  + 'The same applies to the mirrors and to the reflections on the paintwork itself: what is mirrored in the doors and the bonnet must be this hall, not a hedge or a block of flats.\n'
  + 'Keep glass as glass: transparent where it was transparent, with the headrests, seats, steering wheel and interior still visible behind it, and with exactly the same tint as in image 1. Do not make the windows darker to hide what is behind them, and do not turn them into opaque mirrors.\n\n'

  + (firma
    ? 'STEP 7 — THE NUMBER PLATE.\n'
      + 'Cover the number plate completely with a plain dark rectangular dealer sign. It sits in exactly the same place, at exactly the same angle and with the same size and shape as the plate it replaces, and it follows the perspective of the car. Not one character of the original plate may stay readable, not at the edges, not through the sign.\n'
      + `On that sign write this text and nothing else, in clean white sans-serif letters, horizontally centred and vertically centred: "${firma}". `
      + `Spell it exactly like this, letter by letter, with no letter added, removed or exchanged: ${[...firma].map((z) => (z === ' ' ? 'SPACE' : z)).join('-')}. `
      + 'Keep the text inside the sign with a small margin, do not let it touch the edges, and do not stretch it.\n'
      + 'If a second plate is visible — for example at the front and the rear in a three-quarter view — treat it the same way.\n'
      + 'Before you finish, read the name on the sign back in your own result and compare it letter by letter with the spelling above. A dealer name with one wrong letter would stand on every photograph of this listing.\n\n'
    : 'STEP 7 — THE NUMBER PLATE.\n'
      + 'Cover the number plate completely with a plain dark rectangular sign, in exactly the same place, at the same angle and with the same size and shape as the plate, following the perspective of the car, so that not one character of it stays readable. Write no text at all on that sign.\n'
      + 'If a second plate is visible, treat it the same way.\n\n')

  + 'NEVER DO THESE THINGS.\n'
  + 'Do not add people, other vehicles, plants, furniture, price tags, banners, flags, text, logos, watermarks, signatures or borders anywhere in the image.\n'
  + 'Do not add a second copy of the car, and do not show it from two sides at once.\n'
  + 'Do not produce a collage, a split image, a frame, a caption or a before-and-after comparison. One single photograph, nothing else.\n'
  + 'Do not change the aspect ratio or the dimensions of image 2.\n\n'

  + 'FINAL CHECK — go through this list on your own result before you return it.\n'
  + '1. Is the car in the result the same car as in image 1, with every scratch, dent, sticker and dirty patch still there?\n'
  + '2. Is any piece of the old surroundings still visible anywhere — at the edge of the body, between the spokes, around the mirrors, through the glass, in the reflections on the paint?\n'
  + '3. Does every visible wheel stand on the floor, on the same plane, with the car level and not tilted?\n'
  + '4. Is the whole car inside the picture with a margin to every edge, and is the roof below the middle of the picture?\n'
  + '5. Is the room still exactly the room from image 2, equally bright, with nothing added to it?\n'
  + '6. Does the car have a contact shadow under the tyres and a soft shadow around it, lying only on the floor?\n'
  + '7. Is the number plate completely covered, and is the dealer name spelled exactly as given?\n'
  + 'Correct whatever fails this check, then return exactly one photorealistic image with the same dimensions as image 2.';

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
  /** Wird nach jedem Bild aufgerufen, das Google berechnet hat. */
  gezaehlt?: Bildzaehler,
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

    /* Ab hier hat Google geantwortet und damit ein Bild berechnet —
       das wird abgerechnet, auch wenn die Pruefung es gleich verwirft. */
    await gezaehlt?.(1);
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

/**
 * Rueckmeldung: "Google hat gerade ein Bild erzeugt."
 *
 * Abgerechnet wird je erzeugtes Bild, nicht je fertiges Foto. Ein
 * fertiges Foto braucht oft zwei bis drei: einen zweiten Anlauf, wenn die
 * Pruefung das erste Ergebnis verwirft, und den Verfeinerungslauf. Die
 * Route buchte nur die Bilder, die ANKAMEN — die verworfenen stehen
 * trotzdem auf der Google-Rechnung. Genau das war die Luecke zwischen
 * api_costs und der Monatsrechnung.
 *
 * Bewusst ein Rueckruf und kein modulweiter Zaehler: Schritt 2 schickt
 * drei Fotos gleichzeitig durch, und die liefen in derselben Instanz —
 * ein gemeinsamer Zaehler haette die Aufrufe untereinander vertauscht.
 */
export type Bildzaehler = (anzahl: number) => void | Promise<void>;

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
  /** Wird nach jedem Bild aufgerufen, das Google berechnet hat. */
  gezaehlt?: Bildzaehler,
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

    /* Ab hier hat Google geantwortet und damit ein Bild berechnet —
       das wird abgerechnet, auch wenn die Pruefung es gleich verwirft. */
    await gezaehlt?.(1);
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
