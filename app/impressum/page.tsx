import Link from 'next/link';

export const metadata = {
  title: 'Impressum | 2Fast4Sale',
  description: 'Impressum und Anbieterkennzeichnung von 2Fast4Sale',
};

const S = {
  page:    { minHeight: '100vh', background: '#f0f2f5', color: '#0f172a', fontFamily: '"Inter", -apple-system, sans-serif', padding: '60px 24px' } as React.CSSProperties,
  wrap:    { maxWidth: '760px', margin: '0 auto' } as React.CSSProperties,
  h1:      { fontSize: '36px', fontWeight: '800' as const, letterSpacing: '-0.5px', marginBottom: '8px', color: '#0f172a' },
  sub:     { color: '#64748b', fontSize: '15px', marginBottom: '48px' } as React.CSSProperties,
  h2:      { fontSize: '18px', fontWeight: '700' as const, color: '#0f172a', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f8fafc' },
  label:   { fontSize: '12px', fontWeight: '700' as const, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '4px' },
  value:   { fontSize: '15px', color: '#64748b', lineHeight: 1.7 } as React.CSSProperties,
  body:    { color: '#64748b', lineHeight: 1.75, margin: 0, fontSize: '15px' } as React.CSSProperties,
  section: { marginBottom: '36px' } as React.CSSProperties,
  footer:  { marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '20px', fontSize: '14px' } as React.CSSProperties,
};

export default function ImpressumPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontSize: '14px', marginBottom: '40px' }}>
          ← Zurück zur Startseite
        </Link>

        <h1 style={S.h1}>Impressum</h1>
        <p style={S.sub}>Angaben gemäß § 5 TMG</p>

        {/* ── BETA-HINWEIS ── */}
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '32px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#d97706', lineHeight: 1.6 }}>
            <strong>Hinweis:</strong> Diese Plattform befindet sich im geschlossenen Testbetrieb (Beta). Ein vollständiges Impressum mit Anschrift wird mit der offiziellen Gewerbeanmeldung ab Oktober 2026 ergänzt. Bei rechtlichen Anfragen wende dich bitte direkt per E-Mail an uns.
          </p>
        </div>

        {/* ── ANBIETER ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Anbieter</h2>
          <div style={{ marginBottom: '12px' }}>
            <div style={S.label}>Name</div>
            <div style={S.value}>Fabian Barjamasi<br />2Fast4Sale</div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={S.label}>Land</div>
            <div style={S.value}>Deutschland</div>
          </div>
        </div>

        {/* ── KONTAKT ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Kontakt</h2>
          <div style={{ marginBottom: '12px' }}>
            <div style={S.label}>E-Mail</div>
            <div style={S.value}><a href="mailto:info@2fast4sale.com" style={{ color: '#6366f1' }}>info@2fast4sale.com</a></div>
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
            Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen (Kleinunternehmerregelung).
          </p>
        </div>

        {/* ── VERANTWORTLICH ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)</h2>
          <div style={S.value}>Fabian Barjamasi, Deutschland</div>
        </div>

        {/* ── STREIT ── */}
        <div style={S.section}>
          <h2 style={S.h2}>EU-Streitschlichtung</h2>
          <p style={S.body}>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
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
          <Link href="/datenschutz" style={{ color: '#6366f1', textDecoration: 'none' }}>Datenschutz</Link>
          <Link href="/agb" style={{ color: '#6366f1', textDecoration: 'none' }}>AGB</Link>
          <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Startseite</Link>
        </div>

      </div>
    </div>
  );
}

