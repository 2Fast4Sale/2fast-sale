import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST � Bilder zu einem Fahrzeug hinzuf�gen
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    // Sicherstellen dass das Fahrzeug dem User geh�rt
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (!vehicle) return NextResponse.json({ error: 'Fahrzeug nicht gefunden' }, { status: 404 });

    const { images } = await req.json();
    const rows = images.map((img: any, i: number) => ({
      vehicle_id: id,
      original_url: img.original,
      processed_url: img.processed || null,
      position: i,
    }));

    const { data, error } = await supabase
      .from('vehicle_images')
      .insert(rows)
      .select();

    if (error) throw error;
    return NextResponse.json({ images: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
