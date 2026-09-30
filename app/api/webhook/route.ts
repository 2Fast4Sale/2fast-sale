import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = 'force-dynamic';

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

  const supabase = getAdminClient();

  /**
   * Plan im Profil setzen.
   *
   * Vorher wurde der Fehler der Schreiboperation nicht angesehen: Ging
   * sie schief, antwortete die Route trotzdem mit 200, Stripe stellte
   * nie erneut zu — und der Haendler hatte bezahlt und stand weiter auf
   * dem Gratis-Plan. Ein 500 sorgt dafuer, dass Stripe es wiederholt.
   */
  const profilSetzen = async (userId: string, felder: Record<string, unknown>) => {
    const { error } = await supabase.from('profiles').update(felder).eq('id', userId);
    if (error) {
      console.error('[webhook] Profil schreiben fehlgeschlagen:', error.message, event.type);
      return NextResponse.json({ error: 'Profil schreiben fehlgeschlagen' }, { status: 500 });
    }
    return null;
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.subscription) break;
      const sub    = await getStripe().subscriptions.retrieve(session.subscription as string);
      const userId = sub.metadata?.user_id;
      if (!userId) break;
      const priceId = sub.items.data[0]?.price?.id || '';
      const plan    = sub.metadata?.plan || getPlanFromPriceId(priceId);
      const f1 = await profilSetzen(userId, {
        plan,
        stripe_subscription_id: sub.id,
        plan_expires_at: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      });
      if (f1) return f1;
      break;
    }

    case 'customer.subscription.updated': {
      const sub    = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) break;
      const isActive = sub.status === 'active' || sub.status === 'trialing';
      const priceId  = sub.items.data[0]?.price?.id || '';
      const plan     = isActive ? (sub.metadata?.plan || getPlanFromPriceId(priceId)) : 'free';
      const f2 = await profilSetzen(userId, {
        plan,
        stripe_subscription_id: isActive ? sub.id : null,
        plan_expires_at: isActive
          ? new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
          : null,
      });
      if (f2) return f2;
      break;
    }

    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) {
        const f3 = await profilSetzen(userId, {
          plan: 'free',
          stripe_subscription_id: null,
          plan_expires_at: null,
        });
        if (f3) return f3;
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.type === 'listing_credit') {
        const userId = pi.metadata.user_id;
        const gemeldet = parseInt(pi.metadata.quantity || '1', 10);
        const qty = Number.isFinite(gemeldet) && gemeldet > 0 ? Math.min(gemeldet, 500) : 1;
        if (userId) {
          /*
           * Gutschreiben nur, wenn es noch keiner getan hat.
           *
           * Zwei Wege schreiben Credits gut: dieser und
           * /api/credits/fulfill, wenn der Browser nach dem Bezahlen
           * zurueckkommt. Vorher liefen beide — der Kunde zahlte einen
           * Credit und bekam zwei. Dazu kommt, dass Stripe dasselbe
           * Ereignis wiederholt zustellt, wenn eine Antwort ausbleibt.
           *
           * Der Primaerschluessel dieser Tabelle ist die Sperre, und
           * beide Wege benutzen denselben Schluessel: die
           * Payment-Intent-Nummer.
           */
          const { error: sperrFehler } = await supabase
            .from('stripe_fulfillments')
            .insert({ id: pi.id, user_id: userId, quantity: qty });

          if (sperrFehler) {
            if (sperrFehler.code !== '23505') {
              console.error('[webhook] Sperre fehlgeschlagen:', sperrFehler.message);
              // 500 heisst: Stripe stellt erneut zu. Besser als ein
              // bezahlter Credit, der nie ankommt.
              return NextResponse.json({ error: 'Sperre fehlgeschlagen' }, { status: 500 });
            }
            // Schon gutgeschrieben — nichts zu tun.
            break;
          }

          const { error: gutschriftFehler } = await supabase
            .rpc('increment_listing_credits', { uid: userId, amount: qty });
          if (gutschriftFehler) {
            await supabase.from('stripe_fulfillments').delete().eq('id', pi.id);
            console.error('[webhook] Gutschrift fehlgeschlagen:', gutschriftFehler.message);
            return NextResponse.json({ error: 'Gutschrift fehlgeschlagen' }, { status: 500 });
          }
          await supabase.from('profiles').update({ low_credit_email_at: null }).eq('id', userId);
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


