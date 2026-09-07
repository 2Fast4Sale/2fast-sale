import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { komponieren, STANDARD, type KompositorEinstellungen } from '../../../../lib/studio/kompositor';
import { studioHintergrund, STUDIO_VORLAGEN, raumAusCode, type StudioHintergrund } from '../../../../lib/studio/hintergrund';

export const dynamic = 'force-dynamic';

/**
 * Darf dieser Hintergrund geladen werden?
 *
 * Der Server holt hier ein Bild von einer Adresse, die aus dem Browser
 * kommt. Ungeprueft waere das eine Einladung: Wer die Adresse
 * austauscht, laesst den Server beliebige Ziele abrufen — auch solche
 * im internen Netz, an die er von aussen nicht herankaeme.
 *
 * Deshalb nur der eigene Supabase-Speicher, und nur ueber https.
 * Dorthin hat der Haendler sein Hallenfoto geladen, etwas anderes wird
 * hier nicht gebraucht.
 */
function hintergrundErlaubt(adresse: string): boolean {
  try {
    const ziel = new URL(adresse);
    if (ziel.protocol !== 'https:') return false;
    const erlaubt = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!erlaubt) return false;
    return ziel.host === new URL(erlaubt).host;
  } catch {
    return false;
  }
}

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
    const { freigestellt, vorlage, hintergrund, kompositor, breite, hoehe, hintergrundUrl, code } = body as {
      freigestellt?: string;
      vorlage?: string;
      hintergrund?: Partial<StudioHintergrund>;
      kompositor?: Partial<KompositorEinstellungen>;
      breite?: number;
      hoehe?: number;
      /** Eigenes Hallenfoto des Haendlers statt eines gerechneten Raums. */
      hintergrundUrl?: string;
      /** Raum-Code aus dem Konfigurator, z.B. "W02B07". */
      code?: string;
    };

    if (!freigestellt) {
      return NextResponse.json({ error: 'Kein freigestelltes Bild geliefert' }, { status: 400 });
    }

    /*
     * Der Raum-Code hat Vorrang vor der Vorlage.
     *
     * Die Vorlagen bleiben, weil aeltere Aufrufe sie noch schicken.
     * Neue Aufrufe kommen aus dem Konfigurator und tragen einen Code
     * wie "W02B07" — Wand 02 mit Boden 07. Ohne diesen Vorrang waere
     * der Konfigurator Dekoration: Der Haendler waehlt einen Raum, und
     * gerechnet wird ein anderer.
     */
    const basis = code
      ? raumAusCode(code)
      : (STUDIO_VORLAGEN[vorlage ?? 'studio_dunkel'] ?? STUDIO_VORLAGEN.studio_dunkel);
    const hgEinstellungen: StudioHintergrund = { ...basis, ...(hintergrund ?? {}) };

    /*
     * Vorschau kleiner rechnen als das Endbild. 1200 Pixel Breite
     * reichen, um Schatten und Lage zu beurteilen, und halten die
     * Antwort unter einer Sekunde — bei 2000 Pixeln fuehlt sich jeder
     * Reglerzug traege an.
     */
    const zielBreite = Math.max(400, Math.min(2400, Math.round(breite ?? 1200)));
    const zielHoehe  = Math.max(300, Math.min(1600, Math.round(hoehe ?? Math.round(zielBreite / 1.5))));

    /*
     * Eigener Showroom schlaegt den gerechneten Raum.
     *
     * Wer ein Foto seiner Halle hinterlegt hat, will seine Fahrzeuge
     * dort stehen sehen und nicht in einem erfundenen Studio — genau
     * deshalb hat er es hochgeladen. Bis hierher wurde diese Auswahl
     * ignoriert; die Studio-Seite kannte nur ihre vier Vorlagen.
     *
     * Schlaegt das Laden fehl, wird der gerechnete Raum genommen statt
     * einer Fehlermeldung. Ein Bild mit falschem Hintergrund ist
     * brauchbarer als gar keines.
     */
    let hg: Buffer;
    if (hintergrundUrl && hintergrundErlaubt(hintergrundUrl)) {
      try {
        const antwort = await fetch(hintergrundUrl);
        if (!antwort.ok) throw new Error('HTTP ' + antwort.status);
        hg = await sharp(Buffer.from(await antwort.arrayBuffer()))
          .resize(zielBreite, zielHoehe, { fit: 'cover', position: 'centre' })
          .jpeg({ quality: 92 })
          .toBuffer();
      } catch (err) {
        console.warn('[studio-eigen] Eigener Hintergrund nicht ladbar, nehme gerechneten:', err);
        hg = await studioHintergrund(hgEinstellungen, zielBreite, zielHoehe);
      }
    } else {
      hg = await studioHintergrund(hgEinstellungen, zielBreite, zielHoehe);
    }

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
