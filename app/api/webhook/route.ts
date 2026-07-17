import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../lib/supabase/server';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

function getPlanFromPriceId(priceId: string): string {
  const map: Record<string, string> = {
    [process.env.STRIPE_BASIC_MONTHLY_PRICE_ID      || '__']: 'basic',
    [process.env.STRIPE_BASIC_YEARLY_PRICE_ID       || '__']: 'basic',
    [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID    || '__']: 'premium',
    [process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID     || '__']: 'premium',
    [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID   || '__']: 'business',
    [process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID    || '__']: 'business',
    [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '__']: 'enterprise',
    [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID  || '__']: 'enterprise',
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID        || '__']: 'premium',
    [process.env.STRIPE_PRO_YEARLY_PRICE_ID         || '__']: 'premium',
  };
  return map[priceId] || 'basic';
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook-Secret fehlt' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fehler';
    return NextResponse.json({ error: `Webhook: ${msg}` }, { status: 400 });
  }

  const supabase = await createClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.subscription) break;
      const sub    = await getStripe().subscriptions.retrieve(session.subscription as string);
      const userId = sub.metadata?.user_id;
      if (!userId) break;
      const priceId = sub.items.data[0]?.price?.id || '';
      const plan    = sub.metadata?.plan || getPlanFromPriceId(priceId);
      await supabase.from('profiles').update({
        plan,
        stripe_subscription_id: sub.id,
        plan_expires_at: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      }).eq('id', userId);
      break;
    }

    case 'customer.subscription.updated': {
      const sub    = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) break;
      const isActive = sub.status === 'active' || sub.status === 'trialing';
      const priceId  = sub.items.data[0]?.price?.id || '';
      const plan     = isActive ? (sub.metadata?.plan || getPlanFromPriceId(priceId)) : 'free';
      await supabase.from('profiles').update({
        plan,
        stripe_subscription_id: isActive ? sub.id : null,
        plan_expires_at: isActive
          ? new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
          : null,
      }).eq('id', userId);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await supabase.from('profiles').update({
          plan: 'free',
          stripe_subscription_id: null,
          plan_expires_at: null,
        }).eq('id', userId);
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.type === 'listing_credit') {
        const userId  = pi.metadata.user_id;
        const qty     = parseInt(pi.metadata.quantity || '1', 10);
        if (userId) {
          await supabase.rpc('increment_listing_credits', { uid: userId, amount: qty });
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice    = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      console.error('[webhook] Payment failed for customer', customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}


