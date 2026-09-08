import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { logApiCost, imageCostMicros, currentUserId } from '../../../../lib/apiCosts';
import { budget, istSandbox, reservieren, freigeben } from '../../../../lib/photoroomBudget';
import { komponieren, STANDARD, type KompositorEinstellungen } from '../../../../lib/studio/kompositor';
import { studioHintergrund, raumAusCode, type StudioHintergrund } from '../../../../lib/studio/hintergrund';

export const dynamic = 'force-dynamic';

/**
 * Ein Fahrzeugfoto zum fertigen Studiobild — der Weg fuer Schritt 2.
 *
 * Loest /api/pixelcut ab. Der Unterschied steht in der Rechnung:
 *
 *   pixelcut       PhotoRoom Plus   0,10 EUR   alles bei PhotoRoom
 *   diese Route    PhotoRoom Basic  0,02 EUR   nur Freistellen gekauft
 *
 * Bei zwoelf Bildern je Inserat sind das 1,20 EUR gegen 0,24 EUR.
 * Hintergrund, Schatten und Spiegelung rechnet der Server selbst; das
 * kostet Rechenzeit, aber kein Geld.
 *
 * KEIN Rueckfall auf pixelcut, wenn hier etwas schiefgeht. Ein stiller
 * Rueckfall waere bequem und teuer: Der Haendler bekaeme sein Bild und
 * niemand merkte, dass jedes einzelne das Fuenffache kostet. Lieber
 * eine sichtbare Fehlermeldung.
 *
 * Nur der eigene Supabase-Speicher ist als Hallenfoto erlaubt — sonst
 * liesse sich der Server ueber eine untergeschobene Adresse dazu
 * bringen, beliebige Ziele abzurufen.
 */
const SEGMENT = 'https://sdk.photoroom.com/v1/segment';

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

export async function POST(req: NextRequest) {
  try {
    const { image, draftId, code, kompositor, hintergrund, hintergrundUrl, breite } =
      await req.json() as {
        image?: string;
        draftId?: string | null;
        code?: string;
        kompositor?: Partial<KompositorEinstellungen>;
        hintergrund?: Partial<StudioHintergrund>;
        hintergrundUrl?: string;
        breite?: number;
      };

    if (!image) return NextResponse.json({ error: 'Kein Bild geliefert' }, { status: 400 });

    const roherKey = process.env.PHOTOROOM_API_KEY;
    const apiKey = roherKey && process.env.PHOTOROOM_SANDBOX === 'true'
      ? `sandbox_${roherKey}`
      : roherKey;
    if (!apiKey) {
      return NextResponse.json({ error: 'Studio-Bearbeitung ist nicht konfiguriert.' }, { status: 503 });
    }

    // Ein Schluessel mit sandbox_ kann keinen produktiven Aufruf
    // erzeugen — dann wird auch nichts gebucht. Siehe pixelcut/route.ts.
    const sandbox = istSandbox() || apiKey.startsWith('sandbox_');

    let buchung: string | null = null;
    if (!sandbox) {
      const stand = await budget();
      if (stand.erschoepft) {
        return NextResponse.json({
          error: `Das Kontingent für Studio-Bilder ist aufgebraucht (${stand.verbraucht} von ${stand.limit} in diesem Monat). `
               + 'Es füllt sich zum Monatsersten wieder auf.',
          kontingentErschoepft: true,
        }, { status: 429 });
      }
      buchung = await reservieren(
        await currentUserId(), draftId ?? null, imageCostMicros('photoroom_basic'),
      );
      if (!buchung) {
        return NextResponse.json({
          error: 'Das Kontingent für Studio-Bilder ist aufgebraucht.',
          kontingentErschoepft: true,
        }, { status: 429 });
      }
    }

    /* ── 1. Freistellen (kostet) ── */
    const roh = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const form = new FormData();
    form.append('image_file', new Blob([roh], { type: 'image/jpeg' }), 'auto.jpg');
    // PNG, weil nur PNG einen Alphakanal hat. Der Kompositor braucht die
    // Freistellungskante als Teiltransparenz, sonst harte Raender.
    form.append('format', 'png');

    const antwort = await fetch(SEGMENT, { method: 'POST', headers: { 'x-api-key': apiKey }, body: form });
    if (!antwort.ok) {
      const text = await antwort.text();
      console.error('[verarbeiten] Freistellen fehlgeschlagen:', antwort.status, text.slice(0, 300));
      await freigeben(buchung);
      return NextResponse.json(
        { error: 'Studio-Bearbeitung gerade nicht verfügbar. Bitte gleich nochmal versuchen.' },
        { status: 503 },
      );
    }
    const freigestellt = Buffer.from(await antwort.arrayBuffer());

    /* ── 2. In den Raum setzen (kostet nichts) ── */
    const zielBreite = Math.max(600, Math.min(2400, Math.round(breite ?? 2000)));
    const zielHoehe  = Math.round(zielBreite / 1.5);
    const raum: StudioHintergrund = { ...raumAusCode(code ?? 'W02B02'), ...(hintergrund ?? {}) };

    let hg: Buffer;
    if (hintergrundUrl && hintergrundErlaubt(hintergrundUrl)) {
      try {
        const halle = await fetch(hintergrundUrl);
        if (!halle.ok) throw new Error('HTTP ' + halle.status);
        hg = await sharp(Buffer.from(await halle.arrayBuffer()))
          .resize(zielBreite, zielHoehe, { fit: 'cover', position: 'centre' })
          .jpeg({ quality: 92 }).toBuffer();
      } catch (err) {
        console.warn('[verarbeiten] Hallenfoto nicht ladbar, nehme gerechneten Raum:', err);
        hg = await studioHintergrund(raum, zielBreite, zielHoehe);
      }
    } else {
      hg = await studioHintergrund(raum, zielBreite, zielHoehe);
    }

    const ergebnis = await komponieren(freigestellt, hg, { ...STANDARD, ...(kompositor ?? {}) });

    /*
     * Gebucht wird der BASIC-Preis, nicht Plus. Im Sandbox-Betrieb ist
     * oben nichts reserviert worden, deshalb hier nachtragen.
     */
    if (sandbox) {
      await logApiCost({
        userId: await currentUserId(),
        draftId: draftId ?? null,
        service: 'photoroom_basic',
        operation: 'studio-sandbox',
        unitsIn: 1,
        costMicros: imageCostMicros('photoroom_basic'),
      });
    }

    return NextResponse.json({
      result: `data:image/jpeg;base64,${ergebnis.bild.toString('base64')}`,
      eigenbau: true,
      sandbox,
    });
  } catch (err) {
    console.error('[verarbeiten] Fehler:', err);
    return NextResponse.json({ error: 'Unerwarteter Fehler bei der Studio-Bearbeitung.' }, { status: 500 });
  }
}
