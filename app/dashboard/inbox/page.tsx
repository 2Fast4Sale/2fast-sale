'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Phone, Car, Clock, CheckCircle2, Archive,
  RefreshCw, Loader2, MessageSquare, User, ChevronRight,
  X, Reply, Circle, Filter, Search
} from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

const F    = '"Inter", -apple-system, sans-serif';
const BG   = '#050d1a';
const CARD = 'rgba(255,255,255,0.03)';
const BORD = 'rgba(255,255,255,0.08)';
const TH   = '#f0f8ff';
const TS   = '#7a9cbc';
const TD   = '#3a5a78';

interface Inquiry {
  id: string;
  created_at: string;
  vehicle_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: 'new' | 'read' | 'replied' | 'archived';
  notes: string | null;
  // joined
  vehicle_brand?: string;
}

const STATUS_CONFIG = {
  new:      { label: 'Neu',       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  dot: '#3b82f6' },
  read:     { label: 'Gelesen',   color: '#10b981', bg: 'rgba(16,185,129,0.08)',  dot: '#10b981' },
  replied:  { label: 'Beantwortet', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', dot: '#8b5cf6' },
  archived: { label: 'Archiviert', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', dot: '#6b7280' },
};

export default function InboxPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<Inquiry | null>(null);
  const [filter,    setFilter]    = useState<string>('all');
  const [search,    setSearch]    = useState('');
  const [updating,  setUpdating]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/inquiries');
    const data = await res.json();

    if (data.inquiries) {
      // Fetch vehicle brands
      const supabase = createClient();
      const vehicleIds = [...new Set(data.inquiries.map((i: Inquiry) => i.vehicle_id).filter(Boolean))];
      let brands: Record<string, string> = {};
      if (vehicleIds.length > 0) {
        const { data: vdata } = await supabase
          .from('vehicles')
          .select('id, brand')
          .in('id', vehicleIds as string[]);
        brands = Object.fromEntries((vdata || []).map(v => [v.id, v.brand]));
      }
      setInquiries(data.inquiries.map((i: Inquiry) => ({
        ...i,
        vehicle_brand: i.vehicle_id ? brands[i.vehicle_id] : undefined,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      load();
    });
  }, [load, router]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    await fetch('/api/inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: status as Inquiry['status'] } : i));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: status as Inquiry['status'] } : prev);
    setUpdating(false);
  };

  const markRead = (inq: Inquiry) => {
    setSelected(inq);
    if (inq.status === 'new') updateStatus(inq.id, 'read');
  };

  const filtered = inquiries.filter(i => {
    const matchFilter = filter === 'all' || i.status === filter;
    const matchSearch = !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase()) ||
      (i.vehicle_brand || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all:      inquiries.length,
    new:      inquiries.filter(i => i.status === 'new').length,
    read:     inquiries.filter(i => i.status === 'read').length,
    replied:  inquiries.filter(i => i.status === 'replied').length,
    archived: inquiries.filter(i => i.status === 'archived').length,
  };

  const fmtDate = (d: string) => {
    const date = new Date(d);
    const now  = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60 * 60 * 1000) return `vor ${Math.floor(diff / 60000)} Min.`;
    if (diff < 24 * 60 * 60 * 1000) return `vor ${Math.floor(diff / 3600000)} Std.`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TH, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '32px 40px 20px', borderBottom: `1px solid ${BORD}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={18} color="#60a5fa" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.4px', margin: 0 }}>Anfragen</h1>
              <p style={{ color: TS, fontSize: '13px', margin: 0 }}>Alle Kundenanfragen an einem Ort</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {counts.new > 0 && (
              <div style={{ background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px' }}>
                {counts.new} neu
              </div>
            )}
            <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: CARD, border: `1px solid ${BORD}`, borderRadius: '8px', color: TS, padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontFamily: F }}>
              <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Aktualisieren
            </button>
          </div>
        </div>

        {/* Filter + Search */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: TD, pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, E-Mail oder Fahrzeug..."
              style={{ background: '#0c1829', border: `1px solid ${BORD}`, borderRadius: '8px', padding: '8px 12px 8px 30px', color: TH, fontSize: '13px', fontFamily: F, outline: 'none', width: '240px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '3px' }}>
            {(['all', 'new', 'read', 'replied', 'archived'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: filter === f ? '#1e3a5f' : 'transparent', color: filter === f ? '#93c5fd' : TS, fontFamily: F, display: 'flex', alignItems: 'center', gap: '5px' }}>
                {f === 'all' ? 'Alle' : STATUS_CONFIG[f].label}
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', padding: '1px 5px' }}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* List */}
        <div style={{ width: selected ? '380px' : '100%', borderRight: selected ? `1px solid ${BORD}` : 'none', overflowY: 'auto', flexShrink: 0, transition: 'width 0.2s' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '60px', color: TS }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Anfragen werden geladen...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 40px' }}>
              <div style={{ width: '56px', height: '56px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.16)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <MessageSquare size={24} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>Noch keine Anfragen</div>
              <div style={{ fontSize: '13px', color: TS, maxWidth: '280px', margin: '0 auto' }}>
                Teile deine Inserate — Kundenanfragen erscheinen dann hier automatisch.
              </div>
            </div>
          ) : (
            filtered.map(inq => {
              const sc = STATUS_CONFIG[inq.status];
              const isSelected = selected?.id === inq.id;
              return (
                <div key={inq.id} onClick={() => markRead(inq)}
                  style={{ display: 'flex', gap: '14px', padding: '16px 24px', cursor: 'pointer', borderBottom: `1px solid rgba(255,255,255,0.04)`, background: isSelected ? 'rgba(59,130,246,0.06)' : inq.status === 'new' ? 'rgba(59,130,246,0.02)' : 'transparent', transition: 'background 0.15s', borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent' }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = inq.status === 'new' ? 'rgba(59,130,246,0.02)' : 'transparent'; }}>

                  {/* Avatar */}
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${sc.dot}30, ${sc.dot}10)`, border: `1px solid ${sc.dot}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: '700', color: sc.dot }}>
                    {inq.name.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: inq.status === 'new' ? '700' : '600', color: TH, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inq.name}
                      </span>
                      <span style={{ fontSize: '12px', color: TD, flexShrink: 0, marginLeft: '8px' }}>{fmtDate(inq.created_at)}</span>
                    </div>
                    {inq.vehicle_brand && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#60a5fa', marginBottom: '3px' }}>
                        <Car size={11} /> {inq.vehicle_brand}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: TS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inq.message || inq.email}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '4px' }}>
                      {sc.label}
                    </span>
                    {inq.status === 'new' && <Circle size={8} fill="#3b82f6" color="#3b82f6" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: '#60a5fa' }}>
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: TH }}>{selected.name}</div>
                  <div style={{ fontSize: '13px', color: TS }}>{fmtDate(selected.created_at)}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '8px', color: TS, padding: '6px', cursor: 'pointer', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>

            {/* Kontaktdaten */}
            <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: TD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Kontaktdaten</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mail size={14} color={TS} />
                  <a href={`mailto:${selected.email}`} style={{ fontSize: '13px', color: '#60a5fa', textDecoration: 'none', fontWeight: '600' }}>{selected.email}</a>
                </div>
                {selected.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Phone size={14} color={TS} />
                    <a href={`tel:${selected.phone}`} style={{ fontSize: '13px', color: '#60a5fa', textDecoration: 'none', fontWeight: '600' }}>{selected.phone}</a>
                  </div>
                )}
                {selected.vehicle_brand && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Car size={14} color={TS} />
                    <span style={{ fontSize: '13px', color: TH }}>{selected.vehicle_brand}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Nachricht */}
            {selected.message && (
              <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: TD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Nachricht</div>
                <p style={{ fontSize: '13px', color: '#c8dff0', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{selected.message}</p>
              </div>
            )}

            {/* Aktionen */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a href={`mailto:${selected.email}?subject=Re: Anfrage zu ${selected.vehicle_brand || 'Ihrem Fahrzeug'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', borderRadius: '9px', color: '#fff', padding: '10px 20px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>
                <Reply size={14} /> Per E-Mail antworten
              </a>
              {selected.phone && (
                <a href={`tel:${selected.phone}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '9px', color: '#10b981', padding: '10px 20px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>
                  <Phone size={14} /> Anrufen
                </a>
              )}
              {['replied', 'archived'].map(s => (
                <button key={s} onClick={() => updateStatus(selected.id, s)} disabled={updating || selected.status === s}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', background: CARD, border: `1px solid ${BORD}`, borderRadius: '9px', color: selected.status === s ? TD : TS, padding: '10px 16px', cursor: selected.status === s ? 'default' : 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: F, opacity: selected.status === s ? 0.5 : 1 }}>
                  {s === 'replied' ? <><CheckCircle2 size={13} /> Als beantwortet</> : <><Archive size={13} /> Archivieren</>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}




