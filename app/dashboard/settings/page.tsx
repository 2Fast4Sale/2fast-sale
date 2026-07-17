'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2, Key, Shield, ChevronRight, Crown, Receipt,
  Loader2, Trash2, User, LogOut, CheckCircle2, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

const F    = '"Inter", -apple-system, sans-serif';
const BG   = '#f0f2f5';
const CARD = '#ffffff';
const BORD = '#e2e8f0';
const TH   = '#0f172a';
const TS   = '#64748b';

const PLAN_META: Record<string, { label: string; color: string; bg: string }> = {
  free:       { label: 'Starter',    color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
  basic:      { label: 'Basic',      color: '#6366f1', bg: 'rgba(99,102,241,0.08)'  },
  premium:    { label: 'Premium',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)'  },
  business:   { label: 'Business',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
  enterprise: { label: 'Enterprise', color: '#ef4444', bg: 'rgba(239,68,68,0.08)'   },
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile,       setProfile]       = useState({ full_name: '', company: '', email: '', plan: 'free' });
  const [loading,       setLoading]       = useState(true);
  const [changingPw,    setChangingPw]    = useState(false);
  const [pwForm,        setPwForm]        = useState({ next: '', confirm: '' });
  const [pwError,       setPwError]       = useState('');
  const [pwSaved,       setPwSaved]       = useState(false);
  const [showPwForm,    setShowPwForm]    = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput,   setDeleteInput]   = useState('');
  const [deleting,      setDeleting]      = useState(false);
  const [loggingOut,    setLoggingOut]    = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      const { data } = await supabase
        .from('profiles')
        .select('full_name, company, plan')
        .eq('id', user.id)
        .single();
      setProfile({
        full_name: data?.full_name || '',
        company:   data?.company   || '',
        email:     user.email      || '',
        plan:      data?.plan      || 'free',
      });
      setLoading(false);
    });
  }, []);

  const changePassword = async () => {
    setPwError('');
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwörter stimmen nicht überein.'); return; }
    if (pwForm.next.length < 8) { setPwError('Mindestens 8 Zeichen erforderlich.'); return; }
    setChangingPw(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    setChangingPw(false);
    if (error) { setPwError(error.message); return; }
    setPwSaved(true);
    setPwForm({ next: '', confirm: '' });
    setShowPwForm(false);
    setTimeout(() => setPwSaved(false), 3000);
  };

  const logout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const deleteAccount = async () => {
    if (deleteInput !== 'LÖSCHEN') return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Fehler: ' + err.error);
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      router.push('/');
    } catch {
      setDeleting(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#f8fafc', border: `1px solid ${BORD}`,
    borderRadius: '10px', padding: '11px 14px',
    color: TH, fontSize: '14px', outline: 'none', fontFamily: F,
    transition: 'border-color 0.15s',
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
      <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const planMeta = PLAN_META[profile.plan] || PLAN_META.free;

  const navSections = [
    {
      title: 'Händler & KI',
      items: [
        { href: '/dashboard/settings/dealer', icon: <Building2 size={18} color="#6366f1" />, iconBg: 'rgba(99,102,241,0.1)', title: 'Händler-Profil', desc: 'Firmenname, Kontaktdaten, Adresse, KI-Einstellungen' },
      ],
    },
    {
      title: 'Abo & Zahlung',
      items: [
        { href: '/dashboard/settings/abo', icon: <Crown size={18} color="#8b5cf6" />, iconBg: 'rgba(139,92,246,0.1)', title: 'Mein Abo', desc: `Plan: ${planMeta.label} — Upgrade, Downgrade & Kündigung`, badge: planMeta.label, badgeColor: planMeta.color, badgeBg: planMeta.bg },
        { href: '/dashboard/settings/billing', icon: <Receipt size={18} color="#f59e0b" />, iconBg: 'rgba(245,158,11,0.1)', title: 'Abrechnung', desc: 'Zahlungsmethoden, Rechnungen, Rechnungsadresse' },
      ],
    },
    {
      title: 'Sicherheit',
      items: [
        { href: '/dashboard/settings/2fa', icon: <Shield size={18} color="#10b981" />, iconBg: 'rgba(16,185,129,0.1)', title: 'Zwei-Faktor-Authentifizierung', desc: 'TOTP Authenticator-App einrichten' },
      ],
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TH }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Einstellungen</h1>
          <p style={{ margin: 0, color: TS, fontSize: '14px' }}>Konto, Abo und Sicherheit verwalten</p>
        </div>

        {/* Profile Card */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={22} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: TH, marginBottom: '2px' }}>
              {profile.full_name || profile.email}
            </div>
            <div style={{ fontSize: '13px', color: TS }}>
              {profile.email}
              {profile.company && <span style={{ color: '#cbd5e1' }}> · {profile.company}</span>}
            </div>
          </div>
          <div style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', background: planMeta.bg, color: planMeta.color, flexShrink: 0 }}>
            {planMeta.label}
          </div>
        </div>

        {/* Nav Sections */}
        {navSections.map(section => (
          <div key={section.title} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px', marginBottom: '6px' }}>
              {section.title}
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {section.items.map((item, idx) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderTop: idx > 0 ? `1px solid ${BORD}` : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: item.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: TH, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.title}
                        {'badge' in item && item.badge && (
                          <span style={{ padding: '1px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', background: item.badgeBg, color: item.badgeColor }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: TS, marginTop: '1px' }}>{item.desc}</div>
                    </div>
                    <ChevronRight size={15} color="#cbd5e1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Password */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px', marginBottom: '6px' }}>Passwort</div>
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={18} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: TH }}>Passwort</div>
                  <div style={{ fontSize: '12px', color: TS }}>Mindestens 8 Zeichen</div>
                </div>
              </div>
              <button
                onClick={() => setShowPwForm(v => !v)}
                style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', background: '#f8fafc', border: `1px solid ${BORD}`, color: TS, cursor: 'pointer', fontFamily: F }}
              >
                {showPwForm ? 'Abbrechen' : 'Ändern'}
              </button>
            </div>

            {pwSaved && (
              <div style={{ margin: '0 18px 14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13px', color: '#16a34a' }}>
                <CheckCircle2 size={14} /> Passwort erfolgreich geändert!
              </div>
            )}

            {showPwForm && (
              <div style={{ borderTop: `1px solid ${BORD}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Neues Passwort</label>
                  <input type="password" style={inp} placeholder="Mindestens 8 Zeichen"
                    value={pwForm.next}
                    onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Bestätigen</label>
                  <input type="password" style={inp} placeholder="Nochmals eingeben"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                </div>
                {pwError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#ef4444' }}>
                    <AlertCircle size={14} /> {pwError}
                  </div>
                )}
                <button
                  onClick={changePassword}
                  disabled={changingPw || !pwForm.next || !pwForm.confirm}
                  style={{ padding: '11px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', background: '#6366f1', border: 'none', color: '#fff', cursor: changingPw || !pwForm.next ? 'not-allowed' : 'pointer', opacity: changingPw || !pwForm.next ? 0.6 : 1, fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {changingPw ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Wird geändert…</> : 'Passwort speichern'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Actions */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px', marginBottom: '6px' }}>Account</div>
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <button
              onClick={logout} disabled={loggingOut}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: F }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(100,116,139,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={18} color="#64748b" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: TH }}>Abmelden</div>
                <div style={{ fontSize: '12px', color: TS }}>Von diesem Gerät abmelden</div>
              </div>
              {loggingOut ? <Loader2 size={15} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} /> : <ChevronRight size={15} color="#cbd5e1" />}
            </button>

            <div style={{ borderTop: `1px solid ${BORD}` }}>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: F }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={18} color="#ef4444" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>Account löschen</div>
                    <div style={{ fontSize: '12px', color: TS }}>Alle Daten dauerhaft entfernen — nicht rückgängig machbar</div>
                  </div>
                  <ChevronRight size={15} color="#fca5a5" />
                </button>
              ) : (
                <div style={{ padding: '16px 18px', background: '#fff5f5' }}>
                  <p style={{ fontSize: '13px', color: '#ef4444', fontWeight: '600', margin: '0 0 8px' }}>⚠ Diese Aktion kann nicht rückgängig gemacht werden.</p>
                  <p style={{ fontSize: '12px', color: TS, margin: '0 0 12px' }}>
                    Tippe <strong style={{ color: TH }}>LÖSCHEN</strong> zur Bestätigung:
                  </p>
                  <input type="text" placeholder="LÖSCHEN" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                    style={{ ...inp, border: '1px solid #fca5a5', marginBottom: '10px' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#f1f5f9', border: `1px solid ${BORD}`, color: TS, fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: F }}>
                      Abbrechen
                    </button>
                    <button onClick={deleteAccount} disabled={deleteInput !== 'LÖSCHEN' || deleting}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', fontFamily: F, border: 'none', background: deleteInput === 'LÖSCHEN' ? '#ef4444' : '#f1f5f9', color: deleteInput === 'LÖSCHEN' ? '#fff' : '#94a3b8', cursor: deleteInput === 'LÖSCHEN' && !deleting ? 'pointer' : 'not-allowed' }}>
                      {deleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#cbd5e1', paddingTop: '8px' }}>
          2Fast4Sale · <a href="/impressum" style={{ color: '#94a3b8', textDecoration: 'none' }}>Impressum</a> · <a href="/datenschutz" style={{ color: '#94a3b8', textDecoration: 'none' }}>Datenschutz</a>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
