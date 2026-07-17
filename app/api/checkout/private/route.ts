import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const { quantity = 1, successUrl, cancelUrl } = await req.json();

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || undefined,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const priceId = process.env.STRIPE_PRIVATE_LISTING_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({
        error: 'STRIPE_PRIVATE_LISTING_PRICE_ID fehlt in .env.local',
      }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity }],
      metadata: {
        user_id: user.id,
        type: 'listing_credit',
        quantity: String(quantity),
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          type: 'listing_credit',
          quantity: String(quantity),
        },
      },
      // Stripe erstellt automatisch eine echte Rechnung mit PDF
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `${quantity} × Inserat-Credit auf 2Fast4Sale`,
          metadata: { user_id: user.id, type: 'listing_credit' },
          rendering_options: { amount_tax_display: 'include_inclusive_tax' },
        },
      },
      success_url: successUrl || `${baseUrl}/dashboard?credits_added=${quantity}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/dashboard/pricing?cancelled=1`,
      locale: 'de',
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
