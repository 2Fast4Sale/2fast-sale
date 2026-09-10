import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { logApiCost, imageCostMicros, currentUserId } from '../../../../lib/apiCosts';
import { budget, istSandbox, reservieren, freigeben } from '../../../../lib/photoroomBudget';
import { komponieren, STANDARD, type KompositorEinstellungen } from '../../../../lib/studio/kompositor';
import { studioHintergrund, raumAusCode, type StudioHintergrund } from '../../../../lib/studio/hintergrund';
import { raum, raumBild } from '../../../../lib/studio/raeume';

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
    const { image, draftId, code, raum: raumName, kompositor, hintergrund, hintergrundUrl, breite } =
      await req.json() as {
        image?: string;
        draftId?: string | null;
        code?: string;
        raum?: string;
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

    /*
     * ── Welcher Weg ────────────────────────────────────────────────
     *
     * "plus"     PhotoRoom macht alles: freistellen, Hintergrund,
     *            KI-Schatten. 0,10 EUR je Bild.
     * "eigenbau" PhotoRoom stellt nur frei (Basic, 0,02 EUR), Schatten
     *            und Hintergrund rechnet der Server selbst.
     *
     * Plus ist der Standard, und das ist eine bewusste Entscheidung
     * gegen die guenstigere Variante. Der Eigenbau war fertig und
     * funktioniert — sein Schatten ist nur sichtbar schlechter. Beide
     * wurden am selben Foto vermessen: PhotoRooms Schatten endet
     * innerhalb von zehn Pixeln, der eigene laeuft ueber vierzig aus,
     * und der Wagen sieht dadurch aufgesetzt aus.
     *
     * Die Kontingente in studioQuota.ts sind ohnehin gegen 10 Cent je
     * Bild gerechnet; der Eigenbau war ein Bonus, keine Grundlage.
     *
     * Ueber STUDIO_WEG=eigenbau laesst sich zurueckschalten, falls der
     * Schatten spaeter besser wird oder PhotoRoom die Preise anhebt.
     */
    const weg = process.env.STUDIO_WEG === 'eigenbau' ? 'eigenbau' : 'plus';
    const tarif = weg === 'plus' ? 'photoroom' : 'photoroom_basic';

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
        await currentUserId(), draftId ?? null, imageCostMicros(tarif),
      );
      if (!buchung) {
        return NextResponse.json({
          error: 'Das Kontingent für Studio-Bilder ist aufgebraucht.',
          kontingentErschoepft: true,
        }, { status: 429 });
      }
    }

    const roh = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const zielBreite = Math.max(600, Math.min(2400, Math.round(breite ?? 2000)));
    const zielHoehe  = Math.round(zielBreite / 1.5);

    /*
     * Der Raum. Er geht in BEIDE Wege ein — beim Eigenbau als
     * Hintergrund fuer den Kompositor, bei Plus als Datei, die
     * PhotoRoom hinter das Fahrzeug legt.
     *
     * Das ist der Grund, warum die eigenen Renders auch bei Plus
     * bleiben: Wir kaufen Freistellung und Schatten, nicht den Raum.
     * Die acht Hallen gehoeren uns, sind lizenzsauber und sehen bei
     * allen Fahrzeugen eines Haendlers gleich aus.
     */
    const halle = raum(raumName);

    /* ── Weg 1: PhotoRoom Plus macht alles ── */
    if (weg === 'plus' && halle && !hintergrundUrl) {
      const plus = new FormData();
      plus.append('imageFile', new Blob([roh], { type: 'image/jpeg' }), 'auto.jpg');
      // new Uint8Array(...) statt des Buffers direkt: TypeScript nimmt
      // Buffer nicht als BlobPart an, obwohl es zur Laufzeit ginge.
      plus.append(
        'background.imageFile',
        new Blob([new Uint8Array(raumBild(halle))], { type: 'image/jpeg' }),
        'raum.jpg',
      );
      plus.append('background.scaling', 'fill');
      /*
       * Gueltig sind nur ai.soft, ai.hard, ai.floating und
       * ai.auto-with-overrides; alles andere quittiert die API mit 400.
       * ai.floating waere hier falsch — das laesst das Fahrzeug schweben.
       */
      plus.append('shadow.mode', process.env.PHOTOROOM_SHADOW_MODE || 'ai.soft');
      plus.append('outputSize', `${zielBreite}x${zielHoehe}`);
      plus.append('paddingTop', '0.12');
      plus.append('paddingRight', '0.10');
      plus.append('paddingBottom', '0.08');
      plus.append('paddingLeft', '0.10');
      plus.append('verticalAlignment', 'bottom');
      plus.append('horizontalAlignment', 'center');

      const a = await fetch('https://image-api.photoroom.com/v2/edit', {
        method: 'POST', headers: { 'x-api-key': apiKey }, body: plus,
      });
      if (!a.ok) {
        const text = await a.text();
        console.error('[verarbeiten] PhotoRoom Plus fehlgeschlagen:', a.status, text.slice(0, 300));
        await freigeben(buchung);
        return NextResponse.json(
          { error: 'Studio-Bearbeitung gerade nicht verfügbar. Bitte gleich nochmal versuchen.' },
          { status: 503 },
        );
      }
      const fertig = Buffer.from(await a.arrayBuffer());

      if (sandbox) {
        await logApiCost({
          userId: await currentUserId(), draftId: draftId ?? null,
          service: 'photoroom', operation: 'studio-plus-sandbox',
          unitsIn: 1, costMicros: imageCostMicros('photoroom'),
        });
      }

      return NextResponse.json({
        result: `data:image/jpeg;base64,${fertig.toString('base64')}`,
        weg: 'plus',
        raum: halle.name,
        sandbox,
      });
    }

    /* ── Weg 2: nur freistellen, Rest selbst rechnen ── */
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

    /* ── In den Raum setzen (kostet nichts) ── */
    const gerechnet: StudioHintergrund = { ...raumAusCode(code ?? 'W02B02'), ...(hintergrund ?? {}) };

    /*
     * Die Kameradaten des Raums gehen in die Schattenrechnung ein —
     * Horizontlage, Kamerahoehe und Brennweite. Ohne sie greifen
     * Standardwerte, die zu keinem bestimmten Raum passen: Der
     * gerechnete Verlaufshintergrund hat seinen Horizont bei 0,74 statt
     * 0,50, und ein gegen 0,45 gerechneter Schatten liegt darin
     * sichtbar falsch.
     */
    const ausRaum: Partial<KompositorEinstellungen> = halle ? {
      horizont:          halle.horizont,
      kameraHoehe:       halle.kameraHoehe,
      brennweite:        halle.brennweite,
      spiegelungStaerke: halle.bodenglanz,
    } : {};

    let hg: Buffer;
    if (hintergrundUrl && hintergrundErlaubt(hintergrundUrl)) {
      try {
        const eigenes = await fetch(hintergrundUrl);
        if (!eigenes.ok) throw new Error('HTTP ' + eigenes.status);
        hg = await sharp(Buffer.from(await eigenes.arrayBuffer()))
          .resize(zielBreite, zielHoehe, { fit: 'cover', position: 'centre' })
          .jpeg({ quality: 92 }).toBuffer();
      } catch (err) {
        console.warn('[verarbeiten] Hallenfoto nicht ladbar, nehme gerenderten Raum:', err);
        hg = halle
          ? await sharp(raumBild(halle)).resize(zielBreite, zielHoehe, { fit: 'cover' }).jpeg({ quality: 92 }).toBuffer()
          : await studioHintergrund(gerechnet, zielBreite, zielHoehe);
      }
    } else if (halle) {
      hg = await sharp(raumBild(halle))
        .resize(zielBreite, zielHoehe, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 92 })
        .toBuffer();
    } else {
      hg = await studioHintergrund(gerechnet, zielBreite, zielHoehe);
    }

    const ergebnis = await komponieren(freigestellt, hg, {
      ...STANDARD, ...ausRaum, ...(kompositor ?? {}),
    });

    /*
     * Im Sandbox-Betrieb ist oben nichts reserviert worden, deshalb hier
     * nachtragen — mit dem Tarif, der zum gewaehlten Weg gehoert.
     */
    if (sandbox) {
      await logApiCost({
        userId: await currentUserId(),
        draftId: draftId ?? null,
        service: tarif,
        operation: 'studio-sandbox',
        unitsIn: 1,
        costMicros: imageCostMicros(tarif),
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
