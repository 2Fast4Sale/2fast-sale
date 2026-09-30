import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const { base64, filename, folder } = await req.json();
    if (!base64) return NextResponse.json({ error: 'Kein Bild' }, { status: 400 });

    /*
     * Dateiendung und Typ aus der Data-URL ablesen, nicht raten.
     *
     * Vorher gab es nur png oder jpg. Schritt 2 legt Bilder mit
     * Transparenz aber als WebP ab — die landeten als ".jpg" mit
     * Content-Type image/jpeg im Speicher. Ein Browser sieht darueber
     * hinweg, ein Import bei mobile.de oder AutoScout24 nicht.
     */
    const ERLAUBT: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
      'image/webp': 'webp', 'image/avif': 'avif',
    };
    const typ = String(base64).match(/^data:([^;,]+);base64,/)?.[1]?.toLowerCase() || 'image/jpeg';
    const ext = ERLAUBT[typ];
    if (!ext) {
      return NextResponse.json({ error: `Bildformat ${typ} wird nicht gespeichert.` }, { status: 400 });
    }

    const base64Data = String(base64).replace(/^data:[^;,]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Bild ist leer.' }, { status: 400 });
    }

    /*
     * Name und Ordner saeubern: Sie kommen aus dem Browser. Ein
     * "../" darin haette auf einen Pfad ausserhalb des eigenen
     * Nutzerordners gezeigt.
     */
    const sauber = (s: unknown, ersatz: string) =>
      String(s ?? '').replace(/[^a-zA-Z0-9_\-/]/g, '').replace(/\/{2,}/g, '/')
        .replace(/^\/+|\/+$/g, '').slice(0, 80) || ersatz;
    const path = `${user.id}/${sauber(folder, 'images')}/${sauber(filename, String(Date.now()))}.${ext}`;

    const { error } = await supabase.storage
      .from('vehicle-images')
      .upload(path, buffer, { contentType: typ, upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
