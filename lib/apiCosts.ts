/**
 * Kostenerfassung pro API-Aufruf.
 *
 * Zweck: Beantwortet die Frage "was kostet mich ein Inserat wirklich" und
 * damit "verdiene ich an einem Haendler oder zahle ich drauf".
 *
 * ACHTUNG — die Preise unten sind SCHAETZUNGEN nach Listenpreisen.
 * Deine tatsaechlichen Kosten haengen von Vertrag, Volumenrabatt und
 * Wechselkurs ab. Gleiche sie mit deinen echten Rechnungen ab und passe
 * die Konstanten an, sonst rechnest du mit falschen Margen.
 */

import { createClient } from '@supabase/supabase-js';

/** Kosten werden in Mikro-Euro gespeichert — Integer statt Float. */
const MICROS = 1_000_000;

/** USD → EUR. Bei Bedarf anpassen. */
const USD_TO_EUR = 0.92;

/**
 * Umsatzsteuer auf die Lieferantenrechnungen.
 *
 * Grund aus der Google-Rechnung fuer September 2026: 7,99 EUR Google
 * Cloud, darauf 1,60 EUR Umsatzsteuer — bezahlt wurden also 9,59 EUR,
 * zwanzig Prozent mehr als der Listenpreis.
 *
 * Als Kleinunternehmer nach § 19 UStG kann ich die Vorsteuer NICHT
 * abziehen. Die Steuer ist damit echter Aufwand und gehoert in jede
 * Kostenrechnung. Alle Listenpreise unten sind netto; dieser Faktor
 * macht daraus, was vom Konto geht.
 *
 * Pruefen, wenn sich der Satz aendert: Der Wert stammt aus der
 * PDF-Rechnung, nicht aus einer Annahme ueber den Steuersatz.
 */
const UST_FAKTOR = 1.20;

/**
 * LLM-Preise pro 1 Mio Tokens in USD (Listenpreis Anthropic).
 * Quelle: Anthropic Preisliste — bei Modellwechsel hier mitpflegen.
 */
const LLM_PRICES_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-4-8':  { input: 5.00,  output: 25.00 },
  'claude-opus-4-7':  { input: 5.00,  output: 25.00 },
  'claude-sonnet-4-6':{ input: 3.00,  output: 15.00 },
  'claude-haiku-4-5': { input: 1.00,  output:  5.00 },
};

/**
 * Bildverarbeitung: Preis pro Bild in USD.
 * SCHAETZUNGEN — remove.bg ist deutlich teurer als die Alternativen,
 * das ist bei der Anbieterwahl der groesste Hebel.
 */
const IMAGE_PRICES_USD_PER_CALL: Record<string, number> = {
  removebg:  0.20,
  // photoroom steht in IMAGE_PRICES_EUR_PER_CALL — es wird in Euro abgerechnet.
  fal:       0.03,
  pixelcut:  0.04,
  // Octopus Piranha soll die obigen Dienste spaeter ersetzen.
  // Preis eintragen, sobald der Vertrag steht.
  piranha:   0.00,
  /*
   * GEMESSEN am 2. Oktober 2026, nicht geschaetzt — und diesmal am
   * einzelnen Aufruf, nicht an der Monatsrechnung geteilt durch eine
   * geschaetzte Bildzahl.
   *
   * Ein echter Aufruf von gemini-3.1-flash-image mit Fahrzeug- und
   * Raumbild meldete in usageMetadata zurueck:
   *
   *   Eingabe   537 Tokens (davon 516 die zwei Bilder)
   *   Ausgabe  1416 Tokens (davon 1120 das Bild selbst, 1K)
   *
   * Preisliste (ai.google.dev/gemini-api/docs/pricing): Eingabe 0,50
   * USD je 1M, Bildausgabe 60,00 USD je 1M. Ein Bild in 1K sind 1120
   * Tokens und damit 0,067 USD — genau der Wert, den die Preisliste als
   * "equivalent to $0.067 per image" nennt. Mit allen Ausgabe-Tokens
   * gerechnet 0,085 USD.
   *
   * Hier stehen 0,067: der Preis JE ERZEUGTES BILD. Ein fertiges Foto
   * braucht oft zwei (zweiter Anlauf nach einer verworfenen Antwort,
   * Verfeinerungslauf) — deshalb bucht die Route die gezaehlte Zahl
   * ueber geminiErzeugteBilder(), nicht pauschal eins.
   *
   * Vorher standen hier 0,14 "gemessen" — das war die Monatsrechnung
   * geteilt durch die vermuteten Bilder und enthielt damit die
   * Doppelaufrufe. Beides zusammen haette doppelt gezaehlt.
   */
  gemini_bild: 0.067,
};

/**
 * Bilddienste, die in Euro abrechnen.
 *
 * PhotoRoom stellt in Euro; der Umweg ueber den Dollar wuerde bei
 * USD_TO_EUR=0.92 aus 0,10 EUR glatte 9,2 Cent machen — ein Fehler von
 * acht Prozent, eingebaut ohne Not. Dieselbe Ueberlegung steht schon
 * bei den VIN-Preisen.
 *
 * PhotoRoom Plus, Stand September 2026: 100 EUR fuer 1.000 Bilder im
 * Monat = 0,10 EUR je Bild.
 *
 * Hier stand vorher 0,0217 in der Dollar-Tabelle, begruendet mit "Basic
 * 20 EUR fuer 1.000 Bilder". Das war der falsche Tarif: Basic ist die
 * Remove Background API und kann weder AI Backgrounds noch AI Shadows —
 * in der Vergleichstabelle steht bei beiden ein Kreuz. Das Studio setzt
 * shadow.mode=ai.soft und einen Hintergrund, braucht also Plus.
 *
 * Der Fehler war nicht harmlos: Die Kontingente in studioQuota.ts waren
 * gegen 2,17 Cent gerechnet. Bei Paket L standen 30 Bilder zu 0,10 EUR
 * gegen 2,18 EUR Erloes — jedes Inserat ein Verlust.
 */
const IMAGE_PRICES_EUR_PER_CALL: Record<string, number> = {
  photoroom: 0.10,
  /*
   * Nur Freistellen, ohne KI-Hintergrund und KI-Schatten: PhotoRoom
   * Basic, 20 EUR fuer 1.000 Bilder.
   *
   * Eigener Eintrag und nicht derselbe wie oben, weil es sonst keine
   * ehrliche Kostenrechnung gaebe: Seit Schritt 2 den eigenen
   * Kompositor benutzt, wird nur noch freigestellt — mit dem
   * Plus-Preis gebucht waere jedes Inserat funfmal zu teuer
   * ausgewiesen.
   */
  photoroom_basic: 0.02,
};

/**
 * Fahrzeugdaten aus der Fahrgestellnummer: Preis pro Abfrage in EUR.
 *
 * Aktuell gibt es keinen Anbieter. Vincario und Vindecoder wurden
 * entfernt — sie lieferten keine belastbaren Herstellerdaten, und ohne
 * belastbare Daten ist eine Ausstattungsliste geraten. Eine geratene
 * Sitzheizung im Inserat ist ein Sachmangel nach § 434 BGB.
 *
 * DAT soll sie ersetzen. Der Preis ist noch nicht verhandelt und steht
 * deshalb in einer Umgebungsvariablen.
 */
const VIN_PRICES_EUR_PER_CALL: Record<string, number> = {
  // DAT: Preis eintragen, sobald er verhandelt ist. Wichtig fuer die
  // Kalkulation: Ab etwa 1,92 EUR je Abfrage traegt sich Paket L nicht
  // mehr, ab 2,40 EUR auch Paket M nicht.
  dat: Number(process.env.PREIS_DAT_EUR || '0'),
};

export type CostService =
  | 'anthropic' | 'removebg' | 'photoroom' | 'photoroom_basic' | 'fal' | 'pixelcut' | 'piranha'
  | 'gemini_bild' | 'dat';

/**
 * Kosten einer VIN-Abfrage in Mikro-Euro.
 *
 * Anders als bei Bildern und LLM-Aufrufen sind die Preise hier schon in
 * Euro hinterlegt — sie werden in Euro abgerechnet, eine Umrechnung
 * ueber den Dollar waere eine zusaetzliche Fehlerquelle.
 */
export function vinCostMicros(service: CostService, calls = 1): number {
  return Math.round((VIN_PRICES_EUR_PER_CALL[service] ?? 0) * calls * MICROS);
}

/** Kosten eines LLM-Aufrufs in Mikro-Euro. */
export function llmCostMicros(model: string, inputTokens: number, outputTokens: number): number {
  const p = LLM_PRICES_USD_PER_MTOK[model];
  if (!p) return 0;
  const usd = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
  return Math.round(usd * USD_TO_EUR * UST_FAKTOR * MICROS);
}

/** Kosten eines Bildaufrufs in Mikro-Euro — brutto, so wie bezahlt. */
export function imageCostMicros(service: CostService, calls = 1): number {
  const eur = IMAGE_PRICES_EUR_PER_CALL[service];
  if (eur !== undefined) return Math.round(eur * calls * UST_FAKTOR * MICROS);
  const usd = (IMAGE_PRICES_USD_PER_CALL[service] ?? 0) * calls;
  return Math.round(usd * USD_TO_EUR * UST_FAKTOR * MICROS);
}

interface LogInput {
  userId?: string | null;
  vehicleId?: string | null;
  /**
   * Entwurfs-Nummer des Formulars.
   *
   * Zum Zeitpunkt dieser Aufrufe existiert das Fahrzeug noch nicht — es
   * entsteht erst beim Speichern in Schritt 4. Ohne diese Nummer bleibt
   * der Posten unzuordenbar, und genau das war er: bei allen bisherigen
   * Eintraegen ist vehicle_id leer.
   */
  draftId?: string | null;
  service: CostService;
  operation: string;
  unitsIn?: number;
  unitsOut?: number;
  costMicros: number;
  meta?: Record<string, unknown>;
}

/**
 * Schreibt einen Kosteneintrag. Bewusst "fire and forget":
 * Ein Fehler beim Logging darf NIEMALS den eigentlichen Request kippen —
 * der Nutzer soll sein Inserat bekommen, auch wenn die Buchhaltung klemmt.
 */
export async function logApiCost(input: LogInput): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
    await supabase.from('api_costs').insert({
      user_id:     input.userId     ?? null,
      vehicle_id:  input.vehicleId  ?? null,
      draft_id:    input.draftId    ?? null,
      service:     input.service,
      operation:   input.operation,
      units_in:    input.unitsIn    ?? 0,
      units_out:   input.unitsOut   ?? 0,
      cost_micros: input.costMicros,
      meta:        input.meta       ?? {},
    });
  } catch (err) {
    console.error('[apiCosts] Logging fehlgeschlagen:', err);
  }
}

/**
 * Bequemlichkeit fuer Claude-Aufrufe: nimmt das usage-Objekt der Antwort
 * und rechnet daraus die echten Kosten — keine Schaetzung der Tokenzahl.
 */
export async function logLlmCost(args: {
  userId?: string | null;
  vehicleId?: string | null;
  draftId?: string | null;
  operation: string;
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number } | null;
}): Promise<void> {
  const inTok  = args.usage?.input_tokens  ?? 0;
  const outTok = args.usage?.output_tokens ?? 0;
  await logApiCost({
    userId:     args.userId,
    vehicleId:  args.vehicleId,
    draftId:    args.draftId,
    service:    'anthropic',
    operation:  args.operation,
    unitsIn:    inTok,
    unitsOut:   outTok,
    costMicros: llmCostMicros(args.model, inTok, outTok),
    meta:       { model: args.model },
  });
}

/**
 * User-ID des aktuellen Requests, oder null.
 * Dynamischer Import, damit next/headers nicht in Kontexte gezogen wird,
 * die es nicht brauchen.
 */
export async function currentUserId(): Promise<string | null> {
  try {
    const { createClient } = await import('./supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** Mikro-Euro als lesbarer Betrag, z.B. 12345 → "0,0123 €" */
export function formatMicros(micros: number, digits = 4): string {
  return (micros / MICROS).toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }) + ' €';
}

/** Mikro-Euro als Euro-Zahl (fuer Summen und Diagramme). */
export function microsToEur(micros: number): number {
  return micros / MICROS;
}
