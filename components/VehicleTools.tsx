'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode, FileText, X, Loader2, Printer } from 'lucide-react';

const F    = '"DM Sans", -apple-system, sans-serif';
const BORD = 'rgba(255,255,255,0.08)';
const TH   = '#f0f8ff';
const TS   = '#7a9cbc';

interface Vehicle {
  id: string;
  brand?: string;
  price?: string | number;
  km?: string;
  fuel_type?: string;
  power_kw?: string;
  first_registration?: string;
  color?: string;
  seats?: string;
  vin?: string;
  description?: string;
  equipment?: string[];
  vehicle_images?: { processed_url?: string | null; original_url?: string | null }[];
}

/* ─── QR-Code Modal ─── */
export function QRCodeModal({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/inserat/${vehicle.id}`
    : `https://2fast4sale.de/inserat/${vehicle.id}`;

  // Escape-Taste zum Schließen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const modal = (
    <div
      onClick={e => { e.stopPropagation(); onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '36px', maxWidth: '380px', width: '90%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: TH, fontFamily: F }}>QR-Code</div>
          <button onClick={e => { e.stopPropagation(); onClose(); }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: TH, cursor: 'pointer', display: 'flex', padding: '6px' }}><X size={16} /></button>
        </div>

        {/* QR */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', display: 'inline-block', marginBottom: '20px' }}>
          <QRCodeSVG value={url} size={200} level="M" />
        </div>

        <div style={{ fontSize: '14px', color: TS, fontFamily: F, marginBottom: '6px' }}>{vehicle.brand}</div>
        <div style={{ fontSize: '12px', color: '#3a5a78', fontFamily: F, marginBottom: '24px', wordBreak: 'break-all' }}>{url}</div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={e => {
              e.stopPropagation();
              const svg = document.querySelector('svg[data-qr]') as SVGElement;
              if (!svg) return;
              const data = new XMLSerializer().serializeToString(svg);
              const blob = new Blob([data], { type: 'image/svg+xml' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
              a.download = `qr-${vehicle.brand?.replace(/\s/g,'-') || vehicle.id}.svg`; a.click();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', padding: '10px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: F }}>
            <Download size={14} /> Speichern
          </button>
          <button onClick={e => { e.stopPropagation(); window.print(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORD}`, borderRadius: '8px', color: TS, padding: '10px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: F }}>
            <Printer size={14} /> Drucken
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}

/* ─── Angebots-PDF Modal ─── */
export function OfferPDFModal({ vehicle, dealerName, dealerPhone, dealerEmail, onClose }: {
  vehicle: Vehicle;
  dealerName?: string;
  dealerPhone?: string;
  dealerEmail?: string;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Escape-Taste zum Schließen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const img = vehicle.vehicle_images?.[0]?.processed_url || vehicle.vehicle_images?.[0]?.original_url || '';
  const ps  = vehicle.power_kw ? Math.round(Number(vehicle.power_kw) * 1.36) : null;
  const price = vehicle.price
    ? `${Number(String(vehicle.price).replace(/[^0-9]/g,'')).toLocaleString('de-DE')} €`
    : 'Auf Anfrage';

  const specs = [
    { label: 'Kilometerstand', value: vehicle.km ? `${vehicle.km} km` : null },
    { label: 'Erstzulassung',  value: vehicle.first_registration || null },
    { label: 'Kraftstoff',     value: vehicle.fuel_type || null },
    { label: 'Leistung',       value: ps ? `${vehicle.power_kw} kW / ${ps} PS` : null },
    { label: 'Farbe',          value: vehicle.color || null },
    { label: 'Sitzplätze',     value: vehicle.seats || null },
  ].filter(s => s.value);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  };

  if (!mounted) return null;
  return createPortal((
    <>
      <style>{`
        @media print {
          body > *:not(#offer-print-root) { display: none !important; }
          #offer-print-root { display: block !important; position: fixed; inset: 0; z-index: 9999; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div onClick={e => { e.stopPropagation(); onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '680px', maxHeight: '92vh', background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Toolbar */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: TH, fontFamily: F, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="#60a5fa" /> Angebots-PDF Vorschau
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handlePrint} disabled={printing}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', padding: '9px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: F }}>
                {printing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Printer size={14} />}
                {printing ? 'Druckt...' : 'Drucken / PDF'}
              </button>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: TH, cursor: 'pointer', display: 'flex', padding: '7px' }}><X size={16} /></button>
            </div>
          </div>

          {/* PDF Preview */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div id="offer-print-root" ref={printRef} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', fontFamily: '"DM Sans", sans-serif', color: '#111' }}>

              {/* Header Banner */}
              <div style={{ background: 'linear-gradient(135deg, #1e3a6e, #0f2040)', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
                    2Fast<span style={{ color: '#3b82f6' }}>4</span>Sale
                  </div>
                  <div style={{ fontSize: '13px', color: '#7aaac8', marginTop: '2px' }}>Fahrzeugangebot</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#3b82f6' }}>{price}</div>
                  <div style={{ fontSize: '12px', color: '#7aaac8' }}>inkl. 19% MwSt.</div>
                </div>
              </div>

              {/* Fahrzeugbild */}
              {img && (
                <div style={{ height: '260px', overflow: 'hidden', background: '#f0f4f8' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={vehicle.brand} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {/* Titel */}
              <div style={{ padding: '24px 32px 16px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                  {vehicle.brand || 'Fahrzeug'}
                </h1>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  {[vehicle.fuel_type, vehicle.km ? `${vehicle.km} km` : null, vehicle.first_registration].filter(Boolean).join(' · ')}
                </div>
              </div>

              {/* Specs Grid */}
              {specs.length > 0 && (
                <div style={{ padding: '0 32px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Technische Daten</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {specs.map(({ label, value }) => (
                      <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</div>
                        <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '700' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ausstattung */}
              {vehicle.equipment && vehicle.equipment.length > 0 && (
                <div style={{ padding: '0 32px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Ausstattung</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {vehicle.equipment.map((item, i) => (
                      <span key={i} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Beschreibung */}
              {vehicle.description && (
                <div style={{ padding: '0 32px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Beschreibung</div>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: 0 }}>{vehicle.description}</p>
                </div>
              )}

              {/* Footer */}
              <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{dealerName || 'Ihr Händler'}</div>
                  {dealerPhone && <div style={{ fontSize: '13px', color: '#64748b' }}>📞 {dealerPhone}</div>}
                  {dealerEmail && <div style={{ fontSize: '13px', color: '#64748b' }}>✉ {dealerEmail}</div>}
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#94a3b8' }}>
                  <div>Erstellt mit 2Fast4Sale</div>
                  <div>{new Date().toLocaleDateString('de-DE')}</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  ), document.body);
}

/* ─── Watermark Tool ─── */
export function addWatermark(imageUrl: string, text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Semi-transparent banner unten
      const bannerH = Math.max(36, canvas.height * 0.07);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, canvas.height - bannerH, canvas.width, bannerH);

      // Text
      const fontSize = Math.max(14, bannerH * 0.5);
      ctx.font = `700 ${fontSize}px "DM Sans", Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillText(text, canvas.width - 16, canvas.height - bannerH / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/* ─── Combined Tools Button Group ─── */
export function VehicleToolButtons({ vehicle, dealerName, dealerPhone, dealerEmail }: {
  vehicle: Vehicle;
  dealerName?: string;
  dealerPhone?: string;
  dealerEmail?: string;
}) {
  const [showQR,  setShowQR]  = useState(false);
  const [showPDF, setShowPDF] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={e => { e.stopPropagation(); setShowQR(true); }}
          title="QR-Code generieren"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORD}`, borderRadius: '7px', color: TS, padding: '6px 11px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: F }}>
          <QrCode size={13} /> QR
        </button>
        <button
          onClick={e => { e.stopPropagation(); setShowPDF(true); }}
          title="Angebots-PDF erstellen"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORD}`, borderRadius: '7px', color: TS, padding: '6px 11px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: F }}>
          <FileText size={13} /> PDF
        </button>
      </div>

      {showQR  && <QRCodeModal  vehicle={vehicle} onClose={() => setShowQR(false)} />}
      {showPDF && <OfferPDFModal vehicle={vehicle} dealerName={dealerName} dealerPhone={dealerPhone} dealerEmail={dealerEmail} onClose={() => setShowPDF(false)} />}
    </>
  );
}
