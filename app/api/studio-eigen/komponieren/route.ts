import { NextRequest, NextResponse } from 'next/server';
import { komponieren, STANDARD, type KompositorEinstellungen } from '../../../../lib/studio/kompositor';
import { studioHintergrund, STUDIO_VORLAGEN, type StudioHintergrund } from '../../../../lib/studio/hintergrund';

export const dynamic = 'force-dynamic';

/**
 * Setzt ein freigestelltes Fahrzeug in einen Hintergrund.
 *
 * Kostet nichts und ruft nichts von aussen auf — deshalb darf diese
 * Route so oft laufen, wie der Haendler an den Reglern dreht. Genau
 * dafuer ist sie vom Freistellen getrennt: Freistellen kostet Geld und
 * passiert einmal, Einstellen ist umsonst und passiert hundertmal.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { freigestellt, vorlage, hintergrund, kompositor, breite, hoehe } = body as {
      freigestellt?: string;
      vorlage?: string;
      hintergrund?: Partial<StudioHintergrund>;
      kompositor?: Partial<KompositorEinstellungen>;
      breite?: number;
      hoehe?: number;
    };

    if (!freigestellt) {
      return NextResponse.json({ error: 'Kein freigestelltes Bild geliefert' }, { status: 400 });
    }

    const basis = STUDIO_VORLAGEN[vorlage ?? 'studio_dunkel'] ?? STUDIO_VORLAGEN.studio_dunkel;
    const hgEinstellungen: StudioHintergrund = { ...basis, ...(hintergrund ?? {}) };

    /*
     * Vorschau kleiner rechnen als das Endbild. 1200 Pixel Breite
     * reichen, um Schatten und Lage zu beurteilen, und halten die
     * Antwort unter einer Sekunde — bei 2000 Pixeln fuehlt sich jeder
     * Reglerzug traege an.
     */
    const zielBreite = Math.max(400, Math.min(2400, Math.round(breite ?? 1200)));
    const zielHoehe  = Math.max(300, Math.min(1600, Math.round(hoehe ?? Math.round(zielBreite / 1.5))));

    const hg = await studioHintergrund(hgEinstellungen, zielBreite, zielHoehe);

    const roh = Buffer.from(freigestellt.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const ergebnis = await komponieren(roh, hg, { ...STANDARD, ...(kompositor ?? {}) });

    return NextResponse.json({
      bild: `data:image/jpeg;base64,${ergebnis.bild.toString('base64')}`,
      messwerte: ergebnis.messwerte,
    });
  } catch (err) {
    const nachricht = err instanceof Error ? err.message : 'Unbekannter Fehler';
    console.error('[studio-eigen] Kompositor:', nachricht);
    return NextResponse.json({ error: `Zusammensetzen fehlgeschlagen: ${nachricht}` }, { status: 500 });
  }
}
