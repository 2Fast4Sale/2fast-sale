import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Interne Kostenauswertung. Streng admin-only —
 * hier stehen die Margen, die kein Haendler sehen darf.
 */
export async function GET(req: Request) {
  // 1. Wer fragt?
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  // 2. Ist das ein Admin? Bewusst ueber den normalen Client, damit RLS greift.
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  // 3. Ab hier Service-Role, um ueber alle Nutzer aggregieren zu koennen.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get('days') || '30')));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data: rows, error } = await admin
    .from('api_costs')
    .select('service, operation, cost_micros, units_in, units_out, user_id, vehicle_id, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = rows || [];
  const sum = (xs: typeof list) => xs.reduce((s, r) => s + Number(r.cost_micros), 0);

  // Aufschluesselung nach Dienst
  const byService: Record<string, { micros: number; calls: number }> = {};
  for (const r of list) {
    byService[r.service] ??= { micros: 0, calls: 0 };
    byService[r.service].micros += Number(r.cost_micros);
    byService[r.service].calls  += 1;
  }

  // Aufschluesselung nach Operation
  const byOperation: Record<string, { micros: number; calls: number }> = {};
  for (const r of list) {
    byOperation[r.operation] ??= { micros: 0, calls: 0 };
    byOperation[r.operation].micros += Number(r.cost_micros);
    byOperation[r.operation].calls  += 1;
  }

  // Kosten pro Fahrzeug — das ist die eigentlich interessante Zahl
  const byVehicle: Record<string, number> = {};
  for (const r of list) {
    if (!r.vehicle_id) continue;
    byVehicle[r.vehicle_id] = (byVehicle[r.vehicle_id] || 0) + Number(r.cost_micros);
  }
  const vehicleCosts = Object.values(byVehicle);
  const avgPerVehicle = vehicleCosts.length
    ? vehicleCosts.reduce((a, b) => a + b, 0) / vehicleCosts.length
    : 0;

  // Kosten pro Haendler — verraet, wer sich nicht rechnet
  const byUser: Record<string, { micros: number; calls: number }> = {};
  for (const r of list) {
    const k = r.user_id || 'unbekannt';
    byUser[k] ??= { micros: 0, calls: 0 };
    byUser[k].micros += Number(r.cost_micros);
    byUser[k].calls  += 1;
  }

  // Namen der Top-Haendler nachladen
  const topUserIds = Object.entries(byUser)
    .sort((a, b) => b[1].micros - a[1].micros).slice(0, 20).map(([id]) => id)
    .filter(id => id !== 'unbekannt');

  let names: Record<string, string> = {};
  if (topUserIds.length) {
    const { data: profs } = await admin
      .from('profiles').select('id, full_name, company, plan').in('id', topUserIds);
    names = Object.fromEntries(
      (profs || []).map(p => [p.id, p.company || p.full_name || p.id.slice(0, 8)])
    );
  }

  return NextResponse.json({
    days,
    totalMicros: sum(list),
    calls: list.length,
    avgPerVehicleMicros: Math.round(avgPerVehicle),
    vehiclesTracked: vehicleCosts.length,
    byService,
    byOperation,
    topUsers: Object.entries(byUser)
      .sort((a, b) => b[1].micros - a[1].micros).slice(0, 20)
      .map(([id, v]) => ({ id, name: names[id] || id.slice(0, 8), ...v })),
  });
}
