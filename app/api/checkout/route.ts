import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../lib/supabase/server';
import { preisIdLesen } from '../../../lib/stripePreise';

export const dynamic = 'force-dynamic';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

/*
 * Welcher Plan liegt in welcher Umgebungsvariable.
 *
 * Hier stehen absichtlich die Variablennamen und nicht ihre Werte: Die
 * Werte wurden frueher beim Laden des Moduls eingelesen, sodass ein
 * fehlender Eintrag zu einem leeren String wurde und nicht mehr von
 * einem falschen zu unterscheiden war. So bleibt der Name erhalten und
 * kann in der Fehlermeldung genannt werden.
 */
const PREIS_VARIABLEN: Record<string, Record<string, string>> = {
  basic:        { monthly: 'STRIPE_BASIC_MONTHLY_PRICE_ID',      yearly: 'STRIPE_BASIC_YEARLY_PRICE_ID' },
  premium:      { monthly: 'STRIPE_PREMIUM_MONTHLY_PRICE_ID',    yearly: 'STRIPE_PREMIUM_YEARLY_PRICE_ID' },
  business:     { monthly: 'STRIPE_BUSINESS_MONTHLY_PRICE_ID',   yearly: 'STRIPE_BUSINESS_YEARLY_PRICE_ID' },
  enterprise:   { monthly: 'STRIPE_ENTERPRISE_MONTHLY_PRICE_ID', yearly: 'STRIPE_ENTERPRISE_YEARLY_PRICE_ID' },
  professional: { monthly: 'STRIPE_PRO_MONTHLY_PRICE_ID',        yearly: 'STRIPE_PRO_YEARLY_PRICE_ID' },
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const { plan, billing = 'monthly', successUrl, cancelUrl } = await req.json();

    const variable = PREIS_VARIABLEN[plan]?.[billing];
    if (!variable) {
      return NextResponse.json(
        { error: `Unbekannter Plan "${plan}" oder Abrechnungsart "${billing}".` },
        { status: 400 },
      );
    }

    const preis = preisIdLesen(variable);
    if ('fehler' in preis) {
      /*
       * Der Haendler kann hier nichts richten — es ist ein
       * Konfigurationsfehler auf unserer Seite. Deshalb 503 statt 400,
       * die Ursache in die Logs, und nach aussen ein Satz, der nicht
       * nach kaputter Software klingt.
       */
      console.error(`[checkout] Plan "${plan}"/"${billing}" nicht buchbar: ${preis.fehler}`);
      return NextResponse.json(
        { error: 'Dieser Tarif lässt sich gerade nicht buchen. Bitte melden Sie sich kurz bei uns, wir schalten ihn frei.' },
        { status: 503 },
      );
    }
    const priceId = preis.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name, company')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: profile?.company || profile?.full_name || undefined,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 1,
        metadata: { user_id: user.id, plan, billing },
      },
      success_url: `${baseUrl}/payment-success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/dashboard/settings/abo?cancelled=1`,
      locale: 'de',
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: { address: 'auto', name: 'auto' },
      tax_id_collection: { enabled: true },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fehler';
    console.error('[checkout]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


