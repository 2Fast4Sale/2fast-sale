import { NextRequest, NextResponse } from 'next/server';
import { logApiCost, imageCostMicros, currentUserId } from '../../../../lib/apiCosts';
import { budget, istSandbox, reservieren, freigeben } from '../../../../lib/photoroomBudget';
import { freistellenU2Net } from '../../../../lib/studio/freistellenU2Net';

export const dynamic = 'force-dynamic';
/*
 * Das Modell wird beim Kaltstart geladen (176 MB) und rechnet dann rund
 * sechs Sekunden je Foto. Ohne hoeheres Limit bricht der erste Aufruf ab.
 */
export const maxDuration = 120;

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

    const roh0 = Buffer.from(String(image).replace(/^data:image\/\w+;base64,/, ''), 'base64');

    /*
     * ── Standardweg: eigenes Modell, kostenlos ─────────────────────
     *
     * U-2-Net (Apache-2.0) laeuft hier auf dem Server. Gemessen an 64
     * echten Fahrzeugfotos ist es dem bisherigen Browser-Modell ormbg
     * deutlich ueberlegen, weil ormbg fuer Menschen trainiert ist.
     *
     * PhotoRoom bleibt als Weg bestehen, wird aber nur noch genommen,
     * wenn FREISTELLEN=photoroom gesetzt ist — sonst zahlt man fuer
     * etwas, das der eigene Server umsonst kann.
     */
    if (process.env.FREISTELLEN !== 'photoroom') {
      const start = Date.now();
      try {
        const png = await freistellenU2Net(roh0);
        console.info('[studio-eigen] freigestellt mit U-2-Net in', Date.now() - start, 'ms');
        return NextResponse.json({
          freigestellt: `data:image/png;base64,${png.toString('base64')}`,
          verfahren: 'u2net',
        });
      } catch (err) {
        /*
         * Faellt das Modell aus, ist PhotoRoom der Rettungsanker — aber
         * nur, wenn ein Schluessel hinterlegt ist. Sonst bekommt der
         * Haendler eine ehrliche Meldung statt eines kaputten Bildes.
         */
        console.error('[studio-eigen] U-2-Net fehlgeschlagen:', err);
        if (!process.env.PHOTOROOM_API_KEY) {
          return NextResponse.json(
            { error: 'Freistellen gerade nicht möglich. Bitte in einer Minute noch einmal versuchen.' },
            { status: 503 },
          );
        }
      }
    }

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
      verfahren: 'photoroom',
      sandbox,
    });
  } catch (err) {
    console.error('[studio-eigen] Fehler:', err);
    return NextResponse.json({ error: 'Unerwarteter Fehler beim Freistellen.' }, { status: 500 });
  }
}
