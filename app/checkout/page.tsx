'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2, Loader2, ShieldCheck, Lock, ArrowLeft,
  CreditCard, Zap, Crown, Building2, Sparkles, Star, ArrowRight,
} from 'lucide-react';

const F = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const PLAN_DATA: Record<string, {
  name: string; monthlyPrice: number; yearlyPrice: number;
  color: string; gradient: string; listings: string;
  icon: React.ComponentType<{ size: number; color?: string }>;
  features: string[];
}> = {
  basic: {
    name: 'Basic', monthlyPrice: 99.49, yearlyPrice: 79,
    color: '#3b82f6', gradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    listings: '30 Inserate / Monat', icon: Zap,
    features: ['30 Inserate / Monat', 'KI-Dokumentenscan', 'KI-Inseratsbeschreibung', 'KI-Ausstattungserkennung', 'Alle Studio-Hintergründe', 'mobile.de Export', 'AutoScout24 Export', 'E-Mail Support'],
  },
  premium: {
    name: 'Premium', monthlyPrice: 249.99, yearlyPrice: 199,
    color: '#7c3aed', gradient: 'linear-gradient(135deg, #5b21b6, #7c3aed)',
    listings: '150 Inserate / Monat', icon: Crown,
    features: ['150 Inserate / Monat', 'Alles aus Basic', 'Prioritäts-Support (< 24 h)', 'Erweiterte Statistiken', 'Frühzeitiger Feature-Zugang'],
  },
  business: {
    name: 'Business', monthlyPrice: 699.99, yearlyPrice: 559,
    color: '#d97706', gradient: 'linear-gradient(135deg, #b45309, #d97706)',
    listings: '550 Inserate / Monat', icon: Building2,
    features: ['550 Inserate / Monat', 'Alles aus Premium', 'API-Zugang & Webhooks', 'White-Label & eigene Domain', 'Bis zu 10 Nutzerkonten', 'Account Manager & SLA'],
  },
  enterprise: {
    name: 'Enterprise', monthlyPrice: 0, yearlyPrice: 0,
    color: '#0891b2', gradient: 'linear-gradient(135deg, #0e7490, #0891b2)',
    listings: 'Unbegrenzte Inserate', icon: Star,
    features: ['Unbegrenzte Inserate', 'Individuelle API-Integration', 'Eigenes Branding', 'Dedizierter Account Manager', 'SLA Garantie', 'Onboarding & Schulungen'],
  },
  free: {
    name: 'Starter', monthlyPrice: 0, yearlyPrice: 0,
    color: '#64748b', gradient: 'linear-gradient(135deg, #475569, #64748b)',
    listings: '3 Inserate (einmalig)', icon: Sparkles,
    features: ['3 Inserate (einmalig)', 'KI-Dokumentenscan', '2 Studio-Hintergründe', 'PDF Export'],
  },
};

function CheckoutForm() {
  const searchParams = useSearchParams();
  const planKey = searchParams.get('plan') || 'premium';
  const plan = PLAN_DATA[planKey] || PLAN_DATA.premium;
  const Icon = plan.icon;

  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const savedPct = plan.monthlyPrice > 0
    ? Math.round((1 - plan.yearlyPrice / plan.monthlyPrice) * 100) : 0;
  const savedEur = billing === 'yearly' ? (plan.monthlyPrice - plan.yearlyPrice) : 0;

  const handleCheckout = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey, billing, successUrl: `${window.location.origin}/checkout/success`, cancelUrl: window.location.href }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler');
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 480px', fontFamily: F, color: '#0f172a' }}>

      {/* ── LINKS: Plan-Seite (dunkel, branded) ── */}
      <div style={{ background: '#0f172a', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

        {/* Deko-Gradient */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${plan.color}30, transparent)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '300px', background: 'linear-gradient(to top, rgba(15,23,42,1), transparent)', pointerEvents: 'none' }} />

        {/* Top */}
        <div style={{ position: 'relative', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontSize: '18px', fontWeight: '900', color: '#f8fafc', textDecoration: 'none', letterSpacing: '-0.5px' }}>
            2Fast<span style={{ color: plan.color }}>4</span>Sale
          </Link>
          <Link href="/dashboard/pricing" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: '600', transition: 'color 0.15s' }}>
            <ArrowLeft size={13} /> Zurück
          </Link>
        </div>

        {/* Plan-Hero */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 40px 60px' }}>

          {/* Icon + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
            <div style={{ width: '52px', height: '52px', background: `${plan.color}25`, border: `1.5px solid ${plan.color}50`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={24} color={plan.color} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Plan</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.5px' }}>{plan.name}</div>
            </div>
          </div>

          {/* Preis */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '72px', fontWeight: '900', color: '#f8fafc', letterSpacing: '-4px', lineHeight: 1 }}>
                {price % 1 === 0 ? price : price.toFixed(0)}
              </span>
              <div style={{ paddingBottom: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'rgba(255,255,255,0.5)' }}>€</div>
              </div>
              <div style={{ paddingBottom: '14px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', fontWeight: '500', lineHeight: 1.4 }}>pro<br />Monat</div>
              </div>
            </div>
            {billing === 'yearly' && savedEur > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '4px 12px' }}>
                <CheckCircle2 size={12} color="#34d399" />
                <span style={{ fontSize: '12px', color: '#34d399', fontWeight: '700' }}>Du sparst {savedEur.toFixed(0)} € / Monat</span>
              </div>
            )}
          </div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginBottom: '40px' }}>
            {plan.features.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: `${plan.color}20`, border: `1px solid ${plan.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={11} color={plan.color} />
                </div>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', fontWeight: '500', letterSpacing: '-0.1px' }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Trust Zeile */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {[
              { icon: ShieldCheck, text: 'SSL-Verschlüsselt' },
              { icon: Lock,        text: 'Stripe Payments' },
              { icon: CreditCard,  text: 'Jederzeit kündbar' },
            ].map(({ icon: I, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                <I size={12} color="rgba(255,255,255,0.25)" /> {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RECHTS: Bestellformular ── */}
      <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', borderLeft: '1px solid #e2e8f0' }}>

        <div style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Abonnement abschließen</h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Heute kostenlos — danach {price} €/Monat. Jederzeit kündbar.</p>
        </div>

        {/* Billing Toggle */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Abrechnungszeitraum</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['monthly', 'yearly'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                flex: 1, padding: '14px 12px', borderRadius: '12px', border: `2px solid ${billing === b ? plan.color : '#e2e8f0'}`,
                cursor: 'pointer', fontSize: '14px', fontWeight: '700',
                background: billing === b ? `${plan.color}08` : '#fff',
                color: billing === b ? plan.color : '#94a3b8',
                transition: 'all 0.15s', fontFamily: F, textAlign: 'center' as const,
              }}>
                {b === 'monthly' ? 'Monatlich' : (
                  <span style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '3px' }}>
                    <span>Jährlich</span>
                    <span style={{ fontSize: '10px', background: '#dcfce7', color: '#16a34a', padding: '2px 7px', borderRadius: '4px', fontWeight: '800' }}>-{savedPct}%</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bestellübersicht */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{plan.name} · {billing === 'monthly' ? 'Monatlich' : 'Jährlich'}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{plan.listings}</div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{price} €<span style={{ fontSize: '11px', fontWeight: '500', color: '#94a3b8' }}>/Mo.</span></div>
          </div>

          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#64748b' }}>1 Tag gratis (Trial-Rabatt)</span>
            <span style={{ color: '#10b981', fontWeight: '700' }}>−{price} €</span>
          </div>

          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Heute fällig</span>
            <span style={{ fontSize: '22px', fontWeight: '900', color: '#10b981', letterSpacing: '-1px' }}>0,00 €</span>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#dc2626', marginBottom: '16px', fontWeight: '600' }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <button onClick={handleCheckout} disabled={loading} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          background: loading ? '#94a3b8' : plan.gradient,
          color: '#fff', padding: '16px', borderRadius: '14px',
          fontWeight: '800', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px', transition: 'all 0.15s', marginBottom: '16px', fontFamily: F,
          boxShadow: loading ? 'none' : `0 8px 28px ${plan.color}40`,
          boxSizing: 'border-box' as const, letterSpacing: '-0.2px',
        }}>
          {loading
            ? <><Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} /> Weiter zu Stripe…</>
            : <>1 Tag kostenlos starten <ArrowRight size={16} /></>
          }
        </button>

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '28px' }}>
          Mit Klick stimmst du unseren{' '}
          <Link href="/agb" style={{ color: '#64748b', textDecoration: 'underline' }}>AGB</Link>{' '}und der{' '}
          <Link href="/datenschutz" style={{ color: '#64748b', textDecoration: 'underline' }}>Datenschutzerklärung</Link>{' '}zu.
          <br />Keine Zahlung heute · Kündigung jederzeit möglich.
        </div>

        {/* Karten & Stripe */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
            <Lock size={12} color="#94a3b8" />
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>Sichere Zahlung via Stripe</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {['VISA', 'Mastercard', 'AMEX', 'SEPA'].map(c => (
              <div key={c} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em' }}>{c}</div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense><CheckoutForm /></Suspense>;
}
