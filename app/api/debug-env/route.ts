import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NICHT GESETZT';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'NICHT GESETZT';
  return NextResponse.json({
    supabase_url: url,
    anon_key_start: key.slice(0, 40) + '...',
  });
}
