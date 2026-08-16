import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Alle Fotos eines Fahrzeugs als ZIP.
 *
 * Zweck: Der Haendler laedt den Ordner herunter und laedt die Bilder dort hoch,
 * wo er sie braucht — mobile.de, AutoScout24, eigene Seite, Social Media.
 * Funktioniert ohne Freigabe von irgendwem.
 *
 * Die Dateien werden durchnummeriert, damit die Reihenfolge erhalten bleibt.
 * Beim Hochladen auf einem Portal bestimmt die Reihenfolge, welches Bild das
 * Titelbild wird — eine zufaellige Sortierung waere dort aergerlich.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Kein Fahrzeug angegeben' }, { status: 400 });

  const { data: v } = await supabase
    .from('vehicles')
    .select('title, brand, vehicle_images(processed_url, original_url, position)')
    .eq('id', id)
    .eq('user_id', user.id)   // nur eigene Fahrzeuge
    .single();

  if (!v) return NextResponse.json({ error: 'Fahrzeug nicht gefunden' }, { status: 404 });

  const bilder = ((v.vehicle_images || []) as { processed_url?: string; original_url?: string; position?: number }[])
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  if (bilder.length === 0) {
    return NextResponse.json({ error: 'Dieses Fahrzeug hat keine Fotos.' }, { status: 400 });
  }

  const basis = String(v.title || v.brand || 'Fahrzeug')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'Fahrzeug';

  const zip = new JSZip();
  let geladen = 0;

  for (let i = 0; i < bilder.length; i++) {
    const url = bilder[i].processed_url || bilder[i].original_url;
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const nr = String(i + 1).padStart(2, '0');
      // Bearbeitete Bilder als solche kennzeichnen, damit der Haendler beim
      // Hochladen nicht versehentlich die Originale nimmt.
      const kennzeichen = bilder[i].processed_url ? 'studio' : 'original';
      zip.file(`${nr}_${kennzeichen}.jpg`, Buffer.from(await res.arrayBuffer()));
      geladen++;
    } catch {
      // Einzelnes Bild nicht erreichbar — der Rest soll trotzdem ankommen
    }
  }

  if (geladen === 0) {
    return NextResponse.json({ error: 'Keines der Fotos konnte geladen werden.' }, { status: 502 });
  }

  const inhalt = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  return new NextResponse(inhalt as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="${basis}-Fotos.zip"`,
    },
  });
}
