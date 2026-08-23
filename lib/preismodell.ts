/**
 * Das Preismodell — die einzige Stelle, an der Preise stehen.
 *
 * Vorher lagen sie an drei Orten: hart eingetragen auf der Startseite,
 * ein zweites Mal auf der Preisseite im Dashboard, und ein drittes Mal
 * als Betrag in der Abrechnung. Die drei sind auseinandergelaufen — die
 * Website bewarb noch Monats-Abos zu 99,49 €, während abgerechnet längst
 * pro Inserat wurde. Ein Händler, der das bemerkt, glaubt dir keine Zahl
 * mehr.
 *
 * Alle Beträge in Cent und netto. Händler sind vorsteuerabzugsberechtigt,
 * deshalb ist die Auszeichnung netto üblich — die Umsatzsteuer kommt auf
 * der Rechnung obendrauf. Wichtig: In Stripe muss `tax_behavior` dann auf
 * `exclusive` stehen. Steht es auf `inclusive`, zahlt der Händler den
 * beworbenen Betrag als Bruttopreis und die Steuer geht von deiner Marge
 * ab — bei 400 € sind das rund 64 € im Monat je Kunde.
 *
 * Der Mengenrabatt steckt ausschliesslich in den Paketen, nicht zusätzlich
 * in einer automatischen Staffel. Beides zusammen nimmt sich gegenseitig
 * die Wirkung: Sinkt der Preis ohnehin mit der Menge, spart ein Paket bei
 * 150 Inseraten nur noch rund 44 € statt 175 € — dafür bucht niemand ein
 * Paket, und du verschenkst den Rabatt, ohne eine Bindung dafür zu
 * bekommen.
 */

/** Preis je Inserat ohne Paket, in Cent. */
export const PREIS_PRO_INSERAT_CENT = 350;

/** Monatliche Grundgebühr ohne Paket, in Cent. Pakete enthalten sie bereits. */
export const GRUNDGEBUEHR_CENT = 5000;

export interface Paket {
  id: 's' | 'm' | 'l';
  name: string;
  preisCent: number;
  /** Enthaltene Inserate im Monat. */
  inserate: number;
}

/**
 * Die Pakete.
 *
 * Drei und nicht eines, weil ein einzelnes Paket bei 150 Inseraten den
 * Händler mit 40 Fahrzeugen im Monat durchs Raster fallen lässt — für
 * den lohnt sich das grosse Paket nie, und ohne Paket zahlt er den
 * vollen Einzelpreis.
 *
 * Über dem Kontingent läuft es zum normalen Einzelpreis weiter. Das ist
 * hier unproblematisch, weil das nächstgrössere Paket dann ohnehin
 * günstiger wird — siehe bestesAngebot().
 */
/**
 * Der Probelauf.
 *
 * 50 € Grundgebühr sind für jemanden, der das Werkzeug noch nie gesehen
 * hat, eine hohe Hürde — er soll erst einmal erleben, was aus seinem
 * Handyfoto wird. Fünf Euro sind niedrig genug, dass niemand lange
 * überlegt, und hoch genug, dass es nicht kostenlos ist.
 *
 * Bewusst nicht gratis, und das aus zwei Gründen. Ein Preis, und sei er
 * klein, verlangt eine Zahlungsmethode — und die ist die einzige Bremse
 * gegen Mehrfachkonten, die tatsächlich greift. Ausserdem probiert, wer
 * fünf Euro zahlt, das Werkzeug wirklich aus; wer nichts zahlt, meldet
 * sich an und schaut nie wieder rein.
 *
 * Zwei Inserate, weil eines nichts zeigt: Der Effekt der Studiofotos
 * wird erst sichtbar, wenn zwei Fahrzeuge nebeneinander denselben
 * Hintergrund haben.
 */
export const PROBE = {
  name: 'Probelauf',
  preisCent: 500,
  inserate: 2,
  /** Studio-Bilder je Inserat — wie ohne Paket. */
  studioBilder: 12,
} as const;

/**
 * Deckt der Probelauf seine Kosten?
 *
 * Zwei Inserate zu je rund 0,23 € gemessener API-Kosten, dazu die
 * Stripe-Gebühr auf eine Einzelzahlung. Der Rest ist Werbebudget —
 * bewusst, aber es soll kein Minus sein.
 */
export function probeDeckung(kostenJeInseratCent = 23): number {
  const stripe = Math.round(PROBE.preisCent * 0.015 + 25);
  return PROBE.preisCent - PROBE.inserate * kostenJeInseratCent - stripe;
}

export const PAKETE: readonly Paket[] = [
  { id: 's', name: 'Paket S', preisCent: 15000,  inserate: 50 },
  { id: 'm', name: 'Paket M', preisCent: 40000,  inserate: 150 },
  { id: 'l', name: 'Paket L', preisCent: 120000, inserate: 550 },
];

export { STUDIO_INKLUSIVE, PREIS_EXTRA_BILD_CENT, studioInklusive } from './studioQuota';
import { PREIS_EXTRA_BILD_CENT, studioInklusive } from './studioQuota';

/* ────────────────────────── Berechnung ────────────────────────── */

/**
 * Kosten für Studio-Bilder über dem Kontingent, je Inserat gerechnet.
 *
 * Das Kontingent gilt pro Inserat, nicht pro Monat — wer bei einem
 * Fahrzeug sparsam war, kann das nicht auf das nächste übertragen.
 */
export function studioExtraCent(bilderProInserat: number[], paketId?: Paket['id'] | null): number {
  const kontingent = studioInklusive(paketId);
  return bilderProInserat.reduce((summe, n) => {
    const extra = Math.max(0, Math.round(n) - kontingent);
    return summe + extra * PREIS_EXTRA_BILD_CENT;
  }, 0);
}

export interface Monatsposten {
  bezeichnung: string;
  betragCent: number;
}

export interface Monatsrechnung {
  posten: Monatsposten[];
  summeCent: number;
}

/**
 * Stellt die Monatsrechnung zusammen.
 *
 * `paketId` weglassen heisst: ohne Paket, also Grundgebühr plus
 * Einzelpreis. Der Aufrufer entscheidet das nicht selbst — es hängt
 * daran, was der Händler gebucht hat.
 */
export function monatsrechnung(o: {
  inserate: number;
  /** Studio-Bilder je Inserat, für die Kontingentrechnung. */
  studioBilder?: number[];
  paketId?: Paket['id'] | null;
}): Monatsrechnung {
  const inserate = Math.max(0, Math.round(o.inserate));
  const paket = o.paketId ? PAKETE.find(p => p.id === o.paketId) : undefined;
  const posten: Monatsposten[] = [];

  if (paket) {
    posten.push({
      bezeichnung: `${paket.name} (${paket.inserate} Inserate enthalten)`,
      betragCent: paket.preisCent,
    });
    const darueber = Math.max(0, inserate - paket.inserate);
    if (darueber > 0) {
      posten.push({
        bezeichnung: `${darueber} Inserate über dem Kontingent`,
        betragCent: darueber * PREIS_PRO_INSERAT_CENT,
      });
    }
  } else {
    posten.push({ bezeichnung: 'Grundgebühr', betragCent: GRUNDGEBUEHR_CENT });
    if (inserate > 0) {
      posten.push({
        bezeichnung: `${inserate} Inserate`,
        betragCent: inserate * PREIS_PRO_INSERAT_CENT,
      });
    }
  }

  const extra = studioExtraCent(o.studioBilder ?? [], o.paketId);
  if (extra > 0) {
    posten.push({ bezeichnung: 'Zusätzliche Studio-Bilder', betragCent: extra });
  }

  return { posten, summeCent: posten.reduce((s, p) => s + p.betragCent, 0) };
}

/**
 * Welches Angebot ist bei dieser Menge das günstigste?
 *
 * Wird im Dashboard gebraucht, um dem Händler zu sagen, dass er mit
 * einem Paket besser fährt. Die Zahl selbst auszurechnen ist seine
 * Aufgabe nicht — und wenn er merkt, dass er monatelang zu viel gezahlt
 * hat, weil ihn niemand darauf hingewiesen hat, ist er weg.
 */
export function bestesAngebot(inserate: number): { paketId: Paket['id'] | null; summeCent: number } {
  const varianten: { paketId: Paket['id'] | null }[] = [
    { paketId: null },
    ...PAKETE.map(p => ({ paketId: p.id })),
  ];

  return varianten
    .map(v => ({ ...v, summeCent: monatsrechnung({ inserate, paketId: v.paketId }).summeCent }))
    .reduce((beste, v) => (v.summeCent < beste.summeCent ? v : beste));
}

/** Ab wie vielen Inseraten sich dieses Paket erstmals lohnt. */
export function paketLohntAb(id: Paket['id']): number {
  for (let n = 0; n <= 5000; n++) {
    if (bestesAngebot(n).paketId === id) return n;
  }
  return Infinity;
}

const EURO = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 40000 → "400,00" */
export function euro(cent: number): string {
  return EURO.format(cent / 100);
}
