import Link from 'next/link';

export const metadata = {
  title: 'Impressum | 2Fast4Sale',
  description: 'Impressum und Anbieterkennzeichnung von 2Fast4Sale',
};

const S = {
  page:    { minHeight: '100vh', background: '#050d1a', color: '#e8f1fa', fontFamily: '"Inter", -apple-system, sans-serif', padding: '60px 24px' } as React.CSSProperties,
  wrap:    { maxWidth: '760px', margin: '0 auto' } as React.CSSProperties,
  h1:      { fontSize: '36px', fontWeight: '800' as const, letterSpacing: '-0.5px', marginBottom: '8px', color: '#f0f8ff' },
  sub:     { color: '#7a9cbc', fontSize: '15px', marginBottom: '48px' } as React.CSSProperties,
  h2:      { fontSize: '18px', fontWeight: '700' as const, color: '#f0f8ff', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  label:   { fontSize: '12px', fontWeight: '700' as const, color: '#3a5a78', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '4px' },
  value:   { fontSize: '15px', color: '#a8c4dc', lineHeight: 1.7 } as React.CSSProperties,
  body:    { color: '#a8c4dc', lineHeight: 1.75, margin: 0, fontSize: '15px' } as React.CSSProperties,
  section: { marginBottom: '36px' } as React.CSSProperties,
  footer:  { marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '20px', fontSize: '14px' } as React.CSSProperties,
};

export default function ImpressumPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#7a9cbc', textDecoration: 'none', fontSize: '14px', marginBottom: '40px' }}>
          ← Zurück zur Startseite
        </Link>

        <h1 style={S.h1}>Impressum</h1>
        <p style={S.sub}>Angaben gemäß § 5 TMG</p>

        {/* ── ANBIETER ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Anbieter</h2>
          <div style={{ marginBottom: '12px' }}>
            <div style={S.label}>Name / Firma</div>
            <div style={S.value}>Fabian Barjamasi<br />2Fast4Sale</div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={S.label}>Adresse</div>
            <div style={S.value}>
              [Straße und Hausnummer]<br />
              [PLZ] [Stadt]<br />
              Deutschland
            </div>
          </div>
        </div>

        {/* ── KONTAKT ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Kontakt</h2>
          <div style={{ marginBottom: '12px' }}>
            <div style={S.label}>E-Mail</div>
            {/* ⚠️ HIER AUSFÜLLEN */}
            <div style={S.value}><a href="mailto:info@2fast4sale.de" style={{ color: '#60a5fa' }}>info@2fast4sale.de</a></div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={S.label}>Telefon</div>
            <div style={S.value}>+49 176 37670637</div>
          </div>
        </div>

        {/* ── UST ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Umsatzsteuer</h2>
          <p style={S.body}>
            {/* ⚠️ Eine der beiden Zeilen behalten, andere löschen */}
            Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE[XXXXXXXXX]
            {/* ODER bei Kleinunternehmer: Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen. */}
          </p>
        </div>

        {/* ── VERANTWORTLICH ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)</h2>
          <div style={S.value}>Fabian Barjamasi<br />[Adresse wie oben]</div>
        </div>

        {/* ── STREIT ── */}
        <div style={S.section}>
          <h2 style={S.h2}>EU-Streitschlichtung</h2>
          <p style={S.body}>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>
              https://ec.europa.eu/consumers/odr/
            </a>. Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
        </div>

        <div style={S.section}>
          <h2 style={S.h2}>Verbraucherstreitbeilegung</h2>
          <p style={S.body}>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>

        {/* ── HAFTUNG ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Haftung für Inhalte</h2>
          <p style={S.body}>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
            allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
            zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder
            Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
            Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
            Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese
            Inhalte umgehend entfernen.
          </p>
        </div>

        <div style={S.section}>
          <h2 style={S.h2}>Haftung für Links</h2>
          <p style={S.body}>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
            Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
            verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die
            verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
            Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Bei Bekanntwerden von
            Rechtsverletzungen werden wir derartige Links umgehend entfernen.
          </p>
        </div>

        <div style={S.section}>
          <h2 style={S.h2}>Urheberrecht</h2>
          <p style={S.body}>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
            Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
            Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
            Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
          </p>
        </div>

        <div style={S.footer}>
          <Link href="/datenschutz" style={{ color: '#60a5fa', textDecoration: 'none' }}>Datenschutz</Link>
          <Link href="/agb" style={{ color: '#60a5fa', textDecoration: 'none' }}>AGB</Link>
          <Link href="/" style={{ color: '#7a9cbc', textDecoration: 'none' }}>Startseite</Link>
        </div>

      </div>
    </div>
  );
}

