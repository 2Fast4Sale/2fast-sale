import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { preisIdLesen } from '../../../../lib/stripePreise';
import { PROBE } from '../../../../lib/preismodell';

export const dynamic = 'force-dynamic';

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

/**
 * Probelauf buchen — 5 € für 2 Inserate, einmal je Person.
 *
 * Die Prüfung, ob jemand ihn schon hatte, läuft in zwei Stufen und das
 * ist Absicht:
 *
 * Hier vorab nur gegen das Konto. Das fängt den ehrlichen Fall ab — wer
 * schon einen Probelauf hatte, bekommt sofort eine Meldung statt einer
 * Bezahlseite, die ihm hinterher das Geld abnimmt.
 *
 * Die eigentliche Sperre greift erst beim Einlösen, wenn Stripe die
 * Kartenkennung liefert. Vorher gibt es sie nicht: Der Kunde hat seine
 * Karte zu diesem Zeitpunkt noch gar nicht eingegeben.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    /*
     * Der Service-Client, weil probelaeufe für den Nutzer nur lesbar ist
     * und die Funktion mit anderen Konten abgleichen muss.
     */
    const dienst = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: schonGehabt } = await dienst
      .from('probelaeufe')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (schonGehabt) {
      return NextResponse.json(
        {
          error: 'Den Probelauf gibt es einmal je Kunde — du hast ihn schon genutzt.',
          code: 'probelauf_verbraucht',
        },
        { status: 409 },
      );
    }

    const preis = preisIdLesen('STRIPE_PROBELAUF_PRICE_ID');
    if ('fehler' in preis) {
      console.error(`[checkout/probelauf] nicht buchbar: ${preis.fehler}`);
      return NextResponse.json(
        { error: 'Der Probelauf lässt sich gerade nicht buchen. Bitte melde dich kurz bei uns.' },
        { status: 503 },
      );
    }

    const { data: profil } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name, company')
      .eq('id', user.id)
      .single();

    let kundeId = profil?.stripe_customer_id;
    if (!kundeId) {
      const kunde = await getStripe().customers.create({
        email: user.email,
        name: profil?.company || profil?.full_name || undefined,
        metadata: { supabase_uid: user.id },
      });
      kundeId = kunde.id;
      await supabase.from('profiles').update({ stripe_customer_id: kundeId }).eq('id', user.id);
    }

    const basis = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const sitzung = await getStripe().checkout.sessions.create({
      customer: kundeId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: preis.id, quantity: 1 }],
      /*
       * Zahlungsmethode am Kunden speichern.
       *
       * Nicht um spaeter abzubuchen, sondern um an die Kartenkennung zu
       * kommen: Ohne sie laesst sich der zweite Probelauf mit derselben
       * Karte nicht erkennen, und dann waere die Sperre wirkungslos.
       */
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata: { user_id: user.id, type: 'probelauf' },
      },
      metadata: {
        user_id: user.id,
        type: 'probelauf',
        inserate: String(PROBE.inserate),
      },
      // § 312j BGB: Der Knopf muss sagen, dass er zahlungspflichtig ist.
      submit_type: 'pay',
      locale: 'de',
      billing_address_collection: 'required',
      success_url: `${basis}/dashboard/payment-success?probelauf=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${basis}/dashboard/pricing?abgebrochen=1`,
    });

    return NextResponse.json({ url: sitzung.url });
  } catch (fehler: unknown) {
    const meldung = fehler instanceof Error ? fehler.message : 'Fehler';
    console.error('[checkout/probelauf]', meldung);
    return NextResponse.json({ error: meldung }, { status: 500 });
  }
}
