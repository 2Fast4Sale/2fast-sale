/**
 * Verbrauchssperre fuer echte PhotoRoom-Aufrufe.
 *
 * PhotoRoom gibt im Probebetrieb zehn Bilder im Monat ohne Wasserzeichen.
 * Zehn ist eine Zahl, die ein einziger unbedachter Durchlauf aufbraucht:
 * Ein Haendler laedt zwoelf Fotos hoch, drueckt einmal auf Studio, und das
 * Kontingent ist weg — nachbestellen geht nicht, es kommt erst im naechsten
 * Monat wieder.
 *
 * Deshalb zaehlt diese Sperre mit und riegelt vorher ab.
 *
 * Gezaehlt wird in der Datenbank, nicht im Arbeitsspeicher. Auf Vercel
 * laeuft jede Anfrage moeglicherweise in einer neuen Instanz; ein Zaehler
 * im Prozess waere nach dem naechsten Kaltstart wieder bei null und die
 * Sperre damit wertlos.
 *
 * Sie gilt NUR fuer den Produktivbetrieb. Im Sandbox-Modus sind tausend
 * Aufrufe im Monat frei — die zu bremsen waere sinnlos.
 */

import { createClient } from '@supabase/supabase-js';

/** Erster Tag des laufenden Monats, 00:00 Uhr Ortszeit, als ISO-Zeitstempel. */
function monatsAnfangIso(): string {
  const j = new Date();
  return new Date(j.getFullYear(), j.getMonth(), 1).toISOString();
}

/** Kennzeichnet einen echten, kostenpflichtigen Studio-Aufruf. */
export const OPERATION_ECHT = 'studio-produktiv';

/**
 * Wie viele echte Aufrufe im Monat erlaubt sind.
 *
 * Vorgabe zehn — das Probekontingent. Wer einen bezahlten Tarif hat,
 * setzt PHOTOROOM_LIMIT_MONAT hoch oder auf 0 fuer "keine Sperre".
 */
export function limitProMonat(): number {
  const roh = process.env.PHOTOROOM_LIMIT_MONAT;
  if (roh === undefined || roh === '') return 10;
  const n = Number(roh);
  return Number.isFinite(n) && n >= 0 ? n : 10;
}

/** Laeuft die Route gerade gegen die kostenlose Sandbox? */
export function istSandbox(): boolean {
  return process.env.PHOTOROOM_SANDBOX === 'true';
}

export interface Budget {
  /** Bereits verbrauchte echte Aufrufe in diesem Kalendermonat. */
  verbraucht: number;
  limit: number;
  /** Wie viele noch gehen. Nie negativ. */
  uebrig: number;
  erschoepft: boolean;
}

/**
 * Wie viele echte Aufrufe sind in diesem Kalendermonat schon gelaufen?
 *
 * Der Monat beginnt am Ersten um 00:00 Uhr Ortszeit. PhotoRoom setzt sein
 * Kontingent nach eigenem Rhythmus zurueck, der hier nicht bekannt ist —
 * der Monatsanfang ist die vorsichtigere Annahme, weil er frueher
 * zurueckspringt als spaeter und die Sperre damit eher zu streng als zu
 * locker ist.
 *
 * Faellt die Zaehlung aus, gilt das Kontingent als verbraucht. Bei einer
 * Sperre, die Geld schuetzt, ist Blockieren der richtige Fehlerfall —
 * durchlassen hiesse im Zweifel bezahlen.
 */
export async function budget(): Promise<Budget> {
  const limit = limitProMonat();
  if (limit === 0) {
    return { verbraucht: 0, limit: 0, uebrig: Infinity, erschoepft: false };
  }

  const fehlgeschlagen: Budget = {
    verbraucht: limit, limit, uebrig: 0, erschoepft: true,
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fehlgeschlagen;

  try {
    const monatsanfang = monatsAnfangIso();

    const { count, error } = await createClient(url, key)
      .from('api_costs')
      .select('id', { count: 'exact', head: true })
      .eq('service', 'photoroom')
      .eq('operation', OPERATION_ECHT)
      .gte('created_at', monatsanfang);

    if (error) {
      console.error('[photoroomBudget] Zaehlung fehlgeschlagen:', error.message);
      return fehlgeschlagen;
    }

    const verbraucht = count ?? 0;
    return {
      verbraucht,
      limit,
      uebrig: Math.max(0, limit - verbraucht),
      erschoepft: verbraucht >= limit,
    };
  } catch (err) {
    console.error('[photoroomBudget] Zaehlung fehlgeschlagen:', err);
    return fehlgeschlagen;
  }
}

/**
 * Bucht einen Aufruf VOR dem Absenden und gibt die Zeilennummer zurueck.
 *
 * Das ist der Kern der Sperre, und der Grund steht in Schritt 2: Die Fotos
 * laufen dort ueber Promise.all, also gleichzeitig. Wuerde erst nach dem
 * Aufruf gezaehlt, pruefte ein ganzer Stapel dasselbe leere Kontingent und
 * alle kaemen durch — bei zehn Freibildern und zwoelf Fotos genau der Fall,
 * den es zu verhindern gilt.
 *
 * Deshalb: erst buchen, dann senden. Wer die Buchung bekommt, darf.
 *
 * `null` heisst: kein Platz mehr oder die Buchung ging schief. Beides
 * bedeutet nicht senden.
 */
export async function reservieren(
  userId: string | null,
  draftId: string | null,
  kostenMicros: number,
): Promise<string | null> {
  const limit = limitProMonat();
  if (limit === 0) return 'ohne-sperre';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const monatsanfang = monatsAnfangIso();

  try {
    /*
     * Erst eintragen, dann den eigenen Rang bestimmen.
     *
     * Zaehlen-und-dann-eintragen sieht richtiger aus, ist aber falsch: Zwei
     * gleichzeitige Anfragen lesen beide denselben Stand und tragen beide
     * ein. Gemessen mit fuenf parallelen Anfragen bei Limit 3 kamen alle
     * fuenf durch — genau der Stapel aus Schritt 2, gegen den die Sperre
     * gebaut ist.
     *
     * Umgekehrt geht es: Jeder traegt ein und schaut danach, ob er unter
     * den ersten `limit` Zeilen des Monats ist. Die Reihenfolge steht in
     * der Datenbank fest und ist fuer alle dieselbe, also gewinnen immer
     * dieselben — wer hinten liegt, nimmt seine Zeile zurueck.
     */
    const { data: eigen, error: insertFehler } = await supabase
      .from('api_costs')
      .insert({
        user_id:     userId,
        draft_id:    draftId,
        service:     'photoroom',
        operation:   OPERATION_ECHT,
        units_in:    1,
        cost_micros: kostenMicros,
        meta:        {},
      })
      .select('id')
      .single();

    if (insertFehler || !eigen) {
      console.error('[photoroomBudget] Buchung fehlgeschlagen:', insertFehler?.message);
      return null;
    }
    const id = String(eigen.id);

    const { data: gewinner, error: rangFehler } = await supabase
      .from('api_costs')
      .select('id')
      .eq('service', 'photoroom')
      .eq('operation', OPERATION_ECHT)
      .gte('created_at', monatsanfang)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit);

    if (rangFehler) {
      console.error('[photoroomBudget] Rangfolge fehlgeschlagen:', rangFehler.message);
      await freigeben(id);
      return null;
    }

    if ((gewinner ?? []).some(z => String(z.id) === id)) return id;

    // Nicht unter den ersten `limit` — Zeile zuruecknehmen.
    await freigeben(id);
    return null;
  } catch (err) {
    console.error('[photoroomBudget] Buchung fehlgeschlagen:', err);
    return null;
  }
}

/**
 * Gibt eine Buchung wieder frei, wenn der Aufruf nicht zustande kam.
 *
 * Ein abgelehnter Aufruf kostet nichts und darf das Kontingent nicht
 * verbrauchen. Schlaegt das Loeschen fehl, bleibt die Zeile stehen — dann
 * ist die Sperre um eins zu streng. Das ist die richtige Richtung fuer
 * einen Irrtum.
 */
export async function freigeben(id: string | null): Promise<void> {
  if (!id || id === 'ohne-sperre') return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await createClient(url, key).from('api_costs').delete().eq('id', id);
  } catch (err) {
    console.error('[photoroomBudget] Freigabe fehlgeschlagen:', err);
  }
}
