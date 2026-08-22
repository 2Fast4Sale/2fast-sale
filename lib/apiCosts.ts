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
  // Belegt aus dem PhotoRoom API-Dashboard (Stand August 2026):
  // Basic 20 EUR fuer 1.000 Bilder = 0,02 EUR/Bild. Hier in USD hinterlegt,
  // weil die Umrechnung unten pauschal erfolgt. Bei groesseren Kontingenten
  // sinkt der Stueckpreis weiter — dann hier nachziehen.
  photoroom: 0.0217,
  fal:       0.03,
  pixelcut:  0.04,
  // Octopus Piranha soll die obigen Dienste spaeter ersetzen.
  // Preis eintragen, sobald der Vertrag steht.
  piranha:   0.00,
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
  | 'anthropic' | 'removebg' | 'photoroom' | 'fal' | 'pixelcut' | 'piranha'
  | 'dat';

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
  return Math.round(usd * USD_TO_EUR * MICROS);
}

/** Kosten eines Bildaufrufs in Mikro-Euro. */
export function imageCostMicros(service: CostService, calls = 1): number {
  const usd = (IMAGE_PRICES_USD_PER_CALL[service] ?? 0) * calls;
  return Math.round(usd * USD_TO_EUR * MICROS);
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
