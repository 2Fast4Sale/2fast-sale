import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, listing_credits')
    .eq('id', user.id)
    .single();

  const plan    = profile?.plan || 'free';
  const credits = profile?.listing_credits ?? 0;

  // Händler mit aktivem Abo brauchen keine Credits
  if (plan !== 'free') {
    return NextResponse.json({ ok: true, type: 'plan' });
  }

  // Privatperson: Credit prüfen und abziehen
  if (credits < 1) {
    return NextResponse.json({ error: 'Keine Inserat-Credits vorhanden', code: 'no_credits' }, { status: 402 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ listing_credits: credits - 1 })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, type: 'credit', remaining: credits - 1 });
}
