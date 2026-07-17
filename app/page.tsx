'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Sparkles, Zap, Shield, BarChart3, Camera, FileText,
  CheckCircle2, ChevronDown, Star, TrendingUp,
  Globe, Cpu, Image, AlignLeft, ExternalLink, Menu, X, Play
} from 'lucide-react';
import './styles/homepage.css';

/* Animated counter hook */
function useCounter(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return value;
}

export default function HomePage() {
  const [scrolled, setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq]     = useState<number | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const c1 = useCounter(34000, 1600, statsVisible);
  const c2 = useCounter(98,    1400, statsVisible);
  const c3 = useCounter(2,     1000, statsVisible);
  const c4 = useCounter(3,     1200, statsVisible);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const stats = [
    { value: c1 >= 34000 ? '34k+' : c1 > 999 ? `${(c1/1000).toFixed(0)}k` : String(c1), label: 'Inserate erstellt' },
    { value: `${c2}%`,  label: 'Zufriedenheit' },
    { value: `${c3} Min`, label: 'pro Inserat' },
    { value: `${c4}x`, label: 'schnellere Verkäufe' },
  ];

  return (
    <div className="homepage">

      {/* ══ NAVBAR ══ */}
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          <Link href="/" className="nav-logo">2Fast<span className="logo-accent">4</span>Sale</Link>

          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">So geht's</a>
            <a href="#pricing">Preise</a>
            <Link href="/ueber-uns">Über uns</Link>
          </div>

          <div className="nav-actions">
            <Link href="/auth/login" className="nav-btn-ghost">Einloggen</Link>
            <Link href="/dashboard" className="nav-btn-dash">
              <BarChart3 size={13} /> Dashboard
            </Link>
            <Link href="/auth/register" className="nav-btn-primary">Kostenlos starten</Link>
          </div>

          <Link href="/dashboard" className="nav-mobile-dash">
            <BarChart3 size={13} /> Dashboard
          </Link>
          <button className="nav-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="nav-mobile-menu">
            <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#how" onClick={() => setMobileOpen(false)}>So geht's</a>
            <a href="#pricing" onClick={() => setMobileOpen(false)}>Preise</a>
            <Link href="/ueber-uns" onClick={() => setMobileOpen(false)}>Über uns</Link>
            <Link href="/dashboard" className="mob-dash-link" onClick={() => setMobileOpen(false)}>Dashboard öffnen</Link>
            <Link href="/auth/register" className="mob-cta-link" onClick={() => setMobileOpen(false)}>Kostenlos starten</Link>
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="gradient-orb orb-1" />
          <div className="gradient-orb orb-2" />
          <div className="gradient-orb orb-3" />
        </div>

        <div className="hero-container">
          <div className="hero-badge">
            <Sparkles size={13} />
            <span>KI-gestützte Inserat-Erstellung &mdash; Version 2.0</span>
          </div>

          <h1 className="hero-title">
            Fahrzeuge verkaufen<br />
            <span className="gradient-text">schneller als je zuvor.</span>
          </h1>

          <p className="hero-subtitle">
            Fahrzeugschein scannen, Fotos hochladen, fertig. 2fast4sale generiert automatisch
            professionelle Studio-Fotos, KI-Beschreibungen und veröffentlicht direkt auf
            mobile.de &amp; AutoScout24 &mdash; in unter 2 Minuten.
          </p>

          <div className="hero-buttons">
            <Link href="/auth/register" className="btn-hero-primary">
              Kostenlos starten <ArrowRight size={17} />
            </Link>
            <Link href="/dashboard" className="btn-hero-dash">
              <BarChart3 size={16} /> Dashboard öffnen
            </Link>
            <a href="#how" className="btn-hero-secondary">
              <Play size={14} /> Demo ansehen
            </a>
          </div>

          <div className="hero-trust">
            <span className="trust-label">Vertraut von</span>
            {['Auto Muller GmbH', 'Gebrauchtwagen Konig', 'Autohaus Schneider', 'CarWorld Berlin'].map(n => (
              <span key={n} className="trust-name">{n}</span>
            ))}
          </div>

          <div className="hero-stats" ref={statsRef}>
            {stats.map(s => (
              <div key={s.label} className="stat-item">
                <div className="stat-number">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Vorher / Nachher */}
        <div className="hero-demo">
          <div className="demo-card">
            <div className="demo-badge bad">Vorher</div>
            <img
              src="https://boostfactory.pl/wp-content/uploads/2025/07/505177176_1260870776043844_8277089190563971341_n.jpg"
              alt="Parkplatz-Foto vorher"
            />
            <div className="demo-label-overlay bad-overlay">Parkplatz-Foto &mdash; 30 Sek.</div>
          </div>
          <div className="demo-arrow-wrap">
            <div className="demo-arrow-line" />
            <div className="demo-ai-badge"><Sparkles size={14} /> KI</div>
            <div className="demo-arrow-line" />
          </div>
          <div className="demo-card studio">
            <div className="demo-badge good">Nachher</div>
            <img
              src="https://img.classistatic.de/api/v1/mo-prod/images/09/09330bdb-f81a-4b46-9e36-515666293e20?rule=mo-1600"
              alt="Studio-Rendering nachher"
            />
            <div className="demo-label-overlay good-overlay">Studio-Rendering &mdash; 2 Min.</div>
          </div>
        </div>
      </section>

      {/* ══ PLATTFORM-LOGOS ══ */}
      <section className="platforms-section">
        <div className="section-container">
          <p className="platforms-label">Direktexport auf alle großen Plattformen</p>
          <div className="platforms-row">
            {[
              { name: 'mobile.de',   color: '#f97316' },
              { name: 'AutoScout24', color: '#2563eb' },
              { name: 'PDF Export',  color: '#ef4444' },
              { name: 'AutoUncle',   color: '#10b981' },
              { name: 'Heycar',      color: '#8b5cf6' },
            ].map(p => (
              <div key={p.name} className="platform-chip">
                <div className="platform-dot" style={{ background: p.color }} />
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="how-section" id="how">
        <div className="section-container">
          <div className="section-header">
            <div className="section-tag">So einfach geht's</div>
            <h2>4 Schritte. 2 Minuten. Fertig.</h2>
            <p>Kein Fachwissen nötig. Einfach hochladen und die KI macht den Rest.</p>
          </div>

          <div className="steps-row">
            {[
              { num: '01', icon: <FileText size={26} />, title: 'Dokument scannen',  desc: 'Fahrzeugschein fotografieren &mdash; KI liest alle Daten automatisch aus: Marke, Modell, FIN, PS, Hubraum und Ausstattung.', color: '#3b82f6' },
              { num: '02', icon: <Camera size={26} />,   title: 'Fotos hochladen',   desc: 'Beliebige Handy-Fotos reichen. Die KI entfernt den Hintergrund und ersetzt ihn mit einem professionellen Studio.', color: '#8b5cf6' },
              { num: '03', icon: <Sparkles size={26} />, title: 'KI-Studio rendern', desc: 'Dein Fahrzeug erscheint in einem hochwertigen Showroom. Automatischer Schatten, perfekte Beleuchtung, professioneller Look.', color: '#10b981' },
              { num: '04', icon: <Globe size={26} />,    title: 'Publizieren',        desc: 'Ein Klick &mdash; direkt auf mobile.de &amp; AutoScout24 oder als ZIP/PDF exportieren. Fertig in unter 2 Minuten.', color: '#f59e0b' },
            ].map((step, i) => (
              <React.Fragment key={step.num}>
                <div className="step-card" style={{ '--step-color': step.color } as React.CSSProperties}>
                  <div className="step-num">{step.num}</div>
                  <div className="step-icon-wrap" style={{ background: `${step.color}18`, color: step.color, border: `1px solid ${step.color}30` }}>{step.icon}</div>
                  <h3>{step.title}</h3>
                  <p dangerouslySetInnerHTML={{ __html: step.desc }} />
                </div>
                {i < 3 && (
                  <div className="step-connector">
                    <ArrowRight size={18} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="how-cta">
            <Link href="/auth/register" className="btn-hero-primary">
              Jetzt kostenlos testen <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <div className="section-tag">Features</div>
            <h2>Alles was du brauchst</h2>
            <p>Von der Dokumentenanalyse bis zur Veröffentlichung &mdash; komplett automatisiert.</p>
          </div>

          <div className="features-grid">
            {[
              { icon: <FileText size={22} />,     title: 'OCR Dokumentenscan',      desc: 'KI liest den Fahrzeugschein automatisch &mdash; Marke, FIN, PS, Hubraum, Ausstattung. Kein manuelles Tippen mehr.', color: '#3b82f6', badge: 'Core' },
              { icon: <Image size={22} />,        title: 'KI Studio-Rendering',      desc: 'fal.ai &amp; PhotoRoom entfernen den Hintergrund und platzieren das Fahrzeug in einem professionellen Studio.', color: '#8b5cf6', badge: 'Pro' },
              { icon: <AlignLeft size={22} />,    title: 'KI Inseratsbeschreibung',  desc: 'Claude KI generiert automatisch professionelle, kaufmotivierende Beschreibungen auf Basis aller Fahrzeugdaten.', color: '#10b981', badge: 'Core' },
              { icon: <Cpu size={22} />,          title: 'Ausstattungserkennung',    desc: 'Die KI analysiert Fotos und erkennt sichtbare Extras: Sitzheizung, Navi, Sportpaket und mehr.', color: '#f59e0b', badge: 'Pro' },
              { icon: <ExternalLink size={22} />, title: 'Multi-Plattform Export',   desc: 'Direktexport zu mobile.de &amp; AutoScout24. Oder als druckfahiges PDF mit QR-Code und allen Daten.', color: '#ef4444', badge: 'Core' },
              { icon: <Shield size={22} />,       title: 'DSGVO-konform',            desc: 'Alle Daten auf deutschen Servern. SSL-verschlüsselt, DSGVO-zertifiziert, keine Weitergabe an Dritte.', color: '#06b6d4', badge: 'Alle' },
              { icon: <Camera size={22} />,       title: 'Firmen-Wasserzeichen',     desc: 'Ab Premium wird dein Firmenname automatisch in jedes Foto eingeblendet &mdash; dezent und professionell.', color: '#a78bfa', badge: 'Premium' },
              { icon: <TrendingUp size={22} />,   title: 'Verkaufsanalysen',         desc: 'Dashboard mit Live-Statistiken: Aufrufe, Anfragen, Plattform-Performance und Verkaufszeiten.', color: '#34d399', badge: 'Pro' },
              { icon: <Zap size={22} />,          title: 'Team-Accounts',            desc: 'Mehrere Mitarbeiter konnen gleichzeitig Inserate bearbeiten. Rollenbasierte Zugriffsrechte inklusive.', color: '#fb923c', badge: 'Business' },
            ].map((f, i) => (
              <Link key={i} href="/features" style={{ textDecoration: 'none' }}>
                <div className="feature-card" style={{ '--accent': f.color } as React.CSSProperties}>
                  <div className="feature-card-header">
                    <div className="feature-icon-wrap" style={{ background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}22` }}>{f.icon}</div>
                    <span className="feature-badge" style={{ background: `${f.color}15`, color: f.color }}>{f.badge}</span>
                  </div>
                  <h3>{f.title}</h3>
                  <p dangerouslySetInnerHTML={{ __html: f.desc }} />
                  <span className="feature-link">Mehr erfahren <ArrowRight size={12} /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Für wen? ══ */}
      <section className="forwho-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-tag">Für wen?</div>
            <h2>Perfekt für jeden Händler</h2>
            <p>Egal ob Einzelhändler oder großes Autohaus &mdash; 2fast4sale wachst mit dir.</p>
          </div>
          <div className="forwho-grid">
            {[
              {
                icon: '🚗',
                title: 'Einzelhändler',
                desc: 'Du verkaufst 5&ndash;20 Fahrzeuge im Monat und willst weniger Zeit mit Inseraten verschwenden? Starter &amp; Basic sind genau das Richtige.',
                features: ['3&ndash;30 Inserate/Monat', 'Studio-Fotos &amp; KI-Beschreibung', 'PDF Export', 'Keine Bindung'],
                cta: 'Kostenlos starten',
                href: '/auth/register',
                color: '#3b82f6',
              },
              {
                icon: '🏢',
                title: 'Gebrauchtwagenhändler',
                desc: 'Du bearbeitest 30&ndash;150 Fahrzeuge im Monat. Premium gibt dir Wasserzeichen, Custom-Hintergründe und Direktexport auf alle Plattformen.',
                features: ['30&ndash;150 Inserate/Monat', 'Alle Hintergründe &amp; Wasserzeichen', 'mobile.de &amp; AutoScout24', 'Prioritats-Support'],
                cta: 'Premium entdecken',
                href: '/dashboard/pricing',
                color: '#7c3aed',
                popular: true,
              },
              {
                icon: '🏗️',
                title: 'Autohaus / Gruppe',
                desc: 'Du verwaltest über 100+ Fahrzeuge, mehrere Standorte oder ein Team? Business gibt dir unbegrenzte Inserate, API-Zugang und White-Label.',
                features: ['550+ Inserate/Monat', 'Team-Accounts &amp; API', 'White-Label Option', 'Dedizierter Ansprechpartner'],
                cta: 'Business anfragen',
                href: '/kontakt',
                color: '#f59e0b',
              },
            ].map((card, i) => (
              <div key={i} className={`forwho-card ${card.popular ? 'forwho-popular' : ''}`} style={{ '--card-color': card.color } as React.CSSProperties}>
                {card.popular && <div className="forwho-badge">Beliebteste Wahl</div>}
                <div className="forwho-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p dangerouslySetInnerHTML={{ __html: card.desc }} />
                <ul className="forwho-features">
                  {card.features.map((f, j) => (
                    <li key={j}><CheckCircle2 size={13} style={{ color: card.color, flexShrink: 0 }} /><span dangerouslySetInnerHTML={{ __html: f }} /></li>
                  ))}
                </ul>
                <Link href={card.href} className="forwho-cta" style={{ background: card.popular ? card.color : 'transparent', color: card.popular ? '#fff' : card.color, border: `1px solid ${card.color}40` }}>
                  {card.cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="testimonials-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-tag">Kundenstimmen</div>
            <h2>Was Händler sagen</h2>
            <p>Über 500 Autohändler vertrauen bereits auf 2fast4sale.</p>
          </div>
          <div className="testimonials-grid">
            {[
              { text: '"Früher haben wir 2 Stunden für ein Inserat gebraucht. Mit 2fast4sale sind wir in 5 Minuten fertig. Die Studio-Fotos sehen besser aus als unsere alten Profi-Aufnahmen."', name: 'Thomas K.', role: 'Autohaus Köln &mdash; 120 Fzg./Monat', avatar: 'T' },
              { text: '"Der Dokumentenscan ist der absolute Gamechanger. Kein manuelles Tippen mehr. Die KI erkennt sogar die Ausstattung aus den Fotos &mdash; unglaublich genau."', name: 'Sandra M.', role: 'Gebrauchtwagenhändlerin, Hamburg', avatar: 'S' },
              { text: '"Wir haben unsere Verkaufszeit um 40% reduziert seitdem wir auf 2fast4sale umgestellt haben. Die professionellen Bilder machen einen riesigen Unterschied."', name: 'Michael B.', role: 'Autohandel Berlin &mdash; 80 Fzg./Monat', avatar: 'M' },
            ].map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="stars">★★★★★</div>
                <p className="testimonial-text">{t.text}</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{t.avatar}</div>
                  <div>
                    <div className="author-name">{t.name}</div>
                    <div className="author-role" dangerouslySetInnerHTML={{ __html: t.role }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section className="pricing-section" id="pricing">
        <div className="section-container">
          <div className="section-header">
            <div className="section-tag">Preise</div>
            <h2>Einfach. Transparent. Fair.</h2>
            <p>Keine versteckten Kosten. Jederzeit kündbar.</p>
          </div>

          <div className="pricing-grid">
            {[
              {
                name: 'Starter', price: '0', period: '',
                desc: 'Zum Testen &mdash; kostenlos, kein Risiko.',
                features: ['3 Inserate (einmalig)', 'KI Studio-Fotos', 'Dokumentenscan', 'PDF Export'],
                cta: 'Kostenlos starten', href: '/auth/register', primary: false,
              },
              {
                name: 'Basic', price: '99', sub: '49', period: '/ Monat',
                desc: 'Für Einzelhändler mit regelmäßigem Volumen.',
                features: ['30 Inserate / Monat', 'KI-Beschreibungen', 'Studio-Hintergründe', 'PDF + ZIP Export'],
                cta: 'Basic starten', href: '/dashboard/pricing', primary: false,
              },
              {
                name: 'Premium', price: '249', sub: '99', period: '/ Monat',
                desc: 'Mehr Volumen, Wasserzeichen, Custom-Hintergründe.',
                features: ['150 Inserate / Monat', 'Firmen-Wasserzeichen', 'Eigener Showroom-Upload', 'mobile.de &amp; AutoScout24', 'Prioritats-Support'],
                cta: 'Premium starten', href: '/dashboard/pricing', primary: true, badge: 'Beliebteste Wahl',
              },
              {
                name: 'Business', price: '699', sub: '99', period: '/ Monat',
                desc: 'Für Autohäuser und Händlergruppen.',
                features: ['550 Inserate / Monat', 'Alle Premium-Features', 'Team-Accounts (bis 5)', 'API-Zugang', 'Dedizierter Support'],
                cta: 'Business starten', href: '/dashboard/pricing', primary: false,
              },
            ].map((plan, i) => (
              <div key={i} className={`pricing-card ${plan.primary ? 'popular' : ''}`}>
                {(plan as any).badge && <div className="popular-badge">{(plan as any).badge}</div>}
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price-row">
                  {plan.price !== '0' && <span className="currency">&euro;</span>}
                  <span className="amount">{plan.price === '0' ? 'Gratis' : plan.price}</span>
                  {(plan as any).sub && <span className="amount-sub">,{(plan as any).sub}</span>}
                  {plan.period && <span className="period">{plan.period}</span>}
                </div>
                <p className="plan-desc" dangerouslySetInnerHTML={{ __html: plan.desc }} />
                <Link href={plan.href} className={`btn-pricing ${plan.primary ? 'primary' : ''}`}>{plan.cta}</Link>
                <ul className="plan-features">
                  {plan.features.map((f, j) => (
                    <li key={j}><CheckCircle2 size={13} style={{ color: '#3b82f6', flexShrink: 0, opacity: 0.7 }} /><span dangerouslySetInnerHTML={{ __html: f }} /></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: '28px', color: '#1e3050', fontSize: '14px' }}>
            Benötigst du mehr?{' '}
            <Link href="/kontakt" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '700' }}>
              Enterprise anfragen &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="faq-section">
        <div className="section-container" style={{ maxWidth: '800px' }}>
          <div className="section-header">
            <div className="section-tag">FAQ</div>
            <h2>Häufige Fragen</h2>
          </div>
          <div className="faq-list">
            {[
              { q: 'Wie lange dauert ein Inserat?', a: 'Im Durchschnitt 2 Minuten. Fahrzeugschein scannen dauert 30 Sekunden, Fotos hochladen 30 Sekunden, KI-Rendering &amp; Beschreibung 60 Sekunden &mdash; und du kannst direkt veröffentlichen.' },
              { q: 'Brauche ich technisches Know-how?', a: 'Nein. Die Oberflache ist so einfach wie ein Smartphone. Du kannst sofort loslegen, ohne Schulung oder Einrichtung.' },
              { q: 'Wie gut ist die Hintergründentfernung?', a: 'Wir nutzen PhotoRoom v2 (Enterprise-Level) kombiniert mit fal.ai als Fallback. Die Qualitat entspricht professionellen Foto-Editoren &mdash; in Sekunden statt Stunden.' },
              { q: 'Kann ich meinen eigenen Showroom-Hintergrund nutzen?', a: 'Ja! Ab dem Premium-Plan kannst du ein Foto deines Showrooms hochladen. Die KI platziert jedes Fahrzeug automatisch davor.' },
              { q: 'Wie funktioniert die Kündigung?', a: 'Jederzeit zum Monatsende kündbar &mdash; kein Ärger, keine langen Fristen. Bestehende Inserate bleiben gespeichert.' },
              { q: 'Sind meine Daten sicher?', a: 'Alle Daten liegen auf deutschen Servern, sind SSL-verschlüsselt und werden nicht an Dritte weitergegeben. Vollstandig DSGVO-konform.' },
            ].map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="faq-question">
                  <span>{faq.q}</span>
                  <ChevronDown size={16} className="faq-chevron" />
                </div>
                {openFaq === i && <div className="faq-answer" dangerouslySetInnerHTML={{ __html: faq.a }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ══ */}
      <section className="cta-final-section">
        <div className="cta-final-container">
          <div className="cta-orb" />
          <div className="cta-badge"><Star size={13} /> Über 500 zufriedene Händler</div>
          <h2>Bereit für professionelle Inserate?</h2>
          <p>3 Inserate kostenlos testen &mdash; keine Kreditkarte, kein Risiko.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register" className="btn-cta-primary">
              Jetzt kostenlos starten <ArrowRight size={18} />
            </Link>
            <Link href="/dashboard" className="btn-cta-secondary">
              Dashboard öffnen <BarChart3 size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <div className="footer-logo">2Fast<span style={{ color: '#3b82f6' }}>4</span>Sale</div>
            <p>Die intelligente Plattform für professionelle Fahrzeug-Inserate. Gebaut für Autohändler, die ihre Zeit sinnvoll nutzen wollen.</p>
            <div className="footer-socials">
              <a href="mailto:info@2fast4sale.de" title="E-Mail">✉</a>
            </div>
          </div>
          <div className="footer-section">
            <h5>Produkt</h5>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Preise</a></li>
              <li><Link href="/features">Alle Features</Link></li>
              <li><Link href="/ueber-uns">Über uns</Link></li>
              <li><Link href="/auth/register">Kostenlos starten</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h5>Dashboard</h5>
            <ul>
              <li><Link href="/dashboard">Ubersicht</Link></li>
              <li><Link href="/dashboard/listing/step1">Neues Inserat</Link></li>
              <li><Link href="/dashboard/gallery">Inserate</Link></li>
              <li><Link href="/dashboard/backgrounds">Hintergründe</Link></li>
              <li><Link href="/dashboard/pricing">Preise &amp; Plane</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h5>Rechtliches</h5>
            <ul>
              <li><Link href="/datenschutz">Datenschutz</Link></li>
              <li><Link href="/impressum">Impressum</Link></li>
              <li><Link href="/agb">AGB</Link></li>
              <li><Link href="/kontakt">Kontakt</Link></li>
              <li><a href="mailto:enterprise@2fast4sale.de">Enterprise anfragen</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 2fast4sale. Alle Rechte vorbehalten. &mdash; Made in Germany &#127465;&#127466;</p>
        </div>
      </footer>

    </div>
  );
}



