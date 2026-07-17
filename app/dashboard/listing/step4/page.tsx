'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles, Save, ChevronLeft, CheckCircle2, Copy, RefreshCw,
  Send, Car, Gauge, Fuel, Loader2, Zap, Tag as TagIcon,
  AlertTriangle, Shield, Image as ImgIcon, Euro,
  ChevronRight, ExternalLink, Globe, Star, Smartphone, Monitor,
  Phone, Check, BarChart2, Lock,
} from 'lucide-react';

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const F    = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const BG   = '#f0f2f5';
const CARD = '#ffffff';
const SURF = '#f8fafc';
const BORD = '#e2e8f0';
const TH   = '#0f172a';
const TS   = '#64748b';
const TD   = '#94a3b8';
const IND  = '#6366f1';

type Platform = 'mobile' | 'autoscout';
type ViewMode = 'desktop' | 'phone';

/* ─── Confetti ───────────────────────────────────────────────────────────── */
function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
      w: 6 + Math.random() * 8, h: 10 + Math.random() * 8,
      r: Math.random() * Math.PI * 2, dr: (Math.random() - 0.5) * 0.2,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
      color: ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899'][Math.floor(Math.random()*7)],
      opacity: 1,
    }));
    let alive = true;
    const draw = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.r += p.dr; p.vy += 0.05;
        if (p.y > canvas.height * 0.7) p.opacity = Math.max(0, p.opacity - 0.02);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color;
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore();
      });
      if (pieces.some(p => p.opacity > 0)) requestAnimationFrame(draw);
    };
    draw();
    return () => { alive = false; };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }} />;
}

/* ─── Score Ring ─────────────────────────────────────────────────────────── */
function Ring({ score, size = 96 }: { score: number; size?: number }) {
  const r = size/2 - 8, sw = 7, c = 2 * Math.PI * r;
  const color = score >= 80 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${(score/100)*c} ${c}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }} />
      <text x={size/2} y={size/2+6} textAnchor="middle" fontSize={size < 80 ? 14 : 18} fontWeight="900"
        fill={color} style={{ transform:`rotate(90deg)`, transformOrigin:`${size/2}px ${size/2}px`, fontFamily: F }}>
        {score}
      </text>
    </svg>
  );
}

/* ─── Phone Frame ────────────────────────────────────────────────────────── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '320px', background: '#1a1a2e', borderRadius: '40px', padding: '14px 10px', boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)', position: 'relative' }}>
        {/* Notch */}
        <div style={{ width: '100px', height: '28px', background: '#1a1a2e', borderRadius: '0 0 16px 16px', margin: '0 auto 6px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0a0a15', border: '2px solid #2a2a3e' }} />
          <div style={{ width: '50px', height: '6px', background: '#0a0a15', borderRadius: '3px' }} />
        </div>
        {/* Screen */}
        <div style={{ background: '#fff', borderRadius: '28px', overflow: 'hidden', maxHeight: '580px', overflowY: 'auto' }}>
          {children}
        </div>
        {/* Home bar */}
        <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px', margin: '10px auto 0' }} />
      </div>
    </div>
  );
}

/* ─── Browser Frame ──────────────────────────────────────────────────────── */
function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${BORD}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      {/* Chrome bar */}
      <div style={{ background: '#f3f3f3', borderBottom: '1px solid #e0e0e0', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          {['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width: '11px', height: '11px', borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Lock size={9} color="#888" />
          <span style={{ fontFamily: F }}>{url}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[ChevronLeft, ChevronRight].map((Icon, i) => <Icon key={i} size={13} color="#888" />)}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─── mobile.de listing ──────────────────────────────────────────────────── */
function MobileDeListing({ title, price, brand, km, year, fuel, gearbox, power, carColor, desc, equipment, photos }: {
  title:string; price:string; brand:string; km:string; year:string; fuel:string;
  gearbox:string; power:string; carColor:string; desc:string; equipment:string[]; photos:string[];
}) {
  const fmtKm = km ? `${Number(km).toLocaleString('de-DE')} km` : '—';
  const fmtPs = power ? `${power} PS (${Math.round(Number(power)/1.36)} kW)` : '—';
  const fmtPrice = price ? `${Number(price).toLocaleString('de-DE')} €` : '—';
  return (
    <div style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif', background: '#fff', fontSize: '13px' }}>
      {/* Top Nav */}
      <div style={{ background: '#ff6600', padding: '0 16px', height: '44px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontWeight: '900', color: '#fff', fontSize: '20px', letterSpacing: '-0.5px', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
          mobile<span style={{ fontWeight: '400', opacity: 0.85 }}>.de</span>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.2)', borderRadius: '4px', height: '28px', display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Suche...</span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: '8px 16px', fontSize: '11px', color: '#666', borderBottom: '1px solid #e8e8e8', background: '#fafafa', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>Startseite</span><span style={{ color: '#ccc', margin: '0 2px' }}>/</span>
        <span>Gebrauchtwagen</span><span style={{ color: '#ccc', margin: '0 2px' }}>/</span>
        <span style={{ color: '#ff6600', fontWeight: '600' }}>{brand || 'Fahrzeug'}</span>
      </div>

      {/* Main photo */}
      <div style={{ background: '#111', position: 'relative' }}>
        {photos[0] ? (
          <img src={photos[0]} style={{ width: '100%', height: '240px', objectFit: 'cover', display: 'block' }} alt="" />
        ) : (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: '#555' }}>
            <ImgIcon size={32} /><span style={{ fontSize: '12px' }}>Keine Fotos vorhanden</span>
          </div>
        )}
        {photos.length > 0 && (
          <div style={{ position: 'absolute', bottom: '8px', right: '10px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ImgIcon size={10} /> {photos.length} Fotos
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: '3px', padding: '4px', background: '#222', overflowX: 'auto' }}>
          {photos.slice(0, 7).map((p, i) => (
            <div key={i} style={{ flexShrink: 0, width: '60px', height: '44px', borderRadius: '2px', overflow: 'hidden', border: i === 0 ? '2px solid #ff6600' : '2px solid transparent', opacity: i === 0 ? 1 : 0.7 }}>
              <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '0', alignItems: 'start' }}>

        {/* LEFT: Title + Specs + Desc + Equipment */}
        <div style={{ padding: '16px', borderRight: '1px solid #e8e8e8' }}>
          {/* Title */}
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px', lineHeight: 1.3, fontFamily: 'Arial, sans-serif' }}>
            {title || `${brand} Gebrauchtwagen`}
          </h1>
          <div style={{ fontSize: '12px', color: '#777', marginBottom: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[km && fmtKm, year && `EZ ${year}`, fuel, gearbox, power && fmtPs].filter(Boolean).map((v, i) => (
              <span key={i}>{i > 0 && <span style={{ color: '#ccc', marginRight: '8px' }}>·</span>}{v}</span>
            ))}
          </div>

          {/* Key data table */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingBottom: '6px', borderBottom: '2px solid #ff6600', display: 'inline-block' }}>Fahrzeugdaten</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Kilometerstand', fmtKm],
                  ['Erstzulassung', year || '—'],
                  ['Kraftstoff', fuel || '—'],
                  ['Getriebe', gearbox || '—'],
                  ['Leistung', fmtPs],
                  ['Außenfarbe', carColor || '—'],
                ].map(([k, v], i) => (
                  <tr key={k} style={{ background: i % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                    <td style={{ padding: '7px 10px', fontSize: '12px', color: '#666', width: '45%', borderBottom: '1px solid #efefef' }}>{k}</td>
                    <td style={{ padding: '7px 10px', fontSize: '12px', color: '#1a1a1a', fontWeight: '600', borderBottom: '1px solid #efefef' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Description */}
          {desc && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingBottom: '6px', borderBottom: '2px solid #ff6600', display: 'inline-block' }}>Beschreibung</div>
              <p style={{ fontSize: '13px', color: '#444', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>{desc.slice(0, 400)}{desc.length > 400 ? '…' : ''}</p>
            </div>
          )}

          {/* Equipment */}
          {equipment.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingBottom: '6px', borderBottom: '2px solid #ff6600', display: 'inline-block' }}>Ausstattung</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px', marginTop: '8px' }}>
                {equipment.slice(0, 16).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#333', padding: '3px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Check size={11} color="#ff6600" strokeWidth={3} style={{ flexShrink: 0 }} />
                    {e}
                  </div>
                ))}
              </div>
              {equipment.length > 16 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#ff6600', fontWeight: '600', cursor: 'default' }}>
                  + {equipment.length - 16} weitere Ausstattungsmerkmale anzeigen
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Price sidebar */}
        <div style={{ padding: '16px' }}>
          {/* Price box */}
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#1a1a1a', letterSpacing: '-1px', lineHeight: 1, marginBottom: '2px' }}>
              {fmtPrice}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '14px' }}>inkl. MwSt. · Verhandlungsbasis</div>

            <button style={{ width: '100%', background: '#ff6600', color: '#fff', border: 'none', borderRadius: '4px', padding: '11px', fontSize: '14px', fontWeight: '700', cursor: 'default', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>
              Verkäufer kontaktieren
            </button>
            <button style={{ width: '100%', background: '#fff', color: '#ff6600', border: '2px solid #ff6600', borderRadius: '4px', padding: '9px', fontSize: '13px', fontWeight: '700', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'Arial, sans-serif' }}>
              <Phone size={13} /> Anrufen
            </button>
          </div>

          {/* Dealer box */}
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anbieter</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a', marginBottom: '2px' }}>2Fast4Sale Autohandel</div>
            <div style={{ fontSize: '11px', color: '#777', marginBottom: '8px' }}>Gewerblicher Anbieter</div>
            <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
              {[1,2,3,4,5].map(i => <Star key={i} size={12} fill={i <= 4 ? '#ff6600' : 'none'} color="#ff6600" />)}
              <span style={{ fontSize: '11px', color: '#777', marginLeft: '4px' }}>4,8 (127 Bewertungen)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#555' }}>Inserat-ID: {Math.floor(Math.random() * 900000000 + 100000000)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── AutoScout24 listing ────────────────────────────────────────────────── */
function AutoScoutListing({ title, price, brand, km, year, fuel, gearbox, power, carColor, desc, equipment, photos }: {
  title:string; price:string; brand:string; km:string; year:string; fuel:string;
  gearbox:string; power:string; carColor:string; desc:string; equipment:string[]; photos:string[];
}) {
  const fmtKm = km ? `${Number(km).toLocaleString('de-DE')} km` : '—';
  const fmtPrice = price ? `${Number(price).toLocaleString('de-DE')} €` : '—';
  const monthlyRate = price ? `${Math.round(Number(price) / 60).toLocaleString('de-DE')} €/Monat` : null;
  return (
    <div style={{ fontFamily: '"Source Sans Pro", "Open Sans", Arial, sans-serif', background: '#fff', fontSize: '13px' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e5ed', padding: '0 16px', height: '48px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontWeight: '900', fontSize: '18px', letterSpacing: '-0.3px' }}>
          <span style={{ color: '#003781' }}>Auto</span><span style={{ color: '#f56700' }}>Scout</span><span style={{ color: '#003781' }}>24</span>
        </div>
        <div style={{ flex: 1, background: '#f0f4f9', borderRadius: '20px', height: '30px', display: 'flex', alignItems: 'center', paddingLeft: '12px', border: '1px solid #d8e0ed' }}>
          <span style={{ fontSize: '11px', color: '#aaa' }}>Alle Marken · Alle Modelle</span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ background: '#f5f7fb', padding: '8px 16px', fontSize: '11px', color: '#7a8fa6', borderBottom: '1px solid #e0e5ed', display: 'flex', alignItems: 'center', gap: '3px' }}>
        <span>Startseite</span><ChevronRight size={10} /><span>Gebrauchtwagen</span><ChevronRight size={10} /><span>{brand || 'Alle Marken'}</span><ChevronRight size={10} /><span style={{ color: '#003781', fontWeight: '600' }}>{title ? title.slice(0, 30) : brand}</span>
      </div>

      {/* Title row (above photo) */}
      <div style={{ padding: '14px 16px 0', borderBottom: '1px solid #f0f3f8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '19px', fontWeight: '700', color: '#1b2437', margin: '0 0 5px', lineHeight: 1.3 }}>
              {title || `${brand} Gebrauchtwagen`}
            </h1>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {[km && fmtKm, year && `EZ ${year}`, fuel, gearbox, power && `${power} PS`].filter(Boolean).map((v, i) => (
                <span key={i} style={{ fontSize: '12px', background: '#f0f4fb', border: '1px solid #d8e3f0', borderRadius: '3px', padding: '2px 8px', color: '#3d5068', fontWeight: '600' }}>{v}</span>
              ))}
            </div>
          </div>
          {/* Price (top right) */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#1b2437', letterSpacing: '-1px', lineHeight: 1 }}>{fmtPrice}</div>
            {monthlyRate && <div style={{ fontSize: '11px', color: '#7a8fa6', marginTop: '2px' }}>ca. {monthlyRate}*</div>}
            <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '3px', padding: '2px 8px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#43a047' }} />
              <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '700' }}>Fairer Preis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main photo */}
      <div style={{ background: '#111', position: 'relative' }}>
        {photos[0] ? (
          <img src={photos[0]} style={{ width: '100%', height: '250px', objectFit: 'cover', display: 'block' }} alt="" />
        ) : (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', flexDirection: 'column', gap: '8px' }}>
            <ImgIcon size={32} /><span style={{ fontSize: '12px' }}>Keine Fotos</span>
          </div>
        )}
        {photos.length > 0 && (
          <div style={{ position: 'absolute', bottom: '10px', right: '12px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ImgIcon size={10} /> {photos.length} Bilder
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: '3px', padding: '4px 6px', background: '#1b2437' }}>
          {photos.slice(0, 8).map((p, i) => (
            <div key={i} style={{ flexShrink: 0, width: '58px', height: '40px', borderRadius: '3px', overflow: 'hidden', border: i === 0 ? '2px solid #f56700' : '2px solid rgba(255,255,255,0.2)', opacity: i === 0 ? 1 : 0.65 }}>
              <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            </div>
          ))}
        </div>
      )}

      {/* 2-column: content + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '0' }}>

        {/* LEFT */}
        <div style={{ padding: '16px', borderRight: '1px solid #e8edf5' }}>

          {/* Fahrzeugdaten */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1b2437', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #003781' }}>Fahrzeugdaten</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
              {[
                ['Kilometerstand', fmtKm],
                ['Erstzulassung', year || '—'],
                ['Kraftstoff', fuel || '—'],
                ['Getriebe', gearbox || '—'],
                ['Leistung', power ? `${power} PS` : '—'],
                ['Außenfarbe', carColor || '—'],
              ].map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', padding: '8px 10px', background: i % 4 < 2 ? '#f7f9fc' : '#fff', borderBottom: '1px solid #edf0f5' }}>
                  <span style={{ fontSize: '10px', color: '#7a8fa6', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{k}</span>
                  <span style={{ fontSize: '13px', color: '#1b2437', fontWeight: '700' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Beschreibung */}
          {desc && (
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1b2437', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #003781' }}>Beschreibung</div>
              <p style={{ fontSize: '13px', color: '#3d5068', lineHeight: 1.8, margin: 0 }}>{desc.slice(0, 450)}{desc.length > 450 ? '…' : ''}</p>
            </div>
          )}

          {/* Ausstattung */}
          {equipment.length > 0 && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1b2437', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #003781' }}>
                Ausstattung ({equipment.length} Merkmale)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                {equipment.slice(0, 18).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#3d5068', padding: '4px 0', borderBottom: '1px solid #f0f3f8' }}>
                    <Check size={12} color="#003781" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    {e}
                  </div>
                ))}
              </div>
              {equipment.length > 18 && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#003781', fontWeight: '600', cursor: 'default' }}>
                  Alle {equipment.length} Merkmale anzeigen
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <div style={{ padding: '14px' }}>
          {/* Contact box */}
          <div style={{ border: '1px solid #d8e3f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ padding: '14px', borderBottom: '1px solid #edf0f5' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#1b2437', letterSpacing: '-0.8px', marginBottom: '1px' }}>{fmtPrice}</div>
              {monthlyRate && <div style={{ fontSize: '11px', color: '#7a8fa6' }}>ca. {monthlyRate} Finanzierung*</div>}
            </div>
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <button style={{ width: '100%', background: '#f56700', color: '#fff', border: 'none', borderRadius: '5px', padding: '11px', fontSize: '13px', fontWeight: '700', cursor: 'default', fontFamily: 'inherit' }}>
                Verkäufer kontaktieren
              </button>
              <button style={{ width: '100%', background: '#fff', color: '#003781', border: '2px solid #003781', borderRadius: '5px', padding: '9px', fontSize: '12px', fontWeight: '600', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontFamily: 'inherit' }}>
                <Phone size={12} /> Anrufen
              </button>
            </div>
          </div>

          {/* Dealer */}
          <div style={{ border: '1px solid #d8e3f0', borderRadius: '6px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#7a8fa6', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Händler</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1b2437', marginBottom: '2px' }}>2Fast4Sale</div>
            <div style={{ display: 'flex', gap: '2px', marginBottom: '6px', alignItems: 'center' }}>
              {[1,2,3,4,5].map(i => <Star key={i} size={11} fill={i <= 5 ? '#f56700' : 'none'} color="#f56700" />)}
              <span style={{ fontSize: '10px', color: '#7a8fa6', marginLeft: '3px' }}>5,0</span>
            </div>
            <div style={{ fontSize: '11px', color: '#7a8fa6' }}>Gewerblicher Anbieter</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
function Step4Inner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const brand    = searchParams.get('brand')   || '';
  const km       = searchParams.get('km')      || '';
  const price    = searchParams.get('price')   || '';
  const year     = searchParams.get('year')    || '';
  const fuel     = searchParams.get('fuel')    || '';
  const gearbox  = searchParams.get('gearbox') || '';
  const carColor = searchParams.get('color')   || '';
  const power    = searchParams.get('power')   || '';
  const rawDesc  = searchParams.get('desc')    ?? '';

  const [desc,      setDesc]      = useState(() => { try { return decodeURIComponent(rawDesc); } catch { return ''; } });
  const [title,     setTitle]     = useState('');
  const [editPrice, setEditPrice] = useState(price);
  const [saving,    setSaving]    = useState(false);
  const [savedId,   setSavedId]   = useState<string | null>(null);
  const [error,     setError]     = useState('');
  const [copied,    setCopied]    = useState(false);
  const [done,      setDone]      = useState(false);
  const [platform,  setPlatform]  = useState<Platform>('mobile');
  const [viewMode,  setViewMode]  = useState<ViewMode>('desktop');
  const [step1,     setStep1]     = useState<Record<string, unknown>>({});
  const [photos,    setPhotos]    = useState<string[]>([]);

  useEffect(() => {
    try { const r = sessionStorage.getItem('listing_step1'); if (r) { const d = JSON.parse(r); setStep1(d); if (d.suggestedTitle && !title) setTitle(d.suggestedTitle); } } catch {/* */}
    try { const r = sessionStorage.getItem('listing_photos'); if (r) setPhotos(JSON.parse(r)); } catch {/* */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const equipment: string[] = (step1.equipment as string[]) || [];

  /* Score */
  const checks = [
    { label: 'Titel',        ok: title.length >= 20,    pts: 20, detail: `${title.length}/80 Zeichen`,                  icon: <TagIcon size={12} /> },
    { label: 'Preis',        ok: Number(editPrice) > 0, pts: 15, detail: editPrice ? `${Number(editPrice).toLocaleString('de-DE')} €` : 'Fehlt', icon: <Euro size={12} /> },
    { label: 'Beschreibung', ok: desc.length >= 200,    pts: 30, detail: `${desc.length} Zeichen`,                       icon: <Sparkles size={12} /> },
    { label: 'Fotos',        ok: photos.length >= 3,    pts: 20, detail: `${photos.length} hochgeladen`,                 icon: <ImgIcon size={12} /> },
    { label: 'Ausstattung',  ok: equipment.length >= 5, pts: 15, detail: `${equipment.length} Merkmale`,                 icon: <Shield size={12} /> },
  ];
  const score = checks.reduce((s, c) => s + (c.ok ? c.pts : 0), 0);

  const copyText   = () => { navigator.clipboard.writeText(desc); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const regenerate = () => router.push(`/dashboard/listing/step3?${new URLSearchParams({ brand, km, price, year, fuel, gearbox, color: carColor, power }).toString()}`);

  const save = async (st = 'Aktiv') => {
    setSaving(true); setError('');
    try {
      const body = { brand, title: title || undefined, km, price: editPrice || price, year: year || undefined, fuel_type: fuel || undefined, gearbox_type: gearbox || undefined, color: carColor || undefined, power_kw: power ? String(Math.round(Number(power)/1.36)) : undefined, description: desc || undefined, status: st, vin: step1.vin || undefined, first_registration: (step1.firstRegistration as string) || year || undefined, displacement_ccm: step1.displacementCcm || undefined, seats: step1.seats || undefined, equipment, dealer_notes: (step1.dealerNotes as string) || undefined };
      let id = savedId;
      if (!id) { const res = await fetch('/api/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Fehler'); } const data = await res.json(); id = data.vehicle?.id || data.id; setSavedId(id!); }
      else { const res = await fetch(`/api/vehicles/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Fehler'); } }
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Fehler'); }
    finally { setSaving(false); }
  };

  /* ── Success ─────────────────────────────────────────────────────────────── */
  if (done) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1040 50%, #0a0f1e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <Confetti />
      <div style={{ position: 'absolute', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', top: '10%', right: '10%', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 32px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', animation: 'rip 2.5s ease-out infinite' }} />
          <div style={{ position: 'absolute', inset: '18px', borderRadius: '50%', background: 'rgba(16,185,129,0.08)', animation: 'rip 2.5s ease-out 0.6s infinite' }} />
          <div style={{ position: 'absolute', inset: '32px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 60px rgba(16,185,129,0.5)' }}>
            <CheckCircle2 size={46} color="#fff" strokeWidth={1.8} />
          </div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', padding: '5px 16px', fontSize: '11px', fontWeight: '800', color: '#34d399', marginBottom: '20px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <Star size={10} fill="#34d399" /> Inserat erfolgreich erstellt
        </div>

        <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#fff', margin: '0 0 12px', letterSpacing: '-2px', lineHeight: 1 }}>
          {brand || 'Fahrzeug'}<br />
          <span style={{ background: 'linear-gradient(135deg, #818cf8, #c4b5fd, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ist bereit.</span>
        </h1>
        <p style={{ color: '#475569', fontSize: '15px', margin: '0 0 40px', lineHeight: 1.7, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
          Dein Inserat ist gespeichert. Ab September wird es automatisch auf{' '}
          <span style={{ color: '#ff6600', fontWeight: '700' }}>Mobile.de</span> und{' '}
          <span style={{ color: '#1a77c9', fontWeight: '700' }}>AutoScout24</span> erscheinen.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '36px', flexWrap: 'wrap' }}>
          {[
            { icon: <Sparkles size={18} color="#a78bfa" />, val: desc.length, sub: 'Zeichen' },
            { icon: <Shield size={18} color="#34d399" />,   val: equipment.length, sub: 'Ausstattung' },
            { icon: <ImgIcon size={18} color="#60a5fa" />,  val: photos.length, sub: 'Fotos' },
            { icon: <Star size={18} color="#fbbf24" />,     val: score, sub: 'Score' },
          ].map(({ icon, val, sub }) => (
            <div key={sub} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px 20px', textAlign: 'center', minWidth: '95px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{icon}</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '3px' }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '15px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '13px', color: '#e2e8f0', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: F, transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
            Zum Dashboard
          </button>
          <button onClick={() => router.push('/dashboard/listing/step1')} style={{ padding: '15px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '13px', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: F, boxShadow: '0 8px 32px rgba(99,102,241,0.5)' }}>
            Neues Inserat +
          </button>
        </div>
      </div>
      <style>{`@keyframes rip { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.8);opacity:0} }`}</style>
    </div>
  );

  /* ── Editor ─────────────────────────────────────────────────────────────── */
  const charCount = desc.length;
  const qualColor = charCount > 500 ? '#10b981' : charCount > 250 ? '#3b82f6' : charCount > 100 ? '#f59e0b' : '#ef4444';
  const qualLabel = charCount > 500 ? 'Sehr gut' : charCount > 250 ? 'Gut' : charCount > 100 ? 'OK' : 'Zu kurz';

  const mockupProps = { title, price: editPrice || price, brand, km, year, fuel, gearbox, power, carColor, desc, equipment, photos };

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F }}>

      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORD}`, height: '58px', display: 'flex', alignItems: 'center', padding: '0 20px', position: 'sticky', top: 0, zIndex: 40, gap: '14px' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: TS, cursor: 'pointer', fontSize: '13px', fontFamily: F, fontWeight: '600', padding: '6px 8px', borderRadius: '7px', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = SURF)} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
          <ChevronLeft size={15} /> Zurück
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1, justifyContent: 'center' }}>
          {['Fahrzeugdaten', 'Fotos', 'KI-Text', 'Fertigstellen'].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: i === 3 ? 'rgba(99,102,241,0.1)' : 'transparent', border: i === 3 ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: i < 3 ? '#10b981' : IND, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '900', color: '#fff' }}>{i < 3 ? '✓' : '4'}</div>
                <span style={{ fontSize: '12px', fontWeight: i === 3 ? '700' : '500', color: i === 3 ? IND : '#10b981', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < 3 && <ChevronRight size={11} color="#cbd5e1" />}
            </div>
          ))}
        </div>
        <div style={{ flexShrink: 0 }}><Ring score={score} size={48} /></div>
      </div>

      {/* 3-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr 420px', minHeight: 'calc(100vh - 58px)' }}>

        {/* COL 1: Checklist */}
        <div style={{ borderRight: `1px solid ${BORD}`, background: CARD, padding: '22px 16px', position: 'sticky', top: '58px', height: 'calc(100vh - 58px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: TD, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '16px' }}>Vollständigkeit</div>

          {/* Ring centered */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '18px', gap: '8px' }}>
            <Ring score={score} size={96} />
            <div style={{ fontSize: '13px', fontWeight: '800', color: score >= 80 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444' }}>
              {score >= 80 ? 'Top Inserat' : score >= 55 ? 'Sieht gut aus' : 'Fast fertig'}
            </div>
          </div>

          {/* Checks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
            {checks.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '10px 11px', background: c.ok ? 'rgba(16,185,129,0.05)' : '#fafafa', border: `1px solid ${c.ok ? 'rgba(16,185,129,0.2)' : BORD}`, borderRadius: '10px', transition: 'all 0.4s' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: c.ok ? 'rgba(16,185,129,0.12)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: c.ok ? '#10b981' : TD, transition: 'all 0.4s' }}>
                  {c.ok ? <CheckCircle2 size={14} strokeWidth={2.5} /> : c.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: c.ok ? '#059669' : TH }}>{c.label}</div>
                  <div style={{ fontSize: '10px', color: c.ok ? '#6ee7b7' : TD, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.detail}</div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: c.ok ? '#10b981' : '#e2e8f0' }}>+{c.pts}</span>
              </div>
            ))}
          </div>

          {/* Score bar card */}
          <div style={{ padding: '14px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: '700' }}>Inserat-Score</span>
              <span style={{ fontSize: '13px', fontWeight: '900', color: score >= 80 ? '#10b981' : '#f59e0b' }}>{score}/100</span>
            </div>
            <div style={{ height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)' : score >= 55 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)', borderRadius: '4px', transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>

          <div style={{ flex: 1 }} />
          <div style={{ padding: '12px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: IND, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}><BarChart2 size={11} /> September 2026</div>
            <div style={{ fontSize: '11px', color: TS, lineHeight: 1.6 }}>Nach den Gesprächen mit Mobile.de & AutoScout24 wird die Plattform-Verbindung aktiviert.</div>
          </div>
        </div>

        {/* COL 2: Editor */}
        <div style={{ padding: '26px 26px 120px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '22px' }}>
            <h1 style={{ fontSize: '23px', fontWeight: '900', color: TH, margin: '0 0 3px', letterSpacing: '-0.6px' }}>Inserat fertigstellen</h1>
            <p style={{ color: TS, fontSize: '13px', margin: 0 }}>{brand && <strong style={{ color: TH }}>{brand} · </strong>}{km && `${Number(km).toLocaleString('de-DE')} km · `}{editPrice && `${Number(editPrice).toLocaleString('de-DE')} €`}</p>
          </div>

          {/* Titel */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '18px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: TH, display: 'flex', alignItems: 'center', gap: '5px' }}><TagIcon size={12} color={IND} /> Inserat-Titel</label>
              <span style={{ fontSize: '11px', fontWeight: '700', color: title.length >= 40 && title.length <= 80 ? '#10b981' : title.length > 80 ? '#f59e0b' : TD }}>
                {title.length}/80{title.length >= 40 && title.length <= 80 ? ' · Optimal' : title.length > 80 ? ' · Kürzen' : ''}
              </span>
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={`${brand || 'Marke Modell'} · ${year || 'Jahr'} · ${power ? power + ' PS' : 'PS'} · Vollausstattung`}
              style={{ width: '100%', padding: '11px 13px', background: SURF, border: `1px solid ${BORD}`, borderRadius: '9px', color: TH, fontSize: '14px', fontFamily: F, outline: 'none', boxSizing: 'border-box', fontWeight: '700', transition: 'border-color 0.2s, box-shadow 0.2s' }}
              onFocus={e => { e.target.style.borderColor = IND; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = BORD; e.target.style.boxShadow = 'none'; }} />
            <div style={{ marginTop: '6px', height: '3px', background: BORD, borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (title.length/80)*100)}%`, background: title.length >= 40 && title.length <= 80 ? '#10b981' : title.length > 80 ? '#f59e0b' : IND, borderRadius: '2px', transition: 'all 0.3s' }} />
            </div>
          </div>

          {/* Preis + Details */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '18px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: TH, marginBottom: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}><Euro size={12} color={IND} /> Preis & Fahrzeugdaten</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '700', color: TD, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Verkaufspreis</label>
                <div style={{ position: 'relative' }}>
                  <input value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="24900"
                    style={{ width: '100%', padding: '10px 28px 10px 11px', background: SURF, border: `1px solid ${BORD}`, borderRadius: '8px', color: TH, fontSize: '16px', fontFamily: F, outline: 'none', boxSizing: 'border-box', fontWeight: '900', letterSpacing: '-0.5px', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = IND; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = BORD; e.target.style.boxShadow = 'none'; }} />
                  <span style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', color: TD, fontWeight: '700' }}>€</span>
                </div>
              </div>
              {[['Kilometerstand', km ? `${Number(km).toLocaleString('de-DE')} km` : '—'], ['Erstzulassung', year || '—']].map(([l,v]) => (
                <div key={l}><label style={{ fontSize: '10px', fontWeight: '700', color: TD, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</label><div style={{ padding: '10px 11px', background: SURF, border: `1px solid ${BORD}`, borderRadius: '8px', color: TS, fontSize: '13px', fontWeight: '600' }}>{v}</div></div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {[['Kraftstoff', fuel||'—'],['Getriebe', gearbox||'—'],['Leistung', power?`${power} PS`:'—']].map(([l,v]) => (
                <div key={l}><label style={{ fontSize: '10px', fontWeight: '700', color: TD, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</label><div style={{ padding: '10px 11px', background: SURF, border: `1px solid ${BORD}`, borderRadius: '8px', color: TS, fontSize: '13px', fontWeight: '600' }}>{v}</div></div>
              ))}
            </div>
          </div>

          {/* Beschreibung */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '18px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '30px', height: '30px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={14} color="#10b981" /></div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: TH }}>KI-Beschreibung</div>
                  <div style={{ fontSize: '11px', color: TS }}>Qualität: <span style={{ color: qualColor, fontWeight: '700' }}>{qualLabel}</span> · {charCount} Zeichen</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={copyText} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', background: copied ? 'rgba(16,185,129,0.08)' : SURF, border: `1px solid ${copied ? 'rgba(16,185,129,0.2)' : BORD}`, borderRadius: '7px', color: copied ? '#10b981' : TS, fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: F, transition: 'all 0.2s' }}>
                  {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />} {copied ? 'Kopiert!' : 'Kopieren'}
                </button>
                <button onClick={regenerate} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.17)', borderRadius: '7px', color: IND, fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: F }}>
                  <RefreshCw size={12} /> Neu
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '11px' }}>
              <div style={{ flex: 1, height: '5px', background: BORD, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100,(charCount/600)*100)}%`, background: `linear-gradient(90deg, ${qualColor}50, ${qualColor})`, borderRadius: '3px', transition: 'width 0.4s' }} />
              </div>
              <span style={{ fontSize: '11px', color: TD, fontWeight: '600', flexShrink: 0 }}>{charCount}/600</span>
            </div>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={14}
              placeholder="KI-Beschreibung erscheint hier — oder manuell eingeben..."
              style={{ width: '100%', padding: '13px', resize: 'vertical', background: SURF, border: `1px solid ${BORD}`, borderRadius: '10px', color: TH, fontSize: '13px', fontFamily: F, lineHeight: 1.9, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' }}
              onFocus={e => { e.target.style.borderColor = IND; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = BORD; e.target.style.boxShadow = 'none'; }} />
          </div>

          {/* Ausstattung */}
          {equipment.length > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '18px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: TH, marginBottom: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}><Shield size={12} color={IND} /> Ausstattung <span style={{ fontSize: '11px', fontWeight: '600', color: TD }}>· {equipment.length} Merkmale</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {equipment.map((item, i) => <span key={i} style={{ fontSize: '12px', color: '#4f46e5', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.14)', padding: '4px 11px', borderRadius: '20px', fontWeight: '500' }}>{item}</span>)}
              </div>
            </div>
          )}

          {/* Fotos */}
          {photos.length > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '18px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: TH, marginBottom: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}><ImgIcon size={12} color={IND} /> Fotos <span style={{ fontSize: '11px', fontWeight: '600', color: TD }}>· {photos.length} hochgeladen</span></div>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {photos.slice(0,9).map((src,i) => (
                  <div key={i} style={{ width: '70px', height: '54px', borderRadius: '7px', overflow: 'hidden', border: `2px solid ${i === 0 ? IND : BORD}`, position: 'relative', flexShrink: 0 }}>
                    <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    {i === 0 && <div style={{ position: 'absolute', bottom: '2px', left: '2px', background: IND, borderRadius: '3px', padding: '1px 4px', fontSize: '9px', color: '#fff', fontWeight: '700' }}>Cover</div>}
                  </div>
                ))}
                {photos.length > 9 && <div style={{ width: '70px', height: '54px', borderRadius: '7px', background: '#f1f5f9', border: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: TS, fontWeight: '700' }}>+{photos.length - 9}</div>}
              </div>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', color: '#ef4444', fontSize: '13px' }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        {/* COL 3: Live Preview */}
        <div style={{ borderLeft: `1px solid ${BORD}`, background: '#edf0f4', padding: '18px 16px 120px', position: 'sticky', top: '58px', height: 'calc(100vh - 58px)', overflowY: 'auto' }}>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.08)', borderRadius: '9px', padding: '3px', flex: 1 }}>
              {([['mobile','mobile.de'],['autoscout','AutoScout24']] as [Platform,string][]).map(([id,label]) => (
                <button key={id} onClick={() => setPlatform(id)} style={{ flex: 1, padding: '6px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: F, fontSize: '11px', fontWeight: '700', transition: 'all 0.2s', background: platform === id ? '#fff' : 'transparent', color: platform === id ? (id === 'mobile' ? '#ff6600' : '#003566') : TD, boxShadow: platform === id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.08)', borderRadius: '9px', padding: '3px' }}>
              {([['desktop', <Monitor key="d" size={13} />],['phone', <Smartphone key="p" size={13} />]] as [ViewMode, React.ReactNode][]).map(([id,icon]) => (
                <button key={id} onClick={() => setViewMode(id)} style={{ padding: '6px 8px', borderRadius: '7px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: viewMode === id ? '#fff' : 'transparent', color: viewMode === id ? TH : TD, boxShadow: viewMode === id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center' }}>{icon}</button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '10px', fontWeight: '700', color: TD, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px' }}>
            {platform === 'mobile' ? 'mobile.de' : 'AutoScout24'} · {viewMode === 'desktop' ? 'Desktop' : 'iPhone'} Ansicht
          </div>

          {viewMode === 'phone' ? (
            <PhoneFrame>
              {platform === 'mobile' ? <MobileDeListing {...mockupProps} /> : <AutoScoutListing {...mockupProps} />}
            </PhoneFrame>
          ) : (
            <BrowserFrame url={platform === 'mobile' ? 'mobile.de/auto/details/...' : 'autoscout24.de/angebote/...'}>
              {platform === 'mobile' ? <MobileDeListing {...mockupProps} /> : <AutoScoutListing {...mockupProps} />}
            </BrowserFrame>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${BORD}`, padding: '11px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 40, gap: '10px' }}>
        <div style={{ display: 'flex', gap: '7px' }}>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 14px', background: SURF, border: `1px solid ${BORD}`, borderRadius: '9px', color: TS, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: F }}><ChevronLeft size={14} /> Zurück</button>
          <button onClick={() => save('Entwurf')} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 15px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '9px', color: '#d97706', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: F }}><Save size={13} /> Entwurf</button>
        </div>
        <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
          <button onClick={() => save('Aktiv')} disabled={saving} title="Nach September-Gesprächen verfügbar" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 15px', background: '#ff6600', border: 'none', color: '#fff', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: F, opacity: 0.45 }}><Send size={13} /> Mobile.de</button>
          <button onClick={() => save('Aktiv')} disabled={saving} title="Nach September-Gesprächen verfügbar" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 15px', background: '#003566', border: 'none', color: '#fff', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: F, opacity: 0.45 }}><ExternalLink size={13} /> AutoScout24</button>
          <button onClick={() => save('Aktiv')} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: saving ? 'rgba(99,102,241,0.45)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '900', cursor: saving ? 'wait' : 'pointer', fontFamily: F, boxShadow: saving ? 'none' : '0 4px 24px rgba(99,102,241,0.45)', letterSpacing: '-0.2px', transition: 'all 0.2s' }}
            onMouseEnter={e => !saving && (e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.55)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 24px rgba(99,102,241,0.45)')}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={16} />}
            {saving ? 'Speichern…' : 'Veröffentlichen'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function Step4() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:BG, display:'flex', alignItems:'center', justifyContent:'center' }}><Loader2 size={28} color={IND} style={{ animation:'spin 1s linear infinite' }} /></div>}>
      <Step4Inner />
    </Suspense>
  );
}
