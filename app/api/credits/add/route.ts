import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Admin-Endpunkt: Credits manuell zu einem User hinzufÃ¼gen
// POST /api/credits/add  Body: { userId?: string, amount?: number }
// Wenn userId fehlt â†’ eigener Account
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const targetId = (body.userId as string) || user.id;
  const amount   = parseInt(body.amount ?? '1', 10);

  if (isNaN(amount) || amount < 1 || amount > 100) {
    return NextResponse.json({ error: 'UngÃ¼ltige Menge (1-100)' }, { status: 400 });
  }

  // Service-Role-Client fÃ¼r direkte DB-Operationen
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Erst sicherstellen, dass die Spalte existiert (idempotent)
  // Dann Credits inkrementieren
  const { data, error } = await service
    .from('profiles')
    .select('listing_credits')
    .eq('id', targetId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const current = (data as { listing_credits: number | null }).listing_credits ?? 0;
  const updated = current + amount;

  const { error: updateErr } = await service
    .from('profiles')
    .update({ listing_credits: updated })
    .eq('id', targetId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, previous: current, added: amount, total: updated });
}
