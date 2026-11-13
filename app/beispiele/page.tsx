/**
 * Vorher/Nachher für die Händlervorführung.
 *
 * Gedacht für ein Handy auf dem Hof: aufmachen, hinhalten, Finger über
 * das Bild ziehen. Keine Anmeldung, kein Konto, keine Preise, keine
 * Versprechen über Portale — nur der Unterschied zwischen einem
 * Handyfoto und einem Studiobild.
 *
 * Warum das eine eigene Seite ist und nicht Teil der Startseite: Auf
 * der Startseite stehen Tarife und Zusagen, die noch nicht alle
 * stimmen — deshalb steht sie hinter dem Bauzaun. Diese Seite behauptet
 * nichts, was nicht auf den Bildern zu sehen ist, und ist damit das
 * Einzige, was man heute schon guten Gewissens herzeigen kann.
 *
 * Die Bilder legt scripts/beispiel-anlegen.ts an.
 */

import fs from 'node:fs';
import path from 'node:path';
import Vergleich from './Vergleich';

type Eintrag = { id: string; titel: string; vorher: string; nachher: string };

/* Beim Bauen gelesen, nicht bei jedem Aufruf: Die Liste aendert sich
   nur, wenn ein Beispiel dazukommt, und das ist ein neuer Stand. */
function beispieleLesen(): Eintrag[] {
  try {
    const datei = path.join(process.cwd(), 'public', 'beispiele', 'liste.json');
    const roh = JSON.parse(fs.readFileSync(datei, 'utf8'));
    if (!Array.isArray(roh)) return [];
    return roh.filter((e): e is Eintrag =>
      e && typeof e.id === 'string' && typeof e.titel === 'string'
      && typeof e.vorher === 'string' && typeof e.nachher === 'string');
  } catch {
    return [];
  }
}

export const metadata = {
  title: 'Vorher / Nachher — 2Fast4Sale',
  /* Nicht in den Suchmaschinen: Das ist ein Werkzeug fuer das
     Verkaufsgespraech, keine Landingpage. */
  robots: { index: false, follow: false },
};

export default function Beispiele() {
  const beispiele = beispieleLesen();

  return (
    <main style={{
      fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      background: '#0b0b0c', color: '#f4f4f5',
      minHeight: '100vh', margin: 0, padding: '28px 16px 56px',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontSize: 23, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
          Dasselbe Auto. Dasselbe Handy.
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#a1a1aa', margin: '0 0 26px' }}>
          Links das Foto vom Hof, rechts das fertige Inserat&shy;bild.
          Zieh den Finger über das Bild.
        </p>

        {beispiele.length === 0 ? (
          <div style={{
            padding: 18, borderRadius: 12, border: '1px solid #27272a', background: '#141416',
            fontSize: 13.5, lineHeight: 1.7, color: '#a1a1aa',
          }}>
            <strong style={{ color: '#f4f4f5' }}>Noch kein Beispiel hinterlegt.</strong>
            <p style={{ margin: '8px 0 0' }}>
              Drei Fahrzeuge durch Schritt 2 laufen lassen, Original und Ergebnis
              sichern, dann je Fahrzeug einmal:
            </p>
            <pre style={{
              margin: '10px 0 0', padding: 10, borderRadius: 8, background: '#0b0b0c',
              border: '1px solid #27272a', overflowX: 'auto',
              fontSize: 12, color: '#d4d4d8',
            }}>
{`npx tsx scripts/beispiel-anlegen.ts \\
  hof.jpg studio.jpg "BMW 320d, 2017"`}
            </pre>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 30 }}>
            {beispiele.map(b => (
              <figure key={b.id} style={{ margin: 0 }}>
                <Vergleich
                  vorher={`/beispiele/${b.vorher}`}
                  nachher={`/beispiele/${b.nachher}`}
                  titel={b.titel}
                />
                <figcaption style={{ marginTop: 9, fontSize: 13.5, color: '#a1a1aa' }}>
                  {b.titel}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <p style={{
          marginTop: 34, paddingTop: 18, borderTop: '1px solid #27272a',
          fontSize: 12.5, lineHeight: 1.7, color: '#71717a',
        }}>
          Alle Bilder sind unbearbeitete Ergebnisse aus der Anwendung. Das
          Kennzeichen wird ersetzt, am Fahrzeug selbst wird nichts verändert —
          keine Dellen weggerechnet, keine Farbe geschönt.
        </p>
      </div>
    </main>
  );
}
