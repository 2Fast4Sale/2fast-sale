'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Eye, Car, CheckCircle2, Clock, Loader2, BarChart3 } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

const F = '"Inter",-apple-system,sans-serif';

interface VehicleStat {
  id: string;
  brand: string;
  price: string;
  status: string;
  views: number;
  created_at: string;
}

export default function AnalyticsPage() {
  const [vehicles, setVehicles] = useState<VehicleStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from('vehicles')
        .select('id, brand, price, status, views, created_at')
        .eq('user_id', user.id)
        .order('views', { ascending: false });
      setVehicles(data || []);
      setLoading(false);
    });
  }, []);

  const totalViews  = vehicles.reduce((s, v) => s + (v.views || 0), 0);
  const aktiv       = vehicles.filter(v => v.status === 'Aktiv').length;
  const entwurf     = vehicles.filter(v => v.status === 'Entwurf').length;
  const verkauft    = vehicles.filter(v => v.status === 'Verkauft').length;

  const statusColor: Record<string, string> = {
    'Aktiv':      '#10b981',
    'Entwurf':    '#f59e0b',
    'Verkauft':   '#8b5cf6',
    'Reserviert': '#3b82f6',
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6f9' }}>
      <Loader2 size={28} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: '40px 44px', maxWidth: '1100px', margin: '0 auto', color: '#0f172a', fontFamily: F }}>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 6px', letterSpacing: '-0.4px', color: '#0f172a' }}>Statistiken</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
          Echte Aufrufe deiner Inserat-Seiten — gezählt wenn jemand den Link oder QR-Code öffnet.
        </p>
      </div>

      {/* Karten */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '32px' }}>
        {[
          { label: 'Gesamt Aufrufe',  value: totalViews, icon: <Eye size={18} />,          color: '#3b82f6' },
          { label: 'Aktiv',           value: aktiv,      icon: <TrendingUp size={18} />,    color: '#10b981' },
          { label: 'Entwürfe',        value: entwurf,    icon: <Clock size={18} />,         color: '#f59e0b' },
          { label: 'Verkauft',        value: verkauft,   icon: <CheckCircle2 size={18} />,  color: '#8b5cf6' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color, marginBottom: '12px', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#0f172a', letterSpacing: '-1px' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Fahrzeug-Tabelle */}
      {vehicles.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '60px', textAlign: 'center' }}>
          <BarChart3 size={40} color="#3a5a78" style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Noch keine Daten</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Erstelle dein erstes Inserat — dann siehst du hier die echten Aufrufe.</div>
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Inserate nach Aufrufen
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Fahrzeug', 'Preis', 'Status', 'Aufrufe', 'Erstellt'].map(h => (
                  <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, i) => (
                <tr key={v.id} style={{ borderBottom: i < vehicles.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '14px 24px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Car size={14} color="#3a5a78" />
                      {v.brand || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '13px', color: '#64748b' }}>
                    {v.price ? `${Number(v.price).toLocaleString('de-DE')} €` : '—'}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: '700',
                      color: statusColor[v.status] || '#7a9cbc',
                      background: `${statusColor[v.status] || '#7a9cbc'}18`,
                      padding: '4px 10px', borderRadius: '6px',
                    }}>
                      {v.status || 'Entwurf'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: v.views > 0 ? '#60a5fa' : '#3a5a78' }}>
                      <Eye size={13} />
                      {v.views || 0}
                    </div>
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '13px', color: '#64748b' }}>
                    {new Date(v.created_at).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '13px', color: '#94a3b8' }}>
            💡 Aufrufe werden gezählt wenn jemand deine Inserat-Seite über den Link oder QR-Code besucht.
          </div>
        </div>
      )}
    </div>
  );
}





