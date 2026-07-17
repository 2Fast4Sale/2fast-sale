'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../../../lib/supabase/client';
import {
  Shield, ShieldCheck, ShieldOff, Loader2, CheckCircle2,
  AlertCircle, Copy, ArrowLeft, QrCode, KeyRound,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const F    = '"Inter", -apple-system, sans-serif';
const BG   = '#f0f2f5';
const CARD = '#ffffff';
const BORD = '#e2e8f0';
const TH   = '#0f172a';
const TS   = '#64748b';
const TD   = '#94a3b8';

export default function TwoFactorPage() {
  const [status,     setStatus]     = useState<'loading' | 'disabled' | 'enrolling' | 'enabled'>('loading');
  const [qrCode,     setQrCode]     = useState('');
  const [secret,     setSecret]     = useState('');
  const [factorId,   setFactorId]   = useState('');
  const [code,       setCode]       = useState('');
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [verifying,  setVerifying]  = useState(false);
  const [disabling,  setDisabling]  = useState(false);
  const [copied,     setCopied]     = useState(false);

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.find(f => f.status === 'verified');
    if (totp) { setFactorId(totp.id); setStatus('enabled'); }
    else setStatus('disabled');
  };

  const startEnroll = async () => {
    setError('');
    setStatus('enrolling');
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: '2Fast4Sale' });
    if (error || !data) { setError(error?.message || 'Fehler beim Einrichten.'); setStatus('disabled'); return; }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
  };

  const verify = async () => {
    if (code.length !== 6) { setError('Bitte genau 6 Ziffern eingeben.'); return; }
    setVerifying(true); setError('');
    const supabase = createClient();
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) { setError(challengeError.message); setVerifying(false); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code });
    setVerifying(false);
    if (verifyError) { setError('Falscher Code. Bitte erneut versuchen.'); return; }
    setSuccess('2FA erfolgreich aktiviert!');
    setStatus('enabled');
  };

  const disable = async () => {
    if (!window.confirm('2FA wirklich deaktivieren? Dein Konto wird weniger sicher.')) return;
    setDisabling(true);
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId });
    setDisabling(false);
    setStatus('disabled');
    setFactorId('');
    setSuccess('2FA wurde deaktiviert.');
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#f8fafc', border: `1px solid ${BORD}`,
    borderRadius: '10px', padding: '11px 14px',
    color: TH, fontSize: '16px', fontFamily: F,
    outline: 'none', letterSpacing: '0.2em',
    textAlign: 'center', transition: 'border-color 0.15s',
  };

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
      <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TH }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <Link href="/dashboard/settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: CARD, border: `1px solid ${BORD}`, color: TS, textDecoration: 'none' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Zwei-Faktor-Auth</h1>
            <p style={{ margin: 0, color: TS, fontSize: '14px' }}>Zusätzlicher Schutz für dein Konto</p>
          </div>
        </div>

        {/* Status Banner */}
        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {/* Main Card */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '16px' }}>

          {status === 'enabled' && (
            <div>
              {/* Enabled state */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={24} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: TH, marginBottom: '2px' }}>2FA ist aktiv</div>
                  <div style={{ fontSize: '13px', color: TS }}>Dein Konto ist mit einem zweiten Faktor geschützt</div>
                </div>
              </div>

              <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#15803d', fontWeight: '600', marginBottom: '4px' }}>✓ Konto gesichert</div>
                <div style={{ fontSize: '13px', color: '#16a34a', lineHeight: '1.5' }}>
                  Bei jeder Anmeldung wird ein 6-stelliger Code aus deiner Authenticator-App abgefragt.
                </div>
              </div>

              <div style={{ padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', color: '#92400e' }}>
                <strong>Tipp:</strong> Sichere deinen Backup-Code falls du Zugang zur Authenticator-App verlierst.
              </div>

              <button
                onClick={disable}
                disabled={disabling}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                  background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444',
                  cursor: disabling ? 'not-allowed' : 'pointer', fontFamily: F,
                }}
              >
                {disabling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldOff size={14} />}
                2FA deaktivieren
              </button>
            </div>
          )}

          {status === 'disabled' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Shield size={24} color="#94a3b8" />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: TH, marginBottom: '2px' }}>2FA nicht aktiv</div>
                  <div style={{ fontSize: '13px', color: TS }}>Aktiviere die Zwei-Faktor-Authentifizierung für mehr Sicherheit</div>
                </div>
              </div>

              <div style={{ padding: '14px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
                <strong>Was ist 2FA?</strong> Nach dem Passwort wird ein einmaliger Code aus einer Authenticator-App abgefragt. So bleibt dein Konto sicher, selbst wenn dein Passwort bekannt wird.
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: TD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Kompatible Apps</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Google Authenticator', 'Authy', '1Password', 'Bitwarden'].map(app => (
                    <span key={app} style={{ padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', border: `1px solid ${BORD}`, fontSize: '12px', color: TS, fontWeight: '600' }}>{app}</span>
                  ))}
                </div>
              </div>

              <button
                onClick={startEnroll}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none', color: '#fff', cursor: 'pointer', fontFamily: F,
                }}
              >
                <Shield size={16} /> 2FA einrichten
              </button>
            </div>
          )}

          {status === 'enrolling' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <QrCode size={24} color="#6366f1" />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: TH, marginBottom: '2px' }}>QR-Code scannen</div>
                  <div style={{ fontSize: '13px', color: TS }}>Scanne den Code mit deiner Authenticator-App</div>
                </div>
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {[
                  { n: '1', text: 'Öffne Google Authenticator, Authy oder eine andere TOTP-App auf deinem Smartphone' },
                  { n: '2', text: 'Tippe auf "Konto hinzufügen" → "QR-Code scannen"' },
                  { n: '3', text: 'Scanne den QR-Code oder gib den manuellen Schlüssel ein' },
                  { n: '4', text: 'Gib den 6-stelligen Code aus der App unten ein' },
                ].map(step => (
                  <div key={step.n} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{step.n}</div>
                    <div style={{ fontSize: '13px', color: TS, lineHeight: '1.5' }}>{step.text}</div>
                  </div>
                ))}
              </div>

              {/* QR Code */}
              {qrCode && (
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'inline-block', padding: '12px', background: '#fff', border: `2px solid ${BORD}`, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <Image src={qrCode} alt="2FA QR-Code" width={180} height={180} />
                  </div>
                </div>
              )}

              {/* Manual secret */}
              {secret && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: TD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <KeyRound size={11} /> Manueller Schlüssel (falls QR nicht funktioniert)
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1, padding: '10px 14px', background: '#f8fafc', border: `1px solid ${BORD}`, borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', color: TH, letterSpacing: '0.1em', wordBreak: 'break-all' }}>
                      {secret}
                    </div>
                    <button
                      onClick={copySecret}
                      style={{ padding: '10px', borderRadius: '8px', background: copied ? '#f0fdf4' : '#f8fafc', border: `1px solid ${copied ? '#bbf7d0' : BORD}`, color: copied ? '#16a34a' : TS, cursor: 'pointer', fontFamily: F, flexShrink: 0 }}
                      title="Kopieren"
                    >
                      {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Code input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: TH, display: 'block', marginBottom: '8px' }}>
                  6-stelliger Code aus der App
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  style={inp}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#ef4444', marginBottom: '12px' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setStatus('disabled'); setCode(''); setError(''); }}
                  style={{ flex: 1, padding: '11px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', background: '#f1f5f9', border: `1px solid ${BORD}`, color: TS, cursor: 'pointer', fontFamily: F }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={verify}
                  disabled={verifying || code.length !== 6}
                  style={{
                    flex: 2, padding: '11px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                    background: code.length === 6 ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#f1f5f9',
                    border: 'none',
                    color: code.length === 6 ? '#fff' : '#94a3b8',
                    cursor: verifying || code.length !== 6 ? 'not-allowed' : 'pointer',
                    fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {verifying ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Prüfe…</> : '2FA aktivieren'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', fontSize: '13px', color: TS, lineHeight: '1.6' }}>
          <strong style={{ color: TH }}>Wichtig:</strong> Wenn du dein Smartphone verlierst oder die App deinstallierst, benötigst du deinen Wiederherstellungs-Code oder musst den Support kontaktieren. 2FA schützt dein Konto, erfordert aber eine funktionierende Authenticator-App.
        </div>

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
