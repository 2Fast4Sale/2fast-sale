import Link from 'next/link';

export const metadata = {
  title: 'AGB | 2Fast4Sale',
  description: 'Allgemeine Geschäftsbedingungen von 2Fast4Sale',
};

const page:    React.CSSProperties = { minHeight: '100vh', background: '#f0f2f5', color: '#0f172a', fontFamily: '"Inter", -apple-system, sans-serif', padding: '60px 24px' };
const wrap:    React.CSSProperties = { maxWidth: '760px', margin: '0 auto' };
const h1style: React.CSSProperties = { fontSize: '36px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px', color: '#0f172a' };
const h2style: React.CSSProperties = { fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f8fafc', marginTop: '0' };
const body:    React.CSSProperties = { color: '#64748b', lineHeight: 1.8, margin: '0 0 12px', fontSize: '15px' };
const sec:     React.CSSProperties = { marginBottom: '36px' };
const foot:    React.CSSProperties = { marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '20px', fontSize: '14px' };
const lnk = { color: '#6366f1' };

export default function AGBPage() {
  return (
    <div style={page}>
      <div style={wrap}>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontSize: '14px', marginBottom: '40px' }}>
          ← Zurück zur Startseite
        </Link>

        <h1 style={h1style}>Allgemeine Geschäftsbedingungen</h1>
        <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '48px' }}>Stand: Juni 2026 — 2Fast4Sale</p>

        <div style={sec}>
          <h2 style={h2style}>§ 1 Geltungsbereich</h2>
          <p style={body}>
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen{' '}
            Fabian Barjamasi, 2Fast4Sale, [Straße, PLZ, Stadt] (nachfolgend „Anbieter") und den Nutzern der Plattform 2Fast4Sale
            (nachfolgend „Nutzer"). Abweichende Bedingungen des Nutzers werden nicht anerkannt.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 2 Leistungsbeschreibung</h2>
          <p style={body}>
            2Fast4Sale ist eine SaaS-Plattform für Gebrauchtwagenhändler, die folgende Dienste anbietet:
          </p>
          <ul style={{ color: '#64748b', lineHeight: 1.8, paddingLeft: '20px', margin: '0 0 12px' }}>
            <li>KI-gestützte Erstellung von Fahrzeuginseraten</li>
            <li>Automatische Auslese von Fahrzeugscheinen (OCR/KI)</li>
            <li>KI-Bildbearbeitung und Hintergrundersatz</li>
            <li>Export von Inseraten zu Plattformen wie mobile.de und AutoScout24</li>
            <li>Verwaltung und Archivierung von Fahrzeugdaten</li>
          </ul>
          <p style={body}>
            Der Anbieter stellt die Plattform als Software-as-a-Service (SaaS) zur Verfügung. Ein Anspruch
            auf bestimmte Verfügbarkeit oder Fehlerfreiheit besteht nicht, soweit gesetzlich zulässig.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 3 Registrierung & Nutzerkonto</h2>
          <p style={body}>
            Die Nutzung der Plattform setzt eine Registrierung voraus. Der Nutzer ist verpflichtet, wahrheitsgemäße
            Angaben zu machen und diese aktuell zu halten. Pro Person / Unternehmen ist grundsätzlich ein Konto
            zulässig. Mehrere Mitarbeiter eines Händlers nutzen dasselbe Konto.
          </p>
          <p style={body}>
            Der Nutzer ist für die Sicherheit seiner Zugangsdaten selbst verantwortlich. Bei Verdacht auf
            Missbrauch ist der Anbieter unverzüglich zu informieren.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 4 Preise und Abrechnung</h2>
          <p style={body}>
            Die Nutzung wird nach tatsächlich erstellten Inseraten abgerechnet. Ein Inserat kostet
            10,00 €. Hinzu kommt eine monatliche Grundgebühr von 50 €, die bereits erste Leistungen
            wie Speicherplatz und Export enthält.
          </p>
          <p style={body}>
            Zum Kennenlernen gibt es den Probelauf: 5 € für zwei vollständige Inserate, ohne
            Grundgebühr und ohne weitere Verpflichtung.
          </p>
          <p style={body}>
            Alternativ können Pakete im Voraus gekauft werden. Sie enthalten eine feste Anzahl
            Inserate zu einem günstigeren Preis je Inserat sowie die Grundgebühr. Ein Paket verfällt
            nicht automatisch; nicht genutzte Inserate bleiben erhalten, solange das Konto besteht.
          </p>
          <p style={body}>
            Je Inserat sind Studio-Bilder in einem festen Kontingent enthalten. Darüber hinaus
            erzeugte Bilder werden einzeln berechnet. Optionale Zusatzleistungen, etwa der Abruf von
            Ausstattungsdaten über die Fahrgestellnummer, werden gesondert ausgewiesen.
          </p>
          <p style={body}>
            Alle Preise verstehen sich in Euro. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet
            (Kleinunternehmerregelung). Die jeweils gültigen Preise stehen unter
            <Link href="/dashboard/pricing" style={{ ...lnk, marginLeft: '4px' }}>Preise</Link> und
            werden vor jedem Kauf angezeigt.
          </p>
          <p style={body}>
            Preisänderungen werden mindestens 30 Tage vor Inkrafttreten per E-Mail angekündigt.
            Bereits gekaufte Pakete und Guthaben sind davon nicht betroffen.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 5 Laufzeit und Kündigung</h2>
          <p style={body}>
            Es gibt keine Mindestlaufzeit. Die monatliche Grundgebühr kann jederzeit zum Ende des
            laufenden Abrechnungsmonats gekündigt werden; eine automatische Verlängerung über die
            Kündigung hinaus findet nicht statt.
          </p>
          <p style={body}>
            Der Probelauf ist eine einmalige Zahlung und muss nicht gekündigt werden. Pakete sind
            ebenfalls Einmalkäufe ohne Laufzeit.
          </p>
          <p style={body}>
            Die Kündigung erfolgt über die Seite
            <Link href="/kuendigung" style={{ ...lnk, marginLeft: '4px' }}>Vertrag kündigen</Link>,
            im Dashboard unter „Mein Abo" oder per E-Mail an
            <a href="mailto:info@2fast4sale.com" style={{ ...lnk, marginLeft: '4px' }}>info@2fast4sale.com</a>.
          </p>
          <p style={body}>
            Der Anbieter behält sich das Recht vor, Nutzerkonten bei Verstößen gegen diese AGB oder bei
            Zahlungsverzug zu sperren. Bereits bezahltes, ungenutztes Guthaben wird in diesem Fall
            erstattet, soweit die Sperre nicht auf einem Verstoß des Nutzers beruht.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 6 Widerrufsrecht</h2>
          <p style={body}>
            <strong style={{ color: '#0f172a' }}>Für Verbraucher</strong> gilt: Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen
            diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt 14 Tage ab Vertragsschluss.
          </p>
          <p style={body}>
            Das Widerrufsrecht erlischt vorzeitig, wenn der Anbieter die Leistung vollständig erbracht hat und
            der Nutzer vorher ausdrücklich zugestimmt hat, dass die Ausführung vor Ablauf der Widerrufsfrist
            beginnt, und zugleich bestätigt hat, dass er damit sein Widerrufsrecht verliert (§ 356 Abs. 4 und
            Abs. 5 BGB). Diese Zustimmung wird vor jedem Kauf von Guthaben oder eines Pakets ausdrücklich
            eingeholt; erst danach wird das erste Inserat erstellt.
          </p>
          <p style={body}>
            <strong style={{ color: '#0f172a' }}>Für Unternehmer</strong> (gewerbliche Händler) gilt kein Verbraucher-Widerrufsrecht.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 7 Nutzungspflichten & verbotene Inhalte</h2>
          <p style={body}>Der Nutzer verpflichtet sich, keine Inhalte einzustellen die:</p>
          <ul style={{ color: '#64748b', lineHeight: 1.8, paddingLeft: '20px', margin: '0 0 12px' }}>
            <li>gegen geltendes Recht verstoßen</li>
            <li>Rechte Dritter (Urheberrecht, Markenrecht) verletzen</li>
            <li>irreführende oder falsche Fahrzeugangaben enthalten</li>
            <li>Spam oder unerwünschte Werbung darstellen</li>
          </ul>
          <p style={body}>
            Der Nutzer ist für alle über sein Konto eingestellten Inhalte selbst verantwortlich und stellt
            den Anbieter von Ansprüchen Dritter frei.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 8 KI-generierte Inhalte</h2>
          <p style={body}>
            Beschreibungen, die durch KI generiert werden, sind Vorschläge und müssen vom Nutzer vor
            Veröffentlichung auf Richtigkeit und Vollständigkeit geprüft werden. Der Anbieter übernimmt
            keine Haftung für fehlerhafte KI-Ausgaben oder daraus resultierende Schäden.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 9 Verfügbarkeit & Wartung</h2>
          <p style={body}>
            Der Anbieter bemüht sich um eine Verfügbarkeit von 99 % im Jahresdurchschnitt, schließt jedoch
            geplante Wartungsfenster davon aus. Bei Störungen informiert der Anbieter die Nutzer zeitnah.
            Ein Anspruch auf Schadenersatz wegen Ausfällen besteht nur bei grober Fahrlässigkeit oder Vorsatz.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 10 Haftungsbeschränkung</h2>
          <p style={body}>
            Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit. Für leichte Fahrlässigkeit
            haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten),
            begrenzt auf den vorhersehbaren, vertragstypischen Schaden. Die Haftung ist auf die in den
            letzten 12 Monaten gezahlten Abo-Gebühren begrenzt. Die Haftung für entgangenen Gewinn und
            mittelbare Schäden ist ausgeschlossen, soweit gesetzlich zulässig.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 11 Datenschutz</h2>
          <p style={body}>
            Informationen zur Verarbeitung personenbezogener Daten finden sich in unserer{' '}
            <Link href="/datenschutz" style={lnk}>Datenschutzerklärung</Link>.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 12 Änderungen der AGB</h2>
          <p style={body}>
            Der Anbieter behält sich vor, diese AGB mit einer Ankündigungsfrist von 30 Tagen zu ändern.
            Änderungen werden per E-Mail mitgeteilt. Widerspricht der Nutzer nicht innerhalb von 30 Tagen,
            gelten die neuen AGB als akzeptiert.
          </p>
        </div>

        <div style={sec}>
          <h2 style={h2style}>§ 13 Schlussbestimmungen</h2>
          <p style={body}>
            Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
            Gerichtsstand für Streitigkeiten mit Kaufleuten ist{' '}
            {/* ⚠️ PLATZHALTER — Sitz des Unternehmens eintragen */}
            [Stadt des Unternehmenssitzes].
          </p>
          <p style={body}>
            Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen
            Bestimmungen davon unberührt.
          </p>
        </div>

        <div style={foot}>
          <Link href="/impressum" style={lnk}>Impressum</Link>
          <Link href="/datenschutz" style={lnk}>Datenschutz</Link>
          <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Startseite</Link>
        </div>

      </div>
    </div>
  );
}

