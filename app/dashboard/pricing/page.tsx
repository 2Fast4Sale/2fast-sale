'use client';

import React, { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import {
  CheckCircle2, X, Zap, Crown, Building2, Sparkles,
  User, ShoppingCart, Loader2, AlertTriangle, ChevronDown,
  ArrowRight, Star, Shield, Clock,
} from 'lucide-react';

const F = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

/* ─── Plan data ─────────────────────────────────────────── */
const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: 0,
    listings: '3 Inserate',
    listingsSub: 'einmalig',
    desc: 'Kostenlos testen — ohne Abo.',
    icon: Sparkles,
    color: '#64748b',
    bg: '#f8fafc',
    features: ['3 Inserate (einmalig)', 'KI-Dokumentenscan', '2 Studio-Hintergründe', 'PDF Export', 'E-Mail Support'],
    missing: ['KI-Inseratsbeschreibung', 'mobile.de & AutoScout24', 'KI-Ausstattungserkennung'],
    popular: false,
    contact: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 99.49,
    yearlyPrice: 79,
    listings: '30 Inserate',
    listingsSub: 'pro Monat',
    desc: 'Für kleine Händler mit regelmäßigem Verkauf.',
    icon: Zap,
    color: '#3b82f6',
    bg: '#eff6ff',
    features: ['30 Inserate / Monat', 'KI-Dokumentenscan', 'KI-Inseratsbeschreibung', 'KI-Ausstattungserkennung (VIN)', 'Alle Studio-Hintergründe', 'mobile.de Direktexport', 'AutoScout24 Direktexport', 'E-Mail Support'],
    missing: [],
    popular: false,
    contact: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 249.99,
    yearlyPrice: 199,
    listings: '150 Inserate',
    listingsSub: 'pro Monat',
    desc: 'Der Standard für aktive Gebrauchtwagenhändler.',
    icon: Crown,
    color: '#7c3aed',
    bg: '#f5f3ff',
    features: ['150 Inserate / Monat', 'Alles aus Basic', 'Prioritäts-Support (< 24 h)', 'Erweiterte Statistiken', 'Frühzeitiger Zugang zu neuen Features'],
    missing: [],
    popular: true,
    contact: false,
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 699.99,
    yearlyPrice: 559,
    listings: '550 Inserate',
    listingsSub: 'pro Monat',
    desc: 'Für Autohäuser und Händlergruppen.',
    icon: Building2,
    color: '#d97706',
    bg: '#fffbeb',
    features: ['550 Inserate / Monat', 'Alles aus Premium', 'API-Zugang & Webhooks', 'White-Label & eigene Domain', 'Bis zu 10 Nutzerkonten', 'Dedizierter Account Manager', 'SLA & Onboarding-Schulung'],
    missing: [],
    popular: false,
    contact: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: -1,
    yearlyPrice: -1,
    listings: 'Unbegrenzt',
    listingsSub: '',
    desc: 'Individuelle Lösung für große Händlernetze.',
    icon: Star,
    color: '#0891b2',
    bg: '#ecfeff',
    features: ['Unbegrenzte Inserate', 'Individuelle API-Integration', 'Eigenes Branding & White-Label', 'Dedizierter Account Manager', 'SLA Garantie', 'Onboarding & Schulungen'],
    missing: [],
    popular: false,
    contact: true,
  },
];

const FAQS = [
  { q: 'Unterschied Privatperson vs. Händler-Abo?', a: 'Als Privatperson zahlst du 4,99 € pro Inserat — einmalig, kein Abo. Ideal für 1–2 Verkäufe im Jahr. Händler mit regelmäßigem Verkauf sparen mit dem Monats-Abo ab 99,49 €.' },
  { q: 'Wie lange gilt ein Inserat-Credit?', a: 'Gekaufte Credits verfallen nicht. Du kannst sie jederzeit einlösen, auch Monate später.' },
  { q: 'Kann ich jederzeit kündigen?', a: 'Ja — monatliche Kündigung zum Ende des Abrechnungszeitraums. Keine Mindestlaufzeit, keine versteckten Gebühren.' },
  { q: 'Was passiert beim Inserate-Limit?', a: 'Du erhältst eine E-Mail und kannst jederzeit upgraden. Bestehende Inserate bleiben vollständig erhalten.' },
  { q: 'Gibt es eine Testphase?', a: 'Der Starter-Plan ist einmalig kostenlos. Abo-Pläne haben 1 Tag kostenlos zum Testen — danach automatische Abrechnung.' },
];

/* ─── Plan Card ─────────────────────────────────────────── */
function PlanCard({
  plan, billing, currentPlan, onCheckout,
}: {
  plan: typeof PLANS[0];
  billing: 'monthly' | 'yearly';
  currentPlan: string;
  onCheckout: (planId: string) => void;
}) {
  const isCurrent = plan.id === currentPlan;
  const price = plan.monthlyPrice === -1 ? null
    : plan.monthlyPrice === 0 ? 0
    : billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const savedPct = plan.monthlyPrice > 0 && plan.yearlyPrice > 0
    ? Math.round((1 - plan.yearlyPrice / plan.monthlyPrice) * 100) : 0;
  const Icon = plan.icon;

  return (
    <div style={{
      background: '#fff',
      border: isCurrent
        ? `2px solid ${plan.color}`
        : plan.popular ? `2px solid ${plan.color}` : '1px solid #e2e8f0',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: plan.popular
        ? `0 12px 40px ${plan.color}20`
        : '0 2px 8px rgba(0,0,0,0.05)',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}>
      {plan.popular && (
        <div style={{
          background: `linear-gradient(90deg, ${plan.color}, ${plan.color}cc)`,
          color: '#fff', padding: '7px 0',
          fontSize: '10px', fontWeight: '800',
          textTransform: 'uppercase', letterSpacing: '0.15em',
          textAlign: 'center',
        }}>
          Beliebteste Wahl
        </div>
      )}
      {isCurrent && !plan.popular && (
        <div style={{
          background: `${plan.color}15`,
          color: plan.color, padding: '7px 0',
          fontSize: '10px', fontWeight: '800',
          textTransform: 'uppercase', letterSpacing: '0.15em',
          textAlign: 'center', borderBottom: `1px solid ${plan.color}25`,
        }}>
          Dein aktueller Plan
        </div>
      )}

      <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: plan.bg, border: `1.5px solid ${plan.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: plan.color, flexShrink: 0,
          }}>
            <Icon size={20} />
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.3px' }}>{plan.name}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginTop: '2px' }}>{plan.listings} {plan.listingsSub}</div>
          </div>
        </div>

        {/* Preis */}
        <div style={{ marginBottom: '24px' }}>
          {price === null ? (
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', letterSpacing: '-1px', lineHeight: 1 }}>Auf Anfrage</div>
          ) : price === 0 ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
              <span style={{ fontSize: '48px', fontWeight: '900', color: '#0f172a', letterSpacing: '-3px', lineHeight: 1 }}>0</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#94a3b8' }}>€</span>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span style={{ fontSize: '48px', fontWeight: '900', color: '#0f172a', letterSpacing: '-3px', lineHeight: 1 }}>{price % 1 === 0 ? price : price.toFixed(0)}</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#94a3b8' }}>€<span style={{ fontSize: '13px', fontWeight: '500', color: '#cbd5e1' }}>/Mo.</span></span>
              </div>
              {billing === 'yearly' && savedPct > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#16a34a', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', marginTop: '8px' }}>
                  {savedPct}% gespart
                </div>
              )}
            </div>
          )}
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '10px 0 0', lineHeight: 1.6 }}>{plan.desc}</p>
        </div>

        {/* CTA */}
        <div style={{ marginBottom: '24px' }}>
          {isCurrent ? (
            <div style={{
              width: '100%', padding: '13px', borderRadius: '12px', textAlign: 'center',
              fontWeight: '700', fontSize: '14px', boxSizing: 'border-box' as const,
              border: `2px solid ${plan.color}35`, background: `${plan.color}08`,
              color: plan.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
              <CheckCircle2 size={15} /> Aktueller Plan
            </div>
          ) : plan.contact ? (
            <a href="mailto:sales@2fast4sale.de" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '13px', borderRadius: '12px', fontWeight: '700', fontSize: '14px',
              background: plan.bg, color: plan.color,
              border: `1.5px solid ${plan.color}35`, textDecoration: 'none',
            }}>
              Kontakt aufnehmen <ArrowRight size={14} />
            </a>
          ) : plan.id === 'free' ? (
            <div style={{
              width: '100%', padding: '13px', borderRadius: '12px', textAlign: 'center',
              fontWeight: '600', fontSize: '14px', boxSizing: 'border-box' as const,
              border: '1.5px dashed #e2e8f0', color: '#94a3b8',
            }}>
              Kostenlos verfügbar
            </div>
          ) : (
            <button onClick={() => onCheckout(plan.id)} style={{
              width: '100%', padding: '13px', borderRadius: '12px', fontWeight: '800', fontSize: '14px',
              background: plan.popular ? plan.color : '#0f172a',
              color: '#fff', border: 'none', cursor: 'pointer', fontFamily: F,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              boxShadow: plan.popular ? `0 6px 20px ${plan.color}40` : '0 3px 10px rgba(0,0,0,0.2)',
              transition: 'all 0.15s',
            }}>
              Jetzt starten <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#f1f5f9', marginBottom: '16px' }} />

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {plan.features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CheckCircle2 size={14} color={plan.color} style={{ flexShrink: 0, marginTop: '2px', opacity: 0.9 }} />
              <span style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
          {plan.missing.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <X size={13} color="#e2e8f0" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────── */
function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noCredits = searchParams.get('reason') === 'no_credits';

  const [billing, setBilling]       = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState('free');
  const [credits, setCredits]       = useState(0);
  const [buyQty, setBuyQty]         = useState(1);
  const [buyLoading, setBuyLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq]       = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('plan, listing_credits').eq('id', user.id).single();
      setCurrentPlan(data?.plan || 'free');
      setCredits(data?.listing_credits ?? 0);
    });
  }, []);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, billing }),
      });
      const { url, error } = await res.json();
      if (error) { alert(error); return; }
      window.location.href = url;
    } catch { alert('Fehler beim Checkout'); }
    finally { setCheckoutLoading(null); }
  };

  const handleBuyCredits = async () => {
    setBuyLoading(true);
    try {
      const res = await fetch('/api/checkout/private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: buyQty }),
      });
      const { url, error } = await res.json();
      if (error) { alert(error); return; }
      window.location.href = url;
    } catch { alert('Fehler beim Checkout'); }
    finally { setBuyLoading(false); }
  };

  const totalPrice = (buyQty * 4.99).toFixed(2).replace('.', ',');

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: F, color: '#0f172a' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* ── No-Credits Banner ── */}
        {noCredits && (
          <div style={{
            background: '#fefce8', border: '1px solid #fde68a', borderRadius: '14px',
            padding: '16px 20px', marginBottom: '28px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: '700', color: '#92400e', fontSize: '14px' }}>Kein Inserat-Credit vorhanden</div>
              <div style={{ color: '#78350f', fontSize: '12px', marginTop: '2px' }}>Kaufe unten einen Credit für 4,99 € oder wähle ein Händler-Abo.</div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#6366f1', fontSize: '11px', fontWeight: '700', padding: '5px 14px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px' }}>
            <Sparkles size={11} /> Preise
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: '900', margin: '0 0 10px', letterSpacing: '-1px', color: '#0f172a', lineHeight: 1.1 }}>
            Transparent. Fair. Ohne Abo-Fallen.
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px', margin: '0 0 32px', lineHeight: 1.6 }}>
            Privatperson oder Händler — du zahlst nur was du brauchst.
          </p>

          {/* Trust badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
            {[
              { icon: Shield, text: 'Sichere Zahlung via Stripe' },
              { icon: Clock, text: 'Jederzeit kündbar' },
              { icon: CheckCircle2, text: 'Keine Mindestlaufzeit' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                <Icon size={13} color="#10b981" /> {text}
              </div>
            ))}
          </div>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4px', gap: '4px' }}>
            {(['monthly', 'yearly'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                background: billing === b ? '#0f172a' : 'transparent',
                color: billing === b ? '#fff' : '#64748b',
                transition: 'all 0.15s', fontFamily: F,
                display: 'flex', alignItems: 'center', gap: '7px',
              }}>
                {b === 'monthly' ? 'Monatlich' : 'Jährlich'}
                {b === 'yearly' && (
                  <span style={{ fontSize: '9px', background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                    BIS −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Privatperson Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)',
          borderRadius: '24px',
          padding: '32px 36px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '32px',
          alignItems: 'center',
          boxShadow: '0 16px 48px rgba(6,95,70,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Deko-Kreise */}
          <div style={{ position: 'absolute', top: '-40px', right: '200px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '120px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff', letterSpacing: '-0.3px' }}>Privatperson</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Kein Abo — nur zahlen wenn du inserierst</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
              <span style={{ fontSize: '52px', fontWeight: '900', color: '#fff', letterSpacing: '-3px', lineHeight: 1 }}>4,99</span>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'rgba(255,255,255,0.8)' }}>€</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '500', whiteSpace: 'nowrap' }}>pro Inserat</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {['Kein Abo', 'KI-Beschreibung inklusive', 'Studio-Fotos', 'Credits verfallen nicht'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: '600', background: 'rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: '20px' }}>
                  <CheckCircle2 size={11} color="#6ee7b7" /> {f}
                </div>
              ))}
            </div>
          </div>

          {/* Kauf-Box */}
          <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.2)', minWidth: '260px', position: 'relative' }}>
            {credits > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{credits}</div>
                <div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: '700' }}>{credits === 1 ? 'Credit' : 'Credits'} vorhanden</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>verfallen nicht</div>
                </div>
              </div>
            )}

            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Anzahl wählen
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
              <button onClick={() => setBuyQty(q => Math.max(1, q - 1))} style={{ width: '44px', height: '44px', border: 'none', cursor: 'pointer', background: 'transparent', fontSize: '20px', color: '#fff', fontWeight: '700', fontFamily: F, flexShrink: 0 }}>−</button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: '900', color: '#fff' }}>{buyQty}</div>
              <button onClick={() => setBuyQty(q => Math.min(20, q + 1))} style={{ width: '44px', height: '44px', border: 'none', cursor: 'pointer', background: 'transparent', fontSize: '20px', color: '#fff', fontWeight: '700', fontFamily: F, flexShrink: 0 }}>+</button>
            </div>

            <button onClick={handleBuyCredits} disabled={buyLoading} style={{
              width: '100%', padding: '13px', borderRadius: '10px',
              background: buyLoading ? 'rgba(255,255,255,0.3)' : '#fff',
              color: buyLoading ? 'rgba(255,255,255,0.7)' : '#065f46',
              fontWeight: '800', fontSize: '14px', border: 'none',
              cursor: buyLoading ? 'not-allowed' : 'pointer', fontFamily: F,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)', transition: 'all 0.15s',
              boxSizing: 'border-box',
            }}>
              {buyLoading
                ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Lädt…</>
                : <><ShoppingCart size={15} /> {buyQty === 1 ? '1 Inserat' : `${buyQty} Inserate`} kaufen — {totalPrice} €</>
              }
            </button>

            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '8px' }}>
              Einmalzahlung · Sicher via Stripe
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '32px 0 24px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
            Händler & Unternehmen — Monats-Abos
          </span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* ── Plan Grid — Reihe 1: Starter, Basic, Premium ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          {PLANS.slice(0, 3).map(plan => (
            <PlanCard key={plan.id} plan={plan} billing={billing} currentPlan={currentPlan} onCheckout={checkoutLoading ? () => {} : handleCheckout} />
          ))}
        </div>

        {/* ── Plan Grid — Reihe 2: Business, Enterprise ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '780px', margin: '0 auto 48px' }}>
          {PLANS.slice(3).map(plan => (
            <PlanCard key={plan.id} plan={plan} billing={billing} currentPlan={currentPlan} onCheckout={checkoutLoading ? () => {} : handleCheckout} />
          ))}
        </div>

        {/* ── Vergleich Tabelle ── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', marginBottom: '48px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>Plan-Vergleich</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', width: '30%' }}>Feature</th>
                  {['Privat', 'Starter', 'Basic', 'Premium', 'Business'].map(n => (
                    <th key={n} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: n === 'Premium' ? '#7c3aed' : '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Inserate', '1 / Credit', '3 einmalig', '30 / Monat', '150 / Monat', '550 / Monat'],
                  ['KI-Dokumentenscan', true, true, true, true, true],
                  ['KI-Inseratsbeschreibung', true, false, true, true, true],
                  ['KI-Ausstattungserkennung', true, false, true, true, true],
                  ['Studio-Hintergründe', '1', '2', 'Alle', 'Alle', 'Alle + Custom'],
                  ['mobile.de Export', true, false, true, true, true],
                  ['AutoScout24 Export', true, false, true, true, true],
                  ['API-Zugang', false, false, false, false, true],
                  ['White-Label', false, false, false, false, true],
                ].map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '11px 20px', fontWeight: '600', color: '#374151' }}>{row[0] as string}</td>
                    {row.slice(1).map((val, j) => (
                      <td key={j} style={{ padding: '11px 16px', textAlign: 'center' }}>
                        {val === true ? <CheckCircle2 size={14} color="#10b981" style={{ margin: '0 auto' }} />
                          : val === false ? <X size={13} color="#e2e8f0" style={{ margin: '0 auto' }} />
                          : <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>{val}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ maxWidth: '680px', margin: '0 auto 48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', textAlign: 'center', margin: '0 0 24px', letterSpacing: '-0.5px' }}>Häufige Fragen</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '15px 18px', background: 'none', border: 'none', color: '#0f172a',
                  cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: '700', fontFamily: F, gap: '16px',
                }}>
                  {faq.q}
                  <ChevronDown size={15} color="#94a3b8" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 18px 15px', fontSize: '13px', color: '#64748b', lineHeight: 1.7, borderTop: '1px solid #f1f5f9' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA Bottom ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          borderRadius: '20px', padding: '40px',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#fff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Fragen zum richtigen Plan?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>
              Unser Team hilft dir bei der Wahl — kostenlos und unverbindlich.
            </p>
            <a href="mailto:support@2fast4sale.de" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#6366f1', color: '#fff', padding: '13px 28px',
              borderRadius: '10px', fontWeight: '700', textDecoration: 'none',
              fontSize: '14px', boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            }}>
              Kontakt aufnehmen <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}
