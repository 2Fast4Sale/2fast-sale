import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  rechnungPdf, rechnungEmail, rechnungText, ausstellerAusUmgebung,
  summen, betrag, type Rechnung,
} from '../../../../lib/rechnung';

/** Bruttopreis eines Inserat-Credits in Cent. */
const PREIS_CREDIT_BRUTTO_CENT = 499;

export const dynamic = 'force-dynamic';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });
const getResend = () => new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: 'sessionId fehlt' }, { status: 400 });

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: existing } = await service
    .from('stripe_fulfillments')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyFulfilled: true });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['invoice', 'customer'],
    });
  } catch {
    return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Zahlung nicht abgeschlossen' }, { status: 402 });
  }

  const userId   = session.metadata?.user_id;
  const quantity = parseInt(session.metadata?.quantity || '1', 10);

  if (!userId) {
    return NextResponse.json({ error: 'user_id fehlt in Stripe-Metadata' }, { status: 400 });
  }

  const { data: profile } = await service
    .from('profiles')
    .select('listing_credits, full_name, company, billing_address')
    .eq('id', userId)
    .single();

  const current = (profile as { listing_credits: number | null } | null)?.listing_credits ?? 0;

  const { error: updateErr } = await service
    .from('profiles')
    .update({
      listing_credits: current + quantity,
      /*
       * Guthaben-Hinweis wieder scharf stellen. Ohne das Zuruecksetzen
       * bekommt der Haendler die Warnung genau einmal im Leben und steht
       * beim uebernaechsten Mal ohne Vorwarnung vor der Bezahlseite.
       */
      low_credit_email_at: null,
    })
    .eq('id', userId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await service.from('stripe_fulfillments').insert({ id: sessionId, user_id: userId, quantity });

  // E-Mail versenden
  const customerEmail =
    (session.customer as Stripe.Customer)?.email ||
    session.customer_details?.email || '';

  const invoice        = session.invoice as Stripe.Invoice | null;
  const invoiceNumber  = invoice?.number || sessionId.slice(-8).toUpperCase();
  const invoicePdfUrl  = invoice?.invoice_pdf || null;

  const billingAddr  = profile?.billing_address
    ? (typeof profile.billing_address === 'string'
        ? JSON.parse(profile.billing_address)
        : profile.billing_address)
    : null;

  const buyerName    = billingAddr?.company || billingAddr?.name || (profile as {full_name?: string} | null)?.full_name || 'Kunde';
  const buyerStreet  = billingAddr?.street || '';
  const buyerCity    = billingAddr?.zip ? `${billingAddr.zip} ${billingAddr.city}` : '';
  const buyerCountry = billingAddr?.country || '';
  const buyerVat     = billingAddr?.vat || '';
  const fromEmail    = process.env.RESEND_FROM || 'onboarding@resend.dev';
  const isDomainVerified = fromEmail && !fromEmail.includes('onboarding@resend.dev');
  const toEmail      = isDomainVerified ? customerEmail : (process.env.RESEND_OWNER_EMAIL || '2fast4sale@gmail.com');

  if (toEmail && process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('re_...')) {
    const jetzt = new Date();
    const rechnung: Rechnung = {
      nummer: invoiceNumber,
      datum: jetzt,
      // Die Credits sind mit der Zahlung sofort nutzbar, Leistungs- und
      // Rechnungsdatum fallen deshalb zusammen.
      leistungsdatum: jetzt,
      empfaenger: {
        name: buyerName,
        strasse: buyerStreet || undefined,
        ort: buyerCity || undefined,
        land: buyerCountry || undefined,
        ustId: buyerVat || undefined,
      },
      positionen: [{
        bezeichnung: 'Inserat-Credit',
        beschreibung: 'KI-Fahrzeugbeschreibung, Studio-Fotos, Plattform-Export',
        menge: quantity,
        einzelpreisBruttoCent: PREIS_CREDIT_BRUTTO_CENT,
      }],
      steuersatz: 19,
      bezahlt: true,
      stripePdfUrl: invoicePdfUrl,
    };

    const aussteller = ausstellerAusUmgebung();
    const pdfBuffer = await rechnungPdf(rechnung, aussteller);

    await getResend().emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `Rechnung ${invoiceNumber} über ${betrag(summen(rechnung.positionen, 19).bruttoCent)} €`,
      html: rechnungEmail(rechnung, aussteller),
      // Textfassung mitschicken: verbessert die Zustellung und deckt
      // Postfächer ab, die HTML nicht anzeigen.
      text: rechnungText(rechnung, aussteller),
      attachments: [{
        filename: `Rechnung-${invoiceNumber}.pdf`,
        content: pdfBuffer,
      }],
    }).catch(err => console.error('[fulfill] E-Mail-Fehler:', err));
  }

  return NextResponse.json({ ok: true, added: quantity, total: current + quantity });
}

