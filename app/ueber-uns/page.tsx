'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Target, Zap, Heart, Shield, BarChart3, CheckCircle2, Mail } from 'lucide-react';

export default function UeberUnsPage() {
  return (
    <div style={{ background: '#07111f', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Inter',-apple-system,sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', background: 'rgba(7,17,31,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: '1320px', width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '40px' }}>
          <Link href="/" style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', textDecoration: 'none', letterSpacing: '-0.5px' }}>
            2Fast<span style={{ color: '#3b82f6' }}>4</span>Sale
          </Link>
          <div style={{ flex: 1, display: 'flex', gap: '24px' }}>
            {[['/', 'Home'], ['/features', 'Features'], ['/#pricing', 'Preise'], ['/ueber-uns', 'Über uns']].map(([href, label]) => (
              <Link key={href} href={href} style={{ color: href === '/ueber-uns' ? '#60a5fa' : '#64748b', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>{label}</Link>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/auth/login" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px', fontWeight: '500', padding: '7px 14px', borderRadius: '7px' }}>Einloggen</Link>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', textDecoration: 'none', fontSize: '13.5px', fontWeight: '600', padding: '7px 14px', borderRadius: '7px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.22)' }}>
              <BarChart3 size={13} /> Dashboard
            </Link>
            <Link href="/auth/register" style={{ background: '#2563eb', color: '#fff', textDecoration: 'none', fontSize: '13.5px', fontWeight: '600', padding: '8px 18px', borderRadius: '7px' }}>Kostenlos starten</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: '130px', padding: '130px 48px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', background: 'radial-gradient(circle, rgba(37,99,235,0.13), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(59,130,246,0.28)', padding: '7px 18px', borderRadius: '100px', marginBottom: '28px', color: '#60a5fa', fontSize: '11.5px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <Heart size={12} /> Unsere Geschichte
          </div>
          <h1 style={{ fontSize: '3.6rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '-2px', marginBottom: '20px', lineHeight: 1.06 }}>
            Wir machen<br /><span style={{ background: 'linear-gradient(125deg,#3b82f6,#818cf8,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Autohandel einfacher</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#64748b', maxWidth: '620px', margin: '0 auto', lineHeight: 1.8 }}>
            2fast4sale entstand aus einer einfachen Beobachtung: Autohändler verbringen zu viel Zeit mit Inserat-Bürokratie statt mit dem Verkaufen. Das wollten wir ändern.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '0 48px 100px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
          {[
            { icon: <Target size={24} />, color: '#3b82f6', title: 'Unsere Mission', text: 'Jedem Autohändler — ob Einzelkämpfer oder großes Autohaus — die gleichen professionellen Werkzeuge zur Verfügung stellen, die bisher nur großen Ketten mit eigenem Fotostudio vorbehalten waren.' },
            { icon: <Zap size={24} />,    color: '#8b5cf6', title: 'Unsere Vision',  text: 'Die Zukunft des Autohandels ist digital, schnell und datengetrieben. 2fast4sale wird die Plattform sein, auf der jeder Händler in Deutschland sein Business aufbaut.' },
            { icon: <Heart size={24} />,  color: '#ef4444', title: 'Unsere Werte',   text: 'Einfachheit vor Komplexität. Qualität vor Quantität. Ehrlichkeit in allem was wir tun. Wir bauen Tools, die wir selbst benutzen würden.' },
            { icon: <Shield size={24} />, color: '#10b981', title: 'Datenschutz',    text: 'DSGVO ist kein Buzzword für uns — es ist ein Versprechen. Alle Daten bleiben in der EU. Kein Tracking, keine Weitergabe, keine Kompromisse.' },
          ].map((card, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '32px' }}>
              <div style={{ width: '48px', height: '48px', background: `${card.color}15`, border: `1px solid ${card.color}25`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, marginBottom: '18px' }}>
                {card.icon}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', marginBottom: '10px' }}>{card.title}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.8, margin: 0 }}>{card.text}</p>
            </div>
          ))}
        </div>

        {/* Story */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '48px 56px', marginBottom: '48px' }}>
          <div style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.22)', color: '#60a5fa', fontSize: '11px', fontWeight: '600', padding: '5px 14px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>Unsere Geschichte</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.9, marginBottom: '20px' }}>
                2fast4sale wurde 2025 in Deutschland gegründet, nachdem wir gesehen haben, wie viel Zeit Autohändler täglich mit dem Erstellen von Inseraten verschwenden. Zwei Stunden pro Fahrzeug — Fotos bearbeiten, Daten eintippen, Beschreibung schreiben, auf jede Plattform einzeln hochladen.
              </p>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.85, margin: 0 }}>
                Mit moderner KI-Technologie haben wir diesen Prozess auf 2 Minuten reduziert. Nicht durch Qualitätsverlust — sondern durch Automatisierung all der Schritte, die ein Mensch nicht besser macht als eine gut trainierte KI.
              </p>
            </div>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.9, marginBottom: '20px' }}>
                Heute nutzen über 500 Autohändler 2fast4sale täglich. Von Einzelhändlern mit 5 Fahrzeugen im Monat bis zu Autohäusern mit mehreren Standorten und Hunderten von Inseraten.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['34.000+ erstellte Inserate', '500+ zufriedene Händler', '98% Kundenzufriedenheit', 'Made in Germany 🇩🇪'].map((point, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#64748b' }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '48px' }}>
          {[
            { number: '2026', label: 'Gegründet', color: '#3b82f6' },
            { number: '500+', label: 'Händler vertrauen uns', color: '#8b5cf6' },
            { number: '34k+', label: 'Inserate erstellt', color: '#10b981' },
            { number: '🇩🇪', label: 'Made in Germany', color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: '800', color: s.color, lineHeight: 1, marginBottom: '8px', letterSpacing: '-1px' }}>{s.number}</div>
              <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Kontakt */}
        <div style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.15), rgba(109,40,217,0.1))', border: '1px solid rgba(59,130,246,0.22)', borderRadius: '20px', padding: '48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc', marginBottom: '12px', letterSpacing: '-0.8px' }}>Wir freuen uns von dir zu hören</h2>
          <p style={{ color: '#475569', fontSize: '14px', marginBottom: '28px', lineHeight: 1.7 }}>
            Feedback, Fragen, Partnerschaftsanfragen oder einfach Hallo sagen — wir antworten innerhalb von 24 Stunden.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/kontakt" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#2563eb', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: '600', borderRadius: '8px', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}>
              <Mail size={15} /> Kontakt aufnehmen
            </Link>
            <a href="mailto:info@2fast4sale.de" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', textDecoration: 'none', fontSize: '14px', fontWeight: '600', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              info@2fast4sale.de
            </a>
          </div>
        </div>
      </section>

      {/* Footer mini */}
      <footer style={{ background: '#04090f', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 48px', textAlign: 'center', color: '#1e2d40', fontSize: '12.5px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {[['/', 'Home'], ['/features', 'Features'], ['/#pricing', 'Preise'], ['/kontakt', 'Kontakt'], ['/datenschutz', 'Datenschutz'], ['/impressum', 'Impressum']].map(([href, label]) => (
            <Link key={href} href={href} style={{ color: '#1e2d40', textDecoration: 'none', fontSize: '13px' }}>{label}</Link>
          ))}
        </div>
        <p>© 2026 2fast4sale. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  );
}

