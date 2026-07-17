'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, FileText, Camera, Sparkles, Globe, Shield, Cpu,
  Image, AlignLeft, TrendingUp, Zap, CheckCircle2, BarChart3,
  Download, ExternalLink, Users, ArrowLeft
} from 'lucide-react';

const F   = '"Inter", -apple-system, sans-serif';
const BG  = '#050d1a';
const CARD = 'rgba(255,255,255,0.025)';
const BORD = 'rgba(255,255,255,0.07)';
const TH  = '#f0f8ff';
const TS  = '#5a7a96';
const TD  = '#3a5a78';

const FEATURES = [
  {
    id: 'ocr', icon: <FileText size={32} />, color: '#3b82f6', tag: 'Core',
    title: 'OCR Dokumentenscan',
    headline: 'Fahrzeugschein in 30 Sekunden ausgelesen',
    desc: 'Kein manuelles Tippen mehr. Fotografiere einfach den Fahrzeugschein &mdash; unsere KI (powered by GPT-4o Vision) liest alle relevanten Daten automatisch aus: Marke, Modell, FIN/VIN, Hubraum, Leistung, Erstzulassung, Farbe, Sitzplätze und mehr.',
    bullets: [
      'Marke, Modell, Baujahr automatisch erkannt',
      'FIN/VIN für VIN-Decoder Abfrage',
      'PS, kW, Hubraum, Kraftstoffart',
      'Sitzanzahl, Leergewicht, Farbe',
      'Unterstützt deutsche &amp; europäische Fahrzeugscheine',
      'Genauigkeit &gt; 97% in Tests',
    ],
  },
  {
    id: 'studio', icon: <Image size={32} />, color: '#8b5cf6', tag: 'Pro',
    title: 'KI Studio-Rendering',
    headline: 'Professionelle Fotos ohne Profi-Kamera',
    desc: 'Jedes Handy-Foto wird in ein Studio-Bild verwandelt. PhotoRoom v2 Enterprise entfernt den Hintergrund mit KI-Präzision und platziert das Fahrzeug auf dem gewählten Hintergrund &mdash; mit realistischem AI-Schatten und perfekter Positionierung.',
    bullets: [
      'Hintergrundentfernung in Sekunden',
      'Wähle aus 8+ Studio-Hintergrunden',
      'AI-Schatten fur realistische Tiefe',
      'Eigenes Showroom-Foto hochladbar (Premium)',
      'Ausgabe in 1600&times;1067 px (druckfahig)',
      'Fallback via fal.ai rembg',
    ],
  },
  {
    id: 'description', icon: <AlignLeft size={32} />, color: '#10b981', tag: 'Core',
    title: 'KI Inseratsbeschreibung',
    headline: 'Kaufmotivierende Texte in 60 Sekunden',
    desc: 'GPT-4o analysiert alle Fahrzeugdaten und generiert automatisch professionelle, verkaufsorientierte Beschreibungen. Der Text ist SEO-optimiert für mobile.de und AutoScout24 und berücksichtigt deine Händler-Notizen.',
    bullets: [
      'Vollautomatische Texterstellung',
      'SEO-Keywords fur Suchplattformen',
      'Berücksichtigt Ausstattung &amp; Notizen',
      'Tonalität: professionell &amp; vertrauenswürdig',
      'mobile.de &amp; AutoScout24 Format',
      'Manuell bearbeitbar in Schritt 4',
    ],
  },
  {
    id: 'equipment', icon: <Cpu size={32} />, color: '#f59e0b', tag: 'Pro',
    title: 'Ausstattungserkennung',
    headline: 'KI sieht was andere übersehen',
    desc: 'Neben dem OCR-Scan des Fahrzeugscheins analysiert unsere KI auch hochgeladene Fotos und erkennt sichtbare Ausstattungsmerkmale: Sitzheizung, Navi, Sportpaket, Panoramadach und vieles mehr.',
    bullets: [
      'Erkennung aus Fotos und Fahrzeugschein',
      'VIN-Decoder fur Serienausstattung',
      'Manuell erweiterbar mit Tag-System',
      'Fliesst in KI-Beschreibung ein',
      'Wird mit Inserat gespeichert',
      'Händler-Notizen als Kontext-Boost',
    ],
  },
  {
    id: 'export', icon: <ExternalLink size={32} />, color: '#ef4444', tag: 'Core',
    title: 'Multi-Plattform Export',
    headline: 'Ein Klick für alle Plattformen',
    desc: 'Direktexport zu mobile.de &amp; AutoScout24 mit einem Klick. Oder als druckfähiges PDF mit QR-Code und allen Fahrzeugdaten. ZIP-Export fur eigene Archivierung ebenfalls verfügbar.',
    bullets: [
      'mobile.de Direktpublizierung',
      'AutoScout24 Direktpublizierung',
      'PDF-Export mit QR-Code',
      'ZIP-Paket mit allen Fotos &amp; Daten',
      'Druckfähige Datenblatter',
      'Eigenes CMS via API (Business)',
    ],
  },
  {
    id: 'dsgvo', icon: <Shield size={32} />, color: '#06b6d4', tag: 'Alle',
    title: 'DSGVO &amp; Sicherheit',
    headline: 'Deine Daten in deutschen Handen',
    desc: 'Alle Daten werden ausschließlich auf deutschen Servern gespeichert. SSL-verschlüsselt, DSGVO-zertifiziert, keine Weitergabe an Dritte. Vollständige Datenkontrolle fur dein Unternehmen.',
    bullets: [
      'Server in Deutschland (Frankfurt)',
      'SSL-Verschlüsselung end-to-end',
      'DSGVO-konforme Datenhaltung',
      'Keine Weitergabe an Dritte',
      'Löschrecht auf Anfrage',
      'Subprozessor-Verzeichnis verfügbar',
    ],
  },
  {
    id: 'watermark', icon: <Camera size={32} />, color: '#a78bfa', tag: 'Premium',
    title: 'Firmen-Wasserzeichen',
    headline: 'Professioneller Auftritt auf jeder Plattform',
    desc: 'Ab dem Premium-Plan wird dein Firmenname und Logo automatisch in jedes generierte Foto eingeblendet &mdash; dezent positioniert, professionell und unverwechselbar.',
    bullets: [
      'Automatisches Wasserzeichen auf allen Fotos',
      'Position &amp; Deckkraft anpassbar',
      'Eigenes Logo hochladbar',
      'Firmenname als Text-Wasserzeichen',
      'Wird beim Export beibehalten',
      'Schutzt vor unbefugter Nutzung',
    ],
  },
  {
    id: 'analytics', icon: <TrendingUp size={32} />, color: '#34d399', tag: 'Pro',
    title: 'Verkaufsanalysen',
    headline: 'Datengetriebene Verkaufsentscheidungen',
    desc: 'Dashboard mit Live-Statistiken für alle deine Inserate: Aufrufe, Anfragen, Click-Through-Rates und Verkaufszeiten. Erkenne welche Fahrzeuge gut laufen und optimiere deine Strategie.',
    bullets: [
      'Live Aufrufe pro Inserat',
      'Anfragen &amp; Kontaktrate',
      'Plattform-Performance Vergleich',
      'Durchschnittliche Verkaufszeit',
      'Preis-Performance Analyse',
      'Export als CSV-Report',
    ],
  },
  {
    id: 'team', icon: <Users size={32} />, color: '#fb923c', tag: 'Business',
    title: 'Team-Accounts',
    headline: 'Zusammenarbeit ohne Grenzen',
    desc: 'Mehrere Mitarbeiter können gleichzeitig Inserate bearbeiten. Rollenbasierte Zugriffsrechte (Admin, Ersteller, Beobachter) und Vollständige Aktivitätsprotokollierung fur dein Autohaus.',
    bullets: [
      'Bis 5 Nutzer (Business) / unbegrenzt (Enterprise)',
      'Rollen: Admin, Ersteller, Beobachter',
      'Zentrale Fahrzeugverwaltung',
      'Aktivitätsprotokoll fur alle Aktionen',
      'Abteilungsweise Trennung moglich',
      'SSO / Active Directory (Enterprise)',
    ],
  },
];

export default function FeaturesPage() {
  const [active, setActive] = useState('ocr');
  const feat = FEATURES.find(f => f.id === active) || FEATURES[0];

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: F, color: TH }}>

      {/* BG Orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-200px', left: '-200px', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Grid texture */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,13,26,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: '#6a8caa', fontSize: '14px' }}>
            <ArrowLeft size={15} /> Startseite
          </Link>
          <Link href="/" style={{ textDecoration: 'none', fontSize: '18px', fontWeight: '800', color: TH, letterSpacing: '-0.5px' }}>
            2Fast<span style={{ color: '#3b82f6' }}>4</span>Sale
          </Link>
        </div>
        <Link href="/auth/register" style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', textDecoration: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '700' }}>
          Kostenlos starten <ArrowRight size={14} />
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '100px 48px 80px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 16px', borderRadius: '100px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: '12px', fontWeight: '700', color: '#60a5fa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '24px' }}>
          <Sparkles size={13} /> Alle Features
        </div>
        <h1 style={{ fontSize: 'clamp(40px,5vw,72px)', fontWeight: '800', letterSpacing: '-2px', color: TH, margin: '0 0 20px', lineHeight: 1.05 }}>
          Technologie die<br />
          <span style={{ background: 'linear-gradient(135deg,#60a5fa,#a78bfa,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            verkauft.
          </span>
        </h1>
        <p style={{ fontSize: '20px', color: TS, maxWidth: '600px', margin: '0 auto', lineHeight: 1.7 }}>
          Von der Dokumentenanalyse bis zur Veröffentlichung &mdash; 9 Features, komplett automatisiert.
        </p>
      </div>

      {/* Feature Explorer */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1300px', margin: '0 auto', padding: '0 48px 120px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'sticky', top: '80px', alignSelf: 'start' }}>
          {FEATURES.map(f => (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '13px 16px', borderRadius: '12px', cursor: 'pointer',
                background: active === f.id ? `${f.color}12` : 'transparent',
                border: `1px solid ${active === f.id ? `${f.color}30` : 'transparent'}`,
                color: active === f.id ? f.color : '#3a5a78',
                fontFamily: F, fontSize: '14px', fontWeight: active === f.id ? '700' : '500',
                textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <span style={{ opacity: active === f.id ? 1 : 0.5 }}>{React.cloneElement(f.icon as React.ReactElement, { size: 16 })}</span>
              {f.title}
              <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: `${f.color}15`, color: f.color, opacity: active === f.id ? 1 : 0.5 }}>{f.tag}</span>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        <div key={feat.id} style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '24px', padding: '48px', animation: 'fadeIn 0.25s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: `${feat.color}15`, border: `1px solid ${feat.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: feat.color, flexShrink: 0 }}>
              {feat.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '5px', background: `${feat.color}15`, color: feat.color, letterSpacing: '0.06em' }}>{feat.tag}</span>
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', color: TH, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{feat.title}</h2>
              <p style={{ fontSize: '16px', color: feat.color, fontWeight: '600', margin: 0 }} dangerouslySetInnerHTML={{ __html: feat.headline }} />
            </div>
          </div>

          <p style={{ fontSize: '16px', color: TS, lineHeight: 1.8, marginBottom: '36px' }} dangerouslySetInnerHTML={{ __html: feat.desc }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '40px' }}>
            {feat.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORD}`, borderRadius: '10px' }}>
                <CheckCircle2 size={15} color={feat.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '14px', color: '#8ab0d0', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: b }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/auth/register" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${feat.color}, ${feat.color}cc)`, color: '#fff', textDecoration: 'none', padding: '13px 24px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', boxShadow: `0 8px 24px ${feat.color}30` }}>
              Jetzt testen <ArrowRight size={15} />
            </Link>
            <Link href="/#pricing" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#8ab0d0', textDecoration: 'none', padding: '13px 20px', borderRadius: '10px', fontSize: '15px', fontWeight: '600' }}>
              Preise ansehen
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Strip */}
      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(37,99,235,0.05)', borderTop: '1px solid rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '60px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: '800', color: TH, letterSpacing: '-1px', margin: '0 0 14px' }}>
          Alle Features. Ein Plan.
        </h2>
        <p style={{ fontSize: '17px', color: TS, margin: '0 0 32px' }}>3 Inserate kostenlos testen &mdash; keine Kreditkarte benötigt.</p>
        <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', textDecoration: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', boxShadow: '0 8px 32px rgba(37,99,235,0.4)' }}>
          Kostenlos starten <ArrowRight size={16} />
        </Link>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}


