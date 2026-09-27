import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';
import { preisIdLesen } from '../../../../lib/stripePreise';

export const dynamic = 'force-dynamic';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const { quantity = 1, successUrl, cancelUrl, widerrufVerzicht } = await req.json();

    /*
     * Ohne ausdrueckliche Zustimmung kein Kauf.
     *
     * § 356 Abs. 4 und 5 BGB: Das Widerrufsrecht eines Verbrauchers
     * erlischt nur, wenn er dem sofortigen Beginn zugestimmt UND
     * bestaetigt hat, dass er es damit verliert. Fehlt das, koennte er
     * zwoelf fertige Studiofotos behalten und zwei Wochen spaeter sein
     * Geld zurueckverlangen. Der Haken steht auf der Preisseite; hier
     * wird geprueft, dass er wirklich gesetzt war.
     */
    if (widerrufVerzicht !== true) {
      return NextResponse.json({
        error: 'Bitte bestätige den sofortigen Beginn der Leistung, bevor du kaufst.',
      }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: profile?.full_name || undefined,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const preis = preisIdLesen('STRIPE_PRIVATE_LISTING_PRICE_ID');
    if ('fehler' in preis) {
      console.error(`[checkout/private] nicht buchbar: ${preis.fehler}`);
      return NextResponse.json(
        { error: 'Das Einzelinserat lässt sich gerade nicht buchen. Bitte melden Sie sich kurz bei uns.' },
        { status: 503 },
      );
    }
    const priceId = preis.id;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity }],
      metadata: {
        user_id: user.id,
        type: 'listing_credit',
        quantity: String(quantity),
        /* Nachweis, dass der Haken gesetzt war — bleibt bei Stripe. */
        widerruf_verzicht: 'ja',
        widerruf_verzicht_am: new Date().toISOString(),
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          type: 'listing_credit',
          quantity: String(quantity),
        },
      },
      success_url: `${baseUrl}/payment-success?credits_added=${quantity}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/dashboard/pricing?cancelled=1`,
      locale: 'de',
      // Stripe beschriftet den Bestellbutton damit als "Jetzt bezahlen" —
      // ohne submit_type steht dort nur ein generisches "Bezahlen".
      submit_type: 'pay',
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fehler';
    console.error('[checkout/private]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


