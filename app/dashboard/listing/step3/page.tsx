'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, CheckCircle2, Loader2, Zap, TrendingUp, Target, Search, Globe, FileText, Car } from 'lucide-react';

const F = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const STEPS = [
  { icon: FileText,  label: 'Fahrzeugdaten analysieren',  sub: 'Marke · Modell · Ausstattung',       duration: 700  },
  { icon: Target,    label: 'Zielgruppe bestimmen',        sub: 'Kaufmotive & Sprache',                duration: 900  },
  { icon: Sparkles,  label: 'Verkaufstext formulieren',    sub: 'Überzeugend & emotional',             duration: 1400 },
  { icon: Search,    label: 'SEO-Keywords einbauen',       sub: 'Suchmaschinenoptimierung',            duration: 700  },
  { icon: Globe,     label: 'Plattform-Optimierung',       sub: 'Mobile.de & AutoScout24',             duration: 600  },
  { icon: TrendingUp,label: 'Fertigstellen',               sub: 'Dein Inserat ist gleich fertig…',     duration: 300  },
];

const FACTS = [
  { stat: '+14%', text: 'höhere Verkaufspreise mit professionellen Inseratstexten' },
  { stat: '3×',   text: 'mehr Anfragen durch optimierte Überschriften' },
  { stat: '68%',  text: 'der Käufer entscheiden sich binnen 24h nach dem Lesen' },
];

function Step3Inner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [stepIndex, setStepIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [dots,      setDots]      = useState('');
  const doneRef = useRef(false);

  const brand   = searchParams.get('brand')   || '';
  const km      = searchParams.get('km')      || '';
  const price   = searchParams.get('price')   || '';
  const year    = searchParams.get('year')    || '';
  const fuel    = searchParams.get('fuel')    || '';
  const gearbox = searchParams.get('gearbox') || '';
  const color   = searchParams.get('color')   || '';
  const power   = searchParams.get('power')   || '';

  // Foto aus sessionStorage
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('listing_photos');
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (arr[0]) setPhoto(arr[0]);
      }
    } catch { /* ignore */ }
  }, []);

  // Dots animation
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, []);

  // Fact rotation
  useEffect(() => {
    const t = setInterval(() => setFactIndex(i => (i + 1) % FACTS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Step progression + API call
  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    // Step animation
    let i = 0;
    const advance = () => {
      if (i < STEPS.length - 1) {
        i++;
        setStepIndex(i);
        setTimeout(advance, STEPS[i].duration);
      }
    };
    setTimeout(advance, STEPS[0].duration);

    // Step1 data
    let step1Data: Record<string, unknown> = {};
    try {
      const raw = sessionStorage.getItem('listing_step1');
      if (raw) step1Data = JSON.parse(raw);
    } catch { /* ignore */ }

    // API call
    const callAI = async () => {
      try {
        const res = await fetch('/api/generate-description', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand, km, year, fuel, gearbox, color,
            power:        power ? String(Math.round(Number(power) / 1.36)) : undefined,
            equipment:    (step1Data.equipment   as string[]) || [],
            dealerNotes:  (step1Data.dealerNotes as string)  || '',
            seats:        step1Data.seats        || '',
            displacement: step1Data.displacementCcm || '',
          }),
        });
        if (!res.ok) throw new Error('API-Fehler');
        const data = await res.json();
        const desc = encodeURIComponent(data.text || data.description || '');
        const params = new URLSearchParams({ brand, km, price, year, fuel, gearbox, color, power, desc });
        setTimeout(() => router.push(`/dashboard/listing/step4?${params.toString()}`), 600);
      } catch {
        const params = new URLSearchParams({ brand, km, price, year, fuel, gearbox, color, power, desc: '' });
        setTimeout(() => router.push(`/dashboard/listing/step4?${params.toString()}`), 800);
      }
    };
    callAI();
  }, []);

  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '900px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

        {/* ── LEFT: Fahrzeug-Info + Fortschritt ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Fahrzeug-Card */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            {/* Foto */}
            <div style={{ height: '180px', background: photo ? 'transparent' : 'rgba(99,102,241,0.08)', position: 'relative', overflow: 'hidden' }}>
              {photo ? (
                <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                  <Car size={40} color="#334155" style={{ opacity: 0.3 }} />
                  <div style={{ fontSize: '12px', color: '#475569' }}>Fahrzeugvorschau</div>
                </div>
              )}
              {/* Gradient overlay */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(transparent, #0f172a)' }} />
              {/* Badge */}
              <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(99,102,241,0.9)', backdropFilter: 'blur(8px)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={10} /> KI aktiv
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: '18px 20px 20px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.4px', marginBottom: '4px' }}>
                {brand || 'Fahrzeug'}
                {year ? ` · ${year}` : ''}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {km    && <Tag label={`${Number(km).toLocaleString('de-DE')} km`} />}
                {fuel  && <Tag label={fuel} />}
                {power && <Tag label={`${power} PS`} />}
                {price && <Tag label={`${Number(price).toLocaleString('de-DE')} €`} accent />}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Fortschritt</span>
              <span style={{ fontSize: '22px', fontWeight: '900', color: '#6366f1', letterSpacing: '-1px' }}>{progress}%</span>
            </div>
            {/* Bar */}
            <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '4px', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }} />
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
              {STEPS[stepIndex]?.label}{dots}
            </div>
          </div>

          {/* Fact Card */}
          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '16px', padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#fff', letterSpacing: '-1.5px' }}>{FACTS[factIndex].stat}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{FACTS[factIndex].text}</div>
          </div>
        </div>

        {/* ── RIGHT: Steps ── */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>KI generiert deinen Text</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Dauert nur wenige Sekunden</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {STEPS.map((s, i) => {
              const done    = i < stepIndex;
              const current = i === stepIndex;
              const pending = i > stepIndex;
              const Icon    = s.icon;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px',
                  background: current ? 'rgba(99,102,241,0.06)' : done ? 'rgba(16,185,129,0.04)' : '#fafafa',
                  border: `1px solid ${current ? 'rgba(99,102,241,0.3)' : done ? 'rgba(16,185,129,0.25)' : '#f1f5f9'}`,
                  borderRadius: '12px',
                  opacity: pending ? 0.45 : 1,
                  transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
                  transform: current ? 'translateX(3px)' : 'translateX(0)',
                  boxShadow: current ? '0 2px 16px rgba(99,102,241,0.12)' : 'none',
                }}>
                  {/* Icon Box */}
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                    background: current ? 'rgba(99,102,241,0.12)' : done ? 'rgba(16,185,129,0.1)' : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done
                      ? <CheckCircle2 size={16} color="#10b981" />
                      : current
                        ? <Loader2 size={15} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                        : <Icon size={15} color="#cbd5e1" />
                    }
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: current ? '700' : done ? '600' : '500', color: done ? '#059669' : current ? '#4f46e5' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: '11px', color: done ? '#6ee7b7' : current ? '#a5b4fc' : '#e2e8f0', marginTop: '1px' }}>
                      {s.sub}
                    </div>
                  </div>

                  {/* Done badge */}
                  {done && (
                    <div style={{ width: '20px', height: '20px', background: 'rgba(16,185,129,0.15)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', color: '#10b981' }}>✓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom hint */}
          <div style={{ marginTop: '20px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, textAlign: 'center' }}>
              Der Text wird für <strong style={{ color: '#0f172a' }}>mobile.de & AutoScout24</strong> optimiert — du kannst ihn danach noch bearbeiten.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function Tag({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span style={{
      fontSize: '11px', fontWeight: '700',
      color:   accent ? '#fbbf24' : 'rgba(255,255,255,0.7)',
      background: accent ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)',
      border: `1px solid ${accent ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: '6px', padding: '3px 8px', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

export default function Step3() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <Step3Inner />
    </Suspense>
  );
}
