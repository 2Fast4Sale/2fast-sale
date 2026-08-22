'use client';

/**
 * Startseite.
 *
 * Bewusst ohne Sozialbeweis: Es gibt noch keine Kunden, also gibt es auch
 * keine Kundenstimmen, keine Referenzlogos und keine Nutzungszahlen. Die
 * vorherige Fassung behauptete "34k+ Inserate erstellt", "98 % Zufriedenheit"
 * und nannte vier Händler namentlich — alles frei erfunden. Das ist
 * irreführende Werbung nach § 5 UWG und zerstört ausserdem Vertrauen, sobald
 * jemand nachfragt.
 *
 * Stattdessen: konkret zeigen, was das Werkzeug tut. Für einen Händler ist
 * "Fahrzeugschein abfotografieren, Felder sind gefüllt" überzeugender als eine
 * Zahl, die er nicht überprüfen kann.
 *
 * Angaben zu Funktionen entsprechen dem tatsächlichen Stand. Was noch nicht
 * läuft — der Direktexport zu mobile.de und AutoScout24 — steht als geplant
 * gekennzeichnet und nicht als Versprechen.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PAKETE, GRUNDGEBUEHR_CENT, PREIS_PRO_INSERAT_CENT, euro } from '../lib/preismodell';
import {
  ArrowRight, ScanLine, Camera, Sparkles, FileDown, Check, Menu, X,
  ShieldCheck, Clock, Layers, Gauge, ChevronDown,
} from 'lucide-react';
import StudioVisual from './components/StudioVisual';
import './styles/homepage.css';

/* ── Was das Werkzeug tatsächlich tut ─────────────────────────────────── */
const SCHRITTE = [
  {
    icon: <ScanLine size={22} />,
    titel: 'Fahrzeugschein abfotografieren',
    text: 'Marke, Modell, Erstzulassung, Hubraum, Leistung, Farbe und die Schlüsselnummern aus Feld 22 werden ausgelesen und eingetragen.',
  },
  {
    icon: <Camera size={22} />,
    titel: 'Fotos aufnehmen',
    text: 'Die geführte Aufnahme sagt dir Schritt für Schritt, wo du stehen musst — acht Aussenwinkel in Rundum-Reihenfolge plus Innenraum.',
  },
  {
    icon: <Sparkles size={22} />,
    titel: 'Studio und Text',
    text: 'Die Fahrzeuge werden freigestellt, mit Schatten in einen Studio-Hintergrund gesetzt. Titel und Beschreibung entstehen aus den Fahrzeugdaten.',
  },
  {
    icon: <FileDown size={22} />,
    titel: 'Übernehmen',
    text: 'Fotopaket und PDF-Datenblatt herunterladen und dort einstellen, wo du verkaufst.',
  },
];

const FUNKTIONEN = [
  { icon: <ScanLine size={20} />,   titel: 'Fahrzeugschein-Scan',   text: 'Erkennt die Felder der Zulassungsbescheinigung Teil I und die Schlüsselnummern. Unplausible Werte werden verworfen statt übernommen.' },
  { icon: <Gauge size={20} />,      titel: 'Ausstattungserkennung',  text: 'Erkennt Navi, Sitzheizung, Felgen und Assistenzsysteme auf deinen Fotos — an dem, was tatsächlich zu sehen ist, nicht an der Fahrgestellnummer geraten.' },
  { icon: <Camera size={20} />,     titel: 'Geführte Aufnahme',     text: 'Zwölf Winkel mit Silhouette zum Ausrichten. Die Aussenaufnahmen liegen in Rundum-Reihenfolge, dadurch entsteht die 360°-Ansicht von selbst.' },
  { icon: <Layers size={20} />,     titel: 'Studio-Hintergründe',   text: 'Zehn Räume von hellem Studio bis Industrieloft. Alle Fotos eines Fahrzeugs bekommen denselben Hintergrund.' },
  { icon: <Sparkles size={20} />,   titel: 'Beschreibung und Titel', text: 'Entstehen aus den erfassten Daten. Du kannst einen eigenen Beispieltitel hinterlegen, an dem sich die Formulierung orientiert.' },
  { icon: <ShieldCheck size={20} />,titel: 'EnVKV-Pflichtangaben',  text: 'Bei Neuwagen, Tageszulassungen und Vorführwagen sind Verbrauch, CO₂-Wert und CO₂-Klasse vorgeschrieben. Die Klasse wird berechnet, der Pflichttext erzeugt.' },
  { icon: <FileDown size={20} />,   titel: 'PDF und Fotopaket',     text: 'Datenblatt zum Aushängen und alle Bilder nummeriert als ZIP — die Reihenfolge bestimmt beim Hochladen das Titelbild.' },
  { icon: <Clock size={20} />,      titel: 'Direktexport',          text: 'Übertragung zu mobile.de und AutoScout24 ist in Vorbereitung.', geplant: true },
];

/*
 * Die Beträge kommen aus lib/preismodell und stehen nicht mehr hier.
 * Vorher warben diese Zeilen noch Monats-Abos zu 99,49 €, während
 * längst pro Inserat abgerechnet wurde — die Website hat monatelang
 * etwas anderes versprochen, als die Rechnung dann sagte.
 */
const PLAENE = [
  {
    name: 'Ohne Paket',
    preisCent: GRUNDGEBUEHR_CENT,
    zusatz: `+ ${euro(PREIS_PRO_INSERAT_CENT)} € je Inserat`,
    inserate: 'Beliebig viele, einzeln abgerechnet',
    merkmale: ['Studio-Hintergründe', 'Beschreibung und Titel', 'Fahrzeugschein-Scan'],
    cta: 'Kostenlos anlegen',
    ziel: '/auth/register',
    beliebt: false,
  },
  ...PAKETE.map((p, i) => ({
    name: p.name,
    preisCent: p.preisCent,
    zusatz: `entspricht ${euro(Math.round(p.preisCent / p.inserate))} € je Inserat`,
    inserate: `${p.inserate} Inserate im Monat enthalten`,
    /*
     * Nur Merkmale, die es gibt. Hier stand bei Paket L "Bis zu 10
     * Nutzerkonten" — das habe ich aus der alten Preisseite uebernommen,
     * ohne es zu pruefen. Es existiert nicht: keine Tabelle, kein Code.
     */
    merkmale: i === 0
      ? ['Alles ohne Paket', 'Eigener Showroom als Hintergrund', '15 Studio-Bilder je Inserat']
      : i === 1
        ? ['Alles aus Paket S', 'Firmen-Wasserzeichen', '20 Studio-Bilder je Inserat']
        : ['Alles aus Paket M', 'Statistiken zu deinen Inseraten', '30 Studio-Bilder je Inserat'],
    cta: `${p.name} wählen`,
    ziel: '/dashboard/pricing',
    // Das mittlere Paket hervorheben: Es deckt die Menge ab, die ein
    // Händler mit durchschnittlichem Bestand tatsächlich einstellt.
    beliebt: i === 1,
  })),
];

const FRAGEN = [
  {
    f: 'Brauche ich eine besondere Kamera?',
    a: 'Nein. Ein Handy reicht. Die geführte Aufnahme sagt dir, wo du stehen musst — das ist wichtiger als die Kamera.',
  },
  {
    f: 'Stellt ihr direkt auf mobile.de ein?',
    a: 'Noch nicht. Du lädst Fotopaket und Text herunter und stellst damit selbst ein. Die direkte Übertragung ist in Vorbereitung; ehrlicher wäre es, sie erst zu bewerben, wenn sie läuft.',
  },
  {
    f: 'Was passiert mit meinen Fotos?',
    a: 'Sie liegen in deinem Konto und werden für die Bearbeitung an unseren Dienstleister für Bildfreistellung übertragen. Weitergegeben werden sie nicht.',
  },
  {
    f: 'Kann ich monatlich kündigen?',
    a: 'Ja. Die Abrechnung läuft monatlich, es gibt keine Mindestlaufzeit.',
  },
  {
    f: 'Was ist mit den gesetzlichen Verbrauchsangaben?',
    a: 'Bei Neuwagen, Tageszulassungen und Vorführwagen erinnert dich das Formular an die Pflichtangaben und erzeugt den vorgeschriebenen Text. Bei Gebrauchtwagen kannst du Werte freiwillig ergänzen.',
  },
];

export default function Startseite() {
  const [gescrollt, setGescrollt] = useState(false);
  const [menuOffen, setMenuOffen] = useState(false);
  const [frageOffen, setFrageOffen] = useState<number | null>(null);

  useEffect(() => {
    const beiScroll = () => setGescrollt(window.scrollY > 20);
    beiScroll();
    window.addEventListener('scroll', beiScroll, { passive: true });
    return () => window.removeEventListener('scroll', beiScroll);
  }, []);

  return (
    <div className="homepage">

      {/* ══ NAVIGATION ══ */}
      <nav className={`navbar ${gescrollt ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          <Link href="/" className="nav-logo">2Fast<span className="logo-accent">4</span>Sale</Link>

          <div className="nav-links">
            <a href="#funktionen">Funktionen</a>
            <a href="#ablauf">Ablauf</a>
            <a href="#preise">Preise</a>
            <Link href="/kontakt">Kontakt</Link>
          </div>

          <div className="nav-actions">
            <Link href="/auth/login" className="nav-btn-ghost">Anmelden</Link>
            <Link href="/auth/register" className="nav-btn-primary">Kostenlos testen</Link>
          </div>

          <button
            className="nav-mobile-toggle"
            onClick={() => setMenuOffen(o => !o)}
            aria-label={menuOffen ? 'Menü schliessen' : 'Menü öffnen'}
          >
            {menuOffen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOffen && (
          <div className="nav-mobile-menu">
            <a href="#funktionen" onClick={() => setMenuOffen(false)}>Funktionen</a>
            <a href="#ablauf"     onClick={() => setMenuOffen(false)}>Ablauf</a>
            <a href="#preise"     onClick={() => setMenuOffen(false)}>Preise</a>
            <Link href="/kontakt" onClick={() => setMenuOffen(false)}>Kontakt</Link>
            <Link href="/auth/login"    className="mob-dash-link" onClick={() => setMenuOffen(false)}>Anmelden</Link>
            <Link href="/auth/register" className="mob-cta-link"  onClick={() => setMenuOffen(false)}>Kostenlos testen</Link>
          </div>
        )}
      </nav>

      {/* ══ EINSTIEG ══ */}
      <section className="hero-section">
        <div className="hero-container">
          <span className="hero-badge">Für Autohäuser und Gebrauchtwagenhändler</span>

          <h1 className="hero-title">
            Vom Fahrzeugschein zum<br />
            <span className="gradient-text">fertigen Inserat</span>
          </h1>

          <p className="hero-subtitle">
            Schein abfotografieren, Fotos machen, fertig. Die Daten werden ausgelesen,
            die Bilder ins Studio gesetzt, Titel und Beschreibung geschrieben.
            Du lädst alles herunter und stellst ein.
          </p>

          <div className="hero-buttons">
            <Link href="/auth/register" className="btn-hero-primary">
              Kostenlos testen <ArrowRight size={17} />
            </Link>
            <a href="#ablauf" className="btn-hero-ghost">So funktioniert es</a>
          </div>

          {/*
            Hier stand "Drei Inserate im Starter-Tarif kostenlos" — den
            Starter-Tarif gibt es im Paketmodell nicht mehr. Ein Versprechen
            auf der Startseite, das im Konto nicht eingelöst wird, ist der
            erste Eindruck, den ein Händler behält.
          */}
          <p className="hero-note">
            Konto kostenlos anlegen · Keine Zahlungsdaten nötig · Monatlich kündbar
          </p>
        </div>

        {/* Das Produkt zeigen statt beschreiben */}
        <div className="hero-visual">
          <StudioVisual />
        </div>
      </section>

      {/* ══ ABLAUF ══ */}
      {/*
        Bewusst zweispaltig statt zentriertem Raster wie die anderen
        Abschnitte. Acht Mal dasselbe Layout liest sich wie eine Foliensammlung.
      */}
      <section className="how-section" id="ablauf">
        <div className="section-inner how-split">
          <div className="how-intro">
            <span className="eyebrow">Ablauf</span>
            <h2>In vier Schritten<br />zum Inserat</h2>
            <p>
              Der zeitraubende Teil beim Inserieren sind Fotos und Text.
              Genau den nimmt dir das Werkzeug ab — das Formular füllt sich
              aus dem Fahrzeugschein, die Bilder kommen ins Studio.
            </p>
            <Link href="/auth/register" className="btn-hero-ghost how-cta">
              Kostenlos ausprobieren <ArrowRight size={16} />
            </Link>
          </div>

          <ol className="steps-list">
            {SCHRITTE.map((s, i) => (
              <li className="step-row" key={s.titel}>
                <span className="step-marker">{i + 1}</span>
                <div className="step-body">
                  <h3>{s.titel}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══ FUNKTIONEN ══ */}
      <section className="features-section" id="funktionen">
        <div className="section-inner">
          <h2 className="section-title">Was drin ist</h2>
          <p className="section-subtitle">
            Alles was unten steht, funktioniert heute. Was noch nicht läuft, ist als solches gekennzeichnet.
          </p>

          <div className="features-grid">
            {FUNKTIONEN.map(f => (
              <div className={`feature-card${f.geplant ? ' feature-geplant' : ''}`} key={f.titel}>
                <div className="feature-icon-wrap">{f.icon}</div>
                <h3>
                  {f.titel}
                  {f.geplant && <span className="feature-badge">in Vorbereitung</span>}
                </h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PREISE ══ */}
      <section className="pricing-section" id="preise">
        <div className="section-inner">
          <h2 className="section-title">Preise</h2>
          <p className="section-subtitle">Monatlich kündbar. Preise zzgl. gesetzlicher Umsatzsteuer.</p>

          <div className="pricing-grid">
            {PLAENE.map(p => (
              <div className={`pricing-card${p.beliebt ? ' popular' : ''}`} key={p.name}>
                {p.beliebt && <span className="popular-badge">Meist gewählt</span>}
                <h3 className="pricing-name">{p.name}</h3>
                <div className="pricing-price">
                  <span className="price-value">{euro(p.preisCent)}</span>
                  <span className="price-unit">€ / Monat</span>
                </div>
                <p className="pricing-extra">{p.zusatz}</p>
                <p className="pricing-listings">{p.inserate}</p>
                <ul className="pricing-features">
                  {p.merkmale.map(m => (
                    <li key={m}><Check size={15} /> {m}</li>
                  ))}
                </ul>
                <Link href={p.ziel} className="btn-pricing">{p.cta}</Link>
              </div>
            ))}
          </div>

          <p className="pricing-note">
            Über dem Kontingent läuft es mit {euro(PREIS_PRO_INSERAT_CENT)} € je Inserat weiter — ab
            der Menge, ab der sich das nächstgrössere Paket lohnt, weisen wir im Konto darauf hin.
            Grössere Bestände? <Link href="/kontakt">Sprich uns an</Link>.
          </p>
        </div>
      </section>

      {/* ══ FRAGEN ══ */}
      <section className="faq-section">
        <div className="section-inner section-narrow">
          <h2 className="section-title">Häufige Fragen</h2>

          <div className="faq-list">
            {FRAGEN.map((q, i) => (
              <div className={`faq-item${frageOffen === i ? ' open' : ''}`} key={q.f}>
                <button
                  className="faq-question"
                  onClick={() => setFrageOffen(frageOffen === i ? null : i)}
                  aria-expanded={frageOffen === i}
                >
                  {q.f}
                  <ChevronDown size={18} />
                </button>
                {frageOffen === i && <p className="faq-answer">{q.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABSCHLUSS ══ */}
      <section className="cta-section">
        <div className="section-inner section-narrow">
          <h2 className="cta-title">Probier es an einem Fahrzeug aus</h2>
          <p className="cta-text">
            Drei Inserate sind kostenlos. Danach entscheidest du, ob es dir die Zeit wert ist.
          </p>
          <Link href="/auth/register" className="btn-hero-primary">
            Kostenlos testen <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* ══ FUSSBEREICH ══ */}
      <footer className="site-footer">
        <div className="section-inner footer-inner">
          <div className="footer-brand">
            <span className="nav-logo">2Fast<span className="logo-accent">4</span>Sale</span>
            <p>Inserate für Autohändler — schneller erstellt.</p>
          </div>
          <div className="footer-links">
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
            <Link href="/agb">AGB</Link>
            <Link href="/kontakt">Kontakt</Link>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} 2Fast4Sale
        </div>
      </footer>
    </div>
  );
}
