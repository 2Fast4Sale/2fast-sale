'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download, FileText, Globe, ExternalLink, CheckCircle2,
  Clock, AlertCircle, Zap, ChevronRight, Package, Image,
  ArrowRight, RefreshCw, BarChart3
} from 'lucide-react';

const FONT = '"Inter",-apple-system,sans-serif';

const card: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
};

const DEMO_EXPORTS = [
  { id: '1', brand: 'BMW 320d xDrive Touring',     price: '28.500 €', platform: 'AutoScout24', status: 'live',    date: '14.05.2026', adId: 'AS24-4821049', url: '#' },
  { id: '2', brand: 'VW Golf 7 1.4 TSI Highline',  price: '16.900 €', platform: 'mobile.de',  status: 'live',    date: '17.05.2026', adId: 'MD-8920341',   url: '#' },
  { id: '3', brand: 'Skoda Octavia RS 2.0 TDI',    price: '19.800 €', platform: 'mobile.de',  status: 'live',    date: '03.05.2026', adId: 'MD-8821052',   url: '#' },
  { id: '4', brand: 'Mercedes C200 AMG Line',       price: '34.900 €', platform: 'AutoScout24', status: 'sold',   date: '05.05.2026', adId: 'AS24-4700291', url: '#' },
  { id: '5', brand: 'Audi A4 Avant 2.0 TDI S-Line',price: '22.900 €', platform: 'PDF',         status: 'draft',  date: '10.05.2026', adId: '—',            url: '#' },
];

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  live:  { label: 'Live',    color: '#10b981', dot: '#10b981' },
  sold:  { label: 'Verkauft',color: '#8b5cf6', dot: '#8b5cf6' },
  draft: { label: 'Entwurf', color: '#f59e0b', dot: '#f59e0b' },
  error: { label: 'Fehler',  color: '#ef4444', dot: '#ef4444' },
};

const platformConfig: Record<string, { color: string; bg: string }> = {
  'mobile.de':  { color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  'AutoScout24':{ color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  'PDF':        { color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
};

export default function ExportPage() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1200px', margin: '0 auto', color: '#0f172a', fontFamily: FONT, minHeight: '100vh', background: '#f0f2f5' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px', color: '#0f172a' }}>Export & Veröffentlichung</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Verwalte deine Inserate auf mobile.de, AutoScout24 und als PDF/ZIP.</p>
        </div>
        <Link href="/dashboard/listing" style={{ textDecoration: 'none' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', color: '#fff', padding: '11px 20px', borderRadius: '6px', fontWeight: '600', border: 'none', cursor: 'pointer', fontSize: '14px', fontFamily: FONT, boxShadow: '0 2px 14px rgba(37,99,235,0.3)' }}>
            <Zap size={14} /> Neues Inserat
          </button>
        </Link>
      </div>

      {/* Plattform-Karten */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          {
            name: 'mobile.de',
            icon: '🚗',
            color: '#f97316',
            desc: 'Direkt-API-Verbindung zu mobile.de Seller API v2.',
            live: DEMO_EXPORTS.filter(e => e.platform === 'mobile.de' && e.status === 'live').length,
            status: 'Verbunden',
          },
          {
            name: 'AutoScout24',
            icon: '🔵',
            color: '#3b82f6',
            desc: 'AutoScout24 Listing Creation API — alle EU-Märkte.',
            live: DEMO_EXPORTS.filter(e => e.platform === 'AutoScout24' && e.status === 'live').length,
            status: 'Verbunden',
          },
          {
            name: 'PDF & ZIP Export',
            icon: '📄',
            color: '#10b981',
            desc: 'Druckfähige PDFs mit Datenblatt, Fotos und QR-Code.',
            live: DEMO_EXPORTS.length,
            status: 'Immer aktiv',
          },
        ].map(p => (
          <div key={p.name} style={{ ...card, padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '70px', height: '70px', background: `radial-gradient(circle at top right, ${p.color}15, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ fontSize: '26px' }}>{p.icon}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', fontWeight: '700', color: '#10b981' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                {p.status}
              </div>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>{p.name}</div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.65, marginBottom: '16px' }}>{p.desc}</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: p.color, letterSpacing: '-0.8px' }}>{p.live}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Inserate</div>
          </div>
        ))}
      </div>

      {/* Aktionen */}
      <div style={{ ...card, padding: '16px 20px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', flex: 1 }}>
          {selected.length > 0 ? `${selected.length} Inserate ausgewählt` : 'Inserate auswählen für Massenaktionen'}
        </div>
        <button disabled={selected.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(249,115,22,0.25)', background: 'rgba(249,115,22,0.08)', color: selected.length > 0 ? '#f97316' : '#a8c4dc', fontSize: '14px', fontWeight: '600', cursor: selected.length > 0 ? 'pointer' : 'default', fontFamily: FONT, transition: 'all 0.15s' }}>
          <Globe size={13} /> mobile.de
        </button>
        <button disabled={selected.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.25)', background: 'rgba(59,130,246,0.08)', color: selected.length > 0 ? '#3b82f6' : '#a8c4dc', fontSize: '14px', fontWeight: '600', cursor: selected.length > 0 ? 'pointer' : 'default', fontFamily: FONT, transition: 'all 0.15s' }}>
          <ExternalLink size={13} /> AutoScout24
        </button>
        <button disabled={selected.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)', color: selected.length > 0 ? '#10b981' : '#a8c4dc', fontSize: '14px', fontWeight: '600', cursor: selected.length > 0 ? 'pointer' : 'default', fontFamily: FONT, transition: 'all 0.15s' }}>
          <Download size={13} /> PDF Export
        </button>
      </div>

      {/* Export Tabelle */}
      <div style={{ ...card, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Exportverlauf</div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '13px', cursor: 'pointer', fontFamily: FONT }}>
            <RefreshCw size={12} /> Aktualisieren
          </button>
        </div>

        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 110px 110px 120px 90px 80px', gap: '12px', padding: '10px 20px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', background: '#f8fafc' }}>
          <input type="checkbox" style={{ accentColor: '#2563eb' }} onChange={e => setSelected(e.target.checked ? DEMO_EXPORTS.map(x => x.id) : [])} />
          {['Fahrzeug', 'Plattform', 'Inserat-ID', 'Datum', 'Status', 'Aktionen'].map(h => (
            <div key={h} style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
          ))}
        </div>

        {DEMO_EXPORTS.map((exp, i) => {
          const sc = statusConfig[exp.status];
          const pc = platformConfig[exp.platform] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
          return (
            <div key={exp.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 110px 110px 120px 90px 80px', gap: '12px', padding: '13px 20px', borderBottom: i < DEMO_EXPORTS.length - 1 ? '1px solid #f1f5f9' : 'none', alignItems: 'center', background: selected.includes(exp.id) ? 'rgba(99,102,241,0.04)' : 'transparent' }}>
              <input type="checkbox" checked={selected.includes(exp.id)} onChange={() => toggle(exp.id)} style={{ accentColor: '#6366f1' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{exp.brand}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '1px' }}>{exp.price}</div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: pc.bg, color: pc.color, padding: '3px 9px', borderRadius: '4px', fontSize: '14px', fontWeight: '600', border: `1px solid ${pc.color}25` }}>
                {exp.platform}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{exp.adId}</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>{exp.date}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: '600', color: sc.color }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                {sc.label}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {exp.status === 'live' && (
                  <a href={exp.url} title="Ansehen" style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '5px', color: '#60a5fa' }}>
                    <ExternalLink size={12} />
                  </a>
                )}
                <button title="PDF" style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer' }}>
                  <Download size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div style={{ ...card, padding: '16px 20px', marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#eff6ff', borderColor: '#bfdbfe' }}>
        <AlertCircle size={15} style={{ color: '#3b82f6', marginTop: '1px', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.7 }}>
          <strong style={{ color: '#7a90a8' }}>Hinweis:</strong> mobile.de und AutoScout24 Zugangsdaten müssen in den <Link href="/dashboard/settings" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>Einstellungen</Link> hinterlegt werden, bevor der Direkt-Export genutzt werden kann.
        </p>
      </div>
    </div>
  );
}






