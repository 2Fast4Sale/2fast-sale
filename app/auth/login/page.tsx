'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Loader2, Car } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Bitte alle Felder ausfüllen.'); return; }
    setLoading(true);

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('E-Mail oder Passwort falsch.');
      setLoading(false);
      return;
    }

    // Onboarding-Check: neue Nutzer zum Wizard leiten
    if (authData.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', authData.user.id)
        .single();
      if (!profile?.onboarding_done) {
        router.push('/onboarding');
        return;
      }
    }

    router.push(redirect);
    router.refresh();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#0c1829',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '13px 16px',
    color: '#f1f5f9',
    fontSize: '15px',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#07111f', display: 'flex', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Left · Branding */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.18), transparent 70%)', top: '-150px', left: '-100px' }} />
          <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)', bottom: '-100px', right: '-80px' }} />
        </div>

        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '28px', fontWeight: '900', color: '#3b82f6', letterSpacing: '-0.5px' }}>2Fast4Sale</span>
        </Link>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', padding: '8px 18px', borderRadius: '50px', marginBottom: '28px' }}>
            <Car size={15} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '13px', color: '#60a5fa', fontWeight: '700' }}>KI-gestützte Inserat-Plattform</span>
          </div>
          <h1 style={{ fontSize: '3.2rem', fontWeight: '900', color: '#f8fafc', lineHeight: 1.1, margin: '0 0 20px 0', letterSpacing: '-1px' }}>
            Professionelle<br />
            <span style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Inserate</span><br />
            in 2 Minuten.
          </h1>
          <p style={{ color: '#475569', fontSize: '16px', lineHeight: 1.7, maxWidth: '400px' }}>
            Fahrzeugschein scannen, Fotos hochladen und KI erstellt automatisch Studio-Bilder und eine professionelle Beschreibung.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '36px' }}>
            {['KI liest Fahrzeugschein automatisch aus', 'Professionelle Studio-Fotos per KI', 'Direkt auf mobile.de & AutoScout24'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#10b981', fontSize: '11px', fontWeight: '900' }}>✓</span>
                </div>
                <span style={{ fontSize: '14px', color: '#64748b' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '32px', position: 'relative', zIndex: 1 }}>
          {[{ n: '34k+', l: 'Inserate' }, { n: '98%', l: 'Zufriedenheit' }, { n: '2 Min', l: 'Ø Dauer' }].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#3b82f6' }}>{s.n}</div>
              <div style={{ fontSize: '12px', color: '#334155', fontWeight: '600', marginTop: '2px' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right · Form */}
      <div style={{ width: '480px', flexShrink: 0, backgroundColor: '#0a1628', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#f8fafc', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Willkommen zurück</h2>
          <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>Melde dich an, um dein Dashboard zu öffnen.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '8px' }}>E-Mail</label>
            <input type="email" style={inputStyle} placeholder="deine@email.de" value={email} onChange={e => setEmail(e.target.value)}
              onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} autoComplete="email" />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Passwort</label>
              <Link href="/auth/forgot" style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', textDecoration: 'none' }}>Vergessen?</Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: '52px' }} placeholder="Passwort eingeben" value={password} onChange={e => setPassword(e.target.value)}
                onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#fca5a5', fontWeight: '600' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: loading ? '#1e3a8a' : '#2563eb', color: '#fff', padding: '14px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,0.35)', transition: 'all 0.2s', marginTop: '4px' }}>
            {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Wird angemeldet…</> : <>Anmelden <ArrowRight size={17} /></>}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '28px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: '12px', color: '#334155', fontWeight: '600' }}>ODER</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
        </div>

        <p style={{ textAlign: 'center', fontSize: '14px', color: '#475569', margin: 0 }}>
          Noch kein Account?{' '}
          <Link href="/auth/register" style={{ color: '#3b82f6', fontWeight: '700', textDecoration: 'none' }}>Kostenlos registrieren</Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #334155; }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}




