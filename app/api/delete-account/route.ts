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
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }

    const uid = user.id;
    console.log('[delete-account] Deleting user:', uid);

    /*
     * 0. Laufendes Abo bei Stripe beenden — VOR dem Loeschen.
     *
     * Das fehlte. Wer sein Konto loeschte, wurde weiter abgebucht: Die
     * Zahlung haengt am Stripe-Kunden, nicht am Konto hier. Und nach dem
     * Loeschen ist die Abo-Nummer weg, es gibt also keinen Weg zurueck.
     * Sofort statt zum Periodenende: Wer sein Konto loescht, kann den
     * Rest des Zeitraums nicht mehr nutzen.
     */
    const { data: vorProfil } = await supabaseAdmin
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', uid)
      .single();

    if (vorProfil?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' });
        await stripe.subscriptions.cancel(vorProfil.stripe_subscription_id);
        console.log('[delete-account] Abo beendet:', vorProfil.stripe_subscription_id);
      } catch (fehler) {
        /*
         * Hier NICHT weitermachen: Sonst ist das Konto weg und das Abo
         * laeuft, ohne dass noch jemand die Nummer kennt.
         */
        console.error('[delete-account] Abo konnte nicht beendet werden:', fehler);
        return NextResponse.json(
          { error: 'Dein Abo laesst sich gerade nicht beenden. Damit du nicht weiter bezahlst, haben wir das Konto NICHT geloescht. Bitte kurz spaeter erneut versuchen.' },
          { status: 503 },
        );
      }
    }

    /*
     * 0b. Die Fotos aus dem Speicher.
     *
     * Der Eimer vehicle-images ist oeffentlich lesbar und die Dateien
     * liegen unter der Nutzer-Nummer. Ohne diesen Schritt bleiben die
     * Fotos nach dem Loeschen des Kontos fuer jeden erreichbar, der eine
     * Adresse hat — ein loeschbares Datum, das nicht geloescht wird
     * (Art. 17 DSGVO).
     */
    try {
      const alleDateien: string[] = [];
      const ordnerSammeln = async (pfad: string, tiefe = 0) => {
        if (tiefe > 3) return;
        const { data: eintraege } = await supabaseAdmin.storage
          .from('vehicle-images')
          .list(pfad, { limit: 1000 });
        for (const eintrag of eintraege ?? []) {
          const voll = pfad ? `${pfad}/${eintrag.name}` : eintrag.name;
          // Ordner haben keine id — dann tiefer schauen.
          if (eintrag.id) alleDateien.push(voll);
          else await ordnerSammeln(voll, tiefe + 1);
        }
      };
      await ordnerSammeln(uid);
      for (let i = 0; i < alleDateien.length; i += 100) {
        const { error: loeschFehler } = await supabaseAdmin.storage
          .from('vehicle-images')
          .remove(alleDateien.slice(i, i + 100));
        if (loeschFehler) console.warn('[delete-account] Fotos loeschen:', loeschFehler.message);
      }
      console.log('[delete-account] Fotos geloescht:', alleDateien.length);
    } catch (fehler) {
      // Das Konto trotzdem loeschen — sonst haengt der Nutzer fest.
      console.error('[delete-account] Speicher aufraeumen fehlgeschlagen:', fehler);
    }

    // 1. Vehicle images löschen
    const { data: vehicles } = await supabaseAdmin
      .from('vehicles').select('id').eq('user_id', uid);

    if (vehicles?.length) {
      const ids = vehicles.map((v: any) => v.id);
      const { error: imgErr } = await supabaseAdmin
        .from('vehicle_images').delete().in('vehicle_id', ids);
      if (imgErr) console.warn('[delete-account] images delete:', imgErr.message);
    }

    // 2. Vehicles löschen
    const { error: vErr } = await supabaseAdmin
      .from('vehicles').delete().eq('user_id', uid);
    if (vErr) console.warn('[delete-account] vehicles delete:', vErr.message);

    // 3. Profil löschen
    const { error: pErr } = await supabaseAdmin
      .from('profiles').delete().eq('id', uid);
    if (pErr) console.warn('[delete-account] profiles delete:', pErr.message);

    // 4. Auth-Account löschen — kurz warten damit FK-Constraints gelöst sind
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
