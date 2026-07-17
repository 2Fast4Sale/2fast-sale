'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Crown, CheckCircle2, ArrowLeft, Loader2, Zap,
  RefreshCw, AlertCircle, Check, X, Star, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase/client';

const F    = '"Inter", -apple-system, sans-serif';
const BG   = '#f0f2f5';
const CARD = '#ffffff';
const BORD = '#e2e8f0';
const TH   = '#0f172a';
const TS   = '#64748b';
const TD   = '#94a3b8';

interface Plan {
  id: string; label: string; color: string;
  monthlyPrice: number; yearlyPrice: number;
  monthlyLimit: number; features: string[];
  notFeatures?: string[]; popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free', label: 'Starter', color: '#64748b',
    monthlyPrice: 0, yearlyPrice: 0, monthlyLimit: 3,
    features: ['3 Inserate (einmalig)', 'KI Studio-Fotos', 'Dokumentenscan', 'PDF Export'],
    notFeatures: ['KI-Beschreibungen', 'Studio-Hintergründe', 'Wasserzeichen', 'mobile.de & AutoScout24'],
  },
  {
    id: 'basic', label: 'Basic', color: '#6366f1',
    monthlyPrice: 29, yearlyPrice: 290, monthlyLimit: 30,
    features: ['30 Inserate / Monat', 'KI Studio-Fotos', 'KI-Beschreibungen', 'Studio-Hintergründe', 'PDF + ZIP Export', '7 Tage gratis testen'],
    notFeatures: ['Wasserzeichen', 'mobile.de & AutoScout24'],
  },
  {
    id: 'premium', label: 'Premium', color: '#8b5cf6',
    monthlyPrice: 79, yearlyPrice: 790, monthlyLimit: 150,
    popular: true,
    features: ['150 Inserate / Monat', 'Alles aus Basic', 'Firmen-Wasserzeichen', 'Eigener Showroom', 'mobile.de & AutoScout24', 'Prioritäts-Support', '7 Tage gratis testen'],
  },
  {
    id: 'business', label: 'Business', color: '#f59e0b',
    monthlyPrice: 199, yearlyPrice: 1990, monthlyLimit: 550,
    features: ['550 Inserate / Monat', 'Alles aus Premium', 'Team-Accounts (bis 5)', 'API-Zugang', 'Dedizierter Support', '7 Tage gratis testen'],
  },
];

const PLAN_ORDER = ['free', 'basic', 'premium', 'business'];

function AboInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [plan,        setPlan]       = useState('free');
  const [email,       setEmail]      = useState('');
  const [monthCount,  setMonthCount] = useState(0);
  const [totalCount,  setTotalCount] = useState(0);
  const [loading,     setLoading]    = useState(true);
  const [billing,     setBilling]    = useState<'monthly' | 'yearly'>('monthly');
  const [upgrading,   setUpgrading]  = useState('');
  const [cancelling,  setCancelling] = useState(false);
  const [cancelDone,  setCancelDone] = useState(false);
  const [toast,       setToast]      = useState('');
  const [subId,       setSubId]      = useState('');
  const [planExpires, setPlanExpires] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }, []);

  useEffect(() => {
    const upgraded  = searchParams.get('upgraded');
    const cancelled = searchParams.get('cancelled');
    if (upgraded)  showToast(`🎉 Plan "${upgraded}" aktiviert! Viel Erfolg!`);
    if (cancelled) showToast('Upgrade abgebrochen. Kein Geld wurde abgebucht.');
  }, [searchParams, showToast]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      setEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles').select('plan, stripe_subscription_id, plan_expires_at')
        .eq('id', user.id).single();

      setPlan(profile?.plan || 'free');
      setSubId(profile?.stripe_subscription_id || '');
      if (profile?.plan_expires_at) {
        setPlanExpires(new Date(profile.plan_expires_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }));
      }

      const now = new Date();
      const { count: total } = await supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: monthly } = await supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfMonth);

      setTotalCount(total || 0);
      setMonthCount(monthly || 0);
      setLoading(false);
    });
  }, [router]);

  const upgrade = async (targetPlan: string) => {
    if (targetPlan === plan || upgrading) return;
    setUpgrading(targetPlan);
    try {
      const res  = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: targetPlan, billing }) });
      const data = await res.json();
      if (data.error) { showToast('Fehler: ' + data.error); setUpgrading(''); return; }
      if (data.url)   window.location.href = data.url;
    } catch {
      showToast('Netzwerkfehler. Bitte erneut versuchen.');
      setUpgrading('');
    }
  };

  const cancelSubscription = async () => {
    if (!window.confirm('Abo wirklich zum Periodenende kündigen?')) return;
    setCancelling(true);
    const res  = await fetch('/api/stripe/cancel', { method: 'POST' });
    const data = await res.json();
    setCancelling(false);
    if (data.error) { showToast('Fehler: ' + data.error); return; }
    setCancelDone(true);
    showToast('Kündigung bestätigt. Du behältst alle Features bis zum Enddatum.');
  };

  const openPortal = async () => {
    setUpgrading('portal');
    const res  = await fetch('/api/billing/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json();
    setUpgrading('');
    if (data.url)   window.location.href = data.url;
    else showToast('Fehler: ' + data.error);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
      <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const currentPlanDef = PLANS.find(p => p.id === plan) || PLANS[0];
  const limit          = currentPlanDef.monthlyLimit;
  const pct            = limit >= 9999 ? 5 : Math.min(100, (monthCount / limit) * 100);
  const isNearLimit    = pct >= 80;
  const isAtLimit      = monthCount >= limit;
  const currentIdx     = PLAN_ORDER.indexOf(plan);

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TH }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: TH, color: '#fff', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxWidth: '90vw', textAlign: 'center' }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <Link href="/dashboard/settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: CARD, border: `1px solid ${BORD}`, color: TS, textDecoration: 'none' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Mein Abo</h1>
            <p style={{ margin: 0, color: TS, fontSize: '14px' }}>{email}</p>
          </div>
        </div>

        {/* Current Plan Card */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: TD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Aktueller Plan</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Crown size={20} color={currentPlanDef.color} />
                <span style={{ fontSize: '22px', fontWeight: '800', color: TH, letterSpacing: '-0.5px' }}>{currentPlanDef.label}</span>
                {plan !== 'free' && <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: '#f0fdf4', color: '#16a34a' }}>Aktiv</span>}
              </div>
            </div>
            {plan !== 'free' && planExpires && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: TD, marginBottom: '2px' }}>{cancelDone ? 'Endet am' : 'Verlängert sich am'}</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: TS, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RefreshCw size={12} /> {planExpires}
                </div>
              </div>
            )}
          </div>

          {/* Usage bar */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : TH }}>
                {monthCount} / {limit >= 9999 ? '∞' : limit} Inserate diesen Monat
              </span>
              <span style={{ fontSize: '12px', color: TD }}>{totalCount} gesamt</span>
            </div>
            <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : currentPlanDef.color, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          {isAtLimit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
              <AlertCircle size={14} /> Limit erreicht — upgrade für mehr Inserate
            </div>
          )}
          {isNearLimit && !isAtLimit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '13px', color: '#92400e', fontWeight: '600' }}>
              <AlertCircle size={14} /> Fast aufgebraucht — noch {limit - monthCount} Inserate übrig
            </div>
          )}

          {plan !== 'free' && subId && !cancelDone && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${BORD}` }}>
              <button onClick={cancelSubscription} disabled={cancelling}
                style={{ fontSize: '13px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
                {cancelling ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={13} />}
                Abo kündigen (zum Periodenende)
              </button>
            </div>
          )}
          {cancelDone && (
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13px', color: '#16a34a' }}>
              <CheckCircle2 size={14} /> Kündigung bestätigt. Features bis Enddatum verfügbar.
            </div>
          )}
        </div>

        {/* Billing Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', background: CARD, border: `1px solid ${BORD}`, borderRadius: '10px', padding: '3px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {(['monthly', 'yearly'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)}
                style={{ padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', background: billing === b ? '#6366f1' : 'none', color: billing === b ? '#fff' : TS, border: 'none', cursor: 'pointer', fontFamily: F, transition: 'all 0.15s' }}>
                {b === 'monthly' ? 'Monatlich' : 'Jährlich'}
              </button>
            ))}
          </div>
          {billing === 'yearly' && (
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px' }}>
              2 Monate gratis
            </span>
          )}
        </div>

        {/* Plan Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {PLANS.map(p => {
            const isCurrent  = p.id === plan;
            const isUpgrade  = PLAN_ORDER.indexOf(p.id) > currentIdx;
            const price      = billing === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
            return (
              <div key={p.id} style={{
                background: CARD,
                border: isCurrent ? `2px solid ${p.color}` : p.popular ? `1.5px solid ${p.color}40` : `1px solid ${BORD}`,
                borderRadius: '16px', padding: '18px', position: 'relative',
                boxShadow: isCurrent ? `0 0 0 3px ${p.color}12` : p.popular ? '0 4px 20px rgba(139,92,246,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex', flexDirection: 'column',
              }}>
                {p.popular && !isCurrent && (
                  <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    <Star size={8} style={{ marginRight: '3px', display: 'inline' }} />Beliebt
                  </div>
                )}
                {isCurrent && (
                  <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    <Check size={8} style={{ marginRight: '3px', display: 'inline' }} />Aktuell
                  </div>
                )}

                <div style={{ fontSize: '11px', fontWeight: '700', color: p.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{p.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '4px' }}>
                  {price === 0
                    ? <span style={{ fontSize: '22px', fontWeight: '800', color: TH }}>Gratis</span>
                    : <><span style={{ fontSize: '22px', fontWeight: '800', color: TH }}>€{price}</span><span style={{ fontSize: '11px', color: TD }}>/{billing === 'yearly' ? 'Jahr' : 'Mo.'}</span></>
                  }
                </div>
                {billing === 'yearly' && price > 0 && (
                  <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', marginBottom: '8px' }}>≈ €{Math.round(price / 12)}/Monat</div>
                )}
                <div style={{ fontSize: '12px', color: TS, marginBottom: '10px', fontWeight: '600' }}>
                  {p.monthlyLimit >= 9999 ? '∞ Inserate' : `${p.monthlyLimit}/Monat`}
                </div>

                <div style={{ flex: 1, marginBottom: '12px' }}>
                  {p.features.slice(0, 4).map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px', fontSize: '11px', color: TH }}>
                      <Check size={11} color={p.color} style={{ marginTop: '1px', flexShrink: 0 }} />{f}
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <div style={{ padding: '8px', borderRadius: '9px', textAlign: 'center', background: `${p.color}10`, color: p.color, fontSize: '12px', fontWeight: '700' }}>✓ Aktuell</div>
                ) : isUpgrade ? (
                  <button onClick={() => upgrade(p.id)} disabled={!!upgrading}
                    style={{ padding: '8px', borderRadius: '9px', fontSize: '12px', fontWeight: '700', background: p.color, color: '#fff', border: 'none', cursor: upgrading === p.id ? 'not-allowed' : 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', opacity: upgrading && upgrading !== p.id ? 0.5 : 1 }}>
                    {upgrading === p.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <><Zap size={12} />Upgrade</>}
                  </button>
                ) : (
                  <button onClick={openPortal} disabled={!!upgrading}
                    style={{ padding: '8px', borderRadius: '9px', fontSize: '12px', fontWeight: '700', background: '#f1f5f9', border: `1px solid ${BORD}`, color: TS, cursor: 'pointer', fontFamily: F }}>
                    Wechseln
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Stripe Portal */}
        {plan !== 'free' && (
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: TH }}>Stripe Kundenportal</div>
              <div style={{ fontSize: '12px', color: TS }}>Zahlungsmethode & Rechnungen direkt verwalten</div>
            </div>
            <button onClick={openPortal} disabled={upgrading === 'portal'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: '#f8fafc', border: `1px solid ${BORD}`, color: TS, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: F }}>
              {upgrading === 'portal' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={13} />}
              Öffnen
            </button>
          </div>
        )}

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function AboPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <AboInner />
    </Suspense>
  );
}
