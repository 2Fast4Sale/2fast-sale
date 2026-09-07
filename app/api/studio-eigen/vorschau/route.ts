import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { komponieren } from '../../../../lib/studio/kompositor';
import {
  studioHintergrund, STUDIO_VORLAGEN, GERECHNET, FAHRZEUG_UMRISS,
} from '../../../../lib/studio/hintergrund';

export const dynamic = 'force-dynamic';

/**
 * Vorschaubild fuer die Hintergrund-Auswahl.
 *
 * Liefert den Hintergrund mit einem schematischen Fahrzeug darin. Ohne
 * Fahrzeug sagt eine leere Flaeche wenig — Horizont, Licht und
 * Schatten wirken erst, wenn etwas davor steht.
 *
 * Gilt nur fuer die gerechneten Hintergruende. Wer nach einem
 * KI-erzeugten fragt, bekommt 404 statt eines erfundenen Bildes: Eine
 * Vorschau zu zeigen, die nachher anders aussieht, waere schlimmer als
 * gar keine.
 *
 * Wird oft und parallel aufgerufen — deshalb klein gerechnet und mit
 * langer Cache-Vorgabe. Kosten entstehen keine.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  const vorlagenId = GERECHNET[id];

  if (!vorlagenId) {
    return NextResponse.json(
      { error: 'Für diesen Hintergrund gibt es keine gerechnete Vorschau.' },
      { status: 404 },
    );
  }

  try {
    const breite = 640;
    const hoehe = 427;

    const hg = await studioHintergrund(STUDIO_VORLAGEN[vorlagenId], breite, hoehe);
    const umriss = await sharp(FAHRZEUG_UMRISS).png().toBuffer();

    const r = await komponieren(umriss, hg, {
      breitenanteil: 0.74,
      bodenabstand: 0.13,
      schattenWeichheit: 10,
      schattenStaerke: 0.5,
      spiegelungStaerke: 0.2,
      // Der Umriss ist gezeichnet, nicht fotografiert — an sein Licht
      // muss nichts angeglichen werden.
      angleichung: 0,
    });

    return new NextResponse(new Uint8Array(r.bild), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err) {
    console.error('[studio-eigen/vorschau]', err);
    return NextResponse.json({ error: 'Vorschau fehlgeschlagen' }, { status: 500 });
  }
}
