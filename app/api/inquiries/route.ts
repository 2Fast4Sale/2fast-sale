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

  const { vehicle_id, name, email, phone, message } = body;
  if (!vehicle_id || !name || !email)
    return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email))) {
    return NextResponse.json({ error: 'Bitte eine erreichbare E-Mail-Adresse angeben.' }, { status: 400 });
  }

  /*
   * Zu welchem Haendler die Anfrage gehoert, entscheidet das Fahrzeug —
   * nicht der Absender.
   *
   * Vorher kam dealer_id aus dem Formular. Jeder konnte damit Anfragen in
   * das Postfach eines beliebigen Haendlers schreiben, mit beliebigem
   * Inhalt und ohne dass ein Fahrzeug von ihm dazu gehoert haette.
   */
  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const dienst = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: fahrzeug } = await dienst
    .from('vehicles')
    .select('user_id, status')
    .eq('id', vehicle_id)
    .single();

  if (!fahrzeug?.user_id || String(fahrzeug.status || '').toLowerCase() === 'entwurf') {
    return NextResponse.json({ error: 'Inserat nicht gefunden' }, { status: 404 });
  }

  // Laengen begrenzen: Das Formular ist oeffentlich, und die Felder
  // landen unveraendert im Postfach des Haendlers.
  const kurz = (w: unknown, max: number) => String(w ?? '').trim().slice(0, max) || null;

  const { data, error } = await supabase.from('inquiries').insert({
    vehicle_id,
    dealer_id: fahrzeug.user_id,
    name:    kurz(name, 120),
    email:   kurz(email, 160),
    phone:   kurz(phone, 40),
    message: kurz(message, 2000),
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
