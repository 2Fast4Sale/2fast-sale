'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Bitte E-Mail eingeben.'); return; }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Link href="/" style={{ fontSize: '22px', fontWeight: '900', color: '#3b82f6', textDecoration: 'none', letterSpacing: '-0.5px' }}>2Fast4Sale</Link>
        </div>

        <div style={{ backgroundColor: '#0d1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '40px' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', backgroundColor: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={28} style={{ color: '#10b981' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#f8fafc', margin: '0 0 10px 0' }}>E-Mail gesendet</h2>
              <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.7, margin: '0 0 24px 0' }}>
                Wir haben einen Link an <strong style={{ color: '#f1f5f9' }}>{email}</strong> gesendet. Klicke darauf um ein neues Passwort zu setzen.
              </p>
              <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}>
                <ArrowLeft size={14} /> Zurück zum Login
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#f8fafc', margin: '0 0 8px 0' }}>Passwort vergessen?</h2>
              <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 28px 0', lineHeight: 1.6 }}>Gib deine E-Mail ein. Wir senden dir einen Link zum Zurücksetzen.</p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '8px' }}>E-Mail</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#334155' }} />
                    <input type="email" style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#080e1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px 14px 44px', color: '#f1f5f9', fontSize: '15px', outline: 'none', fontFamily: 'inherit' }}
                      placeholder="deine@email.de" value={email} onChange={e => setEmail(e.target.value)}
                      onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                </div>
                {error && <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#fca5a5' }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', padding: '14px', borderRadius: '14px', fontWeight: '800', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                  {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
                  {loading ? 'Wird gesendet…' : 'Reset-Link senden'}
                </button>
              </form>
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#475569', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                  <ArrowLeft size={13} /> Zurück zum Login
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

