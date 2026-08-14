import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logApiCost, imageCostMicros, currentUserId } from '../../../lib/apiCosts';
import { findBackground, DEFAULT_BACKGROUND_ID } from '../../../lib/backgrounds';

export const dynamic = 'force-dynamic';

/**
 * Studio-Bearbeitung eines Fahrzeugfotos.
 *
 * Diese Route macht am Bild selbst nichts. Sie schickt zwei Dinge an
 * PhotoRoom — das Autofoto und eine Hintergrunddatei — und gibt zurueck, was
 * zurueckkommt. Freistellen, Schatten, Skalieren und Platzieren macht
 * ausschliesslich PhotoRoom.
 *
 * Frueher lag hier eine eigene Nachbau-Pipeline mit Sharp sowie Fallbacks auf
 * remove.bg und fal.ai. Beides ist entfernt: das Ergebnis war schlechter, und
 * ein schlechtes Bild beschaedigt genau das, wofuer der Haendler zahlt.
 */
export async function POST(req: NextRequest) {
  try {
    const { image, backgroundId, customBackgroundUrl } = await req.json();
    if (!image) return NextResponse.json({ error: 'Kein Bild geliefert' }, { status: 400 });

    /*
     * Sandbox-Modus: derselbe Key mit Praefix "sandbox_". Kostenlos, 1.000
     * Aufrufe im Monat, Ergebnis traegt ein Wasserzeichen. Fuer echte
     * Kundenbilder muss PHOTOROOM_SANDBOX aus sein.
     */
    const roherKey = process.env.PHOTOROOM_API_KEY;
    const apiKey = roherKey && process.env.PHOTOROOM_SANDBOX === 'true'
      ? `sandbox_${roherKey}`
      : roherKey;

    if (!apiKey) {
      console.error('[pixelcut] PHOTOROOM_API_KEY fehlt');
      return NextResponse.json(
        { error: 'Studio-Bearbeitung ist nicht konfiguriert.' },
        { status: 503 }
      );
    }

    const base64Data  = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const formData = new FormData();
    formData.append('imageFile', new Blob([imageBuffer], { type: 'image/jpeg' }), 'car.jpg');

    /* ── Hintergrund anhaengen ─────────────────────────────────────────────
     * Genau zwei Faelle. Mehr gibt es nicht.
     */
    if (customBackgroundUrl) {
      // Eigenes Showroom-Foto des Haendlers — steht vor allem anderen.
      formData.append('background.imageUrl', customBackgroundUrl);
      formData.append('background.scaling', 'fill');
    } else {
      const bg = findBackground(backgroundId) ?? findBackground(DEFAULT_BACKGROUND_ID);
      if (!bg) {
        console.error('[pixelcut] Kein Hintergrund in der Bibliothek');
        return NextResponse.json(
          { error: 'Kein Hintergrund verfügbar.' },
          { status: 503 }
        );
      }
      const filePath = join(process.cwd(), 'public', 'backgrounds', bg.file);
      if (!existsSync(filePath)) {
        console.error('[pixelcut] Hintergrunddatei fehlt:', bg.file);
        return NextResponse.json(
          { error: `Hintergrund "${bg.label}" ist nicht verfügbar.` },
          { status: 503 }
        );
      }
      formData.append('background.imageFile', new Blob([readFileSync(filePath)], { type: 'image/jpeg' }), 'bg.jpg');
      formData.append('background.scaling', 'fill');
    }

    /*
     * Schatten. Gueltig sind ausschliesslich ai.soft, ai.hard, ai.floating und
     * ai.auto-with-overrides — ein falscher Wert quittiert die API mit 400.
     * ai.soft ist fuer Fahrzeuge richtig: weicher Bodenschatten. ai.floating
     * waere falsch, das laesst das Objekt schweben.
     */
    formData.append('shadow.mode', process.env.PHOTOROOM_SHADOW_MODE || 'ai.soft');

    /*
     * Raender, als Anteil der Bildkante.
     *
     * Achtung beim Nachjustieren: 0.22 links und rechts bedeutet, dass das
     * Fahrzeug nur 56 % der Bildbreite einnehmen darf. Es wirkt dann klein und
     * verloren, mit viel toter Flaeche darueber — genau das laesst ein Bild
     * billig aussehen. Professionelle Haendlerfotos fuellen 80 bis 90 % der
     * Breite.
     *
     * Unten darf trotzdem nicht 0 stehen, sonst sitzt das Fahrzeug auf der
     * Bildkante und wirkt angeschnitten statt aufgestellt.
     */
    formData.append('outputSize', '2000x1333');

    /*
     * STUDIO_PADDING=auto laesst die Raender komplett weg — dann entscheidet
     * PhotoRoom selbst, wie das Fahrzeug im Bild sitzt. Sonst gelten die
     * Werte unten, die sich einzeln ueber Env ueberschreiben lassen.
     */
    if (process.env.STUDIO_PADDING !== 'auto') {
      formData.append('paddingTop',          process.env.STUDIO_PADDING_TOP    || '0.12');
      formData.append('paddingRight',        process.env.STUDIO_PADDING_RIGHT  || '0.10');
      formData.append('paddingBottom',       process.env.STUDIO_PADDING_BOTTOM || '0.08');
      formData.append('paddingLeft',         process.env.STUDIO_PADDING_LEFT   || '0.10');
      formData.append('verticalAlignment',   'bottom');
      formData.append('horizontalAlignment', 'center');
    }

    const response = await fetch('https://image-api.photoroom.com/v2/edit', {
      method:  'POST',
      headers: { 'x-api-key': apiKey },
      body:    formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[pixelcut] PhotoRoom Fehler:', err);
      return NextResponse.json(
        { error: 'Studio-Bearbeitung gerade nicht verfügbar. Bitte gleich nochmal versuchen.' },
        { status: 503 }
      );
    }

    await logApiCost({
      userId:     await currentUserId(),
      service:    'photoroom',
      operation:  'remove-bg',
      unitsIn:    1,
      costMicros: imageCostMicros('photoroom'),
    });

    const resultBuffer = Buffer.from(await response.arrayBuffer());
    return NextResponse.json({ result: `data:image/jpeg;base64,${resultBuffer.toString('base64')}` });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[pixelcut]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
