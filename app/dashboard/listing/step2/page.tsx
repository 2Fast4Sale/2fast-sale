'use client';

import { useState, useRef, useCallback, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Upload, X, ChevronRight, ChevronLeft, Camera,
  CheckCircle2, Image as ImageIcon, Sparkles, Loader2,
  Wand2, Eye, AlertCircle, Droplets, Lock, Crown
} from 'lucide-react';
import { addWatermark } from '../../../../components/VehicleTools';
import Link from 'next/link';

// Fotolimit je Plan
const PHOTO_LIMITS: Record<string, number> = {
  free:       6,
  basic:      15,
  premium:    20,
  pro:        20,
  business:   35,
  enterprise: 35,
};

const F    = '"Inter", -apple-system, sans-serif';
const BG   = '#f0f2f5';
const CARD = '#ffffff';
const BORD = '#e2e8f0';
const TH   = '#0f172a';
const TS   = '#64748b';
const TD   = '#94a3b8';

/* --- Bildqualitäts-Analyse (läuft im Browser, kostenlos) --- */

// Laplacian-Varianz: misst Schärfe. Niedriger Wert = unscharf
function measureBlur(imageUrl: string): Promise<number> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const size = 200; // Downscale für Geschwindigkeit
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      // Grauwerte berechnen
      const gray: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
      }

      // Laplacian-Kernel: Schärfe = Varianz der zweiten Ableitung
      let sum = 0, sum2 = 0, n = 0;
      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          const lap =
            -gray[(y-1)*size+x] - gray[(y+1)*size+x]
            - gray[y*size+(x-1)] - gray[y*size+(x+1)]
            + 4 * gray[y*size+x];
          sum += lap; sum2 += lap * lap; n++;
        }
      }
      const mean = sum / n;
      const variance = sum2 / n - mean * mean;
      resolve(variance);
    };
    img.onerror = () => resolve(999);
    img.src = imageUrl;
  });
}

// Durchschnittshelligkeit messen
function measureBrightness(imageUrl: string): Promise<number> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 100; c.height = 100;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 100, 100);
      const { data } = ctx.getImageData(0, 0, 100, 100);
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        total += (data[i] + data[i+1] + data[i+2]) / 3;
      }
      resolve(total / (data.length / 4));
    };
    img.onerror = () => resolve(128);
    img.src = imageUrl;
  });
}

type QualityIssue = 'blurry' | 'dark' | 'bright' | 'tiny';

async function analyzeImageQuality(file: File, previewUrl: string): Promise<QualityIssue[]> {
  const issues: QualityIssue[] = [];

  // Zu klein?
  if (file.size < 50_000) issues.push('tiny'); // unter 50 KB

  const [blur, brightness] = await Promise.all([
    measureBlur(previewUrl),
    measureBrightness(previewUrl),
  ]);

  if (blur < 80)  issues.push('blurry');  // Schärfe-Schwellenwert
  if (brightness < 30)  issues.push('dark');
  if (brightness > 240) issues.push('bright');

  return issues;
}

const ISSUE_LABELS: Record<QualityIssue, { text: string; color: string }> = {
  blurry: { text: 'Unscharf',               color: '#f87171' },
  dark:   { text: 'Zu dunkel',              color: '#fb923c' },
  bright: { text: 'Überbelichtet',          color: '#fb923c' },
  tiny:   { text: 'Niedrige Auflösung',     color: '#fbbf24' },
};

interface Photo {
  id: string;
  file: File;
  preview: string;
  processed: string | null;
  processing: boolean;
  error: boolean;
  issues: QualityIssue[];
  analyzing: boolean;
}

const PERSPECTIVES = [
  'Vorne links', 'Hinten rechts', 'Seite links', 'Seite rechts',
  'Armaturenbrett', 'Rücksitze', 'Motor', 'Kofferraum', 'Felgen',
];

// 2400px für bessere Cutout-Kanten bei Rädern/Karosserie
const resizeImage = (b64: string, max = 2400): Promise<string> =>
  new Promise(res => {
    const img = new Image();
    img.src = b64;
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.92)); // höhere Qualität
    };
    img.onerror = () => res(b64);
  });

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target?.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

function Step2Inner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const fileRef      = useRef<HTMLInputElement>(null);

  const brand   = searchParams.get('brand') || '';
  const km      = searchParams.get('km') || '';
  const price   = searchParams.get('price') || '';
  const year    = searchParams.get('year') || '';
  const fuel    = searchParams.get('fuel') || '';
  const gearbox = searchParams.get('gearbox') || '';
  const color   = searchParams.get('color') || '';
  const power   = searchParams.get('power') || '';

  const [photos, setPhotos]           = useState<Photo[]>([]);
  const [dragging, setDragging]       = useState(false);
  const [bulkProcessing, setBulk]     = useState(false);
  const [lightbox, setLightbox]       = useState<string | null>(null);
  const [equipState, setEquipState]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [equipFound, setEquipFound]   = useState<string[]>([]);
  const equipTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [watermarkOn, setWatermarkOn] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('watermark_enabled') !== 'false' : true
  );
  const [plan, setPlan] = useState<string>('free');

  const photoLimit = PHOTO_LIMITS[plan] ?? 6;

  // Plan aus localStorage holen (wird vom Layout aktuell gehalten)
  useEffect(() => {
    const p = typeof window !== 'undefined' ? localStorage.getItem('dealer_plan') || 'free' : 'free';
    setPlan(p);
  }, []);

  const processedCount = photos.filter(p => p.processed).length;
  const totalCount     = photos.length;

  /* ---- Ausstattung aus Fotos erkennen ---- */
  const detectEquipmentFromPhotos = useCallback(async (currentPhotos: Photo[]) => {
    if (currentPhotos.length === 0) return;
    setEquipState('loading');
    try {
      // Bis zu 3 Fotos als Base64 konvertieren
      const base64Images = await Promise.all(
        currentPhotos.slice(0, 3).map(async p => {
          const b64 = await fileToBase64(p.file);
          return resizeImage(b64, 800); // kleiner für schnellere Analyse
        })
      );
      const res = await fetch('/api/detect-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Images }),
      });
      if (!res.ok) throw new Error('Fehler');
      const data = await res.json();
      const found: string[] = data.equipment || [];
      if (found.length > 0) {
        setEquipFound(found);
        setEquipState('done');
        // In sessionStorage mergen damit Step 3 es bekommt
        try {
          const raw = sessionStorage.getItem('listing_step1');
          const step1 = raw ? JSON.parse(raw) : {};
          const existing: string[] = step1.equipment || [];
          step1.equipment = [...new Set([...existing, ...found])];
          sessionStorage.setItem('listing_step1', JSON.stringify(step1));
        } catch { /* ignore */ }
      } else {
        setEquipState('idle');
      }
    } catch {
      setEquipState('error');
    }
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const remaining = photoLimit - photos.length;
    if (remaining <= 0) return;
    const arr = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, remaining);

    // Erstmal sofort anzeigen (analyzing = true)
    const newPhotos: Photo[] = arr.map(file => ({
      id:         Math.random().toString(36).slice(2),
      file,
      preview:    URL.createObjectURL(file),
      processed:  null,
      processing: false,
      error:      false,
      issues:     [],
      analyzing:  true,
    }));
    setPhotos(p => [...p, ...newPhotos]);

    // Dann im Hintergrund Qualität analysieren
    for (const photo of newPhotos) {
      analyzeImageQuality(photo.file, photo.preview).then(issues => {
        setPhotos(p => p.map(x => x.id === photo.id ? { ...x, issues, analyzing: false } : x));
      });
    }

    // Ausstattungserkennung mit 2s Verzögerung (falls noch mehr Fotos kommen)
    if (equipTimerRef.current) clearTimeout(equipTimerRef.current);
    const allPhotos = [...photos, ...newPhotos];
    equipTimerRef.current = setTimeout(() => {
      detectEquipmentFromPhotos(allPhotos);
    }, 2000);
  }, [photos, photoLimit, detectEquipmentFromPhotos]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removePhoto = (id: string) => {
    setPhotos(p => {
      const photo = p.find(x => x.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return p.filter(x => x.id !== id);
    });
  };

  const processOne = async (photo: Photo): Promise<void> => {
    setPhotos(p => p.map(x => x.id === photo.id ? { ...x, processing: true, error: false } : x));
    try {
      const b64 = await fileToBase64(photo.file);
      const compressed = await resizeImage(b64);
      const backgroundId = typeof window !== 'undefined'
        ? localStorage.getItem('dealer_background') || 'studio_infinity'
        : 'studio_infinity';

      const res = await fetch('/api/pixelcut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressed, backgroundId }),
      });
      if (!res.ok) throw new Error('Verarbeitung fehlgeschlagen');
      const data = await res.json();

      // Wasserzeichen drauf wenn aktiviert
      let result = data.result as string;
      if (watermarkOn) {
        const dealerName = localStorage.getItem('dealer_company') || '2Fast4Sale';
        try { result = await addWatermark(result, dealerName); } catch { /* ignorieren */ }
      }

      setPhotos(p => p.map(x => x.id === photo.id ? { ...x, processed: result, processing: false } : x));
    } catch {
      setPhotos(p => p.map(x => x.id === photo.id ? { ...x, processing: false, error: true } : x));
    }
  };

  const processAll = async () => {
    setBulk(true);
    const pending = photos.filter(p => !p.processed && !p.processing);
    // Parallel in 3er-Batches  schneller, aber API nicht überlasten
    const BATCH = 3;
    for (let i = 0; i < pending.length; i += BATCH) {
      await Promise.all(pending.slice(i, i + BATCH).map(p => processOne(p)));
    }
    setBulk(false);
  };

  const handleNext = () => {
    const previews = photos.map(p => p.processed || p.preview);
    sessionStorage.setItem('listing_photos', JSON.stringify(previews));
    const params = new URLSearchParams({ brand, km, price, year, fuel, gearbox, color, power });
    router.push(`/dashboard/listing/step3?${params.toString()}`);
  };

  const handleBack = () => {
    const params = new URLSearchParams({ brand, km, price, year, fuel, gearbox, color, power });
    router.push(`/dashboard/listing/step1?${params.toString()}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F }}>

      {/* ---- Top Progress Bar ---- */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORD}`, padding: '0 40px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', color: TD, cursor: 'pointer', fontSize: '13px', fontFamily: F, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ChevronLeft size={14} /> Zurück
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {['Fahrzeugdaten', 'Fotos', 'KI-Text', 'Fertigstellen'].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: i < 1 ? '#10b981' : i === 1 ? '#2563eb' : 'rgba(0,0,0,0.06)',
                  border: `2px solid ${i < 1 ? '#10b981' : i === 1 ? '#3b82f6' : 'rgba(0,0,0,0.07)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '11px', fontWeight: '700',
                }}>
                  {i < 1 ? <CheckCircle2 size={12} /> : i + 1}
                </div>
                <span style={{ fontSize: '13px', fontWeight: i === 1 ? '700' : '500', color: i === 1 ? '#6366f1' : i < 1 ? '#10b981' : '#94a3b8', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < 3 && <div style={{ width: '24px', height: '1px', background: i < 1 ? '#10b981' : 'rgba(0,0,0,0.07)' }} />}
            </div>
          ))}
        </div>
        <div style={{ width: '100px' }} />
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 24px 60px' }}>

        {/* ---- Header ---- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Fahrzeugfotos</h1>
            <p style={{ color: TS, fontSize: '13px', margin: '4px 0 0' }}>
              {brand && <strong style={{ color: TH }}>{brand}</strong>}
              {km && ` · ${Number(km).toLocaleString('de-DE')} km`}
              {' · '}Handy-Fotos genügen  KI entfernt den Hintergrund automatisch.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Wasserzeichen Toggle */}
            <button
              onClick={() => {
                const next = !watermarkOn;
                setWatermarkOn(next);
                localStorage.setItem('watermark_enabled', String(next));
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 16px',
                background: watermarkOn ? 'rgba(16,185,129,0.1)' : '#f8fafc',
                border: `1px solid ${watermarkOn ? 'rgba(16,185,129,0.3)' : 'rgba(0,0,0,0.07)'}`,
                borderRadius: '10px', color: watermarkOn ? '#34d399' : '#7a9cbc',
                fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: F,
                whiteSpace: 'nowrap',
              }}
            >
              <Droplets size={14} />
              Wasserzeichen {watermarkOn ? 'AN' : 'AUS'}
            </button>

          {photos.length > 0 && photos.some(p => !p.processed) && (
            <button
              onClick={processAll}
              disabled={bulkProcessing}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 22px', background: bulkProcessing ? 'rgba(124,58,237,0.4)' : '#7c3aed',
                border: 'none', color: '#fff', borderRadius: '10px',
                fontSize: '13px', fontWeight: '700', cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                fontFamily: F, boxShadow: '0 4px 18px rgba(124,58,237,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              {bulkProcessing
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Verarbeite... ({processedCount}/{totalCount})</>
                : <><Wand2 size={15} /> KI-Studio starten ({photos.filter(p => !p.processed).length} Fotos)</>
              }
            </button>
          )}
          </div>{/* Ende Buttons-div */}
        </div>{/* Ende Header-div */}

        {/* ---- Qualitäts-Warnung Banner ---- */}
        {photos.some(p => !p.analyzing && p.issues.length > 0 && !p.processed) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px' }}>
            <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fca5a5' }}>
                {photos.filter(p => !p.analyzing && p.issues.length > 0 && !p.processed).length} Foto{photos.filter(p => !p.analyzing && p.issues.length > 0 && !p.processed).length > 1 ? 's' : ''} mit Qualitätsproblemen
              </div>
              <div style={{ fontSize: '13px', color: '#7a9cbc', marginTop: '2px' }}>
                Unscharfe oder zu dunkle Fotos können trotzdem verwendet werden  für bessere Ergebnisse ersetze sie.
              </div>
            </div>
          </div>
        )}

        {/* ---- KI-Studio Progress ---- */}
        {photos.length > 0 && (
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <span style={{ fontSize: '13px', color: TS, fontWeight: '600' }}>
                  {processedCount === totalCount && totalCount > 0
                    ? 'Alle Fotos verarbeitet!'
                    : `KI-Studio: ${processedCount}/${totalCount} Fotos`
                  }
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: processedCount === totalCount && totalCount > 0 ? '#10b981' : '#3b82f6' }}>
                  {Math.round((processedCount / Math.max(totalCount, 1)) * 100)}%
                </span>
              </div>
              <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(processedCount / Math.max(totalCount, 1)) * 100}%`, height: '100%', background: processedCount === totalCount && totalCount > 0 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #7c3aed, #3b82f6)', borderRadius: '3px', transition: 'width 0.5s' }} />
              </div>
            </div>
            <div style={{ fontSize: '12px', color: TD, whiteSpace: 'nowrap' }}>
              {photos[0]?.processed ? 'Titelbild bereit' : 'Titelbild ausstehend'}
            </div>
          </div>
        )}

        {/* ---- Ausstattungs-Erkennungs-Banner ---- */}
        {equipState === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '12px', padding: '12px 18px', marginBottom: '12px' }}>
            <Loader2 size={15} color="#a78bfa" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color: '#c4b5fd', fontWeight: '600' }}>KI erkennt Ausstattungsmerkmale aus den Fotos...</span>
          </div>
        )}
        {equipState === 'done' && equipFound.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '12px 18px', marginBottom: '12px' }}>
            <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '14px', color: '#6ee7b7', fontWeight: '700', marginBottom: '6px' }}>
                {equipFound.length} Ausstattungsmerkmale aus Fotos erkannt  zu Schritt 1 hinzugefügt
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {equipFound.slice(0, 8).map((e, i) => (
                  <span key={i} style={{ fontSize: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', padding: '2px 9px', borderRadius: '20px' }}>{e}</span>
                ))}
                {equipFound.length > 8 && <span style={{ fontSize: '12px', color: '#7a9cbc' }}>+{equipFound.length - 8} weitere</span>}
              </div>
            </div>
          </div>
        )}

        {/* ---- Fotolimit Banner ---- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '14px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '13px', color: TS }}>
              <span style={{ fontWeight: '700', color: photos.length >= photoLimit ? '#ef4444' : '#0f172a', fontSize: '13px' }}>{photos.length}</span>
              <span style={{ color: '#94a3b8' }}> / </span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{photoLimit} Fotos</span>
              <span style={{ color: '#94a3b8', marginLeft: '8px' }}>({plan.charAt(0).toUpperCase() + plan.slice(1)}-Plan)</span>
            </div>
            {/* Fortschrittsbalken */}
            <div style={{ width: '120px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((photos.length / photoLimit) * 100, 100)}%`, height: '100%', background: photos.length >= photoLimit ? '#ef4444' : 'linear-gradient(90deg,#3b82f6,#8b5cf6)', borderRadius: '3px', transition: 'width 0.3s' }} />
            </div>
          </div>
          {photos.length >= photoLimit && (
            <Link href="/dashboard/pricing" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
              <Crown size={13} /> Upgrade für mehr Fotos
            </Link>
          )}
        </div>

        {/* ---- Upload Zone ---- */}
        <div
          onDragOver={e => { e.preventDefault(); if (photos.length < photoLimit) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={photos.length < photoLimit ? onDrop : e => e.preventDefault()}
          onClick={() => photos.length < photoLimit && fileRef.current?.click()}
          style={{
            border: `2px dashed ${photos.length >= photoLimit ? 'rgba(239,68,68,0.2)' : dragging ? '#3b82f6' : 'rgba(59,130,246,0.3)'}`,
            borderRadius: '12px', padding: '20px',
            textAlign: 'center', cursor: photos.length >= photoLimit ? 'not-allowed' : 'pointer',
            background: photos.length >= photoLimit ? 'rgba(239,68,68,0.03)' : dragging ? 'rgba(59,130,246,0.07)' : 'rgba(59,130,246,0.02)',
            transition: 'all 0.2s', marginBottom: '24px',
            opacity: photos.length >= photoLimit ? 0.6 : 1,
          }}
        >
          <div style={{ width: '60px', height: '60px', background: photos.length >= photoLimit ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.12)', border: `1px solid ${photos.length >= photoLimit ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)'}`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            {photos.length >= photoLimit ? <Lock size={26} color="#f87171" /> : <Upload size={26} color="#60a5fa" />}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: TH, marginBottom: '5px' }}>
            {photos.length >= photoLimit ? `Limit erreicht (${photoLimit} Fotos)` : 'Fotos hier reinziehen oder klicken'}
          </div>
          <div style={{ fontSize: '13px', color: TS, marginBottom: '14px' }}>
            {photos.length >= photoLimit
              ? <span>Upgrade auf <Link href="/dashboard/pricing" style={{ color: '#fbbf24', fontWeight: '700', textDecoration: 'none' }}>Pro oder Business</Link> für mehr Fotos</span>
              : `JPG, PNG, WEBP, HEIC · Mehrere gleichzeitig · Max. ${photoLimit} Fotos`
            }
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {['Frontal', 'Seite', 'Heck', 'Innenraum', 'Details', 'Motor'].map(t => (
              <span key={t} style={{ fontSize: '13px', color: '#6366f1', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' }}>{t}</span>
            ))}
          </div>
          <input
            ref={fileRef} type="file" multiple accept="image/*"
            style={{ display: 'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* ---- Photo Grid ---- */}
        {photos.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: TS }}>
                {photos.length} Foto{photos.length !== 1 ? 's' : ''} · Erste Bild = Titelbild
              </span>
              <button onClick={() => setPhotos([])} style={{ fontSize: '13px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>
                Alle entfernen
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {photos.map((p, i) => {
                const hasIssues = p.issues.length > 0;
                const borderColor = hasIssues && !p.processed
                  ? p.issues.includes('blurry') ? '#f87171' : '#fb923c'
                  : i === 0 ? '#f59e0b'
                  : p.processed ? 'rgba(16,185,129,0.5)'
                  : BORD;
                return (
                <div key={p.id} style={{
                  position: 'relative', aspectRatio: '4/3', borderRadius: '12px',
                  overflow: 'hidden',
                  border: `2px solid ${borderColor}`,
                  background: '#0f1e30', cursor: 'pointer',
                }}
                  onClick={() => setLightbox(p.processed || p.preview)}
                >
                  <img src={p.processed || p.preview} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: hasIssues && !p.processed ? 'brightness(0.75)' : 'none' }} alt="" />

                  {/* Analysiere... */}
                  {p.analyzing && (
                    <div style={{ position: 'absolute', bottom: '6px', left: '6px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: '6px' }}>
                      <Loader2 size={9} color="#7a9cbc" style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '9px', color: '#7a9cbc', fontWeight: '700' }}>Analyse...</span>
                    </div>
                  )}

                  {/* Qualitäts-Warnungen */}
                  {!p.analyzing && hasIssues && !p.processed && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px' }}>
                      {p.issues.map(issue => (
                        <div key={issue} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: `${ISSUE_LABELS[issue].color}ee`, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', color: '#fff' }}>
                          {ISSUE_LABELS[issue].text}
                        </div>
                      ))}
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', textAlign: 'center' }}>
                        Trotzdem nutzbar  besser ersetzen
                      </div>
                    </div>
                  )}

                  {/* Loading overlay */}
                  {p.processing && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,35,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Loader2 size={22} color="#a78bfa" style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '700' }}>KI...</span>
                    </div>
                  )}

                  {/* Error */}
                  {p.error && (
                    <div style={{ position: 'absolute', bottom: '6px', left: '6px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.85)', padding: '3px 8px', borderRadius: '6px' }}>
                      <AlertCircle size={11} color="#fff" />
                      <span style={{ fontSize: '10px', color: '#fff', fontWeight: '700' }}>Fehler</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div style={{ position: 'absolute', top: '7px', left: '7px', display: 'flex', gap: '4px' }}>
                    {i === 0 && <span style={{ fontSize: '10px', fontWeight: '700', background: '#f59e0b', color: '#000', padding: '2px 7px', borderRadius: '5px' }}>TITEL</span>}
                    {p.processed && <span style={{ fontSize: '10px', fontWeight: '700', background: '#10b981', color: '#fff', padding: '2px 7px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Wand2 size={8} /> STUDIO
                    </span>}
                  </div>

                  {/* Number */}
                  <div style={{ position: 'absolute', bottom: '7px', left: '7px', background: 'rgba(0,0,0,0.65)', color: TS, fontSize: '11px', fontWeight: '700', padding: '2px 7px', borderRadius: '5px' }}>
                    #{i + 1}
                  </div>

                  {/* Process button (hover) */}
                  {!p.processed && !p.processing && (
                    <button
                      onClick={e => { e.stopPropagation(); processOne(p); }}
                      style={{ position: 'absolute', bottom: '7px', right: '7px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(124,58,237,0.9)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: F }}
                    >
                      <Wand2 size={10} /> KI
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); removePhoto(p.id); }}
                    style={{ position: 'absolute', top: '7px', right: '7px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={12} />
                  </button>
                </div>
                );
              })}

              {/* Add more tile */}
              <label style={{ aspectRatio: '4/3', borderRadius: '12px', border: `2px dashed ${BORD}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', gap: '6px', transition: 'all 0.2s' }}>
                <input type="file" hidden multiple accept="image/*" onChange={e => e.target.files && addFiles(e.target.files)} />
                <Upload size={18} color={TD} />
                <span style={{ fontSize: '11px', color: TD, fontWeight: '600' }}>Mehr hinzufügen</span>
              </label>
            </div>
          </div>
        )}

        {/* ---- Perspektiven Checklist ---- */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: TS, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px' }}>Empfohlene Perspektiven</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PERSPECTIVES.map((label, i) => {
              const covered = i < photos.length;
              return (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 13px', borderRadius: '20px',
                  background: covered ? 'rgba(16,185,129,0.1)' : '#f8fafc',
                  border: `1px solid ${covered ? 'rgba(16,185,129,0.3)' : BORD}`,
                  fontSize: '13px', color: covered ? '#6ee7b7' : TS,
                  transition: 'all 0.2s',
                }}>
                  {covered && <CheckCircle2 size={12} color="#10b981" />}
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- Tipps (leer) ---- */}
        {photos.length === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
            {[
              { icon: <Camera size={22} color="#60a5fa" />, title: 'Außen: 3 Seiten', desc: 'Vorne, Seite und Heck  immer aus gleicher Höhe' },
              { icon: <Eye size={22} color="#a78bfa" />,    title: 'Gutes Licht',     desc: 'Tageslicht oder bewölkt  kein direktes Gegenlicht' },
              { icon: <Wand2 size={22} color="#34d399" />,  title: 'KI-Studio',       desc: 'KI entfernt den Hintergrund und erstellt Studio-Look' },
            ].map(t => (
              <div key={t.title} style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ margin: '0 auto 10px', width: '44px', height: '44px', background: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: TH, marginBottom: '5px' }}>{t.title}</div>
                <div style={{ fontSize: '13px', color: TS, lineHeight: 1.6 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* ---- Lightbox ---- */}
        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
            <img src={lightbox} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px' }} alt="" onClick={e => e.stopPropagation()} />
          </div>
        )}
      </div>

      {/* ---- Sticky Bottom Bar ---- */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: `${CARD}ee`, backdropFilter: 'blur(12px)', borderTop: `1px solid ${BORD}`, padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ fontSize: '13px', color: TS }}>
          {photos.length === 0
            ? 'Mindestens 1 Foto hochladen'
            : <span style={{ color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle2 size={14} /> {photos.length} Foto{photos.length !== 1 ? 's' : ''} bereit{processedCount > 0 ? ` · ${processedCount} im Studio bearbeitet` : ''}</span>
          }
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 20px', background: '#f1f5f9', border: `1px solid ${BORD}`, borderRadius: '9px', color: TS, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: F }}>
            <ChevronLeft size={16} /> Zurück
          </button>
          <button
            onClick={handleNext}
            disabled={photos.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 26px', background: photos.length > 0 ? '#2563eb' : 'rgba(37,99,235,0.3)',
              border: 'none', color: '#fff', borderRadius: '9px',
              fontSize: '13px', fontWeight: '700', cursor: photos.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: F, boxShadow: photos.length > 0 ? '0 4px 18px rgba(37,99,235,0.4)' : 'none',
            }}
          >
            KI-Beschreibung generieren <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function Step2() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />}>
      <Step2Inner />
    </Suspense>
  );
}





