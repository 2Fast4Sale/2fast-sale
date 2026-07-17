import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

// Stripe Price IDs aus .env.local
const PRICE_IDS: Record<string, Record<string, string>> = {
  basic: {
    monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID  || '',
    yearly:  process.env.STRIPE_BASIC_YEARLY_PRICE_ID   || '',
  },
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || '',
    yearly:  process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID  || '',
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || '',
    yearly:  process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID  || '',
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '',
    yearly:  process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID  || '',
  },
  professional: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    yearly:  process.env.STRIPE_PRO_YEARLY_PRICE_ID  || '',
  },
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const { plan, billing = 'monthly', successUrl, cancelUrl } = await req.json();

    const priceId = PRICE_IDS[plan]?.[billing];
    if (!priceId) {
      return NextResponse.json({
        error: `Kein Stripe Price-ID für Plan "${plan}" / "${billing}".\nBitte in .env.local eintragen: STRIPE_${plan.toUpperCase()}_${billing.toUpperCase()}_PRICE_ID=price_xxx`,
      }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name, company')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.company || profile?.full_name || undefined,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 1,
        metadata: { user_id: user.id, plan, billing },
      },
      success_url: successUrl
        ? `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`
        : `${baseUrl}/dashboard/settings/abo?upgraded=${plan}&session_id={CHECKOUT_SESSION_ID}`,
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
