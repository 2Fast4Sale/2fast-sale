import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { komponieren, STANDARD } from '../../../../lib/studio/kompositor';
import { studioVerfeinernMitGemini, letzterGrund, GENUTZTES_MODELL } from '../../../../lib/studio/geminiStudio';
import { raum, raumBild } from '../../../../lib/studio/raeume';
import { TESTFAHRZEUG_WEBP } from '../../../../lib/studio/testbild';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Selbsttest der Bildverarbeitung, direkt auf dem Server.
 *
 * Warum es das gibt: Beim Suchen eines Fehlers liess sich nicht klaeren,
 * ob Gemini auf Vercel ueberhaupt etwas am Bild aendert — im Browser sah
 * jedes Ergebnis gleich aus, und die Protokolle von Vercel sind von hier
 * aus nicht lesbar. Dieser Aufruf laeuft dieselbe Kette mit einem festen
 * Testfoto und gibt nur Zahlen zurueck, kein Bild.
 *
 * Aufruf: /api/studio-eigen/selbsttest
 */
export async function GET() {
  const schritte: Record<string, unknown> = {
    modell: GENUTZTES_MODELL,
    schluesselVorhanden: !!process.env.GEMINI_API_KEY,
    studioWeg: process.env.STUDIO_WEG ?? '(nicht gesetzt)',
    studioSchatten: process.env.STUDIO_SCHATTEN ?? '(nicht gesetzt)',
    bildModellVariable: process.env.GEMINI_BILD_MODELL ?? '(nicht gesetzt)',
  };

  try {
    const frei = Buffer.from(TESTFAHRZEUG_WEBP, 'base64');

    const halle = raum('waben_hell') ?? raum('showroom_hell');
    if (!halle) {
      schritte.fehler = 'Kein Raum gefunden';
      return NextResponse.json(schritte);
    }

    const start = Date.now();
    const ergebnis = await komponieren(frei, raumBild(halle), {
      ...STANDARD,
      horizont: halle.horizont,
      kameraHoehe: halle.kameraHoehe,
      brennweite: halle.brennweite,
      wandlinie: halle.wandlinie,
    });
    schritte.komponiertMs = Date.now() - start;
    schritte.masse = `${ergebnis.breite}x${ergebnis.hoehe}`;

    const t2 = Date.now();
    const fein = await studioVerfeinernMitGemini(ergebnis.bild, 'Selbsttest GmbH');
    schritte.verfeinernMs = Date.now() - t2;
    schritte.verfeinert = fein ? Number(fein.aehnlich.toFixed(3)) : false;
    schritte.geaendertProzent = fein ? Number(fein.geaendert.toFixed(1)) : 0;
    schritte.grund = fein ? '' : letzterGrund;
    schritte.urteil = fein
      ? (fein.geaendert >= 1
        ? 'Gemini arbeitet — Aenderung deutlich messbar'
        : 'Gemini gibt das Bild praktisch unveraendert zurueck')
      : 'Verfeinerung kam nicht zustande';

    /*
     * Gegenprobe mit einer denkbar einfachen Aufgabe.
     *
     * Wenn die Verfeinerung nichts bewirkt, gibt es zwei moegliche
     * Gruende: Das Modell antwortet auf Vercel ueberhaupt nicht mit
     * einem neuen Bild, oder es versteht die lange Anweisung nicht. Eine
     * Aufgabe, an der nichts misszuverstehen ist, trennt beides.
     */
    try {
      const klein = await sharp(ergebnis.bild).resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: 88 }).toBuffer();
      const antwort = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GENUTZTES_MODELL}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY ?? '' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Draw a large solid red circle in the middle of this image. Change nothing else.' },
                { inline_data: { mime_type: 'image/jpeg', data: klein.toString('base64') } },
              ],
            }],
          }),
        },
      );
      schritte.probeStatus = antwort.status;
      const daten = await antwort.json();
      const teile = daten?.candidates?.[0]?.content?.parts ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const teil = teile.find((p: any) => p.inline_data?.data || p.inlineData?.data);
      const b64 = teil?.inline_data?.data ?? teil?.inlineData?.data;
      schritte.probeBildKam = !!b64;
      if (b64) {
        const neu = await sharp(Buffer.from(b64, 'base64')).resize(256, 256, { fit: 'fill' })
          .greyscale().raw().toBuffer();
        const alt = await sharp(klein).resize(256, 256, { fit: 'fill' }).greyscale().raw().toBuffer();
        let anders = 0;
        for (let i = 0; i < alt.length; i++) if (Math.abs(alt[i] - neu[i]) > 25) anders++;
        schritte.probeGeaendertProzent = Number(((anders / alt.length) * 100).toFixed(1));
      } else {
        schritte.probeAntwort = JSON.stringify(daten).slice(0, 300);
      }
    } catch (err) {
      schritte.probeFehler = err instanceof Error ? err.message : String(err);
    }
    return NextResponse.json(schritte);
  } catch (err) {
    schritte.fehler = err instanceof Error ? err.message : String(err);
    return NextResponse.json(schritte, { status: 500 });
  }
}
