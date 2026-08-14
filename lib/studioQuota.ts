/**
 * Kontingent-Konstanten für Studio-Bilder.
 *
 * Bewusst in einem eigenen Modul ohne Server-Abhängigkeiten: das Formular
 * braucht dieselben Werte wie die Abrechnung, soll aber nicht Stripe und den
 * Supabase-Admin-Client ins Browser-Bundle ziehen.
 *
 * NEXT_PUBLIC_, damit die Werte auch im Browser ankommen. Wer sie ändert, muss
 * die serverseitigen Gegenstücke in lib/usageBilling.ts mitziehen — deshalb
 * lesen beide dieselben Variablen.
 */

/** So viele freigestellte Bilder sind im Inseratspreis enthalten. */
export const STUDIO_INKLUSIVE = Number(
  process.env.NEXT_PUBLIC_STUDIO_INKLUSIVE || process.env.STUDIO_INKLUSIVE || '10'
);

/** Preis je Studio-Bild über dem Kontingent, in Cent. */
export const PREIS_EXTRA_BILD_CENT = Number(
  process.env.NEXT_PUBLIC_PREIS_EXTRA_BILD_CENT || process.env.PREIS_EXTRA_BILD_CENT || '25'
);

/** Zerlegt eine Bildanzahl in inklusive und zu berechnende Bilder. */
export function studioAufteilung(studioImages: number): {
  inklusive: number;
  extra: number;
  extraCent: number;
} {
  const n = Math.max(0, Math.round(studioImages));
  const extra = Math.max(0, n - STUDIO_INKLUSIVE);
  return {
    inklusive: Math.min(n, STUDIO_INKLUSIVE),
    extra,
    extraCent: extra * PREIS_EXTRA_BILD_CENT,
  };
}

/** Cent als lesbarer Betrag, z.B. 125 → "1,25 €" */
export function centAlsEuro(cent: number): string {
  return (cent / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }) + ' €';
}
