import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { komponieren, STANDARD } from '../../../../lib/studio/kompositor';
import { studioVerfeinernMitGemini, letzterGrund, GENUTZTES_MODELL } from '../../../../lib/studio/geminiStudio';
import { raum, raumBild } from '../../../../lib/studio/raeume';

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
    const datei = path.join(process.cwd(), 'tools', 'proben', 'golf_frei.png');
    const frei = await fs.readFile(datei).catch(() => null);
    if (!frei) {
      schritte.fehler = 'Testfoto tools/proben/golf_frei.png fehlt im Bundle';
      return NextResponse.json(schritte);
    }

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

    return NextResponse.json(schritte);
  } catch (err) {
    schritte.fehler = err instanceof Error ? err.message : String(err);
    return NextResponse.json(schritte, { status: 500 });
  }
}
