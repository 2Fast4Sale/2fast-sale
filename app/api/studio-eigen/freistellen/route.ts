import { NextRequest, NextResponse } from 'next/server';
import { logApiCost, imageCostMicros, currentUserId } from '../../../../lib/apiCosts';
import { budget, istSandbox, reservieren, freigeben } from '../../../../lib/photoroomBudget';

export const dynamic = 'force-dynamic';

/**
 * Freistellen — und NUR Freistellen.
 *
 * Das ist der einzige Schritt der Bildaufbereitung, der ein
 * trainiertes Modell braucht. Hintergrund, Schatten und Spiegelung
 * macht der eigene Kompositor lokal und kostenlos.
 *
 * Der Unterschied in Zahlen, Stand September 2026:
 *
 *   PhotoRoom Plus   0,10 EUR   Freistellen + KI-Hintergrund + KI-Schatten
 *   PhotoRoom Basic  0,02 EUR   nur Freistellen
 *
 * Bei zwoelf Bildern je Inserat sind das 1,20 EUR gegen 0,24 EUR.
 *
 * Ehrlich zur Einordnung: Der KI-Schatten von PhotoRoom ist besser als
 * der gerechnete. Ob der Unterschied 96 Cent je Inserat wert ist,
 * entscheidet der Vergleich am echten Fahrzeug — nicht diese Datei.
 */
const SEGMENT = 'https://sdk.photoroom.com/v1/segment';

export async function POST(req: NextRequest) {
  try {
    const { image, draftId } = await req.json();
    if (!image) return NextResponse.json({ error: 'Kein Bild geliefert' }, { status: 400 });

    const roherKey = process.env.PHOTOROOM_API_KEY;
    const apiKey = roherKey && process.env.PHOTOROOM_SANDBOX === 'true'
      ? `sandbox_${roherKey}`
      : roherKey;

    if (!apiKey) {
      return NextResponse.json({ error: 'Freistellen ist nicht konfiguriert.' }, { status: 503 });
    }

    // Siehe pixelcut/route.ts: ein Schluessel mit sandbox_ kann keinen
    // produktiven Aufruf erzeugen, also wird dafuer auch nichts gebucht.
    const sandbox = istSandbox() || apiKey.startsWith('sandbox_');

    let buchung: string | null = null;
    if (!sandbox) {
      const stand = await budget();
      if (stand.erschoepft) {
        return NextResponse.json({
          error: `Das Kontingent ist aufgebraucht (${stand.verbraucht} von ${stand.limit} in diesem Monat).`,
          kontingentErschoepft: true,
        }, { status: 429 });
      }
      buchung = await reservieren(await currentUserId(), draftId ?? null, imageCostMicros('photoroom'));
      if (!buchung) {
        return NextResponse.json({
          error: 'Das Kontingent ist aufgebraucht.', kontingentErschoepft: true,
        }, { status: 429 });
      }
    }

    const roh = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    const form = new FormData();
    form.append('image_file', new Blob([roh], { type: 'image/jpeg' }), 'auto.jpg');
    /*
     * PNG, weil nur PNG einen Alphakanal hat. Ein JPEG-Ergebnis waere
     * hier wertlos — der Kompositor braucht die Freistellungskante als
     * Teiltransparenz, sonst bekommt jedes Fahrzeug harte Raender.
     */
    form.append('format', 'png');

    const antwort = await fetch(SEGMENT, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: form,
    });

    if (!antwort.ok) {
      const text = await antwort.text();
      console.error('[studio-eigen] Freistellen fehlgeschlagen:', antwort.status, text.slice(0, 300));
      await freigeben(buchung);
      return NextResponse.json(
        { error: 'Freistellen gerade nicht verfügbar.', status: antwort.status },
        { status: 503 },
      );
    }

    if (sandbox) {
      await logApiCost({
        userId: await currentUserId(),
        draftId: draftId ?? null,
        service: 'photoroom',
        operation: 'freistellen-sandbox',
        unitsIn: 1,
        costMicros: imageCostMicros('photoroom'),
      });
    }

    const png = Buffer.from(await antwort.arrayBuffer());
    return NextResponse.json({
      freigestellt: `data:image/png;base64,${png.toString('base64')}`,
      sandbox,
    });
  } catch (err) {
    console.error('[studio-eigen] Fehler:', err);
    return NextResponse.json({ error: 'Unerwarteter Fehler beim Freistellen.' }, { status: 500 });
  }
}
