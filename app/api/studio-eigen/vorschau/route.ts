import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { komponieren } from '../../../../lib/studio/kompositor';
import { studioHintergrund, raumAusCode, FAHRZEUG_UMRISS } from '../../../../lib/studio/hintergrund';

export const dynamic = 'force-dynamic';

/**
 * Vorschaubild fuer den Raum-Konfigurator.
 *
 *   ?code=W02B02      Wand 02 mit Boden 02
 *   &leer=1           ohne Fahrzeug
 *   &b=320            Breite in Pixeln
 *
 * Zwei Betriebsarten, und beide werden gebraucht:
 *
 * MIT Fahrzeug fuer die grosse Vorschau — ein leerer Raum sagt nicht,
 * wie ein Auto darin steht.
 *
 * OHNE Fahrzeug fuer die Katalogkacheln — dort geht es um die Wand
 * oder den Boden, und ein Auto davor verdeckt genau das, worum es
 * geht. Der Gecko-Konfigurator hat aus demselben Grund den Schalter
 * "Fahrzeug ausblenden".
 *
 * Kostet nichts, ruft nichts von aussen auf. Deshalb darf die Seite so
 * viele Kacheln laden, wie sie mag.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const code = p.get('code') ?? 'W02B02';
  const leer = p.get('leer') === '1';
  const breite = Math.max(160, Math.min(1600, Number(p.get('b') ?? 640)));
  const hoehe = Math.round(breite / 1.5);

  try {
    const raum = raumAusCode(code);
    const hg = await studioHintergrund(raum, breite, hoehe);

    if (leer) {
      return new NextResponse(new Uint8Array(hg), {
        headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400, immutable' },
      });
    }

    const umriss = await sharp(FAHRZEUG_UMRISS).png().toBuffer();
    const r = await komponieren(umriss, hg, {
      breitenanteil: 0.76,
      bodenabstand: 0.13,
      schattenWeichheit: Math.max(4, Math.round(breite / 48)),
      schattenStaerke: 0.5,
      spiegelungStaerke: 0.2,
      // Der Umriss ist gezeichnet, nicht fotografiert — sein Licht
      // muss an nichts angeglichen werden.
      angleichung: 0,
    });

    return new NextResponse(new Uint8Array(r.bild), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400, immutable' },
    });
  } catch (err) {
    console.error('[studio-eigen/vorschau]', err);
    return NextResponse.json({ error: 'Vorschau fehlgeschlagen' }, { status: 500 });
  }
}
