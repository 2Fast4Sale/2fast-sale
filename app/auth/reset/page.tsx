'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setError('Link ungültig oder abgelaufen. Bitte neuen Link anfordern.');
          } else {
            setSessionReady(true);
          }
          window.history.replaceState(null, '', window.location.pathname);
        });
      return;
    }

    // Kein Token im Hash — auf AUTH_STATE_CHANGE warten
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Passwort muss mindestens 8 Zeichen lang sein.'); return; }
    if (password !== confirm) { setError('Passwörter stimmen nicht überein.'); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => router.push('/auth/login'), 3000);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#080e1a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '14px 48px 14px 16px',
    color: '#f1f5f9', fontSize: '15px', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Link href="/" style={{ fontSize: '22px', fontWeight: '900', color: '#3b82f6', textDecoration: 'none', letterSpacing: '-0.5px' }}>2Fast4Sale</Link>
        </div>

        <div style={{ backgroundColor: '#0d1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '40px' }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', backgroundColor: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={28} style={{ color: '#10b981' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#f8fafc', margin: '0 0 10px 0' }}>Passwort geändert!</h2>
              <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
                Du wirst automatisch zum Login weitergeleitet…
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#f8fafc', margin: '0 0 8px 0' }}>Neues Passwort setzen</h2>
              <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 28px 0', lineHeight: 1.6 }}>Gib dein neues Passwort ein.</p>

              {!sessionReady && (
                <div style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={15} color="#fbbf24" />
                  <span style={{ fontSize: '13px', color: '#fbbf24' }}>Link wird verifiziert…</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '8px' }}>Neues Passwort</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} style={inputStyle} placeholder="Mind. 8 Zeichen"
                      value={password} onChange={e => setPassword(e.target.value)}
                      onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '8px' }}>Passwort bestätigen</label>
                  <input type={showPw ? 'text' : 'password'} style={inputStyle} placeholder="Passwort wiederholen"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>

                {error && (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#fca5a5' }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || !sessionReady} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: loading || !sessionReady ? '#1e3a8a' : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', padding: '14px', borderRadius: '14px', fontWeight: '800', border: 'none', cursor: loading || !sessionReady ? 'not-allowed' : 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>
                  {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Wird gespeichert…</> : 'Passwort speichern'}
                </button>
              </form>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <Link href="/auth/login" style={{ color: '#475569', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                  Zurück zum Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} input::placeholder{color:#334155}`}</style>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
