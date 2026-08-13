import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Prueft, ob der Nutzer ein Inserat anlegen darf — OHNE etwas abzubuchen.
 *
 * Dient nur der frueheren Rueckmeldung im Formular. Verbraucht wird der
 * Credit erst beim tatsaechlichen Anlegen in /api/vehicles, weil die
 * Formularschritte ueber die URL umgangen werden koennen.
 */
export async function GET() {
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

  if (plan !== 'free') {
    return NextResponse.json({ ok: true, type: 'plan' });
  }
  if (credits < 1) {
    return NextResponse.json(
      { ok: false, error: 'Keine Inserat-Credits vorhanden', code: 'no_credits' },
      { status: 402 }
    );
  }
  return NextResponse.json({ ok: true, type: 'credit', remaining: credits });
}
