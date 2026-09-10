/**
 * Was 2Fast4Sale kostet — alle Kosten an einer Stelle.
 *
 * Gegenstueck zu preismodell.ts. Dort steht, was hereinkommt; hier,
 * was hinausgeht. Beides getrennt zu fuehren war der Fehler, der die
 * Kalkulation zweimal gekippt hat: Erst war der PhotoRoom-Tarif um das
 * Fuenffache zu guenstig angesetzt, dann war die DAT-Abfrage als
 * enthaltene Leistung gerechnet, obwohl sie teurer ist als der
 * Rohertrag eines Inserats.
 *
 * ── Wie diese Datei zu lesen ist ───────────────────────────────────
 *
 * Jeder Posten traegt eine Quelle. Drei Arten:
 *
 *   'gemessen'  aus der Tabelle api_costs, also tatsaechlich bezahlt
 *   'liste'     Listenpreis des Anbieters, nachlesbar
 *   'offen'     noch nicht bekannt — Angebot einholen
 *
 * Ein Posten mit 'offen' und Betrag 0 ist KEIN Posten, der nichts
 * kostet. Er ist einer, dessen Preis noch fehlt. Wer damit rechnet,
 * rechnet sich reich.
 */

export type Quelle = 'gemessen' | 'liste' | 'offen';

export interface Posten {
  name: string;
  /** Betrag in Cent. */
  cent: number;
  quelle: Quelle;
  hinweis?: string;
}

/* ────────────────── Kosten je Inserat ────────────────── */

/**
 * Studio-Bilder.
 *
 * PhotoRoom Plus, 100 EUR fuer 1.000 Bilder im Monat. ACHTUNG: Das ist
 * ein Abo mit enthaltener Menge, kein Preis je Stueck. Die 10 Cent
 * gelten nur, wenn die 1.000 auch verbraucht werden — bei 30 Inseraten
 * zu je 12 Bildern sind es 360 Bilder, und dann kostet ein Bild
 * rechnerisch 28 Cent. Siehe bildpreisEffektiv().
 */
export const PHOTOROOM_ABO_CENT = 10000;
export const PHOTOROOM_BILDER_INKLUSIVE = 1000;

/** Was ein Bild bei dieser Monatsmenge wirklich kostet, in Cent. */
export function bildpreisEffektiv(bilderImMonat: number): number {
  if (bilderImMonat <= 0) return PHOTOROOM_ABO_CENT;
  const inAbo = Math.min(bilderImMonat, PHOTOROOM_BILDER_INKLUSIVE);
  const darueber = Math.max(0, bilderImMonat - PHOTOROOM_BILDER_INKLUSIVE);
  // Ueber dem Kontingent rechnet PhotoRoom zum selben Stueckpreis weiter.
  const gesamt = PHOTOROOM_ABO_CENT + darueber * (PHOTOROOM_ABO_CENT / PHOTOROOM_BILDER_INKLUSIVE);
  return gesamt / (inAbo + darueber);
}

/**
 * Erkennung und Beschreibung ueber Claude.
 *
 * Gemessen am 10.09.2026: 66 Aufrufe zu im Mittel 0,0180 EUR, bei etwa
 * drei Aufrufen je Inserat — Fahrzeugschein lesen, Ausstattung
 * erkennen, Beschreibung schreiben.
 */
export const LLM_JE_INSERAT_CENT = 6;

/**
 * VIN-Ausstattungsabfrage bei der DAT.
 *
 * Steht bewusst hier UND als Aufpreis in preismodell.ts: Der Haendler
 * zahlt sie gesondert, sie geht also nicht von der Marge ab. Der
 * Einkaufspreis ist noch nicht verhandelt — "ab 1,85 EUR" ist ein
 * Einstiegspreis, keine Zusage.
 */
export const DAT_JE_ABFRAGE_CENT = Number(process.env.PREIS_DAT_EUR || '0') * 100;

/* ────────────────── Feste Kosten im Monat ────────────────── */

/**
 * Die Liste, die man beim Rechnen vergisst.
 *
 * Bewusst vollstaendig, auch mit den Posten, deren Preis noch fehlt.
 * Ein fehlender Posten faellt niemandem auf; ein Posten mit 'offen'
 * und einer Null daneben schon.
 */
export const FESTKOSTEN: readonly Posten[] = [
  { name: 'Vercel (Hosting)',        cent: 2000, quelle: 'liste',
    hinweis: 'Pro-Tarif, 20 USD. Hobby waere kostenlos, ist aber fuer gewerbliche Nutzung nicht zulaessig.' },
  { name: 'Supabase (Datenbank)',    cent: 2500, quelle: 'liste',
    hinweis: 'Pro-Tarif. Der kostenlose pausiert nach einer Woche ohne Zugriff.' },
  { name: 'PhotoRoom Plus',          cent: PHOTOROOM_ABO_CENT, quelle: 'liste',
    hinweis: '1.000 Bilder enthalten.' },
  { name: 'Domain',                  cent: 125,  quelle: 'liste',
    hinweis: 'rund 15 EUR im Jahr.' },

  { name: 'Steuerberater',           cent: 0,    quelle: 'offen',
    hinweis: 'Monatliche Buchhaltung plus Jahresabschluss. Angebot einholen.' },
  { name: 'IT-Kanzlei (AGB, Datenschutz, AVV)', cent: 0, quelle: 'offen',
    hinweis: 'Einmalig, auf den Monat umgelegt. Ohne AVV nach Art. 28 DSGVO darf kein Haendler dir Kundendaten geben.' },
  { name: 'Betriebshaftpflicht',     cent: 0,    quelle: 'offen',
    hinweis: 'Vermoegensschaden-Haftpflicht. Ein falsches Inserat ist ein Sachmangel beim Haendler.' },
  { name: 'mobile.de Schnittstelle', cent: 0,    quelle: 'offen',
    hinweis: 'Konditionen noch nicht verhandelt (Stand September 2026).' },
  { name: 'AutoScout24 Schnittstelle', cent: 0,  quelle: 'offen',
    hinweis: 'Konditionen noch nicht verhandelt.' },
];

/** Stripe: 1,5 % plus 25 Cent je Zahlung innerhalb der EU. */
export function stripeGebuehrCent(betragCent: number): number {
  return Math.round(betragCent * 0.015 + 25);
}

/* ────────────────── Zusammenrechnen ────────────────── */

export interface Deckung {
  /** Variable Kosten je Inserat in Cent. */
  variabelCent: number;
  /** Feste Kosten im Monat in Cent, ohne die offenen Posten. */
  festCent: number;
  /** Wie viele Posten noch keinen Preis haben. */
  offenePosten: number;
  /** Rohertrag je Inserat nach variablen Kosten. */
  deckungsbeitragCent: number;
  /** Ab wie vielen Inseraten im Monat die Festkosten gedeckt sind. */
  schwelle: number;
}

/**
 * Die Frage, auf die es ankommt: Ab wann traegt es sich?
 *
 * `erloesJeInseratCent` haengt vom Paket ab — 350 ohne Paket, bei
 * Paket L rechnerisch 218. Siehe preismodell.ts.
 */
export function deckung(o: {
  erloesJeInseratCent: number;
  studioBilderJeInserat: number;
  inserateImMonat: number;
}): Deckung {
  const bilder = o.studioBilderJeInserat * o.inserateImMonat;
  const jeBild = bildpreisEffektiv(bilder);

  /*
   * Das PhotoRoom-Abo steckt bereits in jeBild — es hier zusaetzlich
   * als Festkosten zu zaehlen waere doppelt.
   */
  const variabel = Math.round(o.studioBilderJeInserat * jeBild) + LLM_JE_INSERAT_CENT;

  const fest = FESTKOSTEN
    .filter((p) => p.name !== 'PhotoRoom Plus')
    .reduce((s, p) => s + p.cent, 0);

  const db = o.erloesJeInseratCent - variabel;

  return {
    variabelCent: variabel,
    festCent: fest,
    offenePosten: FESTKOSTEN.filter((p) => p.quelle === 'offen').length,
    deckungsbeitragCent: db,
    schwelle: db > 0 ? Math.ceil(fest / db) : Infinity,
  };
}
