/**
 * Zugangsdaten der Händler für mobile.de und AutoScout24.
 *
 * ── Warum das gebraucht wird ─────────────────────────────────────────
 *
 * Die beiden Export-Routen nahmen ihre Zugangsdaten aus der Umgebung:
 * MOBILEDE_API_USERNAME, AS24_CUSTOMER_ID und so weiter. Das ist MEIN
 * Konto. Jedes Inserat wäre damit in meinem Namen eingestellt worden,
 * nicht im Namen des Händlers — in seinem Portalkonto wäre nichts
 * angekommen, und bei mir stünden fremde Fahrzeuge.
 *
 * Hier liegen stattdessen die Zugänge je Händler, das Geheimnis
 * verschlüsselt.
 *
 * ── Warum verschlüsselt und nicht einfach als Text ───────────────────
 *
 * Es sind fremde Passwörter. Ein Datenbank-Backup, ein versehentlich
 * offener Lesezugriff, ein falsch gesetztes `select *` in einer
 * Protokollzeile — in jedem dieser Fälle wäre das Passwort eines
 * Händlers zu einem Portal weg, mit dem er Geld verdient.
 *
 * AES-256-GCM, Schlüssel aus PORTAL_SCHLUESSEL (32 Byte, hex oder
 * base64). Ohne Schlüssel wird NICHT gespeichert — lieber eine
 * Fehlermeldung als ein Klartextpasswort in der Datenbank.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export type Portal = 'mobile' | 'as24';

export const PORTAL_NAMEN: Record<Portal, string> = {
  mobile: 'mobile.de',
  as24:   'AutoScout24',
};

/* ────────────────────────── Verschlüsselung ────────────────────────── */

/**
 * Den Schlüssel aus der Umgebung lesen.
 *
 * Erlaubt sind 64 Hex-Zeichen oder base64 mit 32 Byte Inhalt. Alles
 * andere wird abgelehnt, statt es mit einem Hash "irgendwie passend" zu
 * machen: Ein zu kurzer Schlüssel, der stillschweigend gestreckt wird,
 * sieht wie Verschlüsselung aus und ist keine.
 */
function schluessel(): Buffer | null {
  const roh = (process.env.PORTAL_SCHLUESSEL || '').trim();
  if (!roh) return null;
  if (/^[0-9a-f]{64}$/i.test(roh)) return Buffer.from(roh, 'hex');
  try {
    const b = Buffer.from(roh, 'base64');
    if (b.length === 32) return b;
  } catch { /* faellt unten durch */ }
  console.error('[portalZugang] PORTAL_SCHLUESSEL ist kein 32-Byte-Schluessel (64 hex oder base64)');
  return null;
}

/** Ist der Server fuer das Speichern von Zugaengen eingerichtet? */
export function verschluesselungBereit(): boolean {
  return schluessel() !== null;
}

/**
 * WARUM es nicht geht — fuer die Oberflaeche.
 *
 * "Der Server kann gerade nicht sicher speichern" ist richtig, aber
 * nutzlos: Die beiden Faelle brauchen verschiedene Handgriffe. Fehlt die
 * Variable, muss sie gesetzt und neu bereitgestellt werden; hat sie das
 * falsche Format, muss ein neuer Schluessel erzeugt werden. Ohne diese
 * Unterscheidung sucht man an der falschen Stelle.
 *
 * Verraten wird dabei nichts ueber den Inhalt — nur die Laenge dessen,
 * was ankam, und die ist bei einem falschen Wert genau die Information,
 * die fehlt.
 */
export function schluesselStand(): { stand: 'ok' | 'fehlt' | 'format'; laenge: number } {
  const roh = (process.env.PORTAL_SCHLUESSEL || '').trim();
  if (!roh) return { stand: 'fehlt', laenge: 0 };
  return { stand: schluessel() ? 'ok' : 'format', laenge: roh.length };
}

/** Klartext → "v1:iv:tag:cipher", alles base64. */
export function verschluesseln(klartext: string): string | null {
  const k = schluessel();
  if (!k) return null;
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', k, iv);
  const cipher = Buffer.concat([c.update(klartext, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), cipher.toString('base64')].join(':');
}

/** Zurück zum Klartext. null, wenn der Schlüssel fehlt oder nicht passt. */
export function entschluesseln(gespeichert: string | null | undefined): string | null {
  if (!gespeichert) return null;
  const k = schluessel();
  if (!k) return null;
  const teile = gespeichert.split(':');
  if (teile.length !== 4 || teile[0] !== 'v1') return null;
  try {
    const d = createDecipheriv('aes-256-gcm', k, Buffer.from(teile[1], 'base64'));
    d.setAuthTag(Buffer.from(teile[2], 'base64'));
    return Buffer.concat([d.update(Buffer.from(teile[3], 'base64')), d.final()]).toString('utf8');
  } catch {
    /*
     * Hierher kommt man, wenn der Schlüssel gewechselt wurde. Dann ist
     * das Geheimnis verloren — der Händler muss es neu eingeben. Das ist
     * der Preis dafür, dass ein Backup allein nichts wert ist.
     */
    console.error('[portalZugang] Entschluesseln fehlgeschlagen — wurde PORTAL_SCHLUESSEL gewechselt?');
    return null;
  }
}

/**
 * Fingerabdruck eines Geheimnisses, nur zum Vergleichen in Protokollen.
 *
 * Nie das Geheimnis selbst loggen. Acht Hex-Zeichen reichen, um zu
 * sehen, ob sich etwas geändert hat, und sagen nichts über den Inhalt.
 */
export function abdruck(klartext: string): string {
  return createHash('sha256').update(klartext).digest('hex').slice(0, 8);
}

/* ────────────────────────── Datenbank ────────────────────────── */

const dienst = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface Zugang {
  portal: Portal;
  benutzer: string | null;
  /** Entschlüsselt. Nur serverseitig weitergeben, nie an den Browser. */
  geheim: string | null;
  kontoNummer: string | null;
  testmodus: boolean;
  /** Woher die Daten kommen — fuer die Anzeige und die Fehlersuche. */
  quelle: 'haendler' | 'umgebung';
}

/** Was die Oberfläche sehen darf: alles ausser dem Geheimnis. */
export interface ZugangAnzeige {
  portal: Portal;
  vorhanden: boolean;
  benutzer: string | null;
  kontoNummer: string | null;
  testmodus: boolean;
  geheimGesetzt: boolean;
  geprueftAm: string | null;
  pruefOk: boolean | null;
  pruefMeldung: string | null;
}

/**
 * Zugang eines Händlers lesen.
 *
 * Rückfall auf die Umgebung NUR im Testmodus, und das mit Absicht: Ohne
 * diese Grenze würde ein Händler ohne eigene Zugangsdaten sein Inserat
 * in MEIN Portalkonto stellen. Das fällt niemandem auf, bis es
 * öffentlich ist.
 */
export async function zugangLesen(userId: string, portal: Portal): Promise<Zugang | null> {
  const { data, error } = await dienst()
    .from('portal_zugaenge')
    .select('benutzer, geheim, konto_nummer, testmodus')
    .eq('user_id', userId)
    .eq('portal', portal)
    .maybeSingle();

  if (error) {
    // Migration 025 noch nicht eingespielt: nicht blockieren, aber laut sein.
    console.error('[portalZugang] Lesen fehlgeschlagen:', error.message);
  }

  if (data?.konto_nummer) {
    return {
      portal,
      benutzer: data.benutzer ?? null,
      geheim: entschluesseln(data.geheim),
      kontoNummer: data.konto_nummer,
      testmodus: data.testmodus !== false,
      quelle: 'haendler',
    };
  }

  const umgebung = ausUmgebung(portal);
  if (umgebung && umgebung.testmodus) return umgebung;
  return null;
}

/** Mein eigener Zugang aus der Umgebung — nur zum Testen. */
function ausUmgebung(portal: Portal): Zugang | null {
  if (portal === 'mobile') {
    const benutzer = process.env.MOBILEDE_API_USERNAME;
    const geheim = process.env.MOBILEDE_API_PASSWORD;
    const kontoNummer = process.env.MOBILEDE_SELLER_ID;
    if (!benutzer || !geheim || !kontoNummer) return null;
    return {
      portal, benutzer, geheim, kontoNummer,
      testmodus: process.env.MOBILEDE_SANDBOX === 'true',
      quelle: 'umgebung',
    };
  }
  const benutzer = process.env.AS24_API_USERNAME;
  const geheim = process.env.AS24_API_PASSWORD;
  const kontoNummer = process.env.AS24_CUSTOMER_ID;
  if (!benutzer || !geheim || !kontoNummer) return null;
  return {
    portal, benutzer, geheim, kontoNummer,
    testmodus: process.env.AS24_TESTMODUS !== 'false',
    quelle: 'umgebung',
  };
}

/** Alle Zugänge eines Händlers, ohne Geheimnisse — für die Oberfläche. */
export async function zugaengeAnzeigen(userId: string): Promise<ZugangAnzeige[]> {
  const { data, error } = await dienst()
    .from('portal_zugaenge')
    .select('portal, benutzer, geheim, konto_nummer, testmodus, geprueft_am, pruef_ok, pruef_meldung')
    .eq('user_id', userId);

  if (error) console.error('[portalZugang] Liste fehlgeschlagen:', error.message);

  const gefunden = new Map((data ?? []).map(z => [z.portal as Portal, z]));
  return (['mobile', 'as24'] as Portal[]).map(portal => {
    const z = gefunden.get(portal);
    return {
      portal,
      vorhanden: Boolean(z?.konto_nummer),
      benutzer: z?.benutzer ?? null,
      kontoNummer: z?.konto_nummer ?? null,
      testmodus: z?.testmodus !== false,
      geheimGesetzt: Boolean(z?.geheim),
      geprueftAm: z?.geprueft_am ?? null,
      pruefOk: z?.pruef_ok ?? null,
      pruefMeldung: z?.pruef_meldung ?? null,
    };
  });
}

export interface ZugangEingabe {
  benutzer?: string | null;
  /** Klartext. Leer oder fehlend lässt ein vorhandenes Geheimnis stehen. */
  geheim?: string | null;
  kontoNummer?: string | null;
  testmodus?: boolean;
}

/**
 * Zugang speichern.
 *
 * Gibt eine Fehlermeldung zurück oder null bei Erfolg. Ohne
 * Verschlüsselungsschlüssel wird abgelehnt — ein Klartextpasswort in der
 * Datenbank ist schlimmer als eine Fehlermeldung.
 */
export async function zugangSpeichern(
  userId: string, portal: Portal, eingabe: ZugangEingabe,
): Promise<string | null> {
  const zeile: Record<string, unknown> = {
    user_id: userId,
    portal,
    geaendert_am: new Date().toISOString(),
  };

  if (eingabe.benutzer !== undefined) zeile.benutzer = eingabe.benutzer || null;
  if (eingabe.kontoNummer !== undefined) zeile.konto_nummer = eingabe.kontoNummer || null;
  if (eingabe.testmodus !== undefined) zeile.testmodus = Boolean(eingabe.testmodus);

  if (eingabe.geheim) {
    const verschluesselt = verschluesseln(eingabe.geheim);
    if (!verschluesselt) {
      return 'Der Server kann Zugangsdaten gerade nicht sicher speichern (PORTAL_SCHLUESSEL fehlt). '
        + 'Bitte später erneut versuchen.';
    }
    zeile.geheim = verschluesselt;
    /* Neues Geheimnis: Die alte Prüfung sagt nichts mehr aus. */
    zeile.geprueft_am = null;
    zeile.pruef_ok = null;
    zeile.pruef_meldung = null;
  }

  const { error } = await dienst()
    .from('portal_zugaenge')
    .upsert(zeile, { onConflict: 'user_id,portal' });

  if (error) {
    console.error('[portalZugang] Speichern fehlgeschlagen:', error.message);
    return 'Die Zugangsdaten konnten nicht gespeichert werden.';
  }
  return null;
}

/** Zugang loeschen. */
export async function zugangLoeschen(userId: string, portal: Portal): Promise<string | null> {
  const { error } = await dienst()
    .from('portal_zugaenge')
    .delete()
    .eq('user_id', userId)
    .eq('portal', portal);
  if (error) {
    console.error('[portalZugang] Loeschen fehlgeschlagen:', error.message);
    return 'Der Zugang konnte nicht entfernt werden.';
  }
  return null;
}

/** Ergebnis einer Prüfung festhalten. */
export async function pruefungMerken(
  userId: string, portal: Portal, ok: boolean, meldung: string,
): Promise<void> {
  const { error } = await dienst()
    .from('portal_zugaenge')
    .update({
      geprueft_am: new Date().toISOString(),
      pruef_ok: ok,
      pruef_meldung: meldung.slice(0, 500),
    })
    .eq('user_id', userId)
    .eq('portal', portal);
  if (error) console.error('[portalZugang] Pruefung merken fehlgeschlagen:', error.message);
}
