import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { periodenNutzung, PREIS_PRO_INSERAT_CENT } from '../../../../lib/usageBilling';
import { PAKETE } from '../../../../lib/preismodell';

export const dynamic = 'force-dynamic';

/**
 * Laufende Kosten der aktuellen Abrechnungsperiode.
 * Der Haendler soll jederzeit sehen, worauf seine Monatsrechnung zulaeuft —
 * eine Rechnung am Monatsende darf nie eine Ueberraschung sein.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('usage_billing, plan')
    .eq('id', user.id)
    .single();

  /*
   * Paketkunden sehen hier ihr Kontingent.
   *
   * Vorher stieg diese Auskunft bei ihnen mit usageBilling:false aus —
   * sie hatten also keine Moeglichkeit zu sehen, wie viele ihrer
   * Inserate noch im Paket stecken. Seit die Inserate ueber dem
   * Kontingent wirklich berechnet werden, ist das keine Nettigkeit
   * mehr, sondern Pflicht: Eine Rechnung am Monatsende darf nie eine
   * Ueberraschung sein.
   */
  const paket = PAKETE.find(p => p.id === profile?.plan);

  if (!profile?.usage_billing && !paket) {
    return NextResponse.json({ usageBilling: false });
  }

  // Vereinfachung: Kalendermonat. Sobald Abos mit abweichendem Zyklus laufen,
  // muss hier current_period_start aus dem Stripe-Abo verwendet werden.
  const jetzt = new Date();
  const periodenStart = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1);

  const { anzahl, summeCent } = await periodenNutzung(user.id, periodenStart);

  return NextResponse.json({
    usageBilling:    true,
    periodenStart:   periodenStart.toISOString(),
    anzahl,
    summeCent,
    preisProInserat: PREIS_PRO_INSERAT_CENT,
    ...(paket ? {
      paket:          paket.name,
      kontingent:     paket.inserate,
      nochFrei:       Math.max(0, paket.inserate - anzahl),
      ueberKontingent: Math.max(0, anzahl - paket.inserate),
    } : {}),
  });
}
