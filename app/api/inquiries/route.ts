import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('dealer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiries: data || [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();

  const { vehicle_id, dealer_id, name, email, phone, message } = body;
  if (!vehicle_id || !dealer_id || !name || !email)
    return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });

  const { data, error } = await supabase.from('inquiries').insert({
    vehicle_id, dealer_id, name, email, phone, message,
    status: 'new',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiry: data });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const { id, status } = await req.json();
  const { error } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', id)
    .eq('dealer_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
