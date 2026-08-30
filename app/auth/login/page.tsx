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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) { setError(err.message); setGoogleLoading(false); }
  };

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

      {/* Left · Branding — hidden on mobile */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', position: 'relative', overflow: 'hidden' }} className="login-branding">
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
          {[{ n: '182', l: 'Marken' }, { n: '2.664', l: 'Modelle' }, { n: '133', l: 'Ausstattungen' }].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#3b82f6' }}>{s.n}</div>
              <div style={{ fontSize: '12px', color: '#334155', fontWeight: '600', marginTop: '2px' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right · Form */}
      <div style={{ width: '480px', flexShrink: 0, backgroundColor: '#0a1628', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px' }} className="login-form-panel">
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

          <button type="submit" disabled={loading || googleLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: loading ? '#1e3a8a' : '#2563eb', color: '#fff', padding: '14px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,0.35)', transition: 'all 0.2s', marginTop: '4px' }}>
            {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Wird angemeldet…</> : <>Anmelden <ArrowRight size={17} /></>}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '28px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: '12px', color: '#334155', fontWeight: '600' }}>ODER</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading || googleLoading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '13px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '14px', fontWeight: '600', cursor: loading || googleLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading || googleLoading ? 0.7 : 1 }}
        >
          {googleLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          )}
          Mit Google anmelden
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
            Noch kein Account?{' '}
            <Link href="/auth/register" style={{ color: '#3b82f6', fontWeight: '700', textDecoration: 'none' }}>Kostenlos registrieren</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #334155; }
        @media (max-width: 768px) {
          .login-branding { display: none !important; }
          .login-form-panel { width: 100% !important; padding: 40px 24px !important; border-left: none !important; }
        }
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




