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

/*
 * Der Preis pro Inserat steht nicht mehr hier, sondern in lib/preismodell
 * — zusammen mit Grundgebuehr und Paketen. Vorher lag er als eigene
 * Konstante hier und ein zweites Mal als Text auf der Website, und die
 * beiden sind auseinandergelaufen.
 *
 * Der Mengenrabatt steckt in den Paketen, nicht im Einzelpreis. Ein
 * Haendler mit Paket bekommt seine Inserate ueber das Kontingent
 * abgedeckt; berechnet wird hier nur, was darueber hinausgeht.
 */
export { PREIS_PRO_INSERAT_CENT } from './preismodell';
import { PREIS_PRO_INSERAT_CENT, studioZusatzCent, PAKETE } from './preismodell';

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
  /*
   * Ueber studioZusatzCent und nicht mit einer eigenen Multiplikation:
   * Anzeige in Schritt 2 und Rechnung muessen dieselbe Zahl nennen. Als
   * es hier eine zweite Rechenstelle gab, liefen sie auseinander.
   */
  const extraCents  = studioZusatzCent(extraImages);
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
  /**
   * Entwurfs-Nummer. Ist sie da, wird die Zahl der Studio-Bilder hier
   * gezaehlt statt geglaubt.
   */
  draftId?: string | null;
}): Promise<BerechnungsErgebnis> {
  const { userId, vehicleId, bezeichnung } = args;
  let studioImages = Math.max(0, Math.round(args.studioImages ?? 0));

  try {
    const supabase = admin();

    const { data: profile } = await supabase
      .from('profiles')
      .select('usage_billing, stripe_customer_id, plan')
      .eq('id', userId)
      .single();

    /*
     * ── Paketkunden: Kontingent zaehlen ───────────────────────────────
     *
     * Ein Paket enthaelt eine Zahl von Inseraten im Monat (S 50, M 150,
     * L 550). Auf der Preisseite steht seit jeher, was darueber hinaus
     * passiert: "x Inserate ueber dem Kontingent" zum Einzelpreis.
     *
     * Berechnet wurde das nie. Diese Funktion stieg bei jedem
     * Paketkunden sofort mit "kein_usage_kunde" aus, und
     * consume_listing_credit gab fuer jeden Plan ausser 'free' einfach
     * true zurueck. Ein Paket S fuer 320 EUR erlaubte damit
     * unbegrenzt viele Inserate — bei rund 1,30 EUR Einkauf je Inserat
     * ist das ab dem 247. Inserat ein Verlustgeschaeft, und nach oben
     * offen.
     *
     * Gezaehlt wird ueber listing_charges: Fuer JEDES Inserat entsteht
     * dort eine Zeile, auch die im Kontingent mit 0 Cent. Das ist
     * zugleich die Zaehlung und die Sperre gegen Doppelberechnung
     * (vehicle_id ist unique).
     */
    const paket = PAKETE.find(p => p.id === profile?.plan);

    if (!profile || (!profile.usage_billing && !paket)) {
      return { berechnet: false, grund: 'kein_usage_kunde' };
    }

    let imKontingent = false;
    if (paket) {
      /*
       * Kalendermonat, nicht Abrechnungszeitraum von Stripe. Der
       * Haendler liest sein Kontingent als "50 im Monat"; ein Zeitraum,
       * der am 17. beginnt, waere ihm nicht zu erklaeren. Der
       * Unterschied faellt nur in dem Monat an, in dem er bucht.
       */
      const monatsBeginn = new Date();
      monatsBeginn.setDate(1);
      monatsBeginn.setHours(0, 0, 0, 0);

      const { count, error: zaehlFehler } = await supabase
        .from('listing_charges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', monatsBeginn.toISOString());

      if (zaehlFehler) {
        /*
         * Im Zweifel fuer den Haendler: Laesst sich nicht zaehlen, gilt
         * das Inserat als im Kontingent. Lieber einmal nicht berechnet
         * als einem Kunden etwas in Rechnung gestellt, das sein Paket
         * abdeckt.
         */
        console.error('[usageBilling] Kontingent nicht zaehlbar:', zaehlFehler.message);
        imKontingent = true;
      } else {
        imKontingent = (count ?? 0) < paket.inserate;
      }
    }

    /*
     * Die Zahl der Studio-Bilder kam aus dem sessionStorage des Browsers.
     * Wer sie dort auf 0 setzt, zahlt die Bilder ueber dem Kontingent
     * nicht. Jedes Studio-Bild hinterlaesst in api_costs eine Zeile mit
     * der Entwurfs-Nummer — das ist der Beleg, und an den kommt der
     * Browser nicht heran. api_costs darf ohnehin nur der Server lesen,
     * deshalb passiert das Zaehlen hier und nicht in der Route.
     */
    if (args.draftId) {
      const { count, error: zaehlFehler } = await supabase
        .from('api_costs')
        .select('id', { count: 'exact', head: true })
        .eq('draft_id', args.draftId)
        .eq('user_id', userId)
        .in('service', ['gemini_bild', 'photoroom']);
      if (zaehlFehler) {
        console.error('[usageBilling] Studio-Bilder nicht zaehlbar:', zaehlFehler.message);
      } else if (typeof count === 'number') {
        studioImages = count;
      }
    }

    const rohPosten = berechnePosten(studioImages);
    /*
     * Im Kontingent kostet das Inserat selbst nichts. Zusaetzliche
     * Studio-Bilder kosten trotzdem — sie stehen in keinem Paket drin
     * (siehe studioQuota: fuenfzehn ueberall, jedes weitere 14 Cent),
     * und sie sind der Posten, der uns wirklich Geld kostet.
     */
    const posten = imKontingent
      ? { ...rohPosten, baseCents: 0, summeCent: rohPosten.extraCents }
      : rohPosten;

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
    /*
     * Im Kontingent entsteht kein Posten bei Stripe. Die Zeile in
     * listing_charges bleibt trotzdem stehen — sie ist die Zaehlung.
     */
    const item = posten.baseCents > 0
      ? await stripe.invoiceItems.create({
          customer:    profile.stripe_customer_id,
          amount:      posten.baseCents,
          currency:    'eur',
          description: paket
            ? `Inserat über dem Kontingent (${paket.name}): ${bezug}`
            : `Inserat: ${bezug}`,
          metadata:    { vehicle_id: vehicleId, user_id: userId, art: 'inserat' },
        })
      : null;

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
      .update({
        stripe_invoice_item_id: item?.id ?? null,
        billed_at: item ? new Date().toISOString() : null,
      })
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
