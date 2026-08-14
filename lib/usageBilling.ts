/**
 * Nutzungsbasierte Abrechnung: Grundgebuehr im Abo, dazu ein Preis pro Inserat.
 *
 * Ablauf pro Inserat:
 *   1. Posten in listing_charges schreiben (vehicle_id ist unique → Idempotenz)
 *   2. Stripe Invoice Item anlegen, ohne Rechnungszuordnung
 *   3. Stripe haengt alle offenen Posten automatisch an die naechste Abo-Rechnung
 *
 * Ergebnis: eine Abbuchung im Monat statt einer pro Inserat. Das spart die
 * Stripe-Fixgebuehr von 0,25 EUR je Transaktion — bei 3,50 EUR pro Inserat
 * waeren das sonst 7 % allein an Transaktionskosten.
 *
 * Grundsatz: Ein Fehler in der Abrechnung darf NIE das Anlegen des Inserats
 * verhindern. Der Haendler bekommt sein Inserat; ein nicht gemeldeter Posten
 * bleibt in der Datenbank stehen und kann nachgereicht werden.
 */

import Stripe from 'stripe';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/** Preis pro Inserat in Cent. Ueber Env aenderbar, ohne Deploy. */
export const PREIS_PRO_INSERAT_CENT = Number(process.env.PREIS_PRO_INSERAT_CENT || '350');

/*
 * Kontingent und Zusatzpreis kommen aus lib/studioQuota — dasselbe Modul, das
 * auch das Formular nutzt. So koennen Anzeige und Rechnung nicht auseinander
 * laufen.
 *
 * Der Grund fuer eine Position pro Bild: Die Kosten entstehen pro Bild. Ohne
 * Preis pro Bild waere jede Kalkulation eine Wette darauf, dass der Kunde wenig
 * nutzt — und die verliert man ausgerechnet bei den besten Kunden.
 */
export { STUDIO_INKLUSIVE, PREIS_EXTRA_BILD_CENT } from './studioQuota';
import { STUDIO_INKLUSIVE, PREIS_EXTRA_BILD_CENT } from './studioQuota';

/** Zerlegt ein Inserat in Grundpreis und Zusatzbilder. */
export function berechnePosten(studioImages: number): {
  extraImages: number;
  baseCents: number;
  extraCents: number;
  summeCent: number;
} {
  const extraImages = Math.max(0, Math.round(studioImages) - STUDIO_INKLUSIVE);
  const baseCents   = PREIS_PRO_INSERAT_CENT;
  const extraCents  = extraImages * PREIS_EXTRA_BILD_CENT;
  return { extraImages, baseCents, extraCents, summeCent: baseCents + extraCents };
}

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

const admin = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface BerechnungsErgebnis {
  berechnet: boolean;
  grund?: 'kein_usage_kunde' | 'bereits_berechnet' | 'kein_stripe_kunde' | 'fehler';
  betragCent?: number;
}

/**
 * Berechnet ein Inserat, sofern der Nutzer nutzungsbasiert abgerechnet wird.
 * Wirft nie — Fehler werden protokolliert und als Ergebnis zurueckgegeben.
 */
export async function berechneInserat(args: {
  userId: string;
  vehicleId: string;
  bezeichnung?: string;
  /** Wie viele Bilder wurden ins Studio gesetzt. Bestimmt die Zusatzposten. */
  studioImages?: number;
}): Promise<BerechnungsErgebnis> {
  const { userId, vehicleId, bezeichnung } = args;
  const studioImages = Math.max(0, Math.round(args.studioImages ?? 0));
  const posten = berechnePosten(studioImages);

  try {
    const supabase = admin();

    const { data: profile } = await supabase
      .from('profiles')
      .select('usage_billing, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.usage_billing) {
      return { berechnet: false, grund: 'kein_usage_kunde' };
    }

    // Posten zuerst in der eigenen Datenbank festhalten. Das unique auf
    // vehicle_id laesst den zweiten Versuch scheitern — genau so soll es sein.
    const { data: charge, error: insertError } = await supabase
      .from('listing_charges')
      .insert({
        user_id:       userId,
        vehicle_id:    vehicleId,
        amount_cents:  posten.summeCent,
        studio_images: studioImages,
        extra_images:  posten.extraImages,
        base_cents:    posten.baseCents,
        extra_cents:   posten.extraCents,
      })
      .select()
      .single();

    if (insertError) {
      // 23505 = unique violation → dieses Inserat wurde schon berechnet
      if (insertError.code === '23505') {
        return { berechnet: false, grund: 'bereits_berechnet' };
      }
      console.error('[usageBilling] Posten konnte nicht angelegt werden:', insertError.message);
      return { berechnet: false, grund: 'fehler' };
    }

    if (!profile.stripe_customer_id) {
      // Posten bleibt stehen und kann nachgereicht werden, sobald der Kunde
      // bei Stripe existiert. Nichts geht verloren.
      console.warn('[usageBilling] Kein Stripe-Kunde für', userId, '— Posten bleibt offen');
      return { berechnet: true, grund: 'kein_stripe_kunde', betragCent: posten.summeCent };
    }

    const stripe = getStripe();
    const bezug  = bezeichnung || 'Fahrzeug';

    // Ohne "invoice" haengt Stripe den Posten an die naechste Abo-Rechnung.
    // Grundpreis und Zusatzbilder werden getrennt ausgewiesen, damit der
    // Haendler auf der Rechnung sieht, wofuer er zahlt.
    const item = await stripe.invoiceItems.create({
      customer:    profile.stripe_customer_id,
      amount:      posten.baseCents,
      currency:    'eur',
      description: `Inserat: ${bezug}`,
      metadata:    { vehicle_id: vehicleId, user_id: userId, art: 'inserat' },
    });

    if (posten.extraCents > 0) {
      await stripe.invoiceItems.create({
        customer:    profile.stripe_customer_id,
        amount:      posten.extraCents,
        currency:    'eur',
        description: `${posten.extraImages} zusätzliche Studio-Bilder (${bezug})`,
        metadata:    { vehicle_id: vehicleId, user_id: userId, art: 'extra_bilder' },
      });
    }

    await supabase
      .from('listing_charges')
      .update({ stripe_invoice_item_id: item.id, billed_at: new Date().toISOString() })
      .eq('id', charge.id);

    return { berechnet: true, betragCent: posten.summeCent };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[usageBilling] Abrechnung fehlgeschlagen:', msg);
    return { berechnet: false, grund: 'fehler' };
  }
}

/**
 * Laufende Kosten der aktuellen Periode — fuer die Anzeige im Dashboard.
 * Der Haendler soll jederzeit sehen, worauf seine Monatsrechnung zulaeuft.
 */
export async function periodenNutzung(userId: string, seit: Date): Promise<{
  anzahl: number;
  summeCent: number;
}> {
  try {
    const { data } = await admin()
      .from('listing_charges')
      .select('amount_cents')
      .eq('user_id', userId)
      .gte('created_at', seit.toISOString());

    const zeilen = data || [];
    return {
      anzahl:    zeilen.length,
      summeCent: zeilen.reduce((s, z) => s + Number(z.amount_cents), 0),
    };
  } catch {
    return { anzahl: 0, summeCent: 0 };
  }
}

/** Cent als lesbarer Betrag, z.B. 12950 → "129,50 €" */
export function formatCent(cent: number): string {
  return (cent / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }) + ' €';
}
