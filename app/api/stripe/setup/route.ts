import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

// Plan definitions — prices in Euro cents
const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    description: '30 Inserate pro Monat, KI-Beschreibungen, Studio-Hintergründe',
    monthly_price: 2900,   // €29/Monat
    yearly_price:  29000,  // €290/Jahr (2 Monate gratis)
  },
  {
    id: 'premium',
    name: 'Premium',
    description: '150 Inserate pro Monat, Wasserzeichen, mobile.de & AutoScout24',
    monthly_price: 7900,
    yearly_price:  79000,
  },
  {
    id: 'business',
    name: 'Business',
    description: '550 Inserate pro Monat, Team-Accounts bis 5, API-Zugang',
    monthly_price: 19900,
    yearly_price:  199000,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Unbegrenzte Inserate, White-Label, dedizierter Support',
    monthly_price: 49900,
    yearly_price:  499000,
  },
];

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const results: Record<string, { monthly: string; yearly: string }> = {};

    for (const plan of PLANS) {
      // Create product
      const product = await stripe.products.create({
        name: `2Fast4Sale ${plan.name}`,
        description: plan.description,
        metadata: { plan_id: plan.id },
      });

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthly_price,
        currency: 'eur',
        recurring: { interval: 'month' },
        metadata: { plan_id: plan.id, billing: 'monthly' },
        nickname: `${plan.name} Monthly`,
      });

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.yearly_price,
        currency: 'eur',
        recurring: { interval: 'year' },
        metadata: { plan_id: plan.id, billing: 'yearly' },
        nickname: `${plan.name} Yearly`,
      });

      results[plan.id] = { monthly: monthlyPrice.id, yearly: yearlyPrice.id };

      // Store in app_settings via service role
      await supabase.from('app_settings').upsert([
        { key: `stripe_${plan.id}_monthly`, value: monthlyPrice.id },
        { key: `stripe_${plan.id}_yearly`,  value: yearlyPrice.id },
      ]);
    }

    return NextResponse.json({ success: true, priceIds: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fehler';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
