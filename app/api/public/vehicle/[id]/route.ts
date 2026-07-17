import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('*, vehicle_images(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Inserat nicht gefunden' }, { status: 404 });
  }

  supabaseAdmin
    .from('vehicles')
    .update({ views: (data.views || 0) + 1 })
    .eq('id', id)
    .then(() => {});

  const { dealer_notes, ...publicData } = data;
  void dealer_notes;

  return NextResponse.json({ vehicle: publicData });
}
