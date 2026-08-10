import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Login testen
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
    email: '2fast4sale@gmail.com',
    password: 'Start2026!',
  });

  // Profil checken
  let profile = null;
  if (loginData?.user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', loginData.user.id)
      .single();
    profile = data;

    // onboarding_done = true setzen damit direkt zum Dashboard
    await supabase
      .from('profiles')
      .update({ onboarding_done: true })
      .eq('id', loginData.user.id);
  }

  return NextResponse.json({
    login_success: !!loginData?.user,
    user_id: loginData?.user?.id ?? null,
    login_error: loginError?.message ?? null,
    profile_exists: !!profile,
    onboarding_done: profile?.onboarding_done ?? null,
    profile_fixed: !!loginData?.user,
  });
}
