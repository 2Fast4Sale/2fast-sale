import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: '2fast4sale@gmail.com',
    password: 'Start2026!',
  });

  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    success: !!data.user,
    user_id: data.user?.id ?? null,
    error: error?.message ?? null,
    error_code: (error as any)?.code ?? null,
    error_status: (error as any)?.status ?? null,
  });
}
