import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PROBE } from '../../../../lib/preismodell';

export const dynamic = 'force-dynamic';

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

/**
 * Probelauf einlösen: Zahlung prüfen, Karte gegenprüfen, Credits buchen.
 *
 * Hier greift die eigentliche Sperre. Beim Buchen war sie nicht möglich —
 * da hatte der Kunde die Karte noch gar nicht eingegeben.
 *
 * Der Ablauf ist bewusst so herum:
 *
 *   1. Zahlung bei Stripe bestätigen lassen
 *   2. Kartenkennung holen
 *   3. Eintrag schreiben — der eindeutige Index entscheidet
 *   4. Erst wenn er durchgeht, die Credits gutschreiben
 *
 * Schlägt Schritt 3 fehl, weil dieselbe Karte schon einen Probelauf
 * hatte, wird das Geld zurückerstattet. Es einzubehalten wäre für zwei
 * Inserate, die er nicht bekommt, nicht vertretbar — und ein Streitfall,
 * der mehr kostet als die fünf Euro.
 */
export async function POST(req: NextRequest) {
  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: 'sessionId fehlt' }, { status: 400 });

  const dienst = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const stripe = getStripe();

  let sitzung: Stripe.Checkout.Session;
  try {
    sitzung = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.payment_method'],
    });
  } catch {
    return NextResponse.json({ error: 'Sitzung nicht gefunden' }, { status: 404 });
  }

  if (sitzung.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Zahlung nicht abgeschlossen' }, { status: 402 });
  }

  const nutzerId = sitzung.metadata?.user_id;
  if (!nutzerId) {
    return NextResponse.json({ error: 'user_id fehlt in den Stripe-Daten' }, { status: 400 });
  }

  /*
   * Die Kennung der physischen Karte.
   *
   * Gleiche Karte, gleicher Wert — auch bei einem anderen Konto und einer
   * anderen E-Mail-Adresse. Das ist der einzige Anker, der über
   * Konten hinweg trägt, ohne ehrliche Kunden zu treffen.
   */
  const zahlung = sitzung.payment_intent as Stripe.PaymentIntent | null;
  const methode = zahlung?.payment_method as Stripe.PaymentMethod | null;
  const kartenKennung = methode?.card?.fingerprint ?? null;

  /*
   * Weiterleitungsadresse aus dem Aufruf, nicht aus der Anfrage:
   * Ein Client könnte sonst eine fremde IP behaupten. Vercel setzt
   * x-forwarded-for; der erste Eintrag ist der tatsächliche Absender.
   */
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;

  const { error: eintragFehler } = await dienst.from('probelaeufe').insert({
    user_id:        nutzerId,
    karten_kennung: kartenKennung,
    ip_adresse:     ip,
    betrag_cent:    PROBE.preisCent,
    inserate:       PROBE.inserate,
  });

  if (eintragFehler) {
    // 23505 = unique violation. Entweder das Konto oder die Karte hatte
    // den Probelauf schon.
    if (eintragFehler.code === '23505') {
      /*
       * Geld zurück. Fünf Euro einzubehalten für zwei Inserate, die er
       * nicht bekommt, wäre nicht vertretbar — und der Streit darüber
       * kostet mehr als der Betrag.
       */
      try {
        if (zahlung?.id) await stripe.refunds.create({ payment_intent: zahlung.id });
      } catch (fehler) {
        console.error('[probelauf] Rückerstattung fehlgeschlagen:', fehler);
      }
      return NextResponse.json(
        {
          error: 'Mit dieser Karte wurde der Probelauf schon genutzt. Der Betrag wird zurückerstattet.',
          code: 'probelauf_verbraucht',
        },
        { status: 409 },
      );
    }
    console.error('[probelauf] Eintrag fehlgeschlagen:', eintragFehler.message);
    return NextResponse.json({ error: eintragFehler.message }, { status: 500 });
  }

  /*
   * Erst jetzt gutschreiben. Andersherum bekäme jemand, dessen Eintrag
   * an der Sperre scheitert, trotzdem seine Credits.
   */
  const { data: profil } = await dienst
    .from('profiles')
    .select('listing_credits')
    .eq('id', nutzerId)
    .single();

  const bisher = (profil as { listing_credits: number | null } | null)?.listing_credits ?? 0;

  const { error: gutschriftFehler } = await dienst
    .from('profiles')
    .update({
      listing_credits: bisher + PROBE.inserate,
      // Guthaben-Hinweis wieder scharf stellen, wie beim Aufladen auch.
      low_credit_email_at: null,
    })
    .eq('id', nutzerId);

  if (gutschriftFehler) {
    console.error('[probelauf] Gutschrift fehlgeschlagen:', gutschriftFehler.message);
    return NextResponse.json({ error: gutschriftFehler.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserate: PROBE.inserate, gesamt: bisher + PROBE.inserate });
}
