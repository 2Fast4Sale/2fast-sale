'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import {
  Building2, User, Phone, Sparkles, Layers, ChevronRight,
  ChevronLeft, Check, Zap, ArrowRight, X
} from 'lucide-react';

const F = '"Inter", -apple-system, sans-serif';

const BG_OPTIONS = [
  { id: 'studio_white',  label: 'Studio Weiß',   color: '#f8fafc', textColor: '#1e293b', tier: 'free' },
  { id: 'studio_grey',   label: 'Studio Grau',   color: '#64748b', textColor: '#fff',    tier: 'free' },
  { id: 'studio_dark',   label: 'Studio Dunkel', color: '#1e293b', textColor: '#fff',    tier: 'free' },
  { id: 'studio_navy',   label: 'Midnight Navy', color: '#0f172a', textColor: '#60a5fa', tier: 'pro'  },
  { id: 'studio_beige',  label: 'Warm Beige',    color: '#d4c5a9', textColor: '#1e293b', tier: 'pro'  },
  { id: 'studio_carbon', label: 'Carbon Black',  color: '#111827', textColor: '#9ca3af', tier: 'pro'  },
];

const STEPS = [
  { id: 1, label: 'Autohaus',    icon: Building2 },
  { id: 2, label: 'KI-Stil',     icon: Sparkles  },
  { id: 3, label: 'Hintergrund', icon: Layers    },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]       = useState(1);
  const [saving, setSaving]   = useState(false);
  const [plan, setPlan]       = useState('free');

  const [company, setCompany] = useState('');
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [aiStyle, setAiStyle] = useState('');
  const [bg, setBg]           = useState('studio_white');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      const { data } = await supabase
        .from('profiles')
        .select('full_name, company, phone, ai_style_template, default_background, plan, onboarding_done')
        .eq('id', user.id)
        .single();
      // Wenn schon erledigt → direkt zum Dashboard
      if (data?.onboarding_done) { router.replace('/dashboard'); return; }
      if (data) {
        setName(data.full_name || '');
        setCompany(data.company || '');
        setPhone(data.phone || '');
        setAiStyle(data.ai_style_template || '');
        setBg(data.default_background || 'studio_white');
        setPlan(data.plan || 'free');
      }
    });
  }, [router]);

  const finish = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({
      id:                 user.id,
      full_name:          name,
      company,
      phone,
      ai_style_template:  aiStyle,
      default_background: bg,
      onboarding_done:    true,
    });
    localStorage.setItem('dealer_company', company);
    localStorage.setItem('dealer_plan', plan);
    router.push('/dashboard');
  };

  const skip = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, onboarding_done: true });
    }
    router.push('/dashboard');
  };

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#0a1628',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', padding: '13px 16px',
    color: '#fff', fontSize: '18px', outline: 'none', fontFamily: F,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#060e1a 0%,#0d1a2e 60%,#0a1628 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: F, color: '#fff',
    }}>

      {/* ── Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
        <div style={{ width: '36px', height: '36px', background: '#2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 16px rgba(37,99,235,0.5)' }}>
          <Zap size={18} color="#fff" />
        </div>
        <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px' }}>
          2Fast<span style={{ color: '#60a5fa' }}>4</span>Sale
        </span>
      </div>

      {/* ── Card ── */}
      <div style={{ width: '100%', maxWidth: '560px', background: '#0d1829', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ padding: '32px 36px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>
              {step === 1 && 'Willkommen! 👋'}
              {step === 2 && 'Dein KI-Stil ✨'}
              {step === 3 && 'Standard-Hintergrund 🎨'}
            </h1>
            <button
              onClick={skip}
              style={{ background: 'none', border: 'none', color: '#3a5a78', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: F, flexShrink: 0, marginTop: '4px' }}
            >
              <X size={13} /> Überspringen
            </button>
          </div>

          <p style={{ margin: '0 0 28px 0', color: '#7a9cbc', fontSize: '18px', lineHeight: 1.6 }}>
            {step === 1 && 'Kurz einrichten — dauert unter 2 Minuten. Alles später in Einstellungen änderbar.'}
            {step === 2 && 'Zeig der KI wie du schreibst — dann klingt jedes Inserat nach dir.'}
            {step === 3 && 'Welchen Hintergrund soll die KI standardmäßig für Fahrzeugfotos verwenden?'}
          </p>

          {/* Fortschrittsbalken */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
            {STEPS.map((s) => (
              <div key={s.id} style={{ flex: 1 }}>
                <div style={{ height: '3px', borderRadius: '99px', background: s.id <= step ? '#2563eb' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: s.id <= step ? '#60a5fa' : '#3a5a78', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginTop: '5px' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '0 36px 36px' }}>

          {/* ── Schritt 1: Firmendaten ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#7a9cbc', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: '8px' }}>
                  Autohaus / Firmenname *
                </label>
                <input style={inp} autoFocus placeholder="z. B. Autohaus Müller GmbH"
                  value={company} onChange={e => setCompany(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'rgba(37,99,235,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#7a9cbc', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: '8px' }}>
                  Dein Name
                </label>
                <input style={inp} placeholder="z. B. Max Müller"
                  value={name} onChange={e => setName(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'rgba(37,99,235,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#7a9cbc', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: '8px' }}>
                  Telefon
                </label>
                <input style={inp} placeholder="+49 176 ..."
                  value={phone} onChange={e => setPhone(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'rgba(37,99,235,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
            </div>
          )}

          {/* ── Schritt 2: KI-Stil ── */}
          {step === 2 && (
            <div>
              <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '18px', color: '#a8c4dc', lineHeight: 1.7 }}>
                💡 Schreib einfach wie du normalerweise ein Auto beschreiben würdest. Die KI übernimmt deinen Ton für alle Inserate.
              </div>
              <textarea rows={7} value={aiStyle} onChange={e => setAiStyle(e.target.value)}
                placeholder={`Beispiel:\n"Wir beim Autohaus Müller legen Wert auf ehrliche Beschreibungen. Kein Verkaufsgerede — nur Fakten. Wir erwähnen immer den Wartungsstand und ob das Fahrzeug scheckheftgepflegt ist."`}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.7, border: '1px solid rgba(139,92,246,0.25)' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(139,92,246,0.25)')}
              />
              <div style={{ fontSize: '18px', color: '#3a5a78', marginTop: '8px' }}>
                {aiStyle.length} Zeichen{aiStyle.length === 0 && ' · Kann auch später ausgefüllt werden'}
              </div>
            </div>
          )}

          {/* ── Schritt 3: Hintergrund ── */}
          {step === 3 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {BG_OPTIONS.map((b) => {
                  const locked = b.tier === 'pro' && plan === 'free';
                  const selected = bg === b.id;
                  return (
                    <button key={b.id} onClick={() => !locked && setBg(b.id)}
                      style={{ background: b.color, border: `2px solid ${selected ? '#2563eb' : 'transparent'}`, borderRadius: '14px', padding: '20px 16px', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.45 : 1, position: 'relative', textAlign: 'left', transition: 'all 0.15s' }}>
                      {selected && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={11} color="#fff" />
                        </div>
                      )}
                      {locked && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: '700', background: 'rgba(139,92,246,0.8)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>PRO</div>
                      )}
                      <div style={{ fontSize: '18px', fontWeight: '700', color: b.textColor }}>{b.label}</div>
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '18px', color: '#3a5a78', marginTop: '12px' }}>
                Mehr Hintergründe unter <strong style={{ color: '#60a5fa' }}>Studio → Hintergründe</strong>
              </p>
            </div>
          )}

          {/* ── Navigation ── */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#a8c4dc', padding: '13px 20px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', fontFamily: F }}>
                <ChevronLeft size={16} /> Zurück
              </button>
            )}
            <button
              onClick={step < 3 ? () => setStep(s => s + 1) : finish}
              disabled={(step === 1 && !company.trim()) || saving}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: (step === 1 && !company.trim()) ? 'rgba(37,99,235,0.3)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                border: 'none', borderRadius: '12px', color: '#fff', padding: '14px',
                fontSize: '18px', fontWeight: '700',
                cursor: (step === 1 && !company.trim()) || saving ? 'not-allowed' : 'pointer',
                fontFamily: F, transition: 'all 0.2s',
                boxShadow: (step === 1 && !company.trim()) ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
              }}
            >
              {saving ? 'Wird gespeichert…'
                : step < 3
                  ? <><span>Weiter</span><ChevronRight size={16} /></>
                  : <><Check size={16} /><span>Fertig & loslegen</span><ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>

      <p style={{ marginTop: '20px', fontSize: '18px', color: '#2a4a68' }}>
        Alles jederzeit in <strong style={{ color: '#3a5a78' }}>Einstellungen → Händler-Profil</strong> änderbar
      </p>
    </div>
  );
}




