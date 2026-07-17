import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ paymentMethods: [], invoices: [] });
    }

    const [pmList, invoiceList, customer, chargeList] = await Promise.all([
      stripe.paymentMethods.list({ customer: profile.stripe_customer_id, type: 'card' }),
      stripe.invoices.list({ customer: profile.stripe_customer_id, limit: 12 }),
      stripe.customers.retrieve(profile.stripe_customer_id),
      // Einmalzahlungen (z.B. Inserat-Credits) — haben keine Invoice
      stripe.charges.list({ customer: profile.stripe_customer_id, limit: 20 }),
    ]);

    /* SEPA dazu */
    const sepaList = await stripe.paymentMethods.list({ customer: profile.stripe_customer_id, type: 'sepa_debit' });

    const defaultPmId = (customer as Stripe.Customer).invoice_settings?.default_payment_method as string | undefined;

    const paymentMethods = [
      ...pmList.data.map(pm => ({
        id: pm.id,
        type: 'card',
        brand: pm.card?.brand || 'unknown',
        last4: pm.card?.last4 || '????',
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPmId,
      })),
      ...sepaList.data.map(pm => ({
        id: pm.id,
        type: 'sepa',
        brand: 'sepa',
        last4: pm.sepa_debit?.last4 || '????',
        country: pm.sepa_debit?.country,
        isDefault: pm.id === defaultPmId,
      })),
    ];

    // Abo-Rechnungen
    const invoiceItems = invoiceList.data.map(inv => ({
      id: inv.id,
      number: inv.number || inv.id,
      date: inv.created,
      amount: (inv.amount_paid / 100).toFixed(2),
      currency: inv.currency.toUpperCase(),
      status: inv.status,
      pdfUrl: inv.invoice_pdf,
      hostedUrl: inv.hosted_invoice_url,
      type: 'invoice' as const,
    }));

    // Invoice-IDs um Dopplungen zu vermeiden
    const invoiceChargeIds = new Set(
      invoiceList.data.map(inv => inv.charge as string | null).filter(Boolean)
    );

    // Einmalzahlungen (ohne zugehörige Invoice)
    const chargeItems = chargeList.data
      .filter(ch => ch.status === 'succeeded' && !invoiceChargeIds.has(ch.id))
      .map(ch => ({
        id: ch.id,
        number: ch.description || 'Inserat-Credit',
        date: ch.created,
        amount: (ch.amount / 100).toFixed(2),
        currency: ch.currency.toUpperCase(),
        status: 'paid' as const,
        pdfUrl: null,
        hostedUrl: ch.receipt_url || null,
        type: 'charge' as const,
      }));

    // Zusammenführen und nach Datum sortieren (neueste zuerst)
    const invoices = [...invoiceItems, ...chargeItems]
      .sort((a, b) => b.date - a.date);

    return NextResponse.json({ paymentMethods, invoices });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fehler';
    console.error('[payment-methods]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
