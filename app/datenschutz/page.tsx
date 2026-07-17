import Link from 'next/link';

export const metadata = {
  title: 'Datenschutzerklärung | 2Fast4Sale',
  description: 'Datenschutzerklärung von 2Fast4Sale gemäß DSGVO',
};

const page:    React.CSSProperties = { minHeight: '100vh', background: '#050d1a', color: '#e8f1fa', fontFamily: '"Inter", -apple-system, sans-serif', padding: '60px 24px' };
const wrap:    React.CSSProperties = { maxWidth: '760px', margin: '0 auto' };
const h1style: React.CSSProperties = { fontSize: '36px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px', color: '#f0f8ff' };
const h2style: React.CSSProperties = { fontSize: '18px', fontWeight: 700, color: '#f0f8ff', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginTop: '0' };
const body:    React.CSSProperties = { color: '#a8c4dc', lineHeight: 1.8, margin: '0 0 12px', fontSize: '15px' };
const sec:     React.CSSProperties = { marginBottom: '36px' };
const foot:    React.CSSProperties = { marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '20px', fontSize: '14px' };
const lnk = { color: '#60a5fa' };

export default function DatenschutzPage() {
  return (
    <div style={page}>
      <div style={wrap}>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#7a9cbc', textDecoration: 'none', fontSize: '14px', marginBottom: '40px' }}>
          ← Zurück zur Startseite
        </Link>

        <h1 style={h1style}>Datenschutzerklärung</h1>
        <p style={{ color: '#7a9cbc', fontSize: '15px', marginBottom: '48px' }}>Zuletzt aktualisiert: Juni 2026</p>

        <div style={sec}>
          <h2 style={h2style}>1. Verantwortlicher</h2>
          <p style={body}>
            Verantwortlicher im Sinne der DSGVO:<br />
            Fabian Barjamasi<br />
            2Fast4Sale<br />
            [Straße, PLZ, Stadt]<br />
            E-Mail: <a href="mailto:info@2fast4sale.de" style={lnk}>info@2fast4sale.de</a>
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>2. Erhebung und Verarbeitung personenbezogener Daten</h2>
          <p style={body}>
            Wir erheben personenbezogene Daten nur, soweit dies zur Bereitstellung unserer Dienste erforderlich ist
            oder Sie uns diese freiwillig mitteilen. Personenbezogene Daten sind alle Informationen, die sich auf
            eine identifizierte oder identifizierbare natürliche Person beziehen.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>3. Welche Daten wir verarbeiten</h2>
          <p style={body}><strong style={{ color: '#f0f8ff' }}>Bei der Registrierung:</strong></p>
          <ul style={{ color: '#a8c4dc', lineHeight: 1.8, paddingLeft: '20px', marginBottom: '12px' }}>
            <li>E-Mail-Adresse</li>
            <li>Name und Firmenname (freiwillig)</li>
            <li>Passwort (verschlüsselt gespeichert)</li>
          </ul>
          <p style={body}><strong style={{ color: '#f0f8ff' }}>Bei der Nutzung der Plattform:</strong></p>
          <ul style={{ color: '#a8c4dc', lineHeight: 1.8, paddingLeft: '20px', marginBottom: '12px' }}>
            <li>Fahrzeugdaten (Marke, Modell, Fotos, Beschreibungen)</li>
            <li>Hochgeladene Dokumente (Fahrzeugscheine) — werden nach Verarbeitung nicht dauerhaft gespeichert</li>
            <li>Rechnungsadresse und Zahlungsinformationen (verarbeitet über Stripe)</li>
            <li>Nutzungsdaten (Login-Zeiten, API-Zugriffe)</li>
          </ul>
        </div>

        <div style={sec}>
          <h2 style={h2style}>4. Rechtsgrundlagen der Verarbeitung (Art. 6 DSGVO)</h2>
          <ul style={{ color: '#a8c4dc', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li><strong style={{ color: '#f0f8ff' }}>Vertragserfüllung (Art. 6 Abs. 1 lit. b):</strong> Bereitstellung der Plattformfunktionen</li>
            <li><strong style={{ color: '#f0f8ff' }}>Berechtigte Interessen (Art. 6 Abs. 1 lit. f):</strong> Sicherheit, Missbrauchsprävention, Verbesserung des Dienstes</li>
            <li><strong style={{ color: '#f0f8ff' }}>Einwilligung (Art. 6 Abs. 1 lit. a):</strong> Wo wir um Erlaubnis bitten (z.B. Marketing-E-Mails)</li>
            <li><strong style={{ color: '#f0f8ff' }}>Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c):</strong> Aufbewahrung von Rechnungsdaten gemäß § 147 AO</li>
          </ul>
        </div>

        <div style={sec}>
          <h2 style={h2style}>5. Drittanbieter & Auftragsverarbeiter</h2>

          <p style={body}><strong style={{ color: '#f0f8ff' }}>Supabase (Datenbank & Authentifizierung)</strong><br />
          Supabase Inc., San Francisco, USA. Daten werden in der EU (Frankfurt) gehostet. Datenschutz:{' '}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={lnk}>supabase.com/privacy</a></p>

          <p style={body}><strong style={{ color: '#f0f8ff' }}>Stripe (Zahlungsabwicklung)</strong><br />
          Stripe Payments Europe, Ltd., Dublin, Irland. Kreditkarten- und Bankdaten werden ausschließlich von Stripe
          verarbeitet — wir speichern keine vollständigen Zahlungsdaten. Datenschutz:{' '}
          <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" style={lnk}>stripe.com/de/privacy</a></p>

          <p style={body}><strong style={{ color: '#f0f8ff' }}>OpenAI (KI-Funktionen)</strong><br />
          OpenAI, L.L.C., San Francisco, USA. Fahrzeugdaten können zur KI-Verarbeitung übermittelt werden.
          Datenschutz:{' '}
          <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" style={lnk}>openai.com/policies/privacy-policy</a></p>

          <p style={body}><strong style={{ color: '#f0f8ff' }}>fal.ai (Bildverarbeitung)</strong><br />
          Zur KI-gestützten Hintergrundentfernung werden Fahrzeugfotos an fal.ai übermittelt. Es werden keine
          personenbezogenen Daten weitergegeben.</p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>6. Cookies & Speicherung</h2>
          <p style={body}>
            Wir verwenden technisch notwendige Cookies für die Sitzungsverwaltung (Auth-Token von Supabase).
            Diese Cookies sind für den Betrieb der Plattform unerlässlich und können nicht deaktiviert werden.
            Es werden keine Tracking- oder Marketing-Cookies gesetzt ohne Einwilligung.
          </p>
          <p style={body}>
            Im Browser (localStorage) werden folgende Daten gespeichert: gewählter Hintergrund, Plan-Informationen
            (zur schnellen Anzeige). Diese Daten verlassen nicht Ihren Browser.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>7. Datenspeicherung & Löschung</h2>
          <p style={body}>
            Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist:
          </p>
          <ul style={{ color: '#a8c4dc', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Nutzerdaten: bis zur Löschung des Accounts</li>
            <li>Rechnungsdaten: 10 Jahre (gesetzliche Aufbewahrungspflicht)</li>
            <li>Fahrzeugfotos: bis zur manuellen Löschung durch den Nutzer</li>
            <li>Fahrzeugscheindaten: werden nach KI-Verarbeitung nicht dauerhaft gespeichert</li>
          </ul>
        </div>

        <div style={sec}>
          <h2 style={h2style}>8. Ihre Rechte (Art. 15–22 DSGVO)</h2>
          <p style={body}>Sie haben das Recht auf:</p>
          <ul style={{ color: '#a8c4dc', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li><strong style={{ color: '#f0f8ff' }}>Auskunft</strong> über gespeicherte Daten (Art. 15)</li>
            <li><strong style={{ color: '#f0f8ff' }}>Berichtigung</strong> unrichtiger Daten (Art. 16)</li>
            <li><strong style={{ color: '#f0f8ff' }}>Löschung</strong> Ihrer Daten (Art. 17)</li>
            <li><strong style={{ color: '#f0f8ff' }}>Einschränkung</strong> der Verarbeitung (Art. 18)</li>
            <li><strong style={{ color: '#f0f8ff' }}>Datenübertragbarkeit</strong> (Art. 20)</li>
            <li><strong style={{ color: '#f0f8ff' }}>Widerspruch</strong> gegen die Verarbeitung (Art. 21)</li>
            <li><strong style={{ color: '#f0f8ff' }}>Beschwerde</strong> bei einer Aufsichtsbehörde (Art. 77)</li>
          </ul>
          <p style={{ ...body, marginTop: '12px' }}>
            Zur Ausübung Ihrer Rechte wenden Sie sich an:{' '}
            <a href="mailto:info@2fast4sale.de" style={lnk}>info@2fast4sale.de</a>
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>9. Datensicherheit</h2>
          <p style={body}>
            Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten gegen zufällige
            oder vorsätzliche Manipulationen, Verlust, Zerstörung oder den Zugriff unberechtigter Personen zu
            schützen. Alle Verbindungen sind SSL/TLS-verschlüsselt. Passwörter werden gehasht gespeichert.
            Zahlungsdaten werden ausschließlich über PCI-DSS-zertifizierte Dienstleister verarbeitet.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>10. Änderungen dieser Datenschutzerklärung</h2>
          <p style={body}>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte Rechtslagen oder bei
            Änderungen des Dienstes zu aktualisieren. Die aktuelle Version ist stets unter /datenschutz abrufbar.
          </p>
        </div>

        <div style={foot}>
          <Link href="/impressum" style={lnk}>Impressum</Link>
          <Link href="/agb" style={lnk}>AGB</Link>
          <Link href="/" style={{ color: '#7a9cbc', textDecoration: 'none' }}>Startseite</Link>
        </div>

      </div>
    </div>
  );
}

