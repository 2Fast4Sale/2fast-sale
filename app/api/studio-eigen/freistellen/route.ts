import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { freistellenU2Net } from '../../../../lib/studio/freistellenU2Net';

/*
 * Das freigestellte Bild geht als WebP zurueck, nicht als PNG.
 *
 * Vercel nimmt hoechstens 4,5 MB je Anfrage an. Ein PNG mit Alphakanal
 * bei 2400 Bildpunkten wiegt schnell 8 MB, als Base64 elf — der naechste
 * Schritt lief damit in "Foto zu gross". WebP mit Alphakanal bringt
 * dasselbe Bild auf einen Bruchteil.
 */
async function alsWebp(bild: Buffer): Promise<string> {
  const webp = await sharp(bild).webp({ quality: 92, alphaQuality: 100, effort: 4 }).toBuffer();
  return `data:image/webp;base64,${webp.toString('base64')}`;
}

export const dynamic = 'force-dynamic';
/*
 * Das Modell wird beim Kaltstart geladen (176 MB) und rechnet dann rund
 * sechs Sekunden je Foto. Ohne hoeheres Limit bricht der erste Aufruf ab.
 */
export const maxDuration = 120;

/**
 * Freistellen — und NUR Freistellen.
 *
 * U-2-Net (Apache-2.0) laeuft hier auf dem Server. Gemessen an 64 echten
 * Fahrzeugfotos ist es dem Browser-Modell ormbg deutlich ueberlegen,
 * weil ormbg fuer Menschen trainiert ist.
 *
 * Hintergrund, Schatten und Spiegelung macht der eigene Kompositor
 * lokal und kostenlos — dieser Weg ist ohnehin nur noch der Rueckfall.
 * Im Normalfall macht Gemini in Schritt 2 alles allein.
 *
 * ── PhotoRoom ist raus ─────────────────────────────────────────────
 *
 * Bis zum 28.10.2026 lag dahinter PhotoRoom als Rettungsanker, samt
 * Schluessel, Kontingent, Sandbox-Modus und Abrechnung. Der Dienst
 * wird nicht mehr benutzt; was bleibt, ist das eigene Modell. Faellt
 * es aus, bekommt der Aufrufer eine ehrliche Meldung und weicht in das
 * Modell im Browser aus.
 */
export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: 'Kein Bild geliefert' }, { status: 400 });

    const roh = Buffer.from(String(image).replace(/^data:image\/\w+;base64,/, ''), 'base64');

    const start = Date.now();
    try {
      const png = await freistellenU2Net(roh);
      console.info('[studio-eigen] freigestellt mit U-2-Net in', Date.now() - start, 'ms');
      return NextResponse.json({
        freigestellt: await alsWebp(png),
        verfahren: 'u2net',
      });
    } catch (err) {
      console.error('[studio-eigen] U-2-Net fehlgeschlagen:', err);
      return NextResponse.json(
        { error: 'Freistellen gerade nicht möglich. Bitte in einer Minute noch einmal versuchen.' },
        { status: 503 },
      );
    }
  } catch (err) {
    console.error('[studio-eigen] Fehler:', err);
    return NextResponse.json({ error: 'Unerwarteter Fehler beim Freistellen.' }, { status: 500 });
  }
}
