'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Eye, ExternalLink, Download,
  Trash2, Calendar, MoreHorizontal, Car, TrendingUp,
  CheckCircle2, Clock, Loader2, RefreshCw, X,
  ChevronLeft, ChevronRight, Fuel, Gauge, MapPin,
  Phone, Mail, Share2, Heart, Zap, Copy, ArrowUpDown
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { VehicleToolButtons } from '../../../components/VehicleTools';
import { Viewer360 } from '../../../components/Viewer360';

interface Vehicle {
  id: string;
  brand: string;
  price: string;
  created_at: string;
  status: string;
  km?: string;
  fuel_type?: string;
  power_kw?: string;
  displacement_ccm?: string;
  color?: string;
  seats?: string;
  vin?: string;
  first_registration?: string;
  description?: string;
  equipment?: string[];
  views: number;
  vehicle_images?: { processed_url: string | null; original_url: string | null }[];
}

const STATUS_OPTIONS = ['Alle', 'Aktiv', 'Reserviert', 'Entwurf', 'Verkauft'];

const statusStyle: Record<string, { bg: string; color: string; dot: string }> = {
  'Aktiv':      { bg: 'rgba(16,185,129,0.1)',  color: '#34d399', dot: '#10b981' },
  'Reserviert': { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', dot: '#3b82f6' },
  'Entwurf':    { bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24', dot: '#f59e0b' },
  'Verkauft':   { bg: 'rgba(139,92,246,0.1)',  color: '#c4b5fd', dot: '#8b5cf6' },
};

const STATUS_CYCLE = ['Entwurf', 'Aktiv', 'Reserviert', 'Verkauft'];

function getImages(v: Vehicle): string[] {
  const imgs = (v.vehicle_images || [])
    .map(i => i.processed_url || i.original_url)
    .filter(Boolean) as string[];
  if (imgs.length === 0) return ['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=60&w=800'];
  return imgs;
}

// ── Detail Modal ──────────────────────────────────────────
function DetailModal({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const imgs = getImages(vehicle);
  const realImgs = (vehicle.vehicle_images || []).map(i => i.processed_url || i.original_url).filter(Boolean) as string[];
  const has360 = realImgs.length >= 6;
  const [activeImg, setActiveImg] = useState(0);
  const [show360, setShow360] = useState(has360);
  const sc = statusStyle[vehicle.status] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b', dot: '#64748b' };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (!show360) {
        if (e.key === 'ArrowLeft') setActiveImg(i => Math.max(0, i - 1));
        if (e.key === 'ArrowRight') setActiveImg(i => Math.min(imgs.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imgs.length, onClose, show360]);

  const specs = [
    { label: 'Kilometerstand', value: vehicle.km ? `${vehicle.km} km` : null },
    { label: 'Erstzulassung',  value: vehicle.first_registration || null },
    { label: 'Kraftstoff',     value: vehicle.fuel_type || null },
    { label: 'Leistung',       value: vehicle.power_kw ? `${vehicle.power_kw} kW (${Math.round(Number(vehicle.power_kw) * 1.36)} PS)` : null },
    { label: 'Hubraum',        value: vehicle.displacement_ccm ? `${Number(vehicle.displacement_ccm).toLocaleString('de-DE')} ccm` : null },
    { label: 'Farbe',          value: vehicle.color || null },
    { label: 'Sitzplätze',     value: vehicle.seats || null },
    { label: 'FIN',            value: vehicle.vin ? vehicle.vin.slice(0, 10) + '...' : null },
  ].filter(s => s.value);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '900px', maxHeight: '92vh', backgroundColor: '#0a1628', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}
      >
        {/* Bild-Bereich */}
        <div style={{ position: 'relative', backgroundColor: '#080e1a', flexShrink: 0 }}>

          {/* Toggle 360° / Fotos */}
          {has360 && (
            <div style={{ display: 'flex', gap: '6px', padding: '10px 14px 0', position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
              <button onClick={() => setShow360(true)} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: show360 ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>360°</button>
              <button onClick={() => setShow360(false)} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: !show360 ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Fotos</button>
            </div>
          )}

          {show360 && has360 ? (
            <div style={{ aspectRatio: '16/7' }}>
              <Viewer360 images={realImgs} autoPlay={false} />
            </div>
          ) : (
          <div style={{ aspectRatio: '16/7', overflow: 'hidden', position: 'relative' }}>
            <img src={imgs[activeImg]} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s' }} alt={vehicle.brand} />
            {/* Gradient unten */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to top, rgba(8,14,26,0.9), transparent)' }} />
            {/* Bild-Zähler */}
            <div style={{ position: 'absolute', bottom: '14px', right: '16px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#94a3b8', fontSize: '14px', fontWeight: '700', padding: '5px 12px', borderRadius: '8px', backdropFilter: 'blur(8px)' }}>
              {activeImg + 1} / {imgs.length}
            </div>
            {/* Status Badge */}
            <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: sc.bg, border: `1px solid ${sc.color}40`, borderRadius: '10px', padding: '6px 14px', backdropFilter: 'blur(8px)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sc.dot }} />
              <span style={{ fontSize: '14px', fontWeight: '700', color: sc.color }}>{vehicle.status}</span>
            </div>
            {/* Nav Pfeile */}
            {activeImg > 0 && (
              <button onClick={() => setActiveImg(i => i - 1)} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                <ChevronLeft size={20} />
              </button>
            )}
            {activeImg < imgs.length - 1 && (
              <button onClick={() => setActiveImg(i => i + 1)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                <ChevronRight size={20} />
              </button>
            )}
          </div>
          )}{/* Ende else (normaler Slider) */}

          {/* Thumbnails — nur bei normalem Foto-Modus */}
          {!show360 && imgs.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', padding: '10px 16px', overflowX: 'auto' }}>
              {imgs.map((img, i) => (
                <div key={i} onClick={() => setActiveImg(i)} style={{ width: '64px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', border: `2px solid ${i === activeImg ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`, transition: 'border-color 0.15s' }}>
                  <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                </div>
              ))}
            </div>
          )}

          {/* Close */}
          <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Inhalt (scrollbar) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Titel + Preis */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>{vehicle.brand || 'Fahrzeug'}</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {vehicle.first_registration && <span style={{ fontSize: '14px', color: '#a8c4dc', fontWeight: '600' }}>EZ {vehicle.first_registration}</span>}
                {vehicle.km && <span style={{ fontSize: '14px', color: '#a8c4dc' }}>· {vehicle.km} km</span>}
                {vehicle.fuel_type && <span style={{ fontSize: '14px', color: '#a8c4dc' }}>· {vehicle.fuel_type}</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6', lineHeight: 1 }}>{vehicle.price || 'Auf Anfrage'}</div>
              <div style={{ fontSize: '14px', color: '#7aaac8', marginTop: '4px' }}>inkl. 19% MwSt.</div>
            </div>
          </div>

          {/* Technische Daten Grid */}
          {specs.length > 0 && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#7aaac8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Technische Daten</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {specs.map(({ label, value }) => (
                  <div key={label} style={{ backgroundColor: '#080e1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#7aaac8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '14px', color: '#e8f1fa', fontWeight: '700' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ausstattung */}
          {vehicle.equipment && vehicle.equipment.length > 0 && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#7aaac8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Ausstattung</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {vehicle.equipment.map((item, i) => (
                  <span key={i} style={{ backgroundColor: '#080e1a', border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8', padding: '5px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}>
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Beschreibung */}
          {vehicle.description && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#7aaac8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Beschreibung</div>
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: 1.85, backgroundColor: '#080e1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
                {vehicle.description}
              </p>
            </div>
          )}

          {/* Händler-Info Box (wie auf mobile.de) */}
          <div style={{ backgroundColor: '#080e1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Car size={22} style={{ color: '#3b82f6' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Ihr Fahrzeug</div>
              <div style={{ fontSize: '14px', color: '#a8c4dc', marginTop: '2px' }}>Erstellt am {new Date(vehicle.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2563eb', border: 'none', color: 'white', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                <ExternalLink size={14} /> Veröffentlichen
              </button>
              <Link href="/dashboard/listing" style={{ textDecoration: 'none' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  Neu inserieren
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hauptseite ────────────────────────────────────────────
type SortKey = 'date' | 'price_asc' | 'price_desc' | 'views';

export default function InseratePage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('Alle');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const deleteVehicle = async (id: string) => {
    if (!confirm('Fahrzeug wirklich löschen?')) return;
    setUpdatingId(id);
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    setVehicles(prev => prev.filter(v => v.id !== id));
    setOpenMenu(null);
    setUpdatingId(null);
    toast('Inserat gelöscht', 'success');
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    await fetch(`/api/vehicles/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    setOpenMenu(null);
    setUpdatingId(null);
    toast(`Status geändert → ${newStatus}`, 'success');
  };

  const duplicateVehicle = async (car: Vehicle) => {
    setOpenMenu(null);
    toast('Inserat wird dupliziert...', 'info');
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: `${car.brand} (Kopie)`,
          km: car.km,
          price: car.price?.replace(/[^0-9]/g, ''),
          description: car.description,
          status: 'Entwurf',
        }),
      });
      if (!res.ok) throw new Error();
      toast('Inserat dupliziert – als Entwurf gespeichert', 'success');
      fetchVehicles();
    } catch {
      toast('Duplizieren fehlgeschlagen', 'error');
    }
  };

  const markSold = async (id: string) => {
    setOpenMenu(null);
    await updateStatus(id, 'Verkauft');
  };

  const cycleStatus = (current: string) => STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];

  const filtered = vehicles
    .filter(v => {
      const matchSearch = (v.brand || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = activeStatus === 'Alle' || v.status === activeStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortKey === 'date')       return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortKey === 'price_asc')  return (Number(a.price?.replace(/[^0-9]/g,''))||0) - (Number(b.price?.replace(/[^0-9]/g,''))||0);
      if (sortKey === 'price_desc') return (Number(b.price?.replace(/[^0-9]/g,''))||0) - (Number(a.price?.replace(/[^0-9]/g,''))||0);
      if (sortKey === 'views')      return (b.views||0) - (a.views||0);
      return 0;
    });

  const live   = vehicles.filter(v => v.status?.includes('Live')).length;
  const drafts = vehicles.filter(v => v.status === 'Entwurf').length;
  const totalViews = vehicles.reduce((s, v) => s + (v.views || 0), 0);

  const F = '"Inter",-apple-system,sans-serif';

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1240px', margin: '0 auto', color: '#0f172a', fontFamily: F, minHeight: '100vh', background: '#f0f2f5' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px', color: '#0f172a' }}>Meine Inserate</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px', fontFamily: F }}>Alle Fahrzeuge verwalten, Status ändern und publizieren.</p>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px', fontFamily: F }}>Tipp: Drücke <kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', color: '#475569' }}>N</kbd> für Neues Inserat</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchVehicles} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b', padding: '10px 16px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', fontFamily: F, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <RefreshCw size={14} /> Aktualisieren
          </button>
          <Link href="/dashboard/listing" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', border: 'none', cursor: 'pointer', fontSize: '14px', fontFamily: F, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
              <Plus size={16} /> Neues Inserat
            </button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Gesamt',  value: vehicles.length, icon: <Car size={18} />,          color: '#6366f1' },
          { label: 'Live',    value: live,             icon: <CheckCircle2 size={18} />, color: '#10b981' },
          { label: 'Entwurf', value: drafts,           icon: <Clock size={18} />,        color: '#f59e0b' },
          { label: 'Aufrufe', value: totalViews,       icon: <TrendingUp size={18} />,   color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '38px', height: '38px', backgroundColor: `${s.color}12`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', lineHeight: 1, letterSpacing: '-0.5px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Suche */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 16px 10px 42px', color: '#0f172a', fontSize: '14px', outline: 'none', fontFamily: F, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            placeholder="Fahrzeug suchen..." value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '4px', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setActiveStatus(s)} style={{ padding: '7px 13px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', backgroundColor: activeStatus === s ? '#6366f1' : 'transparent', color: activeStatus === s ? '#fff' : '#64748b', transition: 'all 0.15s', whiteSpace: 'nowrap', fontFamily: F } as React.CSSProperties}>{s}</button>
          ))}
        </div>

        {/* Sortierung */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '4px 12px 4px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <ArrowUpDown size={14} color="#94a3b8" />
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            style={{ background: 'none', border: 'none', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer', outline: 'none', fontFamily: F }}
          >
            <option value="date">Neueste zuerst</option>
            <option value="price_desc">Preis: hoch → niedrig</option>
            <option value="price_asc">Preis: niedrig → hoch</option>
            <option value="views">Meiste Aufrufe</option>
          </select>
        </div>

        {/* Grid/List */}
        <div style={{ display: 'flex', gap: '3px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {(['grid', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', backgroundColor: view === v ? '#6366f1' : 'transparent', color: view === v ? '#fff' : '#64748b', fontSize: '14px', fontWeight: '700' }}>
              {v === 'grid' ? '⊞' : '☰'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginBottom: '14px' }}>
        {loading ? 'Lädt…' : `${filtered.length} Inserat${filtered.length !== 1 ? 'e' : ''}`}
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px', color: '#64748b' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: '600' }}>Inserate werden geladen…</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '60px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>{search ? `Kein Ergebnis für "${search}"` : 'Noch keine Inserate'}</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' }}>Erstelle dein erstes Inserat in wenigen Minuten.</p>
          <Link href="/dashboard/listing" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
              <Plus size={16} /> Jetzt inserieren
            </button>
          </Link>
        </div>
      )}

      {/* GRID */}
      {!loading && view === 'grid' && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
          {filtered.map(car => {
            const sc = statusStyle[car.status] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b', dot: '#64748b' };
            const thumb = getImages(car)[0];
            return (
              <div key={car.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', position: 'relative', transition: 'transform 0.15s, box-shadow 0.2s', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(99,102,241,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
              >
                {/* Bild */}
                <div style={{ height: '190px', overflow: 'hidden', position: 'relative' }} onClick={() => setDetailVehicle(car)}>
                  <img src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    alt={car.brand || ''} />
                  {/* Status */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: sc.bg, border: `1px solid ${sc.color}40`, borderRadius: '8px', padding: '4px 10px', backdropFilter: 'blur(8px)' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: sc.dot }} />
                    <span style={{ fontSize: '14px', fontWeight: '700', color: sc.color }}>{car.status}</span>
                  </div>
                  {/* Menu */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setOpenMenu(openMenu === car.id ? null : car.id)} style={{ width: '30px', height: '30px', backgroundColor: 'rgba(8,14,26,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {updatingId === car.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <MoreHorizontal size={14} />}
                    </button>
                    {openMenu === car.id && (
                      <div style={{ position: 'absolute', top: '36px', right: 0, backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '6px', zIndex: 10, minWidth: '190px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
                        <button onClick={() => setDetailVehicle(car)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#ffffff', textAlign: 'left', fontFamily: F }}>
                          <Eye size={13} /> Details ansehen
                        </button>
                        <button onClick={() => updateStatus(car.id, cycleStatus(car.status))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#60a5fa', textAlign: 'left', fontFamily: F }}>
                          <ExternalLink size={13} /> Status: {cycleStatus(car.status)}
                        </button>
                        <button onClick={() => duplicateVehicle(car)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#a78bfa', textAlign: 'left', fontFamily: F }}>
                          <Copy size={13} /> Duplizieren
                        </button>
                        <button onClick={() => markSold(car.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#c4b5fd', textAlign: 'left', fontFamily: F }}>
                          <CheckCircle2 size={13} /> Als verkauft markieren
                        </button>
                        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
                        <button onClick={() => deleteVehicle(car.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#f87171', textAlign: 'left', fontFamily: F }}>
                          <Trash2 size={13} /> Löschen
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Hover-Overlay "Details" */}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', opacity: 0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.35)'; (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)'; (e.currentTarget as HTMLDivElement).style.opacity = '0'; }}
                  >
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', padding: '10px 20px', borderRadius: '30px', color: 'white', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Eye size={15} /> Details ansehen
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '16px' }} onClick={() => setDetailVehicle(car)}>
                  <h3
                    title="Klicken zum Bearbeiten"
                    onClick={e => {
                      e.stopPropagation();
                      const neu = window.prompt('Titel bearbeiten:', car.brand);
                      if (neu && neu.trim() && neu !== car.brand) {
                        fetch(`/api/vehicles/${car.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand: neu.trim() }) })
                          .then(() => fetchVehicles());
                      }
                    }}
                    style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', lineHeight: 1.3, cursor: 'text' }}
                  >
                    {car.brand || 'Unbekannt'} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>✏️</span>
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {car.km && <span style={{ fontSize: '13px', color: '#64748b' }}>{car.km} km</span>}
                    {car.fuel_type && <span style={{ fontSize: '13px', color: '#64748b' }}>· {car.fuel_type}</span>}
                    {car.power_kw && <span style={{ fontSize: '13px', color: '#64748b' }}>· {car.power_kw} kW</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#6366f1', letterSpacing: '-0.5px' }}>{car.price || '—'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {car.views > 0 && <span style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}><Eye size={11} /> {car.views}</span>}
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(car.created_at).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                </div>

                {/* Details + Tools Buttons */}
                <div style={{ padding: '0 14px 12px', display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setDetailVehicle(car)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', backgroundColor: '#f5f3ff', border: '1px solid #e9d5ff', color: '#6366f1', padding: '9px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ede9fe'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f3ff'; }}
                  >
                    <Eye size={13} /> Details
                  </button>
                  <VehicleToolButtons vehicle={car} dealerName="2Fast4Sale" />
                </div>
              </div>
            );
          })}

          {/* Neues Inserat Kachel */}
          <Link href="/dashboard/listing" style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: '#ffffff', border: '2px dashed #d8b4fe', borderRadius: '16px', minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLDivElement).style.background = '#f5f3ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#d8b4fe'; (e.currentTarget as HTMLDivElement).style.background = '#ffffff'; }}
            >
              <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={22} style={{ color: '#6366f1' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#6366f1' }}>Neues Inserat</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '3px' }}>In 2 Minuten erstellt</div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* LIST */}
      {!loading && view === 'list' && filtered.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 150px', padding: '10px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            {['Fahrzeug', 'Preis', 'KM-Stand', 'Status', ''].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</span>
            ))}
          </div>
          {filtered.map((car, i) => {
            const sc = statusStyle[car.status] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b', dot: '#64748b' };
            return (
              <div key={car.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 150px', padding: '12px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', alignItems: 'center', transition: 'background 0.15s', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}
                onClick={() => setDetailVehicle(car)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '60px', height: '42px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                    <img src={getImages(car)[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{car.brand || 'Unbekannt'}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                      <Calendar size={10} /> {new Date(car.created_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#6366f1' }}>{car.price || '—'}</span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{car.km || '—'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: sc.dot }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: sc.color }}>{car.status}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setDetailVehicle(car)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e9d5ff', backgroundColor: '#f5f3ff', color: '#6366f1', cursor: 'pointer', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={11} /> Details
                  </button>
                  <button onClick={() => deleteVehicle(car.id)} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 5 }} onClick={() => setOpenMenu(null)} />}

      {/* Detail Modal */}
      {detailVehicle && <DetailModal vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #7aaac8; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
      `}</style>
    </div>
  );
}







