import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !srvKey) {
      console.error('[delete-account] Missing env vars');
      return NextResponse.json({ error: 'Server nicht konfiguriert' }, { status: 500 });
    }

    const supabaseAdmin = createClient(url, srvKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Token aus Authorization Header
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    // User verifizieren
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      console.error('[delete-account] getUser error:', authErr?.message);
      return NextResponse.json({ error: 'UngÃ¼ltiger Token' }, { status: 401 });
    }

    const uid = user.id;
    console.log('[delete-account] Deleting user:', uid);

    // 1. Vehicle images lÃ¶schen
    const { data: vehicles } = await supabaseAdmin
      .from('vehicles').select('id').eq('user_id', uid);

    if (vehicles?.length) {
      const ids = vehicles.map((v: any) => v.id);
      const { error: imgErr } = await supabaseAdmin
        .from('vehicle_images').delete().in('vehicle_id', ids);
      if (imgErr) console.warn('[delete-account] images delete:', imgErr.message);
    }

    // 2. Vehicles lÃ¶schen
    const { error: vErr } = await supabaseAdmin
      .from('vehicles').delete().eq('user_id', uid);
    if (vErr) console.warn('[delete-account] vehicles delete:', vErr.message);

    // 3. Profil lÃ¶schen
    const { error: pErr } = await supabaseAdmin
      .from('profiles').delete().eq('id', uid);
    if (pErr) console.warn('[delete-account] profiles delete:', pErr.message);

    // 4. Auth-Account lÃ¶schen â€” kurz warten damit FK-Constraints gelÃ¶st sind
    await new Promise(r => setTimeout(r, 200));
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (deleteErr) {
      console.error('[delete-account] auth.admin.deleteUser failed:', deleteErr.message, JSON.stringify(deleteErr));
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    console.log('[delete-account] Success:', uid);
    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error('[delete-account] Exception:', e?.message, e?.stack);
    return NextResponse.json({ error: e?.message ?? 'Unbekannter Fehler' }, { status: 500 });
  }
}
