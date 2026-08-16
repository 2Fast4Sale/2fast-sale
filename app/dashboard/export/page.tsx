'use client';

/**
 * Export.
 *
 * Zeigt die echten Fahrzeuge des Händlers und was sich damit tun lässt.
 *
 * Bewusst ehrlich bei den Portalen: mobile.de und AutoScout24 sind NICHT
 * angebunden. Vorher stand hier "Verbunden" an fünf erfundenen Fahrzeugen —
 * das hätte spätestens bei der ersten Vorführung vor einem Händler Schaden
 * angerichtet.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Download, FileText, Image as ImageIcon, Loader2, AlertCircle,
  Clock, Zap, Car,
} from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

const F    = '"Inter", -apple-system, sans-serif';
const CARD = '#ffffff';
const BORD = '#e2e8f0';
const TH   = '#0f172a';
const TS   = '#64748b';

interface Fahrzeug {
  id: string;
  title?: string;
  brand?: string;
  price?: string;
  km?: string;
  status?: string;
  created_at?: string;
  vehicle_images?: { processed_url?: string; original_url?: string; position?: number }[];
}

const preis = (v?: string) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return n > 0 ? n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €' : '—';
};

export default function ExportPage() {
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [laedt, setLaedt]         = useState(true);
  const [fehler, setFehler]       = useState<string | null>(null);
  const [aktiv, setAktiv]         = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/vehicles')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Fahrzeuge konnten nicht geladen werden')))
      .then(d => setFahrzeuge(d.vehicles || []))
      .catch(e => setFehler(e.message))
      .finally(() => setLaedt(false));
  }, []);

  /**
   * Startet einen Download. Bewusst über ein verstecktes Anchor-Element statt
   * window.open — Popup-Blocker greifen sonst auf dem Handy.
   */
  const herunterladen = async (id: string, art: 'pdf' | 'zip') => {
    setAktiv(`${id}:${art}`);
    setFehler(null);
    try {
      const res = await fetch(`/api/export/${art}?id=${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Export fehlgeschlagen');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
                 || `export.${art}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Export fehlgeschlagen');
    } finally {
      setAktiv(null);
    }
  };

  const card: React.CSSProperties = {
    background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  };

  return (
    <div style={{ padding: '28px 24px 60px', maxWidth: '1100px', margin: '0 auto', fontFamily: F, minHeight: '100vh', background: '#f0f2f5' }}>

      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: TH, margin: '0 0 4px', letterSpacing: '-0.5px' }}>Export</h1>
        <p style={{ margin: 0, color: TS, fontSize: '14px' }}>
          Fertige Inserate herunterladen — als Datenblatt oder Fotopaket.
        </p>
      </div>

      {/* ── Was geht, was nicht ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '22px' }}>
        {[
          {
            name: 'PDF-Datenblatt', icon: <FileText size={18} />, farbe: '#10b981',
            text: 'Fahrzeugdaten, Fotos und Pflichtangaben zum Ausdrucken.',
            status: 'Verfügbar', bereit: true,
          },
          {
            name: 'Fotopaket (ZIP)', icon: <ImageIcon size={18} />, farbe: '#6366f1',
            text: 'Alle Studio-Fotos nummeriert, zum Hochladen auf jedem Portal.',
            status: 'Verfügbar', bereit: true,
          },
          {
            name: 'mobile.de · AutoScout24', icon: <Clock size={18} />, farbe: '#94a3b8',
            text: 'Direktes Einstellen ist noch nicht angebunden.',
            status: 'In Vorbereitung', bereit: false,
          },
        ].map(k => (
          <div key={k.name} style={{ ...card, padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: k.farbe }}>{k.icon}</span>
              <span style={{
                fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px',
                background: k.bereit ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.14)',
                color:      k.bereit ? '#059669' : '#64748b',
              }}>{k.status}</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: TH, marginBottom: '4px' }}>{k.name}</div>
            <div style={{ fontSize: '12.5px', color: TS, lineHeight: 1.55 }}>{k.text}</div>
          </div>
        ))}
      </div>

      {fehler && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '12px 15px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', marginBottom: '14px' }}>
          <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: '#7f1d1d' }}>{fehler}</span>
        </div>
      )}

      {/* ── Fahrzeugliste ── */}
      {laedt ? (
        <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
          <Loader2 size={24} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : fahrzeuge.length === 0 ? (
        <div style={{ ...card, padding: '44px 24px', textAlign: 'center' }}>
          <Car size={32} color="#cbd5e1" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: '700', color: TH, marginBottom: '5px' }}>Noch keine Fahrzeuge</div>
          <p style={{ fontSize: '13.5px', color: TS, margin: '0 0 18px' }}>
            Sobald du ein Inserat angelegt hast, kannst du es hier exportieren.
          </p>
          <Link href="/dashboard/listing/step1" style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px', textDecoration: 'none',
            background: '#4f46e5', color: '#fff', padding: '11px 20px', borderRadius: '9px',
            fontSize: '14px', fontWeight: '700',
          }}>
            <Zap size={14} /> Erstes Inserat anlegen
          </Link>
        </div>
      ) : (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: `1px solid #f1f5f9`, fontSize: '14px', fontWeight: '700', color: TH }}>
            Deine Fahrzeuge <span style={{ color: '#94a3b8', fontWeight: '500' }}>({fahrzeuge.length})</span>
          </div>

          {fahrzeuge.map((f, i) => {
            const bilder = f.vehicle_images || [];
            const vorschau = bilder[0]?.processed_url || bilder[0]?.original_url;
            const pdfLaeuft = aktiv === `${f.id}:pdf`;
            const zipLaeuft = aktiv === `${f.id}:zip`;
            return (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 18px',
                borderBottom: i < fahrzeuge.length - 1 ? '1px solid #f1f5f9' : 'none',
                flexWrap: 'wrap',
              }}>
                <div style={{ width: '70px', height: '52px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                  {vorschau
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={vorschau} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Car size={18} color="#cbd5e1" /></div>}
                </div>

                <div style={{ flex: 1, minWidth: '160px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: TH, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.title || f.brand || 'Ohne Titel'}
                  </div>
                  <div style={{ fontSize: '12.5px', color: TS, marginTop: '1px' }}>
                    {preis(f.price)} · {bilder.length} {bilder.length === 1 ? 'Foto' : 'Fotos'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                  <button onClick={() => herunterladen(f.id, 'pdf')} disabled={!!aktiv}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 13px',
                      borderRadius: '8px', border: '1px solid rgba(16,185,129,0.25)',
                      background: 'rgba(16,185,129,0.08)', color: '#059669',
                      fontSize: '13px', fontWeight: '700', fontFamily: F,
                      cursor: aktiv ? 'default' : 'pointer', opacity: aktiv && !pdfLaeuft ? 0.5 : 1,
                    }}>
                    {pdfLaeuft
                      ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                      : <FileText size={13} />} PDF
                  </button>

                  <button onClick={() => herunterladen(f.id, 'zip')} disabled={!!aktiv || bilder.length === 0}
                    title={bilder.length === 0 ? 'Dieses Fahrzeug hat keine Fotos' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 13px',
                      borderRadius: '8px', border: '1px solid rgba(99,102,241,0.25)',
                      background: 'rgba(99,102,241,0.08)', color: '#4f46e5',
                      fontSize: '13px', fontWeight: '700', fontFamily: F,
                      cursor: aktiv || bilder.length === 0 ? 'default' : 'pointer',
                      opacity: (aktiv && !zipLaeuft) || bilder.length === 0 ? 0.5 : 1,
                    }}>
                    {zipLaeuft
                      ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                      : <Download size={13} />} Fotos
                  </button>
                </div>
              </div>
            );
          })}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  );
}
