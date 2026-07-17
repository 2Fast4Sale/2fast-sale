import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name, company')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    /* Stripe-Customer anlegen falls noch keiner existiert */
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email!,
        name: profile?.company || profile?.full_name || undefined,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const { returnUrl } = await req.json().catch(() => ({}));
    const returnUrlFinal = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing`;

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrlFinal,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fehler';
    console.error('[portal]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


