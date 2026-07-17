import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Einmaliger Endpunkt â€” fÃ¼hrt die fehlenden Migrationen aus
// POST /api/stripe/setup-db
export async function POST() {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const results: Record<string, string> = {};

  // Migration 010 â€” listing_credits Spalte
  try {
    const { error } = await service.rpc('exec_migration_listing_credits');
    if (error && !error.message.includes('already exists')) {
      results['010_column'] = `Fehler: ${error.message}`;
    } else {
      results['010_column'] = 'ok';
    }
  } catch {
    results['010_column'] = 'rpc nicht gefunden â€” direkt per SQL';
  }

  // Direkt per SQL: Spalte hinzufÃ¼gen (postgrest unterstÃ¼tzt kein raw SQL)
  // Wir benutzen den service client um profiles zu lesen/schreiben
  // und checken ob listing_credits existiert:
  const { error: colCheck } = await service
    .from('profiles')
    .select('listing_credits')
    .limit(1);

  if (colCheck?.code === '42703') {
    // Spalte fehlt â€” kann Ã¼ber PostgREST nicht per DDL hinzugefÃ¼gt werden
    results['status'] = 'MIGRATION_REQUIRED';
    results['instructions'] = 'Bitte im Supabase SQL Editor ausfÃ¼hren (siehe sql unten)';
    results['sql_010'] = 'alter table public.profiles add column if not exists listing_credits integer default 0;';
    results['sql_011'] = `create or replace function public.increment_listing_credits(uid uuid, amount integer)
returns void language sql security definer as $$
  update public.profiles set listing_credits = coalesce(listing_credits, 0) + amount where id = uid;
$$;`;
    return NextResponse.json(results, { status: 400 });
  }

  results['010_column'] = 'Spalte existiert bereits âœ“';

  // Function 011 checken
  const { error: fnCheck } = await service.rpc('increment_listing_credits', { uid: '00000000-0000-0000-0000-000000000000', amount: 0 });
  if (fnCheck && fnCheck.code === 'PGRST202') {
    results['011_function'] = 'FEHLT â€” SQL ausfÃ¼hren';
    results['sql_011'] = `create or replace function public.increment_listing_credits(uid uuid, amount integer)
returns void language sql security definer as $$
  update public.profiles set listing_credits = coalesce(listing_credits, 0) + amount where id = uid;
$$;`;
    return NextResponse.json(results, { status: 400 });
  }

  results['011_function'] = 'Funktion existiert âœ“';
  results['status'] = 'ALL_OK';
  return NextResponse.json(results);
}
