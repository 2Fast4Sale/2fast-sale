'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert, TrendingDown, Server, Car, Users, AlertTriangle } from 'lucide-react';

const F    = '"Inter", -apple-system, sans-serif';
const CARD = '#ffffff';
const BORD = '#e2e8f0';
const TH   = '#0f172a';
const TS   = '#64748b';

const MICROS = 1_000_000;
const eur = (micros: number, digits = 2) =>
  (micros / MICROS).toLocaleString('de-DE', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }) + ' €';

interface Data {
  days: number;
  totalMicros: number;
  calls: number;
  avgPerVehicleMicros: number;
  vehiclesTracked: number;
  byService:   Record<string, { micros: number; calls: number }>;
  byOperation: Record<string, { micros: number; calls: number }>;
  topUsers: { id: string; name: string; micros: number; calls: number }[];
}

const SERVICE_COLORS: Record<string, string> = {
  anthropic: '#d97706', removebg: '#ef4444', photoroom: '#6366f1',
  fal: '#10b981', pixelcut: '#8b5cf6', piranha: '#0ea5e9',
};

export default function AdminCostsPage() {
  const [data,    setData]    = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied,  setDenied]  = useState(false);
  const [days,    setDays]    = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/costs?days=${days}`)
      .then(async r => {
        if (r.status === 403 || r.status === 401) { setDenied(true); return null; }
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: F }}>
      <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (denied) return (
    <div style={{ padding: '60px 32px', textAlign: 'center', fontFamily: F }}>
      <ShieldAlert size={40} color="#ef4444" style={{ marginBottom: '14px' }} />
      <h1 style={{ fontSize: '20px', fontWeight: '800', color: TH, margin: '0 0 8px' }}>Kein Zugriff</h1>
      <p style={{ color: TS, fontSize: '14px', margin: 0 }}>
        Diese Seite ist nur für Administratoren.
      </p>
    </div>
  );

  if (!data) return null;

  const services   = Object.entries(data.byService).sort((a, b) => b[1].micros - a[1].micros);
  const operations = Object.entries(data.byOperation).sort((a, b) => b[1].micros - a[1].micros);
  const maxService = services[0]?.[1].micros || 1;

  // Warnsignal: Fallback auf den teuren Dienst
  const removebgShare = data.totalMicros > 0
    ? (data.byService.removebg?.micros || 0) / data.totalMicros : 0;

  const card: React.CSSProperties = {
    background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px',
    padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1100px', margin: '0 auto', fontFamily: F, minHeight: '100vh', background: '#f0f2f5' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: TH, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            API-Kosten
          </h1>
          <p style={{ margin: 0, color: TS, fontSize: '14px' }}>
            Interne Auswertung — was dich deine Nutzer wirklich kosten.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
              border: `1px solid ${days === d ? '#6366f1' : BORD}`,
              background: days === d ? 'rgba(99,102,241,0.08)' : '#fff',
              color: days === d ? '#6366f1' : TS, cursor: 'pointer', fontFamily: F,
            }}>
              {d} Tage
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '9px', padding: '11px 14px',
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
        marginBottom: '20px',
      }}>
        <AlertTriangle size={14} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '12.5px', color: '#78350f', lineHeight: 1.6 }}>
          <strong>Nur Admins.</strong> Diese Zahlen sind Schätzungen nach Listenpreisen —
          gleiche sie mit deinen echten Rechnungen ab und passe die Konstanten in
          <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: '4px', margin: '0 3px' }}>lib/apiCosts.ts</code>
          an.
        </p>
      </div>

      {/* Kennzahlen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: `Gesamt (${data.days} Tage)`, value: eur(data.totalMicros), icon: <TrendingDown size={15} />, color: '#ef4444' },
          { label: 'Ø pro Fahrzeug', value: eur(data.avgPerVehicleMicros, 3), icon: <Car size={15} />, color: '#6366f1', sub: `${data.vehiclesTracked} Fahrzeuge erfasst` },
          { label: 'API-Aufrufe', value: data.calls.toLocaleString('de-DE'), icon: <Server size={15} />, color: '#8b5cf6' },
          { label: 'Aktive Nutzer', value: String(data.topUsers.length), icon: <Users size={15} />, color: '#10b981' },
        ].map(k => (
          <div key={k.label} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: TS, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              <span style={{ color: k.color }}>{k.icon}</span> {k.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: TH, letterSpacing: '-1px' }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px' }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Warnung bei teurem Fallback */}
      {removebgShare > 0.25 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px',
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginBottom: '20px',
        }}>
          <AlertTriangle size={15} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: 1.6 }}>
            <strong>{Math.round(removebgShare * 100)} % deiner Bildkosten laufen über remove.bg.</strong>{' '}
            Das ist der teuerste Anbieter in deiner Kette und wird nur als Fallback genutzt —
            wenn der Anteil so hoch ist, schlägt PhotoRoom regelmäßig fehl. Prüf den API-Key
            und die Fehlerlogs.
          </p>
        </div>
      )}

      {/* Nach Dienst */}
      <div style={{ ...card, marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: TH, marginBottom: '14px' }}>Nach Anbieter</div>
        {services.length === 0 && (
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            Noch keine Daten. Sobald jemand ein Inserat erstellt, erscheinen hier Kosten.
          </div>
        )}
        {services.map(([name, v]) => (
          <div key={name} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
              <span style={{ fontWeight: '600', color: TH }}>{name}</span>
              <span style={{ color: TS }}>
                {eur(v.micros)} <span style={{ color: '#94a3b8' }}>· {v.calls} Aufrufe</span>
              </span>
            </div>
            <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${(v.micros / maxService) * 100}%`, height: '100%',
                background: SERVICE_COLORS[name] || '#94a3b8', borderRadius: '4px',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Nach Operation */}
      <div style={{ ...card, marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: TH, marginBottom: '12px' }}>Nach Funktion</div>
        {operations.map(([name, v]) => (
          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid #f1f5f9`, fontSize: '13px' }}>
            <span style={{ color: TH, fontWeight: '500' }}>{name}</span>
            <span style={{ color: TS }}>
              {eur(v.micros)}
              <span style={{ color: '#94a3b8' }}> · {eur(Math.round(v.micros / Math.max(1, v.calls)), 4)}/Aufruf</span>
            </span>
          </div>
        ))}
      </div>

      {/* Teuerste Nutzer */}
      <div style={card}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: TH, marginBottom: '4px' }}>Teuerste Nutzer</div>
        <div style={{ fontSize: '12px', color: TS, marginBottom: '12px' }}>
          Vergleiche das mit dem Plan-Preis — wer hier über seinem Abo liegt, kostet dich Geld.
        </div>
        {data.topUsers.map(u => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
            <span style={{ color: TH, fontWeight: '500' }}>{u.name}</span>
            <span style={{ color: TS }}>{eur(u.micros)} <span style={{ color: '#94a3b8' }}>· {u.calls}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
