'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, FileText, Camera, Sparkles, Globe, Shield, Cpu,
  Image, AlignLeft, TrendingUp, Zap, CheckCircle2, BarChart3,
  Download, ExternalLink, Users, ArrowLeft
} from 'lucide-react';

const F   = '"Inter", -apple-system, sans-serif';
const BG  = '#f0f2f5';
const CARD = 'rgba(255,255,255,0.025)';
const BORD = '#f8fafc';
const TH  = '#0f172a';
const TS  = '#94a3b8';
const TD  = '#94a3b8';

/*
 * Diese Liste stand voller Dinge, die es nicht gibt: Team-Konten mit
 * Rollen, SSO und Active Directory, Verkaufsanalysen mit Aufrufen und
 * Kontaktraten, Direktexport zu mobile.de, "Server in Deutschland
 * (Frankfurt)", "DSGVO-zertifiziert", "Genauigkeit > 97 % in Tests",
 * "GPT-4o Vision", "PhotoRoom v2 Enterprise", "Fallback via fal.ai".
 *
 * Nichts davon ist gebaut oder gemessen. Das ist irrefuehrende Werbung
 * (§ 5 UWG) und widerspricht der obersten Regel des Projekts: Was hier
 * steht, muss im Code wirklich passieren. Ein Haendler, der wegen einer
 * dieser Zeilen kommt und sie nicht vorfindet, kommt nicht wieder.
 *
 * Diese Fassung beschreibt nur, was heute laeuft. Geplantes ist als
 * geplant gekennzeichnet.
 */
const FEATURES = [
  {
    id: 'ocr', icon: <FileText size={32} />, color: '#6366f1', tag: 'Kern',
    title: 'Fahrzeugschein auslesen',
    headline: 'Abfotografieren statt abtippen',
    desc: 'Du fotografierst die Zulassungsbescheinigung Teil I, die Felder im Formular füllen sich. Gelesen wird nur, was dort steht — Unlesbares bleibt leer, statt aus dem Fahrzeugmodell ergänzt zu werden.',
    bullets: [
      'Marke, Handelsbezeichnung, Erstzulassung',
      'FIN, Hubraum, Leistung, Kraftstoff',
      'Farbe, Sitzplätze, Leermasse, Türen',
      'Schadstoffklasse und Anhängelasten',
      'Unplausible Leistungswerte werden verworfen',
      'Jedes Feld vor dem Veröffentlichen änderbar',
    ],
  },
  {
    id: 'studio', icon: <Image size={32} />, color: '#8b5cf6', tag: 'Kern',
    title: 'Studio-Bilder aus Handyfotos',
    headline: 'Freigestellt, in den Showroom gesetzt, mit Schatten',
    desc: 'Das Fahrzeug wird freigestellt und in einen selbst gerenderten Showroom gesetzt, mit Schatten entlang der Standlinie. Erkennt die Seite, dass ein Foto nicht sauber freigestellt werden konnte, sagt sie das — statt ein auffälliges Bild auszuliefern.',
    bullets: [
      '19 eigene Räume: helles Studio bis Werkstatt',
      'Alle Fotos eines Fahrzeugs im selben Raum',
      'Eigenes Hallenfoto als Hintergrund möglich',
      'Freistellen läuft im Browser — kostenlos',
      'Misslungene Freistellungen werden gemeldet',
      'Kein Fahrzeug auf dem Foto: keine Bearbeitung',
    ],
  },
  {
    id: 'kennzeichen', icon: <Shield size={32} />, color: '#0891b2', tag: 'Kern',
    title: 'Kennzeichen ersetzen',
    headline: 'Das Kennzeichen ist ein personenbezogenes Datum',
    desc: 'Ein Erkennungsmodell sucht das Kennzeichen im Foto; an seine Stelle kommt ein Schild mit deinem Firmennamen, passend zur Schräglage des Originals. Wird keines sicher erkannt, bleibt das Bild unverändert — lieber kein Ersatz als ein Schild an der falschen Stelle.',
    bullets: [
      'Erkennung per Bildmodell, nicht per Farbregel',
      'Schild wird in die Schräglage eingepasst',
      'Firmenname aus deinen Einstellungen',
      'Auch fremde Händlerschilder werden ersetzt',
      'Im Zweifel bleibt das Foto unverändert',
      'Läuft auf dem Server, nichts einzurichten',
    ],
  },
  {
    id: 'description', icon: <AlignLeft size={32} />, color: '#059669', tag: 'Kern',
    title: 'Titel und Beschreibung',
    headline: 'Text aus den erfassten Daten',
    desc: 'Aus den Fahrzeugdaten entstehen Titel und Beschreibung. Du kannst einen eigenen Beispieltitel hinterlegen, an dem sich die Formulierung orientiert, und jeden Text vor dem Veröffentlichen ändern.',
    bullets: [
      'Entsteht aus den erfassten Fahrzeugdaten',
      'Eigener Beispieltitel als Vorlage',
      'Händler-Notizen fließen ein',
      'Vollständig bearbeitbar',
      'Keine erfundenen Ausstattungen im Text',
      'Pflichtangaben nach EnVKV werden ergänzt',
    ],
  },
  {
    id: 'equipment', icon: <Cpu size={32} />, color: '#d97706', tag: 'Kern',
    title: 'Ausstattung',
    headline: 'Nur was belegt ist',
    desc: 'Aus den Fotos wird ausschließlich übernommen, was eindeutig zu sehen ist. Verwechselbares — etwa Xenon gegenüber LED oder Klimaanlage gegenüber Klimaautomatik — bleibt draußen, weil ein falsches Merkmal im Inserat eine falsche Zusicherung wäre.',
    bullets: [
      'Erkennung aus deinen Fotos',
      'Feste Liste erlaubter Merkmale',
      'Verwechselbares wird weggelassen',
      'Codes aus Feld 22 des Fahrzeugscheins',
      'Jederzeit von Hand ergänzbar',
      'Werksausstattung per FIN ist in Vorbereitung',
    ],
  },
  {
    id: 'export', icon: <Download size={32} />, color: '#ef4444', tag: 'Kern',
    title: 'Übernehmen',
    headline: 'Fotopaket und Datenblatt',
    desc: 'Du lädst die Studiobilder als nummeriertes ZIP und ein PDF-Datenblatt herunter und stellst damit dort ein, wo du verkaufst. Die direkte Übertragung zu mobile.de und AutoScout24 ist in Vorbereitung und wird hier erst stehen, wenn sie läuft.',
    bullets: [
      'Alle Bilder nummeriert als ZIP',
      'Reihenfolge bestimmt das Titelbild',
      'PDF-Datenblatt zum Aushängen',
      'Daten jederzeit im Konto abrufbar',
      'Direktexport mobile.de: in Vorbereitung',
      'Direktexport AutoScout24: in Vorbereitung',
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
        <div style={{ position: 'absolute', top: '-200px', left: '-200px', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Grid texture */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,13,26,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #f8fafc', padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '14px' }}>
            <ArrowLeft size={15} /> Startseite
          </Link>
          <Link href="/" style={{ textDecoration: 'none', fontSize: '18px', fontWeight: '800', color: TH, letterSpacing: '-0.5px' }}>
            2Fast<span style={{ color: '#6366f1' }}>4</span>Sale
          </Link>
        </div>
        <Link href="/auth/register" style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', textDecoration: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '700' }}>
          Kostenlos starten <ArrowRight size={14} />
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '100px 48px 80px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 16px', borderRadius: '100px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '12px', fontWeight: '700', color: '#6366f1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '24px' }}>
          <Sparkles size={13} /> Alle Features
        </div>
        <h1 style={{ fontSize: 'clamp(40px,5vw,72px)', fontWeight: '800', letterSpacing: '-2px', color: TH, margin: '0 0 20px', lineHeight: 1.05 }}>
          Technologie die<br />
          <span style={{ background: 'linear-gradient(135deg,#6366f1,#a78bfa,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
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
                color: active === f.id ? f.color : '#94a3b8',
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
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', background: '#f8fafc', border: `1px solid ${BORD}`, borderRadius: '10px' }}>
                <CheckCircle2 size={15} color={feat.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: b }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/auth/register" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${feat.color}, ${feat.color}cc)`, color: '#fff', textDecoration: 'none', padding: '13px 24px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', boxShadow: `0 8px 24px ${feat.color}30` }}>
              Jetzt testen <ArrowRight size={15} />
            </Link>
            <Link href="/#preise" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', textDecoration: 'none', padding: '13px 20px', borderRadius: '10px', fontSize: '15px', fontWeight: '600' }}>
              Preise ansehen
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Strip */}
      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(79,70,229,0.05)', borderTop: '1px solid rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.1)', padding: '60px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: '800', color: TH, letterSpacing: '-1px', margin: '0 0 14px' }}>
          Alle Features. Ein Plan.
        </h2>
        <p style={{ fontSize: '17px', color: TS, margin: '0 0 32px' }}>Konto anlegen kostet nichts. Der Probelauf mit zwei Inseraten kostet 5 €.</p>
        <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', textDecoration: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', boxShadow: '0 8px 32px rgba(79,70,229,0.4)' }}>
          Kostenlos starten <ArrowRight size={16} />
        </Link>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}


