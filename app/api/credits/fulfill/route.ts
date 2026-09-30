import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  rechnungPdf, rechnungEmail, rechnungText, ausstellerAusUmgebung,
  summen, betrag, type Rechnung,
} from '../../../../lib/rechnung';
import { PREIS_PRO_INSERAT_CENT, STEUERSATZ_PROZENT } from '../../../../lib/preismodell';

/*
 * Preis und Steuersatz kommen aus dem Preismodell, nicht mehr von hier.
 *
 * Hier stand fest verdrahtet 499 (4,99 EUR) bei 19 % Umsatzsteuer,
 * waehrend Startseite und lib/preismodell.ts 3,50 EUR ohne Umsatzsteuer
 * nannten. Der Haendler haette also eine Rechnung bekommen, die von der
 * beworbenen Seite abweicht — und als Kleinunternehmer haetten wir eine
 * Steuer ausgewiesen, die wir nicht ausweisen duerfen (§ 14c UStG).
 */
const PREIS_CREDIT_BRUTTO_CENT = PREIS_PRO_INSERAT_CENT;

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
  // Kaputte oder fehlende Angabe heisst ein Credit, nicht NaN.
  const gemeldet = parseInt(session.metadata?.quantity || '1', 10);
  const quantity = Number.isFinite(gemeldet) && gemeldet > 0 ? Math.min(gemeldet, 500) : 1;

  if (!userId) {
    return NextResponse.json({ error: 'user_id fehlt in Stripe-Metadata' }, { status: 400 });
  }

  /*
   * Gutschreiben darf nur einer — und zwar genau einmal.
   *
   * Hier lag der teuerste Fehler des Projekts: Fuer JEDEN Credit-Kauf
   * schrieben ZWEI Wege gut. Dieser hier, wenn der Browser nach dem
   * Bezahlen aufs Dashboard zurueckkommt, und der Stripe-Webhook bei
   * payment_intent.succeeded. Der Kunde zahlte einen Credit und bekam
   * zwei — jedes zweite Inserat also auf meine Kosten.
   *
   * Beide Wege sperren sich jetzt ueber denselben Schluessel: die
   * Payment-Intent-Nummer. Die kennen beide, die Checkout-Session-Nummer
   * nur dieser hier. Der Primaerschluessel der Tabelle macht daraus eine
   * Sperre, die auch zwei gleichzeitige Aufrufe aushaelt — der zweite
   * Insert scheitert, statt ein zweites Mal gutzuschreiben.
   */
  const zahlungId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || sessionId;

  const { error: sperrFehler } = await service
    .from('stripe_fulfillments')
    .insert({ id: zahlungId, user_id: userId, quantity });

  if (sperrFehler) {
    // 23505 = unique_violation: schon gutgeschrieben, hier ist nichts zu tun.
    if (sperrFehler.code === '23505') {
      return NextResponse.json({ ok: true, alreadyFulfilled: true });
    }
    return NextResponse.json({ error: sperrFehler.message }, { status: 500 });
  }

  const { data: profile } = await service
    .from('profiles')
    .select('listing_credits, full_name, company, billing_address')
    .eq('id', userId)
    .single();

  const current = (profile as { listing_credits: number | null } | null)?.listing_credits ?? 0;

  // Addieren in der Datenbank, nicht hier: zwei Aufrufe gleichzeitig
  // haetten sich sonst gegenseitig ueberschrieben.
  const { error: updateErr } = await service
    .rpc('increment_listing_credits', { uid: userId, amount: quantity });

  if (updateErr) {
    // Die Sperre wieder aufheben, sonst ist der Credit fuer immer verloren.
    await service.from('stripe_fulfillments').delete().eq('id', zahlungId);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  /*
   * Guthaben-Hinweis wieder scharf stellen. Ohne das Zuruecksetzen
   * bekommt der Haendler die Warnung genau einmal im Leben und steht
   * beim uebernaechsten Mal ohne Vorwarnung vor der Bezahlseite.
   */
  await service.from('profiles').update({ low_credit_email_at: null }).eq('id', userId);

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
        bezeichnung: 'Inserat',
        /*
         * "Plattform-Export" stand hier, obwohl es ihn nicht gibt: Die
         * Uebertragung zu mobile.de und AutoScout24 ist Vorbereitung,
         * nicht Leistung. Eine Rechnungsposition darf nichts aufzaehlen,
         * was der Kunde nicht bekommt.
         */
        beschreibung: 'Fahrzeugdaten aus dem Fahrzeugschein, Studio-Fotos, Beschreibung und Titel',
        menge: quantity,
        einzelpreisBruttoCent: PREIS_CREDIT_BRUTTO_CENT,
      }],
      steuersatz: STEUERSATZ_PROZENT,
      bezahlt: true,
      stripePdfUrl: invoicePdfUrl,
    };

    const aussteller = ausstellerAusUmgebung();
    const pdfBuffer = await rechnungPdf(rechnung, aussteller);

    await getResend().emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `Rechnung ${invoiceNumber} über ${betrag(summen(rechnung.positionen, STEUERSATZ_PROZENT).bruttoCent)} €`,
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

