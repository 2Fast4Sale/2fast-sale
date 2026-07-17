'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) { setError('Bitte alle Pflichtfelder ausfüllen.'); return; }
    if (form.password !== form.confirm) { setError('Passwörter stimmen nicht überein.'); return; }
    if (form.password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben.'); return; }
    if (!agreed) { setError('Bitte stimme den AGB zu.'); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name, company: form.company },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#0c1829',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '12px 15px',
    color: '#f1f5f9',
    fontSize: '15px',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: '700', color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.8px',
    display: 'block', marginBottom: '8px',
  };

  const pwStrength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const pwColors = ['transparent', '#ef4444', '#f59e0b', '#10b981'];
  const pwLabels = ['', 'Schwach', 'Mittel', 'Stark'];

  if (success) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#080e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px', padding: '40px' }}>
          <div style={{ width: '72px', height: '72px', backgroundColor: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle2 size={34} style={{ color: '#10b981' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#f8fafc', margin: '0 0 12px 0' }}>Fast geschafft!</h2>
          <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.7, margin: '0 0 28px 0' }}>
            Wir haben eine Bestätigungsmail an <strong style={{ color: '#f1f5f9' }}>{form.email}</strong> gesendet. Klicke auf den Link um dein Konto zu aktivieren.
          </p>
          <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', padding: '14px 28px', borderRadius: '14px', fontWeight: '700', textDecoration: 'none', fontSize: '15px' }}>
            Zum Login <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#07111f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.12), transparent 70%)', top: '-200px', right: '-100px' }} />
        <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.10), transparent 70%)', bottom: '-150px', left: '-80px' }} />
      </div>

      <div style={{ width: '100%', maxWidth: '520px', position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '26px', fontWeight: '900', color: '#3b82f6', letterSpacing: '-0.5px' }}>2Fast4Sale</span>
          </Link>
          <div style={{ marginTop: '16px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#f8fafc', margin: '0 0 6px 0' }}>Konto erstellen</h2>
            <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>7 Tage kostenlos · keine Kreditkarte nötig</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#0a1628', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '36px 40px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input style={inputStyle} placeholder="Max Mustermann" value={form.name} onChange={set('name')}
                  onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
              </div>
              <div>
                <label style={labelStyle}>Autohaus / Firma</label>
                <input style={inputStyle} placeholder="Autohaus GmbH" value={form.company} onChange={set('company')}
                  onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>E-Mail *</label>
              <input type="email" style={inputStyle} placeholder="max@autohaus.de" value={form.email} onChange={set('email')}
                onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
            </div>

            <div>
              <label style={labelStyle}>Passwort *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: '52px' }} placeholder="Mindestens 6 Zeichen" value={form.password} onChange={set('password')}
                  onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(pwStrength / 3) * 100}%`, backgroundColor: pwColors[pwStrength], borderRadius: '99px', transition: 'all 0.3s' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: pwColors[pwStrength], fontWeight: '700', minWidth: '40px' }}>{pwLabels[pwStrength]}</span>
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Passwort bestätigen *</label>
              <input type="password" style={{ ...inputStyle, borderColor: form.confirm && form.confirm !== form.password ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)' }}
                placeholder="Passwort wiederholen" value={form.confirm} onChange={set('confirm')}
                onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                onBlur={e => (e.target.style.borderColor = form.confirm && form.confirm !== form.password ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)')} />
              {form.confirm && form.confirm === form.password && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                  <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>Passwörter stimmen überein</span>
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <div onClick={() => setAgreed(!agreed)} style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${agreed ? '#3b82f6' : 'rgba(255,255,255,0.12)'}`, backgroundColor: agreed ? '#2563eb' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px', transition: 'all 0.15s', cursor: 'pointer' }}>
                {agreed && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '900' }}>✓</span>}
              </div>
              <span style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                Ich stimme den <Link href="/agb" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>AGB</Link> und der <Link href="/datenschutz" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>Datenschutzerklärung</Link> zu.
              </span>
            </label>

            {error && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#fca5a5', fontWeight: '600' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: loading ? '#1e3a8a' : '#2563eb', color: '#fff', padding: '13px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,0.35)', transition: 'all 0.2s', marginTop: '4px' }}>
              {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Konto wird erstellt…</> : <>Kostenlos registrieren <ArrowRight size={17} /></>}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#475569' }}>
          Bereits ein Konto? <Link href="/auth/login" style={{ color: '#3b82f6', fontWeight: '700', textDecoration: 'none' }}>Anmelden</Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #334155; }
      `}</style>
    </div>
  );
}


