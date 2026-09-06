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
 * Die Zahlen standen frueher bei 12/15/20/30. Sie waren gegen einen
 * angenommenen Einkaufspreis von 2,17 Cent je Bild gerechnet — und der
 * war falsch: Er stammte vom Basic-Tarif, der nur freistellen kann.
 * Studio-Bilder brauchen AI Backgrounds und AI Shadows, das ist Plus,
 * und der kostet bei 1.000 Bildern im Monat 10 Cent je Bild.
 *
 * Damit kostete Paket L 30 x 0,10 = 3,00 EUR an Fotos bei 2,18 EUR
 * Erloes je Inserat. Jedes einzelne Inserat war ein Verlustgeschaeft.
 *
 * Die neuen Zahlen kommen nicht aus der Marge, sondern aus dem Auto:
 * Ein Fahrzeug hat etwa acht sinnvolle Aussenansichten — vorne, hinten,
 * beide Dreiviertel, beide Seiten, dazu Front und Heck gerade. Darueber
 * wiederholt man sich. Innenraum, Motorraum, Felgen und Serviceheft
 * laufen ohnehin nicht durchs Studio und kosten nichts.
 *
 * Deshalb endet die Staffelung bei zwoelf: Mehr Studio-Bilder zu
 * verschenken hiesse, fuer Ansichten zu zahlen, die es gar nicht gibt.
 * Der Vorteil eines groesseren Pakets liegt im Preis je Inserat, nicht
 * in mehr Fotos vom selben Auto.
 */
export const STUDIO_INKLUSIVE_JE_PAKET: Record<'kein' | Paket['id'], number> = {
  kein: 8,
  s:    10,
  m:    12,
  l:    12,
};

/**
 * Preis je Studio-Bild über dem Kontingent, in Cent.
 *
 * Zwölf Cent, nicht die früheren vier. Die vier waren mit "ein Bild
 * kostet rund 2,6 Cent" begründet — bei den tatsächlichen 10 Cent
 * Einkauf verlor jedes Zusatzbild sechs Cent, ausgerechnet bei einer
 * Leistung, die extra berechnet wird.
 *
 * Der Grundsatz bleibt derselbe: Zusatzbilder sollen sich tragen und
 * nichts verdienen. Zehn Cent Einkauf plus zwei für Speicher und
 * Auslieferung.
 */
export const PREIS_EXTRA_BILD_CENT = Number(
  process.env.NEXT_PUBLIC_PREIS_EXTRA_BILD_CENT || process.env.PREIS_EXTRA_BILD_CENT || '12'
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
