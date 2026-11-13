/**
 * Trägt die Datenpartner-Anmeldung eine FREMDE Kundennummer?
 *
 *   # Zugangsdaten setzt du selbst, sie gehören nicht in den Quelltext:
 *   export MOBILEDE_API_USERNAME=...
 *   export MOBILEDE_API_PASSWORD=...
 *   npx tsx scripts/mobilede-sandbox-probe.ts 1804 1995 2355 2597
 *
 * Nur Lesezugriffe. Es wird nichts angelegt, nichts geändert, nichts
 * gelöscht, und es kostet nichts.
 *
 * ── Warum es diese Probe gibt ──────────────────────────────────────
 *
 * Das ganze Geschäftsmodell hängt an einer einzigen technischen Frage,
 * die bisher nur auf Papier beantwortet war: Kann 2Fast4Sale mit der
 * EIGENEN Anmeldung ein Inserat im Bestand eines FREMDEN Händlers
 * verwalten?
 *
 * Geht das nicht, muss jeder Händler eigene API-Zugangsdaten
 * beantragen. Dann ist das Produkt für die Zielgruppe unbenutzbar —
 * wer zehn Autos im Monat verkauft, tut das nicht — und für alle
 * anderen unnötig, weil die schon ein System haben, das auf alle
 * Börsen stellt. Siehe lib/portalZugang.ts, Funktion zugangWaehlen.
 *
 * mobile.de nennt diesen Weg "Datenpartner" und stellt dafür in der
 * Sandbox mehrere Verkäufer mit unterschiedlichen Tarifen bereit
 * (Bronze, Silver, Gold, Platinum). Genau das prüft diese Probe: eine
 * Anmeldung, mehrere fremde Verkäufer.
 *
 * Nebenbei beantwortet sie die zweite offene Frage — ob der Tarif des
 * Händlers etwas ändert. Platinum darf mehr Bilder und mehr Inserate
 * als Bronze; läuft der Zugriff bei Bronze auf eine Grenze, muss das
 * Produkt das wissen, bevor ein Händler es merkt.
 *
 * Das Ergebnis ist zugleich der beste Anhang für den
 * Datenpartner-Antrag: Nicht "ich würde gern", sondern "die Anbindung
 * läuft gegen Ihre Sandbox, hier ist das Protokoll".
 *
 * ── Achtung bei den Sandbox-Daten ──────────────────────────────────
 *
 * mobile.de schreibt selbst, dass diese Zugangsdaten von mehreren
 * Entwicklern benutzt werden und sich die Datenbestände dabei ändern.
 * Eine Inseratszahl von heute kann morgen anders sein. Was hier zählt,
 * ist nicht die Zahl, sondern ob der Zugriff überhaupt erlaubt ist.
 */

const BASIS = 'https://services.sandbox.mobile.de/seller-api';

const benutzer = process.env.MOBILEDE_API_USERNAME;
const geheim = process.env.MOBILEDE_API_PASSWORD;

const verkaeufer = process.argv.slice(2);

async function hole(pfad: string) {
  const antwort = await fetch(`${BASIS}${pfad}`, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${benutzer}:${geheim}`).toString('base64'),
      Accept: 'application/vnd.de.mobile.api+json',
    },
    signal: AbortSignal.timeout(30000),
  });
  const text = await antwort.text();
  let koerper: any = text;
  try { koerper = JSON.parse(text); } catch { /* bleibt Text */ }
  return { status: antwort.status, koerper };
}

/** Deutet den Status, statt nur eine Zahl zu zeigen. */
function deutung(status: number): string {
  if (status === 200) return 'Zugriff erlaubt';
  if (status === 401) return 'Anmeldung abgelehnt — Benutzername oder Passwort falsch';
  if (status === 403) return 'Angemeldet, aber fuer DIESEN Verkaeufer nicht freigegeben';
  if (status === 404) return 'Verkaeufer gibt es nicht';
  if (status === 429) return 'Zu viele Anfragen';
  return `unerwartet (${status})`;
}

async function main() {
  if (!benutzer || !geheim) {
    console.error('MOBILEDE_API_USERNAME und MOBILEDE_API_PASSWORD muessen gesetzt sein.');
    console.error('Setz sie selbst in der Umgebung — in den Quelltext gehoeren sie nicht.');
    process.exitCode = 1;
    return;
  }
  if (verkaeufer.length === 0) {
    console.error('Bitte mindestens eine Seller-ID angeben:');
    console.error('  npx tsx scripts/mobilede-sandbox-probe.ts 1804 1995');
    process.exitCode = 1;
    return;
  }

  console.log(`Sandbox: ${BASIS}`);
  console.log(`Anmeldung: ${benutzer} (Passwort nicht angezeigt)\n`);

  let erlaubt = 0;
  let fehler = 0;

  for (const id of verkaeufer) {
    /* Der entscheidende Aufruf: der Bestand eines fremden Verkaeufers
       mit MEINER Anmeldung. Nur lesend. */
    const { status, koerper } = await hole(`/sellers/${id}/ads?page.size=1`);
    const ok = status === 200;
    console.log(`${ok ? 'OK   ' : 'FEHLER'} Seller-ID ${id.padEnd(6)} ${deutung(status)}`);

    if (ok) {
      erlaubt++;
      const gesamt = koerper?.total ?? koerper?.['search-result']?.total ?? '?';
      console.log(`       Inserate im Bestand: ${gesamt}`);
    } else {
      fehler++;
      const grund = typeof koerper === 'string'
        ? koerper.slice(0, 200)
        : JSON.stringify(koerper).slice(0, 200);
      if (grund.trim()) console.log(`       Antwort: ${grund}`);
    }
  }

  console.log();
  if (erlaubt > 1) {
    console.log(`Belegt: EINE Anmeldung, ${erlaubt} verschiedene Verkaeufer.`);
    console.log('Der Datenpartner-Weg traegt. Haendler brauchen keine eigenen');
    console.log('Zugangsdaten — nur ihre Kundennummer. (MOBILEDE_TRANSFER=true,');
    console.log('aber erst wenn der Zugang fuer das Produktivsystem erteilt ist.)');
  } else if (erlaubt === 1) {
    console.log('Nur ein Verkaeufer erreichbar. Pruefe die weiteren Seller-IDs —');
    console.log('mit nur einem ist nicht belegt, dass fremde Bestaende gehen.');
  } else {
    console.log('Kein Zugriff. Solange das so ist, braucht JEDER Haendler eigene');
    console.log('Zugangsdaten, und das Produkt ist fuer die Zielgruppe nicht');
    console.log('benutzbar. Das ist dann die wichtigste offene Frage, nicht die');
    console.log('Ausstattung.');
  }

  process.exitCode = fehler === 0 ? 0 : 1;
}

main().catch(e => { console.error(e); process.exit(1); });

export {};
