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

/**
 * Preis je Inserat ohne Paket, in Cent.
 *
 * 7,50 EUR mit 15 Studio-Bildern — nicht 10 EUR mit 40.
 *
 * Die Wahl lag zwischen beidem. Gerechnet mit den gemessenen 15 Cent
 * brutto je Studio-Bild:
 *
 *   10,00 EUR, 40 Bilder → 6,18 Bilder + 0,07 Text + 0,40 Stripe = 3,35 uebrig
 *    7,50 EUR, 15 Bilder → 2,32 Bilder + 0,07 Text + 0,36 Stripe = 4,75 uebrig
 *
 * Der niedrigere Preis bringt also MEHR, und das ist kein Rechentrick:
 * Vierzig Studio-Bilder gibt es bei einem Auto gar nicht. Ein Fahrzeug
 * hat zehn bis fuenfzehn sinnvolle Aussenansichten; Cockpit, Tacho,
 * Motorraum, Serviceheft und Reifenprofil gehoeren NICHT vor einen
 * Studio-Hintergrund — dort sieht er falsch aus. Vierzig Bilder zu
 * versprechen hiesse, fuer Ansichten zu zahlen, die kein Haendler
 * braucht.
 *
 * Was der Haendler stattdessen bekommt: 15 Studio-Bilder und dazu
 * beliebig viele gewoehnliche Fotos bis zur Obergrenze von 60 (so viele
 * nimmt mobile.de). Die kosten nichts, weil an ihnen nichts gerechnet
 * wird. Ein vollstaendiges Inserat mit 35 bis 40 Fotos ist damit
 * drin — nur eben nicht vierzig Mal Studio.
 *
 * Wer wirklich mehr Studio-Bilder will, bekommt sie fuer 14 Cent je Bild
 * (PREIS_EXTRA_BILD_CENT).
 */
export const PREIS_PRO_INSERAT_CENT = 750;

/**
 * Umsatzsteuersatz auf unseren Rechnungen, in Prozent.
 *
 * NULL, und das ist kein Versehen: Das Impressum nennt die
 * Kleinunternehmerregelung nach § 19 UStG. Wer darunter faellt, darf
 * keine Umsatzsteuer ausweisen — tut er es doch, schuldet er sie dem
 * Finanzamt trotzdem (§ 14c Abs. 2 UStG), obwohl er sie nie eingenommen
 * hat.
 *
 * Die erzeugten Rechnungen wiesen bis hierher 19 % aus, waehrend die
 * Website "keine Umsatzsteuer" sagte. Eine der beiden Angaben war immer
 * falsch. Ab der Regelbesteuerung hier auf 19 stellen — und dann auch
 * den Hinweis auf der Preisseite aendern.
 */
export const STEUERSATZ_PROZENT = 0;

/** Pflichthinweis auf jeder Rechnung, solange § 19 UStG gilt. */
export const STEUER_HINWEIS =
  'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).';

/** Monatliche Grundgebühr ohne Paket, in Cent. Pakete enthalten sie bereits. */
export const GRUNDGEBUEHR_CENT = 5000;

/**
 * Aufpreis für die VIN-Ausstattungsabfrage, je Inserat, in Cent.
 *
 * Bewusst ein Aufpreis und keine enthaltene Leistung. Der Grund ist eine
 * Rechnung, die ohne diesen Aufpreis nicht aufgeht:
 *
 * Die DAT verlangt laut ihrer eigenen Preisseite "ab 1,85 Euro zzgl.
 * MwSt. pro Abruf". Bei Paket L bringt ein Inserat 2,18 € ein; nach
 * rund 0,26 € sonstiger Kosten blieben sieben Cent. Als
 * Kleinunternehmer, der die Vorsteuer nicht zieht, kostet derselbe
 * Abruf 2,20 € — dann ist Paket L mit jedem Inserat defizitaer.
 *
 * Als Aufpreis kann das nicht passieren: Was die Abfrage kostet, wird
 * durchgereicht, unabhaengig vom gebuchten Paket und unabhaengig von
 * der Besteuerungsform. Und der Haendler entscheidet selbst — beim
 * eigenen Vorfuehrwagen kreuzt er die Ausstattung an, beim
 * eingetauschten Fremdfabrikat nimmt er die Abfrage.
 *
 * Der Betrag ist vorlaeufig. Der Einkaufspreis ist noch nicht
 * verhandelt ("ab" ist ein Einstiegspreis, kein zugesagter), deshalb
 * steht er in PREIS_DAT_EUR und nicht hier. Vor dem Livegang gegen
 * vinAufpreisDeckung() pruefen.
 */
export const AUFPREIS_VIN_CENT = 290;

/**
 * Was bleibt vom Aufpreis nach dem Einkauf uebrig, in Cent?
 *
 * `datPreisEur` ist der Nettopreis je Abruf. `vorsteuerabzug` false
 * rechnet die Umsatzsteuer als echte Kosten — so liegt der Fall beim
 * Kleinunternehmer nach § 19 UStG.
 *
 * Negativ heisst: Der Aufpreis deckt den Einkauf nicht. Dann ist nicht
 * die Abfrage das Problem, sondern der Aufpreis zu niedrig.
 */
export function vinAufpreisDeckung(datPreisEur: number, vorsteuerabzug = true): number {
  const einkaufCent = Math.round(datPreisEur * 100 * (vorsteuerabzug ? 1 : 1.19));
  return AUFPREIS_VIN_CENT - einkaufCent;
}

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
 * Was ein fertiges Studio-Foto kostet, in Cent — brutto.
 *
 * ── Exakt gemessen am 2. Oktober 2026 ───────────────────────────────
 *
 * EIN Aufruf von gemini-3.1-flash-image meldet in usageMetadata:
 * 537 Tokens Eingabe (die zwei Bilder sind 516 davon), 1416 Tokens
 * Ausgabe, darunter 1120 für das Bild selbst in 1K. Zum Listenpreis
 * (Eingabe 0,50 USD je 1M, Bildausgabe 60,00 USD je 1M) sind das
 * 0,085 USD = 7,8 Cent netto = **9,4 Cent brutto**. Die Preisliste
 * nennt für ein 1K-Bild 0,067 USD, das ist derselbe Wert ohne die
 * Text-Tokens der Antwort.
 *
 * Ein FERTIGES Foto braucht aber oft zwei Aufrufe: einen zweiten
 * Anlauf, wenn die Ähnlichkeitsprüfung das erste Ergebnis verwirft,
 * und den Verfeinerungslauf für Scheiben und Spiegelungen. Deshalb
 * stehen hier 15 Cent und nicht 9,4 — das deckt den normalen Fall mit
 * zwei Aufrufen.
 *
 * Das erklärt auch die Google-Rechnung für September: 9,59 € brutto
 * bei 25 Fotos, die über die Website liefen, plus meinen Testläufen
 * über die Skripte. Pro Foto rund zwei Bilder.
 *
 * Die Umsatzsteuer zählt mit, weil als Kleinunternehmer nach § 19 UStG
 * kein Vorsteuerabzug möglich ist.
 *
 * Der Listenpreis je AUFRUF steht in lib/apiCosts.ts (0,067 USD plus
 * UST_FAKTOR). Hier liegt der Wert je FOTO noch einmal, weil apiCosts
 * den Supabase-Client mitbringt und preismodell in Seiten im Browser
 * benutzt wird.
 */
export const KOSTEN_STUDIO_BILD_CENT = 15;

/**
 * Text und Erkennung je Inserat, in Cent — brutto.
 *
 * Gemessen über api_costs: 114 Claude-Aufrufe für 1,56 € netto, also
 * rund 1,4 Cent je Aufruf. Ein Inserat braucht vier bis fünf
 * (Fahrzeugschein, Ausstattung, Titel, Beschreibung) — macht 6 Cent
 * netto, mit Steuer gerundet 7.
 */
export const KOSTEN_TEXT_JE_INSERAT_CENT = 7;

/**
 * Was ein Inserat an Einkauf kostet, in Cent.
 *
 * Die Zahl der Studio-Bilder ist der Haupttreiber: acht Bilder ohne
 * Paket sind 1,20 €, zwölf im Probelauf 1,80 €. Deshalb steht sie als
 * Parameter da und nicht als Annahme im Text.
 */
export function kostenJeInseratCent(studioBilder = 8): number {
  return Math.round(studioBilder * KOSTEN_STUDIO_BILD_CENT + KOSTEN_TEXT_JE_INSERAT_CENT);
}

/**
 * Deckt der Probelauf seine Kosten?
 *
 * Hier stand als Vorgabe 23 Cent je Inserat. Das war die Rechnung aus
 * der Zeit, in der ein Studio-Bild zwei Cent kostete — es kostet fünfzehn.
 * Zwei Inserate mit je zwölf Bildern sind also rund 3,74 €, nicht 46
 * Cent: Die Funktion meldete einen Überschuss von 4,21 €, wo in
 * Wahrheit knapp 90 Cent übrig bleiben. Der Rest ist Werbebudget —
 * bewusst, aber es soll kein Minus sein.
 */
export function probeDeckung(kostenJeInserat = kostenJeInseratCent(PROBE.studioBilder)): number {
  const stripe = Math.round(PROBE.preisCent * 0.015 + 25);
  return PROBE.preisCent - PROBE.inserate * kostenJeInserat - stripe;
}

/*
 * Die Pakete wandern mit dem Einzelpreis mit.
 *
 * Sie waren gegen 3,50 EUR gerechnet und haetten bei 10 EUR einen
 * Rabatt von ueber 70 Prozent bedeutet — das verschenkt Geld, ohne dass
 * jemand dafuer etwas zusagt. Der Abstand zum Einzelpreis bleibt
 * derselbe wie vorher: rund 15, 25 und 38 Prozent.
 */
export const PAKETE: readonly Paket[] = [
  { id: 's', name: 'Paket S', preisCent: 32000,  inserate: 50 },   /* 6,40 je Inserat */
  { id: 'm', name: 'Paket M', preisCent: 84500,  inserate: 150 },  /* 5,63 je Inserat */
  { id: 'l', name: 'Paket L', preisCent: 255000, inserate: 550 },  /* 4,64 je Inserat */
];

/*
 * Hier standen BILDPAKETE: Stufen von +10, +25 und +45 Bildern zu 24,
 * 22 und 20 Cent je Bild, mit einer Tabelle auf jeder Paketkarte.
 *
 * Weg, weil der Einzelpreis auf 14 Cent gesenkt wurde. Jede Stufe waere
 * damit teurer als die Bilder, die sie ersetzt — eine Tabelle, die nur
 * noch zeigt, dass man sie nicht nehmen soll. Ein Preis, ein Satz:
 * fuenfzehn Bilder enthalten, jedes weitere 14 Cent.
 *
 * Wenn Stufen wiederkommen sollen, muessen sie UNTER dem Einzelpreis
 * liegen und ueber den Kosten von 15,5 Cent — bei 14 Cent Einzelpreis
 * gibt es diesen Bereich nicht.
 */

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
    return summe + studioZusatzCent(extra);
  }, 0);
}

/**
 * Was zusätzliche Studio-Bilder in EINEM Inserat kosten, in Cent.
 *
 * Anzahl mal Einzelpreis — seit der Einzelpreis bei 14 Cent liegt, gibt es
 * keine Stufen mehr, die darunter liegen könnten (siehe den Hinweis bei
 * den Paketen). Die Funktion bleibt als eine Stelle, an der dieser Preis
 * gerechnet wird: Anzeige in Schritt 2 und Rechnung in usageBilling
 * benutzen sie beide.
 */
export function studioZusatzCent(zusatzBilder: number): number {
  return Math.max(0, Math.round(zusatzBilder)) * PREIS_EXTRA_BILD_CENT;
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
  /**
   * Wie viele Inserate haben die VIN-Ausstattungsabfrage genutzt?
   *
   * Nicht jedes Inserat — das ist der Punkt. Wer die Ausstattung selbst
   * ankreuzt, zahlt den Aufpreis nicht.
   */
  vinAbfragen?: number;
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

  /*
   * Der Aufpreis ist in jedem Paket gleich hoch und nie im Kontingent
   * enthalten. Genau deshalb verzerrt er bestesAngebot() nicht: Er
   * kommt auf jede Variante gleich obendrauf und kann die Reihenfolge
   * nicht drehen. Waere er im Kontingent, muesste er dort mitgerechnet
   * werden — und ein Paket koennte sich nur deshalb lohnen, weil der
   * Haendler Abfragen nutzt, die er gar nicht braucht.
   */
  const vin = Math.max(0, Math.round(o.vinAbfragen ?? 0));
  if (vin > 0) {
    posten.push({
      bezeichnung: `${vin} × VIN-Ausstattungsabfrage`,
      betragCent: vin * AUFPREIS_VIN_CENT,
    });
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
