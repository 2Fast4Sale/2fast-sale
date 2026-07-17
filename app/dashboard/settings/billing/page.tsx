'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, MapPin, FileText, Download, CheckCircle2,
  Loader2, Edit3, Save, X, AlertCircle, Building2,
  User, Mail, Phone, Globe, Receipt, Shield,
  Clock, ExternalLink, Plus, Star, Trash2, RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { createClient } from '../../../../lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/* ── Design tokens ── */
const F    = '"Inter", -apple-system, sans-serif';
const BG   = '#f0f2f5';
const CARD = '#ffffff';
const BORD = '#e2e8f0';
const TH   = '#0f172a';
const TS   = '#64748b';
const TD   = '#94a3b8';
const INP: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#f8fafc', border: `1px solid ${BORD}`, borderRadius: '9px', padding: '11px 14px', color: '#0f172a', fontSize: '14px', fontFamily: F, outline: 'none', transition: 'border-color 0.2s' };

/* ── Types ── */
interface BillingAddress { company: string; name: string; street: string; zip: string; city: string; country: string; email: string; phone: string; vat: string; }
interface PaymentMethod  { id: string; type: string; brand: string; last4: string; expMonth?: number; expYear?: number; country?: string; isDefault: boolean; }
interface Invoice        { id: string; number: string; date: number; amount: string; currency: string; status: string | null; pdfUrl: string | null; hostedUrl: string | null; type?: 'invoice' | 'charge'; }

const EMPTY: BillingAddress = { company: '', name: '', street: '', zip: '', city: '', country: 'Deutschland', email: '', phone: '', vat: '' };

const BRAND_COLORS: Record<string, string> = {
  visa: '#1a1f71', mastercard: '#eb001b', amex: '#2e77bc', sepa: '#003476',
};
const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', sepa: 'SEPA', unknown: 'Karte',
};

function CardIcon({ brand }: { brand: string }) {
  const color = BRAND_COLORS[brand] || '#f8fafc';
  return (
    <div style={{ width: '52px', height: '34px', background: `linear-gradient(135deg, ${color}, ${color}dd)`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e2e8f0' }}>
      {brand === 'sepa'
        ? <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', letterSpacing: '0.02em' }}>SEPA</span>
        : <CreditCard size={16} color="#fff" />}
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();

  /* address */
  const [addr,      setAddr]      = useState<BillingAddress>(EMPTY);
  const [draft,     setDraft]     = useState<BillingAddress>(EMPTY);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [addrSaved, setAddrSaved] = useState(false);

  /* stripe data */
  const [pms,          setPms]          = useState<PaymentMethod[]>([]);
  const [invoices,     setInvoices]     = useState<Invoice[]>([]);
  const [stripeLoading,setStripeLoading]= useState(true);
  const [portalLoading,setPortalLoading]= useState(false);
  const [stripeError,  setStripeError]  = useState('');

  /* page */
  const [loading, setLoading] = useState(true);

  /* ─── Load profile ─── */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company, plan, billing_address')
        .eq('id', user.id)
        .single();

      const saved = profile?.billing_address
        ? (typeof profile.billing_address === 'string' ? JSON.parse(profile.billing_address) : profile.billing_address)
        : null;

      const initial: BillingAddress = { ...EMPTY, company: profile?.company || '', name: profile?.full_name || '', email: user.email || '', ...(saved || {}) };
      setAddr(initial);
      setDraft(initial);
      setLoading(false);
    });
  }, [router]);

  /* ─── Load Stripe data ─── */
  const loadStripe = useCallback(async () => {
    setStripeLoading(true);
    setStripeError('');
    try {
      const res = await fetch('/api/billing/payment-methods');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPms(data.paymentMethods || []);
      setInvoices(data.invoices || []);
    } catch (e: unknown) {
      setStripeError(e instanceof Error ? e.message : 'Fehler beim Laden');
    } finally {
      setStripeLoading(false);
    }
  }, []);

  useEffect(() => { loadStripe(); }, [loadStripe]);

  /* ─── Open Stripe Customer Portal ─── */
  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Portal konnte nicht geöffnet werden');
      setPortalLoading(false);
    }
  };

  /* ─── Save address ─── */
  const saveAddr = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        full_name: draft.name,
        company: draft.company,
        billing_address: JSON.stringify(draft),
      }).eq('id', user.id);
    }
    setAddr({ ...draft });
    setSaving(false);
    setAddrSaved(true);
    setEditing(false);
    setTimeout(() => setAddrSaved(false), 3500);
  };

  const upd = (k: keyof BillingAddress, v: string) => setDraft(p => ({ ...p, [k]: v }));

  const fmtDate = (ts: number) => new Date(ts * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const statusBadge = (s: string | null) => {
    if (s === 'paid')   return { label: 'bezahlt', bg: 'rgba(16,185,129,0.1)',  color: '#10b981', border: 'rgba(16,185,129,0.25)' };
    if (s === 'open')   return { label: 'offen',   bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' };
    if (s === 'void')   return { label: 'storniert',bg: 'rgba(239,68,68,0.08)', color: '#f87171', border: 'rgba(239,68,68,0.2)' };
    return { label: s || '—', bg: '#f1f5f9', color: TS, border: BORD };
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TH, padding: '40px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <Link href="/dashboard/settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: CARD, border: `1px solid ${BORD}`, color: TS, textDecoration: 'none', flexShrink: 0 }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>Abrechnung</h1>
            <p style={{ color: TS, fontSize: '14px', margin: 0 }}>Rechnungsadresse, Zahlungsmethoden und Rechnungshistorie</p>
          </div>
        </div>

        {addrSaved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', color: '#34d399' }}>
            <CheckCircle2 size={16} /> Rechnungsadresse gespeichert
          </div>
        )}

        {/* ── RECHNUNGSADRESSE ── */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '20px', padding: '28px 32px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={18} color="#6366f1" />
              <span style={{ fontSize: '14px', fontWeight: '700' }}>Rechnungsadresse</span>
            </div>
            {!editing
              ? <button onClick={() => { setDraft({ ...addr }); setEditing(true); setAddrSaved(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: `1px solid ${BORD}`, borderRadius: '8px', color: TS, padding: '7px 14px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: F }}>
                  <Edit3 size={13} /> Bearbeiten
                </button>
              : <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditing(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8fafc', border: `1px solid ${BORD}`, borderRadius: '8px', color: TS, padding: '7px 14px', cursor: 'pointer', fontSize: '14px', fontFamily: F }}>
                    <X size={13} /> Abbrechen
                  </button>
                  <button onClick={saveAddr} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: '8px', color: '#0f172a', padding: '7px 16px', cursor: saving ? 'wait' : 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: F }}>
                    {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                    {saving ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
            }
          </div>

          {!editing ? (
            addr.street && addr.city ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                {[
                  { icon: <Building2 size={13} />, label: 'Firma',            value: addr.company },
                  { icon: <User size={13} />,      label: 'Ansprechpartner',  value: addr.name },
                  { icon: <MapPin size={13} />,    label: 'Straße',           value: addr.street },
                  { icon: <Globe size={13} />,     label: 'PLZ / Stadt',      value: `${addr.zip} ${addr.city}` },
                  { icon: <Globe size={13} />,     label: 'Land',             value: addr.country },
                  { icon: <Mail size={13} />,      label: 'Rechnungs-E-Mail', value: addr.email },
                  { icon: <Phone size={13} />,     label: 'Telefon',          value: addr.phone || '—' },
                  { icon: <FileText size={13} />,  label: 'USt-IdNr.',        value: addr.vat || '—' },
                ].map(({ icon, label, value }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: TD, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>{icon} {label}</div>
                    <div style={{ fontSize: '14px', color: value && value !== '—' ? TH : TD }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '12px' }}>
                <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fbbf24', marginBottom: '2px' }}>Keine Rechnungsadresse hinterlegt</div>
                  <div style={{ fontSize: '14px', color: '#78350f' }}>Trag deine Adresse ein, damit wir korrekte Rechnungen ausstellen können.</div>
                </div>
              </div>
            )
          ) : (
            /* ── Edit form ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {([
                  { k: 'company' as const, label: 'Firmenname',      ph: 'Autohaus GmbH',   icon: <Building2 size={13} /> },
                  { k: 'name'    as const, label: 'Ansprechpartner', ph: 'Max Mustermann',  icon: <User size={13} /> },
                ]).map(({ k, label, ph, icon }) => (
                  <div key={k}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: '600', color: TS, marginBottom: '7px' }}>{icon} {label}</label>
                    <input value={draft[k]} onChange={e => upd(k, e.target.value)} placeholder={ph} style={INP}
                      onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = BORD} />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: '600', color: TS, marginBottom: '7px' }}><MapPin size={13} /> Straße &amp; Hausnummer</label>
                <input value={draft.street} onChange={e => upd('street', e.target.value)} placeholder="Musterstraße 12" style={INP}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = BORD} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: TS, display: 'block', marginBottom: '7px' }}>PLZ</label>
                  <input value={draft.zip} onChange={e => upd('zip', e.target.value)} placeholder="12345" style={INP}
                    onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = BORD} />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: TS, display: 'block', marginBottom: '7px' }}>Stadt</label>
                  <input value={draft.city} onChange={e => upd('city', e.target.value)} placeholder="München" style={INP}
                    onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = BORD} />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: TS, display: 'block', marginBottom: '7px' }}>Land</label>
                  <select value={draft.country} onChange={e => upd('country', e.target.value)} style={{ ...INP, cursor: 'pointer' }}
                    onFocus={e => (e.target as HTMLSelectElement).style.borderColor = '#6366f1'}
                    onBlur={e  => (e.target as HTMLSelectElement).style.borderColor = BORD}>
                    {['Deutschland', 'Österreich', 'Schweiz', 'Liechtenstein'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {([
                  { k: 'email' as const, label: 'Rechnungs-E-Mail', ph: 'rechnung@firma.de', icon: <Mail size={13} />,  type: 'email' },
                  { k: 'phone' as const, label: 'Telefon (optional)', ph: '+49 89 123456',  icon: <Phone size={13} />, type: 'tel'   },
                ]).map(({ k, label, ph, icon, type }) => (
                  <div key={k}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: '600', color: TS, marginBottom: '7px' }}>{icon} {label}</label>
                    <input type={type} value={draft[k]} onChange={e => upd(k, e.target.value)} placeholder={ph} style={INP}
                      onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = BORD} />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: '600', color: TS, marginBottom: '7px' }}><FileText size={13} /> USt-IdNr. (optional)</label>
                <input value={draft.vat} onChange={e => upd('vat', e.target.value)} placeholder="DE123456789" style={{ ...INP, maxWidth: '260px' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = BORD} />
              </div>
            </div>
          )}
        </div>

        {/* ── ZAHLUNGSMETHODEN ── */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '20px', padding: '28px 32px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CreditCard size={18} color="#6366f1" />
              <span style={{ fontSize: '14px', fontWeight: '700' }}>Zahlungsmethoden</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={loadStripe}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8fafc', border: `1px solid ${BORD}`, borderRadius: '8px', color: TS, padding: '7px 12px', cursor: 'pointer', fontSize: '14px', fontFamily: F }}
                title="Aktualisieren">
                <RefreshCw size={13} style={stripeLoading ? { animation: 'spin 1s linear infinite' } : {}} />
              </button>
              <button onClick={openPortal} disabled={portalLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: '8px', color: '#0f172a', padding: '8px 16px', cursor: portalLoading ? 'wait' : 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: F, opacity: portalLoading ? 0.75 : 1 }}>
                {portalLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                {portalLoading ? 'Wird geöffnet...' : 'Hinzufügen / Verwalten'}
                {!portalLoading && <ArrowUpRight size={12} />}
              </button>
            </div>
          </div>

          {stripeError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', marginBottom: '16px', fontSize: '14px', color: '#fca5a5' }}>
              <AlertCircle size={14} /> {stripeError}
            </div>
          )}

          {stripeLoading ? (
            /* Skeleton */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2].map(i => (
                <div key={i} style={{ height: '70px', borderRadius: '12px', background: 'linear-gradient(90deg,#f8fafc 25%,#f1f5f9 50%,#f8fafc 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          ) : pms.length === 0 ? (
            /* Empty state */
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ width: '56px', height: '56px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.16)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CreditCard size={24} color="#6366f1" />
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Noch keine Zahlungsmethode hinterlegt</div>
              <div style={{ fontSize: '14px', color: TS, marginBottom: '24px', maxWidth: '360px', margin: '0 auto 24px' }}>
                Füge eine Kreditkarte, Debitkarte oder SEPA-Lastschrift hinzu — sicher über Stripe.
              </div>
              <button onClick={openPortal} disabled={portalLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: '10px', color: '#0f172a', padding: '13px 28px', cursor: portalLoading ? 'wait' : 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: F }}>
                {portalLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={16} />}
                {portalLoading ? 'Wird geöffnet...' : 'Zahlungsmethode hinzufügen'}
                {!portalLoading && <ArrowUpRight size={14} />}
              </button>
            </div>
          ) : (
            /* Payment method list */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pms.map(pm => (
                <div key={pm.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: pm.isDefault ? 'rgba(99,102,241,0.06)' : '#f8fafc', border: `1px solid ${pm.isDefault ? 'rgba(99,102,241,0.25)' : BORD}`, borderRadius: '14px' }}>
                  <CardIcon brand={pm.brand} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: TH }}>
                        {BRAND_LABELS[pm.brand] || pm.brand} •••• {pm.last4}
                      </span>
                      {pm.isDefault && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '700', background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)', padding: '2px 8px', borderRadius: '5px' }}>
                          <Star size={10} fill="#6366f1" /> Standard
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: TD, marginTop: '3px' }}>
                      {pm.type === 'card' && pm.expMonth && pm.expYear
                        ? `Läuft ab ${String(pm.expMonth).padStart(2, '0')}/${pm.expYear}`
                        : pm.type === 'sepa' ? `SEPA-Lastschrift · ${pm.country || ''}` : ''}
                    </div>
                  </div>
                  <button onClick={openPortal}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8fafc', border: `1px solid ${BORD}`, borderRadius: '8px', color: TS, padding: '7px 13px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: F }}>
                    <Trash2 size={12} /> Verwalten
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Info-Banner */}
          {!stripeLoading && (
            <div style={{ marginTop: '18px', padding: '14px 18px', background: '#f8fafc', border: `1px solid ${BORD}`, borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Shield size={15} color="#6366f1" style={{ flexShrink: 0, marginTop: '1px' }} />
              <span style={{ fontSize: '14px', color: TD, lineHeight: '1.55' }}>
                Über <strong style={{ color: TS }}>„Hinzufügen / Verwalten"</strong> öffnet sich das sichere Stripe-Kundenportal. Du kannst dort Kreditkarten, Debitkarten und SEPA-Lastschriften hinzufügen, als Standard setzen oder entfernen.
              </span>
            </div>
          )}
        </div>

        {/* ── RECHNUNGSHISTORIE ── */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '20px', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Clock size={18} color="#6366f1" />
            <span style={{ fontSize: '14px', fontWeight: '700' }}>Rechnungen &amp; Belege</span>
          </div>

          {stripeLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '52px', borderRadius: '8px', background: 'linear-gradient(90deg,#f8fafc 25%,#f1f5f9 50%,#f8fafc 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '22px 20px', background: '#f8fafc', border: `1px solid ${BORD}`, borderRadius: '12px' }}>
              <FileText size={20} color={TD} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '3px' }}>Noch keine Rechnungen</div>
                <div style={{ fontSize: '14px', color: TD }}>Rechnungen und Belege erscheinen hier nach deinen Käufen.</div>
              </div>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 90px 70px', gap: '10px', padding: '6px 14px 10px', fontSize: '11px', fontWeight: '700', color: TD, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${BORD}` }}>
                <span>Rechnung</span><span>Datum</span><span>Betrag</span><span>Status</span><span style={{ textAlign: 'right' }}>Aktionen</span>
              </div>

              {invoices.map(inv => {
                const badge = statusBadge(inv.status);
                return (
                  <div key={inv.id}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 90px 70px', gap: '10px', padding: '13px 14px', borderRadius: '10px', alignItems: 'center', transition: 'background 0.15s', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.16)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={14} color="#6366f1" />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: TH }}>{inv.number}</span>
                    </div>
                    <span style={{ fontSize: '14px', color: TS }}>{fmtDate(inv.date)}</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: TH }}>{inv.amount} {inv.currency}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '3px 9px', borderRadius: '5px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                      {badge.label}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" title="PDF herunterladen"
                          style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: `1px solid ${BORD}`, borderRadius: '7px', padding: '6px 9px', color: TS, textDecoration: 'none', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(59,130,246,0.1)'; (e.currentTarget as HTMLAnchorElement).style.color = '#6366f1'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#f8fafc'; (e.currentTarget as HTMLAnchorElement).style.color = TS; }}>
                          <Download size={13} />
                        </a>
                      )}
                      {inv.hostedUrl && (
                        <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer" title={inv.type === 'charge' ? 'Beleg anzeigen' : 'Online anzeigen'}
                          style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: `1px solid ${BORD}`, borderRadius: '7px', padding: '6px 9px', color: TS, textDecoration: 'none', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(59,130,246,0.1)'; (e.currentTarget as HTMLAnchorElement).style.color = '#6366f1'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#f8fafc'; (e.currentTarget as HTMLAnchorElement).style.color = TS; }}>
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
      `}</style>
    </div>
  );
}




