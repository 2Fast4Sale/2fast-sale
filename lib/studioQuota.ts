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
 *
 * ── Jetzt 15, und in jedem Paket gleich ───────────────────────────────
 *
 * Die Staffelung 8/10/12/12 war fuer den Haendler nicht nachvollziehbar:
 * Er sieht bei jedem Fahrzeug eine andere Zahl und muss nachrechnen, was
 * noch frei ist. Fuenfzehn sind genug fuer jede Aussenansicht, die ein
 * Auto hat, und sie gelten ueberall — das ist ein Satz, den man sich
 * merken kann.
 *
 * Fuenfzehn kosten 15 x 0,1546 = 2,32 EUR brutto. Bei 7,50 EUR je
 * Inserat bleiben nach Stripe 4,75 EUR, beim kleinsten Paket (6,40 je
 * Inserat) noch 4,01 EUR.
 *
 * Wer mehr will, zahlt 14 Cent je weiteres Bild. Gewoehnliche Fotos
 * bleiben unbegrenzt bis zur Obergrenze von 60 und kosten nichts.
 */
export const STUDIO_INKLUSIVE_JE_PAKET: Record<'kein' | Paket['id'], number> = {
  kein: 15,
  s:    15,
  m:    15,
  l:    15,
};

/**
 * Preis je Studio-Bild über dem Kontingent, in Cent.
 *
 * ── Die Geschichte dieser Zahl, weil sie dreimal falsch war ──────────
 *
 * Vier Cent: begründet mit "ein Bild kostet rund 2,6 Cent". Der Einkauf
 * lag bei zehn — jedes Zusatzbild verlor sechs Cent.
 *
 * Zwölf Cent: gegen PhotoRoom gerechnet, kurz bevor Gemini die Bilder
 * machte. Deren Preis lag zwischen 6 und 13 Cent, im schlechtesten Fall
 * also wieder ein Minus.
 *
 * 25 Cent: deckte jeden Fall und verdiente mit. Zusammen mit den
 * Stufen (24/22/20 Cent) war es aber eine Tabelle, die niemand lesen
 * wollte, um ein paar Fotos mehr zu bekommen.
 *
 * ── Jetzt 14 Cent, flach ────────────────────────────────────────────
 *
 * Fabians Entscheidung vom 2. Oktober 2026: ein weiteres Bild kostet
 * 14 Cent. Eine Zahl, ein Satz, keine Stufen.
 *
 * Das liegt BEWUSST unter dem Einkauf von 15,5 Cent brutto (Google-
 * Rechnung September: 7,99 € netto plus 1,60 € Umsatzsteuer, kein
 * Vorsteuerabzug nach § 19 UStG). Jedes Zusatzbild kostet damit rund
 * 1,5 Cent — getragen wird das aus dem Grundpreis: Ein Inserat mit 40
 * Studio-Bildern bringt 7,50 + 25 x 0,14 = 11,00 € bei 6,25 € Einkauf.
 *
 * Die Grenze, ab der es sich selbst trägt, liegt bei 16 Cent. Wenn der
 * Bildpreis bei Google wieder steigt — zwischen Juli und September hat
 * er sich vervierfacht —, muss diese Zahl mitgehen. Dafür braucht es
 * keinen neuen Code: NEXT_PUBLIC_PREIS_EXTRA_BILD_CENT setzen.
 */
export const PREIS_EXTRA_BILD_CENT = Number(
  process.env.NEXT_PUBLIC_PREIS_EXTRA_BILD_CENT || process.env.PREIS_EXTRA_BILD_CENT || '14'
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
