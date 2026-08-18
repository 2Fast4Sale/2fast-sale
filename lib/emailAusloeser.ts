/**
 * Auslöser für die automatischen E-Mails.
 *
 * Beide Funktionen sind bewusst so gebaut, dass sie nie werfen und nie
 * blockieren: Eine fehlgeschlagene Begrüssungsmail darf die Anmeldung
 * nicht verhindern, ein Versandfehler beim Guthaben-Hinweis nicht das
 * Anlegen des Inserats. Im Zweifel kommt die Mail nicht — das ist
 * deutlich besser als eine kaputte Seite.
 *
 * Beide brauchen den Service-Role-Schlüssel, weil sie Spalten schreiben,
 * die der Nutzer selbst nicht ändern darf (siehe Migration 018).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sende, ausstellerAusUmgebung } from './email';
import { begruessungEmail, guthabenNiedrigEmail } from './mails';

/**
 * Ab welchem Restguthaben gewarnt wird.
 *
 * Zwei und nicht eins: Bei einem verbleibenden Credit ist der Händler
 * mitten in der Arbeit, wenn die Mail ankommt, und muss trotzdem sofort
 * nachkaufen. Bei zwei bleibt ihm ein Inserat Vorlauf.
 */
const WARNSCHWELLE = 2;

function dienst(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !schluessel) return null;
  return createClient(url, schluessel);
}

/**
 * Verschickt die Begrüssung, falls das noch nicht geschehen ist.
 *
 * Aufgerufen wird das nach der Bestätigung der E-Mail-Adresse, nicht
 * schon bei der Registrierung. Wer seine Adresse vertippt hat, bekommt
 * sonst eine Begrüssung an ein Postfach, das ihm nicht gehört — und die
 * Zustellrate der eigenen Domain leidet mit jeder solchen Mail.
 */
export async function begruessungSenden(nutzerId: string, adresse: string): Promise<void> {
  try {
    const db = dienst();
    if (!db) return;

    const { data: profil } = await db
      .from('profiles')
      .select('full_name, company, listing_credits, welcome_email_at')
      .eq('id', nutzerId)
      .single();

    // Schon verschickt — oder Profil noch nicht angelegt.
    if (!profil || profil.welcome_email_at) return;

    /*
     * Zeitstempel VOR dem Versand setzen.
     *
     * Bei der Bestätigung öffnen sich manchmal zwei Anfragen gleichzeitig
     * (Vorschau des Mailprogramms plus Klick des Nutzers). Setzt man den
     * Stempel erst danach, laufen beide durch und der Händler bekommt die
     * Begrüssung doppelt. Andersherum ist der schlimmste Fall eine Mail,
     * die nicht ankommt.
     */
    const { error: sperrFehler } = await db
      .from('profiles')
      .update({ welcome_email_at: new Date().toISOString() })
      .eq('id', nutzerId)
      .is('welcome_email_at', null);

    if (sperrFehler) return;

    // Ohne hinterlegten Namen bleibt es beim blossen "Guten Tag," — das
    // ist besser als ein Platzhalter, der als solcher erkennbar ist.
    const anrede = (profil.company || profil.full_name || '').trim();

    const mail = begruessungEmail(
      { anrede, startCredits: profil.listing_credits ?? 0 },
      ausstellerAusUmgebung(),
    );

    await sende({ an: adresse, betreff: mail.betreff, html: mail.html, text: mail.text });
  } catch (fehler) {
    console.error('[email] Begruessung fehlgeschlagen:', fehler);
  }
}

/**
 * Warnt, wenn das Guthaben zur Neige geht.
 *
 * Wird nach dem Anlegen eines Inserats aufgerufen. Nutzer mit Abo oder
 * nachträglicher Abrechnung bekommen nichts — die haben kein Guthaben,
 * das ausgehen könnte.
 */
export async function guthabenPruefen(nutzerId: string, adresse: string): Promise<void> {
  try {
    const db = dienst();
    if (!db) return;

    const { data: profil } = await db
      .from('profiles')
      .select('full_name, company, listing_credits, plan, usage_billing, low_credit_email_at')
      .eq('id', nutzerId)
      .single();

    if (!profil) return;
    if (profil.usage_billing === true) return;
    if (profil.plan && profil.plan !== 'free') return;

    const rest = profil.listing_credits ?? 0;
    if (rest > WARNSCHWELLE) return;

    /*
     * Höchstens ein Hinweis je Guthabenstand.
     *
     * Ohne diese Sperre kämen bei zwei Restcredits drei Mails
     * hintereinander (bei 2, bei 1, bei 0). Der Zeitstempel wird beim
     * Aufladen zurückgesetzt, siehe credits/fulfill.
     */
    if (profil.low_credit_email_at) return;

    const { error: sperrFehler } = await db
      .from('profiles')
      .update({ low_credit_email_at: new Date().toISOString() })
      .eq('id', nutzerId)
      .is('low_credit_email_at', null);

    if (sperrFehler) return;

    const anrede = (profil.company || profil.full_name || '').trim();

    const mail = guthabenNiedrigEmail({ anrede, rest }, ausstellerAusUmgebung());
    await sende({ an: adresse, betreff: mail.betreff, html: mail.html, text: mail.text });
  } catch (fehler) {
    console.error('[email] Guthaben-Hinweis fehlgeschlagen:', fehler);
  }
}
