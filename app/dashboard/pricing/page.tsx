'use client';

import React, { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import {
  PAKETE, GRUNDGEBUEHR_CENT, PREIS_PRO_INSERAT_CENT, paketLohntAb, euro,
} from '../../../lib/preismodell';
import { studioInklusive, PREIS_EXTRA_BILD_CENT, centAlsEuro } from '../../../lib/studioQuota';
import {
  CheckCircle2, X, Zap, Crown, Building2, Sparkles,
  User, ShoppingCart, Loader2, AlertTriangle, ChevronDown,
  ArrowRight, Star, Shield, Clock,
} from 'lucide-react';

const F = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

/* ─── Plan data ─────────────────────────────────────────── */
/*
 * Die Pakete.
 *
 * Preise und Kontingente kommen aus lib/preismodell und lib/studioQuota,
 * damit Startseite, diese Seite und die Rechnung nicht auseinanderlaufen.
 * Genau das war passiert: Hier standen Starter, Basic, Premium, Business
 * und Enterprise mit Betraegen aus dem abgeloesten Abo-Modell.
 *
 * Alle Merkmale sind gegen den Code geprueft. Die alte Fassung warb mit
 * "mobile.de Direktexport", "AutoScout24 Direktexport", "API-Zugang",
 * "White-Label" und "Bis zu 10 Nutzerkonten" — nichts davon existiert.
 * Bei einem kostenpflichtigen Tarif ist das irrefuehrende Werbung nach
 * § 5 UWG, und es ist der Punkt, an dem ein Haendler sein Geld
 * zurueckverlangt.
 */
const PLANS = [
  {
    id: 'kein',
    name: 'Ohne Paket',
    monthlyPrice: GRUNDGEBUEHR_CENT / 100,
    yearlyPrice: GRUNDGEBUEHR_CENT / 100,
    listings: `+ ${euro(PREIS_PRO_INSERAT_CENT)} €`,
    listingsSub: 'je Inserat',
    desc: 'Grundgebühr plus Einzelpreis. Passend bei wenigen Fahrzeugen.',
    icon: Sparkles,
    color: '#334155',
    bg: '#f8fafc',
    features: [
      'Fahrzeugschein-Scan',
      'Geführte Aufnahme mit Silhouette',
      'Titel und Beschreibung aus den Fahrzeugdaten',
      'PDF-Datenblatt und Fotopaket',
    ],
    missing: ['Eigener Showroom als Hintergrund', 'Firmen-Wasserzeichen'],
    popular: false,
    contact: false,
  },
  ...PAKETE.map((p, i) => ({
    id: p.id,
    name: p.name,
    monthlyPrice: p.preisCent / 100,
    yearlyPrice: p.preisCent / 100,
    listings: `${p.inserate} Inserate`,
    listingsSub: 'im Monat enthalten',
    desc: [
      'Für Händler mit regelmäßigem Verkauf.',
      'Für aktive Gebrauchtwagenhändler.',
      'Für Autohäuser mit großem Bestand.',
    ][i],
    icon: [Zap, Crown, Building2][i],
    color: ['#3b82f6', '#7c3aed', '#d97706'][i],
    bg: ['#eff6ff', '#f5f3ff', '#fffbeb'][i],
    features: [
      i === 0 ? 'Alles aus "Ohne Paket"' : `Alles aus ${PAKETE[i - 1].name}`,
      'Eigener Showroom als Hintergrund',
      ...(i >= 1 ? ['Firmen-Wasserzeichen', 'Statistiken zu deinen Inseraten'] : []),
      `Darüber ${euro(PREIS_PRO_INSERAT_CENT)} € je weiteres Inserat`,
    ],
    missing: [],
    popular: i === 1,
    contact: false,
  })),
];

const FAQS = [
  { q: 'Was kostet ein Inserat ohne Paket?', a: `${euro(GRUNDGEBUEHR_CENT)} € Grundgebühr im Monat plus ${euro(PREIS_PRO_INSERAT_CENT)} € je Inserat. Ab ${paketLohntAb('s')} Inseraten im Monat ist Paket S günstiger, ab ${paketLohntAb('m')} Paket M, ab ${paketLohntAb('l')} Paket L.` },
  { q: 'Was passiert über dem Kontingent?', a: `Es läuft mit ${euro(PREIS_PRO_INSERAT_CENT)} € je Inserat weiter — nichts wird blockiert. Sobald sich das nächstgrößere Paket lohnt, weisen wir dich darauf hin.` },
  { q: 'Was sind Studio-Bilder?', a: `Fotos, die freigestellt und vor einen Studio-Hintergrund gesetzt werden. Das brauchen nur die Außenansichten — Cockpit, Motorraum oder Serviceheft lädst du normal hoch, die zählen nicht aufs Kontingent und kosten nichts. Zusätzliche Studio-Bilder kosten ${PREIS_EXTRA_BILD_CENT} Cent.` },
  { q: 'Unterschied Privatperson und Händler?', a: 'Als Privatperson zahlst du 4,99 € pro Inserat — einmalig, kein Abo. Für ein bis zwei Verkäufe im Jahr ist das richtig. Wer regelmäßig verkauft, fährt mit Grundgebühr oder Paket günstiger.' },
  { q: 'Wie lange gilt ein Inserat-Credit?', a: 'Gekaufte Credits verfallen nicht. Du kannst sie jederzeit einlösen, auch Monate später.' },
  { q: 'Kann ich jederzeit kündigen?', a: 'Ja — monatliche Kündigung zum Ende des Abrechnungszeitraums. Keine Mindestlaufzeit.' },
  { q: 'Stellt ihr direkt auf mobile.de ein?', a: 'Noch nicht. Du lädst Fotopaket und Text herunter und stellst damit selbst ein. Die direkte Übertragung ist in Vorbereitung — wir bewerben sie erst, wenn sie läuft.' },
];

/* ─── Bilder-Rechner ─────────────────────────────────────── */

/**
 * Wie viele Studio-Bilder brauche ich, und was kostet das extra?
 *
 * Die Zahl der enthaltenen Bilder stand bisher nur als Zeile in der
 * Merkmalsliste. Wer mehr braucht — und bei einem teuren Fahrzeug
 * braucht man mehr —, konnte nicht sehen, was ihn das kostet. Er musste
 * es aus zwei Angaben auf verschiedenen Seiten selbst zusammenrechnen.
 *
 * Hier stellt er die Zahl direkt ein und sieht den Aufschlag sofort.
 * Der Regler kauft nichts: Zusatzbilder werden nach Verbrauch
 * abgerechnet, nicht im Voraus gebucht. Er beantwortet nur die Frage,
 * die vor dem Buchen im Kopf steht.
 */
function BilderRechner({ inklusive, farbe }: { inklusive: number; farbe: string }) {
  const [anzahl, setAnzahl] = useState(inklusive);
  const extra = Math.max(0, anzahl - inklusive);
  const extraCent = extra * PREIS_EXTRA_BILD_CENT;

  const knopf = (zeichen: string, beiKlick: () => void, aus: boolean) => (
    <button type="button" onClick={beiKlick} disabled={aus}
      style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        border: `1px solid ${aus ? '#e2e8f0' : '#cbd5e1'}`,
        background: '#fff', cursor: aus ? 'default' : 'pointer',
        color: aus ? '#475569' : '#334155',
        fontSize: 16, fontWeight: 700, lineHeight: 1, fontFamily: F,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{zeichen}</button>
  );

  return (
    <div style={{
      marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9',
    }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
        Studio-Bilder je Inserat
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/*
          Unter das Inklusivkontingent kann man nicht: Weniger zu waehlen
          spart nichts, es ist ja bezahlt. Ein Regler, der nach unten geht
          ohne etwas zu bewirken, verspricht eine Ersparnis, die es nicht
          gibt.
        */}
        {knopf('−', () => setAnzahl(a => Math.max(inklusive, a - 1)), anzahl <= inklusive)}
        <span style={{
          minWidth: 34, textAlign: 'center', fontSize: 19, fontWeight: 800,
          color: '#0f172a', fontVariantNumeric: 'tabular-nums',
        }}>{anzahl}</span>
        {knopf('+', () => setAnzahl(a => Math.min(60, a + 1)), anzahl >= 60)}

        <span style={{ marginLeft: 'auto', textAlign: 'right', lineHeight: 1.35 }}>
          {extra > 0 ? (
            <>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: farbe }}>
                + {centAlsEuro(extraCent)}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: '#475569' }}>
                je Inserat
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#475569' }}>alles enthalten</span>
          )}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: '#475569', marginTop: 7 }}>
        {inklusive} enthalten · jedes weitere {PREIS_EXTRA_BILD_CENT} Cent
      </div>
    </div>
  );
}

/* ─── Plan Card ─────────────────────────────────────────── */
function PlanCard({
  plan, billing, currentPlan, onCheckout, compact = false,
}: {
  plan: typeof PLANS[0];
  billing: 'monthly' | 'yearly';
  currentPlan: string;
  onCheckout: (planId: string) => void;
  compact?: boolean;
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

      <div style={{ padding: compact ? '18px 16px' : '28px', flex: 1, display: 'flex', flexDirection: 'column' }}>

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
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600', marginTop: '2px' }}>{plan.listings} {plan.listingsSub}</div>
          </div>
        </div>

        {/* Preis */}
        <div style={{ marginBottom: '24px' }}>
          {price === null ? (
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-1px', lineHeight: 1 }}>Auf Anfrage</div>
          ) : price === 0 ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
              <span style={{ fontSize: compact ? '38px' : '48px', fontWeight: '900', color: '#0f172a', letterSpacing: '-3px', lineHeight: 1 }}>0</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#475569' }}>€</span>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span style={{ fontSize: compact ? '38px' : '48px', fontWeight: '900', color: '#0f172a', letterSpacing: '-3px', lineHeight: 1 }}>{price % 1 === 0 ? price : price.toFixed(0)}</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#475569' }}>€<span style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>/Mo.</span></span>
              </div>
              {billing === 'yearly' && savedPct > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#16a34a', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', marginTop: '8px' }}>
                  {savedPct}% gespart
                </div>
              )}
            </div>
          )}
          <p style={{ fontSize: '13px', color: '#475569', margin: '10px 0 0', lineHeight: 1.6 }}>{plan.desc}</p>
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
              border: '1.5px dashed #e2e8f0', color: '#475569',
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
              Zahlungspflichtig bestellen <ArrowRight size={14} />
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
              <span style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Steht unter den Merkmalen, nicht dazwischen: Es ist eine Rechnung, keine Eigenschaft. */}
        <BilderRechner inklusive={studioInklusive(plan.id === 'kein' ? null : (plan.id as 's' | 'm' | 'l'))} farbe={plan.color} />
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
  const [isMobile, setIsMobile]     = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: isMobile ? '20px 16px 100px' : '32px 24px 80px' }}>

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
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '28px' : '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#4f46e5', fontSize: '11px', fontWeight: '700', padding: '5px 14px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px' }}>
            <Sparkles size={11} /> Preise
          </div>
          <h1 style={{ fontSize: isMobile ? '24px' : '36px', fontWeight: '900', margin: '0 0 10px', letterSpacing: '-1px', color: '#0f172a', lineHeight: 1.1 }}>
            Transparent. Fair. Ohne Abo-Fallen.
          </h1>
          <p style={{ color: '#334155', fontSize: '15px', margin: '0 0 32px', lineHeight: 1.6 }}>
            Privatperson oder Händler — du zahlst nur was du brauchst.
          </p>

          {/* Trust badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
            {[
              { icon: Shield, text: 'Sichere Zahlung via Stripe' },
              { icon: Clock, text: 'Jederzeit kündbar' },
              { icon: CheckCircle2, text: 'Keine Mindestlaufzeit' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155', fontWeight: '600' }}>
                <Icon size={13} color="#10b981" /> {text}
              </div>
            ))}
          </div>

          {/*
            Hier stand ein Umschalter Monatlich/Jaehrlich mit dem Hinweis
            "BIS -20%". Im Paketmodell gibt es keinen Jahrespreis — der
            Rabatt haette nie gegriffen, der Umschalter haette denselben
            Betrag zweimal gezeigt. Ein Rabattversprechen, das die Seite
            selbst nicht einloest, faellt beim ersten Klick auf.
          */}
        </div>

        {/* ── Privatperson Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)',
          borderRadius: '20px',
          padding: isMobile ? '24px 20px' : '32px 36px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
          gap: isMobile ? '20px' : '32px',
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
          <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.2)', minWidth: isMobile ? 'unset' : '260px', position: 'relative' }}>
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

            {/* Bestelluebersicht — Pflicht direkt vor dem Bestellbutton (§ 312j Abs. 2 BGB) */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '10px 0', marginBottom: '10px',
              borderTop: '1px solid rgba(255,255,255,0.2)',
            }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                {buyQty === 1 ? '1 Inserat-Credit' : `${buyQty} Inserat-Credits`}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>
                {totalPrice} €
              </span>
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
                : <><ShoppingCart size={15} /> Zahlungspflichtig bestellen</>
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
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
            Händler & Unternehmen — Monats-Abos
          </span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* ── Plan Grid ── */}
        {isMobile && (
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.05em' }}>
            ← Wischen zum Vergleichen →
          </div>
        )}
        {isMobile ? (
          /* Mobile: horizontales Swipe-Karussell */
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
            gap: '12px',
            padding: '4px 0 20px',
            marginBottom: '12px',
            scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
          }}>
            {PLANS.map(plan => (
              <div key={plan.id} style={{ flex: '0 0 82vw', maxWidth: '320px', scrollSnapAlign: 'center' }}>
                <PlanCard plan={plan} billing={billing} currentPlan={currentPlan} onCheckout={checkoutLoading ? () => {} : handleCheckout} compact />
              </div>
            ))}
          </div>
        ) : (
          /*
           * Alle vier nebeneinander.
           *
           * Vorher waren es fuenf Plaene in zwei Reihen zu 3 und 2. Mit
           * vieren haette die zweite Reihe eine einzelne Karte enthalten,
           * mittig und doppelt so breit wie die anderen — das liest sich
           * wie ein Fehler, nicht wie ein Angebot.
           */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '48px' }}>
            {PLANS.map(plan => (
              <PlanCard key={plan.id} plan={plan} billing={billing} currentPlan={currentPlan} onCheckout={checkoutLoading ? () => {} : handleCheckout} />
            ))}
          </div>
        )}

        {/* ── Vergleich Tabelle ── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', marginBottom: '48px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>Plan-Vergleich</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: '700', color: '#334155', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', width: '30%' }}>Feature</th>
                  {['Privat', 'Ohne Paket', 'Paket S', 'Paket M', 'Paket L'].map(n => (
                    <th key={n} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: n === 'Paket M' ? '#7c3aed' : '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/*
                  * Nur Zeilen, die es wirklich gibt.
                  *
                  * Hier standen "mobile.de Export", "AutoScout24 Export",
                  * "API-Zugang" und "White-Label" mit gruenem Haken. Keines
                  * davon existiert — der Direktexport ist in Vorbereitung,
                  * die anderen beiden gar nicht. Ein Haken in einer
                  * Vergleichstabelle ist eine Zusage.
                  */}
                {[
                  ['Inserate', '1 / Credit', `+ ${euro(PREIS_PRO_INSERAT_CENT)} € je Stück`, `${PAKETE[0].inserate} / Monat`, `${PAKETE[1].inserate} / Monat`, `${PAKETE[2].inserate} / Monat`],
                  ['Studio-Bilder je Inserat', String(studioInklusive(null)), String(studioInklusive(null)), String(studioInklusive('s')), String(studioInklusive('m')), String(studioInklusive('l'))],
                  ['Fotos je Inserat gesamt', '20', '20', '30', '45', '60'],
                  ['Fahrzeugschein-Scan', true, true, true, true, true],
                  ['Ausstattung aus Fotos erkennen', true, true, true, true, true],
                  ['Titel und Beschreibung', true, true, true, true, true],
                  ['Geführte Aufnahme', true, true, true, true, true],
                  ['EnVKV-Pflichtangaben', true, true, true, true, true],
                  ['PDF und Fotopaket', true, true, true, true, true],
                  ['Studio-Hintergründe', 'Alle', 'Alle', 'Alle', 'Alle', 'Alle'],
                  ['Eigener Showroom als Hintergrund', false, false, true, true, true],
                  ['Firmen-Wasserzeichen', false, false, false, true, true],
                  ['Statistiken', false, false, false, true, true],
                  ['Direktexport mobile.de', 'in Vorbereitung', 'in Vorbereitung', 'in Vorbereitung', 'in Vorbereitung', 'in Vorbereitung'],
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
                  <div style={{ padding: '0 18px 15px', fontSize: '13px', color: '#334155', lineHeight: 1.7, borderTop: '1px solid #f1f5f9' }}>
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
              background: '#4f46e5', color: '#fff', padding: '13px 28px',
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
