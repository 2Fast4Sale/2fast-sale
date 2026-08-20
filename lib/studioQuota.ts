/**
 * Kontingent-Konstanten für Studio-Bilder.
 *
 * Bewusst in einem eigenen Modul ohne Server-Abhängigkeiten: das Formular
 * braucht dieselben Werte wie die Abrechnung, soll aber nicht Stripe und den
 * Supabase-Admin-Client ins Browser-Bundle ziehen.
 *
 * Wichtig: Gemeint sind nur Bilder, die durch das Studio laufen — also
 * freigestellt und vor einen Hintergrund gesetzt werden. Normale Fotos
 * (Innenraum, Motorraum, Felgen, Serviceheft) sind davon nicht betroffen
 * und kosten nichts. Ein Armaturenbrett vor einem Studio-Hintergrund
 * freizustellen ergäbe ohnehin keinen Sinn, da ist kein Auto.
 */

import type { Paket } from './preismodell';

/**
 * Studio-Bilder je Inserat, die im Paketpreis enthalten sind.
 *
 * Gestaffelt nach Paket. Ein Händler mit Fahrzeugen im sechsstelligen
 * Bereich stellt mehr Ansichten ein als einer mit Kleinwagen — bei
 * mobile.de haben teure Fahrzeuge bis zu 56 Fotos. Die brauchen aber nicht
 * alle das Studio, sondern nur die Aussenansichten.
 */
export const STUDIO_INKLUSIVE_JE_PAKET: Record<'kein' | Paket['id'], number> = {
  kein: 12,
  s:    15,
  m:    20,
  l:    30,
};

/**
 * Preis je Studio-Bild über dem Kontingent, in Cent.
 *
 * Vier Cent, nicht die früheren 25. Ein Bild kostet rund 2,6 Cent —
 * 2,0 Cent bei PhotoRoom plus Speicher und Auslieferung. Bei 25 Cent
 * wäre das ein Aufschlag auf das Neunfache; die Zusatzbilder sollen sich
 * aber tragen und nichts verdienen. Unter 4 Cent wird es knapp, sobald
 * ein Händler seine Bilder oft ausliefern lässt — und genau dafür sind
 * sie da.
 */
export const PREIS_EXTRA_BILD_CENT = Number(
  process.env.NEXT_PUBLIC_PREIS_EXTRA_BILD_CENT || process.env.PREIS_EXTRA_BILD_CENT || '4'
);

/** Kontingent für ein Paket. `null` heisst: kein Paket gebucht. */
export function studioInklusive(paketId: Paket['id'] | null | undefined): number {
  return STUDIO_INKLUSIVE_JE_PAKET[paketId ?? 'kein'];
}

/** Zerlegt eine Bildanzahl in inklusive und zu berechnende Bilder. */
export function studioAufteilung(
  studioImages: number,
  paketId?: Paket['id'] | null,
): { inklusive: number; extra: number; extraCent: number } {
  const kontingent = studioInklusive(paketId);
  const n = Math.max(0, Math.round(studioImages));
  const extra = Math.max(0, n - kontingent);
  return {
    inklusive: Math.min(n, kontingent),
    extra,
    extraCent: extra * PREIS_EXTRA_BILD_CENT,
  };
}

/**
 * Kontingent ohne Paket.
 *
 * Bleibt als Einzelwert erhalten, weil das Formular in Schritt 2 nicht
 * immer weiss, welches Paket gebucht ist — dort wird der kleinste Wert
 * angezeigt, damit die Anzeige nie mehr verspricht als abgedeckt ist.
 */
export const STUDIO_INKLUSIVE = STUDIO_INKLUSIVE_JE_PAKET.kein;

/** Cent als lesbarer Betrag, z.B. 125 → "1,25 €" */
export function centAlsEuro(cent: number): string {
  return (cent / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }) + ' €';
}
