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

    // Base64 ? Buffer
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = base64.startsWith('data:image/png') ? 'png' : 'jpg';
    const path = `${user.id}/${folder || 'images'}/${filename || Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('vehicle-images')
      .upload(path, buffer, {
        contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
