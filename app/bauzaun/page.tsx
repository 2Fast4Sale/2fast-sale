import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Was ein Besucher sieht, solange der Bauzaun steht.
 *
 * Erreichbar nur ueber das Umschreiben im Proxy — niemand tippt diese
 * Adresse ein. Deshalb hier auch kein Hinweis darauf, wie man
 * durchkommt.
 *
 * Bewusst nuechtern: kein Countdown, kein "Trag dich ein", keine
 * Versprechen. Wer hier landet, hat sich verlaufen; er soll das in
 * fuenf Sekunden merken und wissen, wie er dich erreicht.
 */

export const metadata: Metadata = {
  title: '2Fast4Sale — in Arbeit',
  description: 'Diese Seite ist noch nicht fertig.',
  robots: { index: false, follow: false },
  /*
   * openGraph mit ueberschreiben, nicht nur description.
   *
   * Das Grundlayout setzt og:description auf "Fahrzeugschein
   * abfotografieren, Fotos ins Studio setzen …". Ohne diese Zeile
   * wuerde die Zaunseite in jeder Vorschau — Messenger, Slack,
   * Suchmaschine — weiter mit Funktionen werben, die noch nicht
   * laufen. Genau das soll der Bauzaun verhindern.
   */
  openGraph: {
    title: '2Fast4Sale — in Arbeit',
    description: 'Diese Seite ist noch nicht fertig.',
    type: 'website',
  },
};

export default function Bauzaun() {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f1f4f9', color: '#000',
      padding: '32px 24px', textAlign: 'center',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28,
        fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px',
      }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, background: '#4f46e5',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 16,
        }}>⚡</span>
        2Fast<span style={{ color: '#4f46e5' }}>4</span>Sale
      </div>

      <h1 style={{
        margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.8px',
        lineHeight: 1.2, maxWidth: 560,
      }}>
        Diese Seite ist gerade in Arbeit.
      </h1>

      <p style={{
        margin: '18px 0 0', fontSize: 16, lineHeight: 1.6,
        color: '#334155', maxWidth: 460,
      }}>
        2Fast4Sale wird noch gebaut — ein Werkzeug, mit dem Autohändler
        ihre Fahrzeuge schneller inserieren. Wir melden uns, wenn es so
        weit ist.
      </p>

      <p style={{ margin: '28px 0 0', fontSize: 15, color: '#334155' }}>
        Fragen?{' '}
        <a href="mailto:info@2fast4sale.com" style={{ color: '#4f46e5', fontWeight: 600 }}>
          info@2fast4sale.com
        </a>
      </p>

      {/*
        Impressum und Datenschutz bleiben hinter dem Bauzaun immer
        erreichbar (siehe IMMER_OFFEN in lib/bauzaun.ts) und muessen
        deshalb auch von hier aus verlinkt sein.
      */}
      <nav style={{
        marginTop: 44, display: 'flex', gap: 20, flexWrap: 'wrap',
        justifyContent: 'center', fontSize: 13.5,
      }}>
        <Link href="/impressum" style={{ color: '#334155' }}>Impressum</Link>
        <Link href="/datenschutz" style={{ color: '#334155' }}>Datenschutz</Link>
        <Link href="/agb" style={{ color: '#334155' }}>AGB</Link>
      </nav>
    </main>
  );
}
