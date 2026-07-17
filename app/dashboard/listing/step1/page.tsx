'use client';

import { useState, useRef, useEffect } from 'react';
import { BRAND_NAMES, getModels } from '../../../../lib/carDatabase';
import { EQUIPMENT_DB, searchEquipment, normalizeEquipment } from '../../../../lib/equipmentDatabase';
import { useRouter } from 'next/navigation';
import {
  Car, Gauge, Tag, Fuel, Calendar, Zap, Palette,
  Upload, Loader2, Sparkles, CheckCircle2, X,
  FileText, Hash, AlertCircle, ArrowRight, Camera,
  ChevronDown, Settings2,
} from 'lucide-react';

const F    = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const BG   = '#f0f2f5';
const CARD = '#ffffff';
const BORD = '#e2e8f0';
const TH   = '#0f172a';
const TS   = '#64748b';
const TD   = '#94a3b8';

// Popular brands with colors for visual picker
const TOP_BRANDS = [
  { name: 'BMW',        color: '#0066CC', abbr: 'BMW' },
  { name: 'Mercedes',   color: '#1a1a1a', abbr: 'MB'  },
  { name: 'Audi',       color: '#BB0A21', abbr: 'AUDI'},
  { name: 'Volkswagen', color: '#00438A', abbr: 'VW'  },
  { name: 'Porsche',    color: '#d5001c', abbr: 'POR' },
  { name: 'Opel',       color: '#F5A623', abbr: 'OPL' },
  { name: 'Ford',       color: '#003478', abbr: 'FRD' },
  { name: 'Skoda',      color: '#4BA82E', abbr: 'SKO' },
  { name: 'Seat',       color: '#FA0000', abbr: 'SEA' },
  { name: 'Hyundai',    color: '#003087', abbr: 'HYU' },
  { name: 'Kia',        color: '#C00000', abbr: 'KIA' },
  { name: 'Toyota',     color: '#EB0A1E', abbr: 'TOY' },
];

const FUEL_OPTIONS    = ['Benzin', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Elektro', 'LPG', 'CNG'];
const GEARBOX_OPTIONS = ['Automatik', 'Manuell'];

const FUEL_COLORS: Record<string, string> = {
  Benzin: '#f59e0b', Diesel: '#3b82f6', Hybrid: '#10b981',
  'Plug-in Hybrid': '#8b5cf6', Elektro: '#22c55e', LPG: '#f97316', CNG: '#64748b',
};

interface FormData {
  brand: string; model: string; vin: string;
  firstRegistration: string; km: string; price: string;
  fuelType: string; gearbox: string; powerKw: string;
  displacementCcm: string; color: string; seats: string;
  equipment: string[]; dealerNotes: string;
}

export default function Step1() {
  const router = useRouter();
  const docInputRef  = useRef<HTMLInputElement>(null);
  const brandRef     = useRef<HTMLDivElement>(null);
  const modelRef     = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<FormData>({
    brand: '', model: '', vin: '', firstRegistration: '', km: '', price: '',
    fuelType: '', gearbox: '', powerKw: '', displacementCcm: '',
    color: '', seats: '', equipment: [], dealerNotes: '',
  });

  const [brandSearch, setBrandSearch]     = useState('');
  const [showBrandDrop, setShowBrandDrop] = useState(false);
  const [showModelDrop, setShowModelDrop] = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [docImage, setDocImage]           = useState<string | null>(null);
  const [scanState, setScanState]         = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [vinState,  setVinState]          = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [vinHits,   setVinHits]           = useState<string[]>([]);
  const [equipInput, setEquipInput]       = useState('');
  const [equipSearch, setEquipSearch]     = useState('');
  const [openCategory, setOpenCategory]   = useState<string | null>('Komfort');
  const [navigating,  setNavigating]      = useState(false);
  const [dragOver,    setDragOver]        = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);

  const filteredBrands   = BRAND_NAMES.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()));
  const availableModels  = data.brand ? getModels(data.brand) : [];

  const filledFields = [data.brand, data.km, data.price, data.fuelType, data.gearbox,
    data.firstRegistration, data.powerKw, data.color, data.seats, data.displacementCcm].filter(Boolean);
  const completionPct = Math.round((filledFields.length / 10) * 100);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setShowBrandDrop(false);
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setShowModelDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const set = (k: keyof FormData, v: string | string[]) => {
    setData(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const resizeImage = (b64: string, max = 1200): Promise<string> =>
    new Promise(res => {
      const img = new Image();
      img.src = b64;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => res(b64);
    });

  const processUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await resizeImage(ev.target?.result as string);
      setDocImage(compressed);
      setScanState('loading');
      try {
        const res = await fetch('/api/scan-doc', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: compressed }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Scan fehlgeschlagen');
        setData(p => ({
          ...p,
          brand: d.brand ?? p.brand, vin: d.vin ?? p.vin,
          firstRegistration: d.firstRegistration ?? p.firstRegistration,
          km: d.km != null ? String(d.km) : p.km,
          fuelType: d.fuelType ?? p.fuelType,
          // scan-doc returns powerPs (already converted from kW×1.3596); vin-decode returns powerKw (which also contains PS value)
          powerKw: (d.powerPs ?? d.powerKw) != null ? String(d.powerPs ?? d.powerKw) : p.powerKw,
          displacementCcm: d.displacementCcm != null ? String(d.displacementCcm) : p.displacementCcm,
          color: d.color ?? p.color, seats: d.seats != null ? String(d.seats) : p.seats,
          equipment: Array.isArray(d.equipment) ? [...new Set([...p.equipment, ...d.equipment])] : p.equipment,
        }));
        setScanState('done');
        if (d.vin && d.vin.length >= 11) decodeVin(d.vin);
      } catch { setScanState('error'); }
    };
    reader.readAsDataURL(file);
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processUpload(file);
  };

  const decodeVin = async (vin: string) => {
    if (vin.length < 11) return;
    setVinState('loading');
    try {
      const res = await fetch('/api/vin-decode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(p => ({
        ...p,
        brand:           !p.brand && d.brand ? d.brand : p.brand,
        fuelType:        !p.fuelType && d.fuelType ? d.fuelType : p.fuelType,
        powerKw:         !p.powerKw && d.powerKw ? String(d.powerKw) : p.powerKw,
        displacementCcm: !p.displacementCcm && d.displacementCcm ? String(d.displacementCcm) : p.displacementCcm,
        equipment:       [...new Set([...p.equipment, ...(d.equipment || [])])],
      }));
      setVinHits(d.equipment || []);
      setVinState('done');
    } catch { setVinState('error'); }
  };

  const addEquip = () => {
    const v = equipInput.trim();
    if (v && !data.equipment.includes(v)) set('equipment', [...data.equipment, v]);
    setEquipInput('');
  };
  const removeEquip = (i: number) => set('equipment', data.equipment.filter((_, j) => j !== i));

  const handleNext = async () => {
    const e: Record<string, string> = {};
    if (!data.brand.trim()) e.brand = 'Bitte Marke wählen';
    if (!data.km.trim())    e.km    = 'Pflichtfeld';
    if (!data.price.trim()) e.price = 'Pflichtfeld';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setNavigating(true);

    // Credit-Check: Abo oder Privatperson-Credit?
    const creditRes = await fetch('/api/credits/use', { method: 'POST' });
    if (!creditRes.ok) {
      setNavigating(false);
      // Bei jedem Fehler (keine Credits, DB-Fehler, etc.) zur Pricing-Seite
      router.push('/dashboard/pricing?reason=no_credits');
      return;
    }

    const titleParts: string[] = [];
    const brandModel = [data.brand, data.model].filter(Boolean).join(' ');
    if (brandModel) titleParts.push(brandModel);
    const yr = data.firstRegistration.match(/(\d{4})/)?.[1];
    if (yr) titleParts.push(yr);
    const ps = data.powerKw ? `${data.powerKw} PS` : '';
    const combo = [ps, data.fuelType].filter(Boolean).join(' ');
    if (combo) titleParts.push(combo);
    const topEquip = data.equipment.slice(0, 2);
    if (topEquip.length) titleParts.push(topEquip.join(', '));
    const fallbackTitle = titleParts.join(' · ');

    let suggestedTitle = fallbackTitle;
    try {
      const titleRes = await fetch('/api/generate-title', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: data.brand, model: data.model,
          year: yr || '', fuel: data.fuelType, gearbox: data.gearbox,
          color: data.color, power: data.powerKw, equipment: data.equipment,
        }),
      });
      if (titleRes.ok) {
        const { title } = await titleRes.json();
        if (title) suggestedTitle = title;
      }
    } catch { /* fallback */ }

    sessionStorage.setItem('listing_step1', JSON.stringify({ ...data, suggestedTitle }));
    const fullBrand = [data.brand, data.model].filter(Boolean).join(' ');
    const p = new URLSearchParams({
      brand: fullBrand, km: data.km, price: data.price,
      year: data.firstRegistration, fuel: data.fuelType,
      gearbox: data.gearbox, color: data.color, power: data.powerKw,
    });
    router.push(`/dashboard/listing/step2?${p.toString()}`);
  };

  // ── Shared input style ──
  const INP: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#f8fafc', border: `1px solid ${BORD}`,
    borderRadius: '10px', padding: '11px 14px',
    color: TH, fontSize: '14px', fontFamily: F,
    outline: 'none', transition: 'border-color 0.15s',
  };

  const fmtPrice = (v: string) => v ? `€ ${Number(v.replace(/\D/g, '')).toLocaleString('de-DE')}` : '—';
  const fmtKm    = (v: string) => v ? `${Number(v.replace(/\D/g, '')).toLocaleString('de-DE')} km` : '—';

  const aiRunning = scanState === 'loading' || vinState === 'loading';

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TH }}>

      {/* ══════ TOP PROGRESS BAR ══════ */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#ffffff', borderBottom: `1px solid ${BORD}`,
        boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TD, fontSize: '13px', fontFamily: F, display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
            ← Abbrechen
          </button>

          {/* Step Tracker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[
              { n: 1, label: 'Fahrzeugdaten', active: true,  done: false },
              { n: 2, label: 'Fotos',         active: false, done: false },
              { n: 3, label: 'KI-Text',       active: false, done: false },
              { n: 4, label: 'Fertig',        active: false, done: false },
            ].map((step, idx) => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 12px', borderRadius: '20px', background: step.active ? '#6366f1' : 'transparent', transition: 'all 0.2s' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: step.active ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    border: `2px solid ${step.active ? 'rgba(255,255,255,0.4)' : BORD}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: '800',
                    color: step.active ? '#fff' : TD,
                  }}>
                    {step.n}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: step.active ? '#fff' : TD, whiteSpace: 'nowrap' }}>
                    {step.label}
                  </span>
                </div>
                {idx < 3 && <div style={{ width: '20px', height: '1px', background: BORD }} />}
              </div>
            ))}
          </div>

          {/* Completion pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '80px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${completionPct}%`, height: '100%', background: completionPct === 100 ? '#10b981' : '#6366f1', borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700', color: completionPct === 100 ? '#10b981' : '#6366f1', minWidth: '32px' }}>{completionPct}%</span>
          </div>
        </div>
      </div>

      {/* ══════ MAIN LAYOUT ══════ */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px 120px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' }}>

        {/* ══ LEFT COLUMN — Form ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Page title */}
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
              Neues Inserat erstellen
            </h1>
            <p style={{ margin: 0, color: TS, fontSize: '14px' }}>
              Schritt 1 von 4 — Fahrzeugdaten eingeben
            </p>
          </div>

          {/* ══ AI SCANNER (compact, utility bar) ══ */}
          <div style={{
            background: aiRunning
              ? 'linear-gradient(135deg, #f5f3ff, #eff6ff)'
              : scanState === 'done'
              ? 'linear-gradient(135deg, #f0fdf4, #ecfdf5)'
              : CARD,
            border: `2px ${dragOver ? 'solid' : 'dashed'} ${aiRunning ? '#6366f1' : scanState === 'done' ? '#86efac' : '#e2e8f0'}`,
            borderRadius: '16px', overflow: 'hidden',
            transition: 'all 0.3s ease',
            boxShadow: aiRunning ? '0 0 0 4px rgba(99,102,241,0.1)' : 'none',
          }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'stretch' }}>

                {/* Scan document */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: scanState === 'done' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {scanState === 'loading' ? <Loader2 size={14} color="#6366f1" style={{ animation: 'spin 0.7s linear infinite' }} />
                        : scanState === 'done' ? <CheckCircle2 size={14} color="#10b981" />
                        : <Camera size={14} color="#6366f1" />}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: TH }}>
                      {scanState === 'loading' ? 'KI scannt…' : scanState === 'done' ? 'Gescannt ✓' : 'Fahrzeugschein scannen'}
                    </span>
                  </div>
                  <label
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: '10px', padding: '20px 16px', borderRadius: '12px', cursor: 'pointer',
                      background: scanState === 'done' ? 'rgba(16,185,129,0.06)' : dragOver ? 'rgba(99,102,241,0.08)' : '#f8fafc',
                      border: `1px dashed ${scanState === 'done' ? 'rgba(16,185,129,0.3)' : '#d1d5db'}`,
                      minHeight: '100px', transition: 'all 0.2s',
                    }}
                  >
                    <input ref={docInputRef} type="file" hidden accept="image/*" onChange={handleDocUpload} />
                    {scanState === 'loading' ? (
                      <>
                        <div style={{ position: 'relative', width: '44px', height: '44px' }}>
                          <div style={{ position: 'absolute', inset: 0, border: '3px solid #e0e7ff', borderRadius: '50%' }} />
                          <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                        <span style={{ fontSize: '13px', color: '#6366f1', fontWeight: '600', textAlign: 'center' }}>
                          KI analysiert Fahrzeugschein…<br />
                          <span style={{ fontWeight: '400', color: TS }}>Felder werden automatisch befüllt</span>
                        </span>
                      </>
                    ) : scanState === 'done' ? (
                      <>
                        <CheckCircle2 size={32} color="#10b981" />
                        <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '600', textAlign: 'center' }}>
                          Felder befüllt!<br />
                          <span style={{ fontWeight: '400', color: TS }}>Erneut tippen um neu zu scannen</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Upload size={20} color="#6366f1" />
                        </div>
                        <span style={{ fontSize: '13px', color: TH, fontWeight: '600', textAlign: 'center' }}>
                          Foto hochladen oder hierher ziehen<br />
                          <span style={{ fontWeight: '400', color: TS }}>JPG, PNG, HEIC — KI befüllt alle Felder</span>
                        </span>
                      </>
                    )}
                  </label>
                </div>

                {/* VIN Decoder */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: vinState === 'done' ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {vinState === 'loading' ? <Loader2 size={14} color="#8b5cf6" style={{ animation: 'spin 0.7s linear infinite' }} />
                        : vinState === 'done' ? <CheckCircle2 size={14} color="#10b981" />
                        : <Hash size={14} color="#8b5cf6" />}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: TH }}>
                      FIN / VIN dekodieren
                      {vinState === 'done' && vinHits.length > 0 && (
                        <span style={{ marginLeft: '8px', fontSize: '11px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 7px', borderRadius: '10px', fontWeight: '700' }}>
                          {vinHits.length} Merkmale
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        value={data.vin}
                        onChange={e => {
                          const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                          set('vin', v);
                          if (v.length === 17 && vinState !== 'loading') decodeVin(v);
                        }}
                        placeholder="z.B. WVWZZZ1JZW000001"
                        maxLength={17}
                        style={{
                          ...INP, paddingRight: '44px',
                          letterSpacing: '0.08em', fontFamily: 'monospace',
                          border: `1px solid ${vinState === 'done' ? 'rgba(16,185,129,0.4)' : vinState === 'error' ? '#fca5a5' : BORD}`,
                        }}
                        onFocus={e => (e.target.style.borderColor = '#8b5cf6')}
                        onBlur={e => {
                          e.target.style.borderColor = vinState === 'done' ? 'rgba(16,185,129,0.4)' : BORD;
                          const v = e.target.value.trim();
                          if (v.length >= 11 && vinState !== 'loading') decodeVin(v);
                        }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: '700', color: data.vin.length === 17 ? '#10b981' : TD }}>
                        {data.vin.length}/17
                      </span>
                    </div>
                    {vinState === 'loading' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(139,92,246,0.08)', borderRadius: '8px', fontSize: '13px', color: '#8b5cf6', fontWeight: '600' }}>
                        <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> FIN wird dekodiert…
                      </div>
                    )}
                    {vinState === 'done' && vinHits.length > 0 && (
                      <div style={{ padding: '10px 12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', marginBottom: '6px' }}>✓ Ausstattung geladen</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {vinHits.slice(0, 5).map((item, i) => (
                            <span key={i} style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '2px 7px', borderRadius: '10px' }}>{item}</span>
                          ))}
                          {vinHits.length > 5 && <span style={{ fontSize: '11px', color: TS }}>+{vinHits.length - 5}</span>}
                        </div>
                      </div>
                    )}
                    {vinState === 'idle' && data.vin.length > 0 && data.vin.length < 17 && (
                      <span style={{ fontSize: '12px', color: TD }}>{17 - data.vin.length} Zeichen fehlen — wird automatisch dekodiert</span>
                    )}
                    {vinState === 'error' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#ef4444' }}>
                        <AlertCircle size={12} /> FIN nicht gefunden — manuell eingeben
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══ BRAND PICKER ══ */}
          <div style={{ background: CARD, border: `2px solid ${errors.brand ? '#fca5a5' : data.brand ? '#6366f1' : BORD}`, borderRadius: '16px', padding: '20px 24px', transition: 'border-color 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: TH, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Car size={17} color="#6366f1" /> Marke & Modell <span style={{ color: '#ef4444', fontSize: '14px' }}>*</span>
                </div>
                {errors.brand && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={11} /> {errors.brand}</div>}
              </div>
              {data.brand && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '20px', padding: '4px 12px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5' }}>{data.brand}{data.model ? ` ${data.model}` : ''}</span>
                  <button onClick={() => { set('brand', ''); set('model', ''); setBrandSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TD, display: 'flex', padding: '2px' }}>
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Quick brand grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '10px' }}>
              {(showAllBrands ? BRAND_NAMES.slice(0, 30) : TOP_BRANDS).map((b) => {
                const name = typeof b === 'string' ? b : b.name;
                const abbr = typeof b === 'string' ? b.slice(0, 3).toUpperCase() : b.abbr;
                const color = typeof b === 'string' ? '#6366f1' : b.color;
                const isSelected = data.brand === name;
                return (
                  <button
                    key={name}
                    onClick={() => { set('brand', name); set('model', ''); setBrandSearch(''); setShowBrandDrop(false); }}
                    style={{
                      padding: '8px 4px', borderRadius: '10px', border: `2px solid ${isSelected ? color : BORD}`,
                      background: isSelected ? `${color}10` : '#f8fafc',
                      cursor: 'pointer', fontFamily: F, textAlign: 'center',
                      transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: isSelected ? color : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: isSelected ? '#fff' : '#64748b', letterSpacing: '-0.2px' }}>{abbr}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: isSelected ? color : TS }}>{name.length > 9 ? name.slice(0, 8) + '.' : name}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowAllBrands(v => !v)}
              style={{ fontSize: '12px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, fontWeight: '600', padding: '0 0 10px', display: 'block' }}
            >
              {showAllBrands ? '↑ Weniger anzeigen' : `↓ Alle ${BRAND_NAMES.length} Marken anzeigen`}
            </button>

            {/* Search + other brand */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} ref={brandRef}>
              <div style={{ position: 'relative' }}>
                <input
                  value={showBrandDrop ? brandSearch : (data.brand || '')}
                  placeholder="Andere Marke suchen…"
                  onChange={e => { setBrandSearch(e.target.value); setShowBrandDrop(true); }}
                  onFocus={() => { setBrandSearch(''); setShowBrandDrop(true); }}
                  style={{ ...INP, paddingRight: '32px' }}
                />
                <ChevronDown size={14} color={TD} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                {showBrandDrop && filteredBrands.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: CARD, border: `1px solid ${BORD}`, borderRadius: '12px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', marginTop: '4px' }}>
                    {filteredBrands.slice(0, 30).map(b => (
                      <div
                        key={b}
                        onMouseDown={() => { set('brand', b); set('model', ''); setBrandSearch(''); setShowBrandDrop(false); }}
                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '14px', color: data.brand === b ? '#6366f1' : TH, background: data.brand === b ? 'rgba(99,102,241,0.06)' : 'transparent', borderBottom: `1px solid ${BORD}`, fontWeight: data.brand === b ? '700' : '400' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = data.brand === b ? 'rgba(99,102,241,0.06)' : 'transparent')}
                      >{b}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Model */}
              <div ref={modelRef} style={{ position: 'relative' }}>
                {availableModels.length > 0 ? (
                  <>
                    <div
                      onClick={() => setShowModelDrop(v => !v)}
                      style={{ ...INP, cursor: 'pointer', paddingRight: '32px', color: data.model ? TH : TD, display: 'flex', alignItems: 'center', userSelect: 'none' }}
                    >
                      {data.model || 'Modell wählen'}
                    </div>
                    <ChevronDown size={14} color={TD} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    {showModelDrop && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: CARD, border: `1px solid ${BORD}`, borderRadius: '12px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', marginTop: '4px' }}>
                        {availableModels.map(m => (
                          <div
                            key={m}
                            onMouseDown={() => { set('model', m); setShowModelDrop(false); }}
                            style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '14px', color: data.model === m ? '#6366f1' : TH, background: data.model === m ? 'rgba(99,102,241,0.06)' : 'transparent', borderBottom: `1px solid ${BORD}`, fontWeight: data.model === m ? '700' : '400' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.background = data.model === m ? 'rgba(99,102,241,0.06)' : 'transparent')}
                          >{m}</div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <input value={data.model} onChange={e => set('model', e.target.value)}
                    placeholder={data.brand ? 'Modell eingeben' : 'Erst Marke wählen'}
                    disabled={!data.brand}
                    style={{ ...INP, opacity: data.brand ? 1 : 0.4, cursor: data.brand ? 'text' : 'not-allowed' }}
                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                    onBlur={e => (e.target.style.borderColor = BORD)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ══ KEY NUMBERS ══ */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', padding: '20px 24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: TH, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={15} color="#6366f1" /> Kernzahlen
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {/* KM */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: TS, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <Gauge size={11} /> Kilometerstand <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input value={data.km} onChange={e => set('km', e.target.value.replace(/\D/g, ''))}
                    placeholder="75000"
                    style={{ ...INP, fontSize: '18px', fontWeight: '800', padding: '13px 14px', border: `2px solid ${errors.km ? '#fca5a5' : data.km ? '#6366f1' : BORD}`, letterSpacing: '-0.3px' }}
                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                    onBlur={e => (e.target.style.borderColor = errors.km ? '#fca5a5' : data.km ? '#6366f1' : BORD)}
                  />
                  {data.km && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: TS, fontWeight: '600' }}>km</span>}
                </div>
                {data.km && <div style={{ fontSize: '12px', color: '#6366f1', marginTop: '3px', fontWeight: '600' }}>{fmtKm(data.km)}</div>}
                {errors.km && <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}><AlertCircle size={10} />{errors.km}</span>}
              </div>
              {/* Price */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: TS, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <Tag size={11} /> Preis <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: '800', color: data.price ? '#10b981' : TD }}>€</span>
                  <input value={data.price} onChange={e => set('price', e.target.value.replace(/\D/g, ''))}
                    placeholder="24900"
                    style={{ ...INP, fontSize: '18px', fontWeight: '800', padding: '13px 14px 13px 30px', border: `2px solid ${errors.price ? '#fca5a5' : data.price ? '#10b981' : BORD}`, letterSpacing: '-0.3px' }}
                    onFocus={e => (e.target.style.borderColor = '#10b981')}
                    onBlur={e => (e.target.style.borderColor = errors.price ? '#fca5a5' : data.price ? '#10b981' : BORD)}
                  />
                </div>
                {data.price && <div style={{ fontSize: '12px', color: '#10b981', marginTop: '3px', fontWeight: '700' }}>{fmtPrice(data.price)}</div>}
                {errors.price && <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}><AlertCircle size={10} />{errors.price}</span>}
              </div>
              {/* Year */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: TS, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <Calendar size={11} /> Erstzulassung
                </label>
                <input value={data.firstRegistration} onChange={e => set('firstRegistration', e.target.value)}
                  placeholder="03/2021"
                  style={{ ...INP, fontSize: '16px', fontWeight: '700', padding: '13px 14px' }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = BORD)}
                />
              </div>
            </div>
          </div>

          {/* ══ KI-BRIEFING — prominent, after key numbers ══ */}
          <div style={{
            background: 'linear-gradient(135deg, #faf5ff 0%, #f0f4ff 100%)',
            border: `2px solid ${data.dealerNotes.trim() ? '#8b5cf6' : 'rgba(139,92,246,0.3)'}`,
            borderRadius: '16px', padding: '20px 24px',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#4c1d95', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={17} color="#8b5cf6" /> Briefing für KI-Text
                </div>
                <div style={{ fontSize: '12px', color: '#7c3aed', marginTop: '3px', fontWeight: '500' }}>
                  Je mehr du schreibst, desto besser wird die KI-Beschreibung
                </div>
              </div>
              {data.dealerNotes.trim() && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '20px', padding: '4px 10px' }}>
                  <CheckCircle2 size={12} color="#8b5cf6" />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed' }}>Briefing vorhanden</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {['Unfallfrei', 'Scheckheftgepflegt', 'Nichtraucherfahrzeug', 'Neuwertig', 'Erstbesitz', 'TÜV neu'].map(tip => (
                <button
                  key={tip}
                  onClick={() => {
                    const cur = data.dealerNotes;
                    if (!cur.includes(tip)) set('dealerNotes', cur ? `${cur}, ${tip}` : tip);
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: '600',
                    background: data.dealerNotes.includes(tip) ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.06)',
                    border: `1px solid ${data.dealerNotes.includes(tip) ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.2)'}`,
                    color: data.dealerNotes.includes(tip) ? '#6d28d9' : '#8b5cf6',
                    cursor: 'pointer', fontFamily: F, transition: 'all 0.15s',
                  }}
                >
                  {data.dealerNotes.includes(tip) ? '✓ ' : '+ '}{tip}
                </button>
              ))}
            </div>
            <textarea
              value={data.dealerNotes}
              onChange={e => set('dealerNotes', e.target.value)}
              placeholder={'z.B. Unfallfrei, Scheckheftgepflegt, Neuwertig, frischer TÜV, Erstbesitz\n\nDie KI nutzt dieses Briefing direkt für die Inserat-Beschreibung.'}
              rows={4}
              style={{
                ...INP,
                resize: 'vertical', lineHeight: '1.6',
                background: 'rgba(255,255,255,0.8)',
                border: `1.5px solid ${data.dealerNotes.trim() ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.2)'}`,
                fontSize: '14px',
              }}
              onFocus={e => (e.target.style.borderColor = '#8b5cf6')}
              onBlur={e => (e.target.style.borderColor = data.dealerNotes.trim() ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.2)')}
            />
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileText size={11} />
              Intern — nicht sichtbar für Käufer, nur für KI-Texterstellung
            </div>
          </div>

          {/* ══ FUEL + GEARBOX VISUAL ══ */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', padding: '20px 24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: TH, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Fuel size={15} color="#f59e0b" /> Antrieb
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Fuel type visual pills */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: TS, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Kraftstoff</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {FUEL_OPTIONS.map(f => {
                    const isActive = data.fuelType === f;
                    const color = FUEL_COLORS[f] || '#6366f1';
                    return (
                      <button key={f} onClick={() => set('fuelType', f)}
                        style={{
                          padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                          background: isActive ? `${color}15` : '#f8fafc',
                          border: `1.5px solid ${isActive ? color : BORD}`,
                          color: isActive ? color : TS, cursor: 'pointer', fontFamily: F,
                          transition: 'all 0.15s',
                        }}>
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Gearbox */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: TS, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Getriebe</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {GEARBOX_OPTIONS.map(g => {
                    const isActive = data.gearbox === g;
                    return (
                      <button key={g} onClick={() => set('gearbox', g)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                          background: isActive ? '#6366f1' : '#f8fafc',
                          border: `1.5px solid ${isActive ? '#6366f1' : BORD}`,
                          color: isActive ? '#fff' : TS, cursor: 'pointer', fontFamily: F,
                          transition: 'all 0.15s',
                        }}>
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ══ TECH SPECS ══ */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', padding: '20px 24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: TH, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings2 size={15} color="#8b5cf6" /> Technische Daten
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'Leistung (PS)', key: 'powerKw' as const, placeholder: '190', icon: <Zap size={12} /> },
                { label: 'Hubraum (ccm)', key: 'displacementCcm' as const, placeholder: '1998', icon: <Gauge size={12} /> },
                { label: 'Sitzplätze', key: 'seats' as const, placeholder: '5', icon: <Car size={12} /> },
                { label: 'Farbe', key: 'color' as const, placeholder: 'Schwarz', icon: <Palette size={12} /> },
              ].map(({ label, key, placeholder, icon }) => (
                <div key={key}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: TS, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    {icon} {label}
                  </label>
                  <input value={data[key] as string} onChange={e => set(key, e.target.value)}
                    placeholder={placeholder} style={INP}
                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                    onBlur={e => (e.target.style.borderColor = BORD)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ══ EQUIPMENT ══ */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: TH, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={15} color="#f59e0b" /> Ausstattung
                {data.equipment.length > 0 && (
                  <span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                    {data.equipment.length} Merkmale
                  </span>
                )}
              </div>
              {aiRunning && (
                <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> KI lädt…
                </span>
              )}
            </div>

            {/* Selected chips */}
            {data.equipment.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {data.equipment.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px 5px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '20px', fontSize: '12px', color: '#6366f1', fontWeight: '600' }}>
                    {item}
                    <button onClick={() => removeEquip(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc', display: 'flex', padding: '1px' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Manual add */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                value={equipInput}
                onChange={e => { setEquipInput(e.target.value); setEquipSearch(e.target.value); }}
                onKeyDown={e => e.key === 'Enter' && addEquip()}
                placeholder="Merkmal eingeben und Enter drücken…"
                style={{ ...INP, flex: 1 }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = BORD)}
              />
              <button onClick={addEquip} style={{ padding: '11px 16px', borderRadius: '10px', background: '#6366f1', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: F, fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                Hinzufügen
              </button>
            </div>

            {/* Category browser */}
            {EQUIPMENT_DB.map((category) => {
              const labels = category.items.map(i => i.label);
              const searchItems = equipSearch.length > 0
                ? labels.filter(l => l.toLowerCase().includes(equipSearch.toLowerCase()))
                : labels.slice(0, 12);
              if (searchItems.length === 0) return null;
              const isOpen = openCategory === category.label || equipSearch.length > 0;
              return (
                <div key={category.label} style={{ marginBottom: '8px', border: `1px solid ${BORD}`, borderRadius: '10px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenCategory(isOpen && equipSearch.length === 0 ? null : category.label)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontFamily: F, textAlign: 'left' }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700', color: TH, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{category.icon} {category.label}</span>
                    <ChevronDown size={13} color={TD} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                  {isOpen && (
                    <div style={{ padding: '10px 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {searchItems.map((label: string) => {
                        const isAdded = data.equipment.includes(label);
                        return (
                          <button
                            key={label}
                            onClick={() => {
                              if (isAdded) removeEquip(data.equipment.indexOf(label));
                              else set('equipment', [...data.equipment, label]);
                            }}
                            style={{
                              padding: '5px 10px', borderRadius: '16px', fontSize: '12px',
                              fontWeight: isAdded ? '700' : '500', cursor: 'pointer',
                              background: isAdded ? 'rgba(99,102,241,0.1)' : '#f1f5f9',
                              border: `1px solid ${isAdded ? 'rgba(99,102,241,0.3)' : BORD}`,
                              color: isAdded ? '#6366f1' : TS, fontFamily: F,
                              transition: 'all 0.1s',
                            }}
                          >
                            {isAdded && '✓ '}{label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* ══ RIGHT COLUMN — Live Preview ══ */}
        <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Preview Card */}
          <div style={{
            background: TH, borderRadius: '20px', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            {/* Card header */}
            <div style={{ padding: '20px 20px 0', background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>VORSCHAU</div>

              {/* Fake photo area */}
              <div style={{
                height: '160px', borderRadius: '12px', marginBottom: '0',
                background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 50%, #162035 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(99,102,241,0.2) 0%, transparent 60%)' }} />
                {scanState === 'loading' ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Fahrzeugschein wird gescannt…</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Car size={36} color="#334155" style={{ opacity: 0.35 }} />
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Fotos in Schritt 2</div>
                  </div>
                )}
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '16px 20px 20px', background: '#0f172a' }}>
              {/* Brand + Model */}
              <div style={{ marginBottom: '10px' }}>
                {data.brand ? (
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.5px', lineHeight: '1.2' }}>
                    {data.brand}{data.model ? ` ${data.model}` : ''}
                    {data.firstRegistration && (
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', marginLeft: '8px' }}>
                        {data.firstRegistration.match(/\d{4}/)?.[0]}
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ height: '28px', background: '#1e293b', borderRadius: '6px', marginBottom: '4px', animation: 'pulse 1.5s infinite' }} />
                )}
              </div>

              {/* Badges row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {data.fuelType && (
                  <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: `${FUEL_COLORS[data.fuelType] || '#6366f1'}20`, color: FUEL_COLORS[data.fuelType] || '#6366f1', border: `1px solid ${FUEL_COLORS[data.fuelType] || '#6366f1'}30` }}>
                    {data.fuelType}
                  </span>
                )}
                {data.gearbox && (
                  <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                    {data.gearbox}
                  </span>
                )}
                {data.powerKw && (
                  <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                    {data.powerKw} PS
                  </span>
                )}
              </div>

              {/* Key stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div style={{ background: '#1e293b', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Kilometerstand</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: data.km ? '#f8fafc' : '#334155' }}>
                    {data.km ? fmtKm(data.km) : '— km'}
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Preis</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: data.price ? '#a5b4fc' : '#334155' }}>
                    {data.price ? fmtPrice(data.price) : '— €'}
                  </div>
                </div>
              </div>

              {/* Equipment count */}
              {data.equipment.length > 0 && (
                <div style={{ padding: '10px 12px', background: '#1e293b', borderRadius: '10px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Ausstattung ({data.equipment.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {data.equipment.slice(0, 4).map((e, i) => (
                      <span key={i} style={{ fontSize: '10px', color: '#64748b', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>{e}</span>
                    ))}
                    {data.equipment.length > 4 && <span style={{ fontSize: '10px', color: '#475569' }}>+{data.equipment.length - 4} weitere</span>}
                  </div>
                </div>
              )}

              {/* Completion */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Vollständigkeit</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: completionPct >= 80 ? '#10b981' : '#6366f1' }}>{completionPct}%</span>
                </div>
                <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${completionPct}%`, background: completionPct >= 80 ? '#10b981' : '#6366f1', borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: TH, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="#6366f1" /> Tipps
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: <Camera size={12} color="#6366f1" />, text: 'Fahrzeugschein scannen befüllt alle Felder automatisch' },
                { icon: <Hash size={12} color="#8b5cf6" />,   text: 'FIN eingeben lädt die genaue Serienausstattung' },
                { icon: <CheckCircle2 size={12} color="#10b981" />, text: 'Mehr Ausstattung = höherer Verkaufspreis' },
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: TS, lineHeight: '1.4', alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, marginTop: '1px' }}>{tip.icon}</span>
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ STICKY BOTTOM CTA ══════ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${BORD}`, padding: '14px 24px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {(errors.brand || errors.km || errors.price) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
                <AlertCircle size={14} />
                {errors.brand ? 'Marke fehlt · ' : ''}{errors.km ? 'KM fehlt · ' : ''}{errors.price ? 'Preis fehlt' : ''}
              </div>
            )}
            <div style={{ fontSize: '13px', color: TS }}>
              <span style={{ fontWeight: '700', color: TH }}>{filledFields.length}</span> / 10 Felder ausgefüllt
              {data.equipment.length > 0 && <span style={{ marginLeft: '8px', color: '#6366f1', fontWeight: '600' }}>· {data.equipment.length} Ausstattungsmerkmale</span>}
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={navigating}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '13px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: '800',
              background: navigating ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none', color: '#fff', cursor: navigating ? 'not-allowed' : 'pointer',
              fontFamily: F, boxShadow: navigating ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
              transition: 'all 0.2s', letterSpacing: '-0.2px',
            }}
          >
            {navigating ? (
              <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> KI generiert Titel…</>
            ) : (
              <>Weiter zu Fotos <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
      `}</style>
    </div>
  );
}
