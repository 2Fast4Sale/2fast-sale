'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Car, Fuel, Gauge, Calendar, Palette, Users, Send, CheckCircle2, Loader2, Images } from 'lucide-react';
import { Viewer360 } from '../../../components/Viewer360';
const F = '"DM Sans", -apple-system, sans-serif';

export default function PublicListingPage() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle]   = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [sent,    setSent]      = useState(false);
  const [form,    setForm]      = useState({ name: '', email: '', phone: '', message: '' });

  useEffect(() => {
    fetch(`/api/public/vehicle/${id}`)
      .then(r => r.json())
      .then(({ vehicle }) => { setVehicle(vehicle || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    setSending(true);
    await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, vehicle_id: id, dealer_id: vehicle.dealer_id || vehicle.user_id }),
    });
    setSent(true);
    setSending(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050d1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!vehicle) return (
    <div style={{ minHeight: '100vh', background: '#050d1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0f8ff', fontFamily: F }}>
      <div style={{ textAlign: 'center' }}>
        <Car size={48} color="#3a5a78" style={{ marginBottom: '16px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Inserat nicht gefunden</h1>
        <p style={{ color: '#7a9cbc' }}>Dieses Inserat existiert nicht oder wurde entfernt.</p>
      </div>
    </div>
  );

  const imgs = ((vehicle.vehicle_images as {processed_url?:string;original_url?:string}[]) || []);
  const imgUrls = imgs.map(i => i.processed_url || i.original_url).filter(Boolean) as string[];
  const img  = imgUrls[0] || '';
  const has360 = imgUrls.length >= 6; // ab 6 Fotos → 360°-Viewer anbieten
  const ps   = vehicle.power_kw ? Math.round(Number(vehicle.power_kw) * 1.36) : null;
  const price = vehicle.price ? `${Number(String(vehicle.price)).toLocaleString('de-DE')} €` : 'Auf Anfrage';

  const specs = [
    { icon: <Gauge size={14} />,    label: 'Kilometerstand', value: vehicle.km ? `${vehicle.km} km` : null },
    { icon: <Calendar size={14} />, label: 'Erstzulassung',  value: vehicle.first_registration as string || null },
    { icon: <Fuel size={14} />,     label: 'Kraftstoff',     value: vehicle.fuel_type as string || null },
    { icon: <Gauge size={14} />,    label: 'Leistung',       value: ps ? `${vehicle.power_kw} kW / ${ps} PS` : null },
    { icon: <Palette size={14} />,  label: 'Farbe',          value: vehicle.color as string || null },
    { icon: <Users size={14} />,    label: 'Sitzplätze',     value: vehicle.seats as string || null },
  ].filter(s => s.value);

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', color: '#f0f8ff', fontFamily: F }}>
      {/* Navbar */}
      <nav style={{ padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>2Fast<span style={{ color: '#3b82f6' }}>4</span>Sale</div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px', alignItems: 'start' }}>

          {/* Left */}
          <div>
            {has360 ? (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Images size={15} color="#3b82f6" />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6' }}>360°-Ansicht</span>
                  <span style={{ fontSize: '13px', color: '#3a5a78' }}>— Ziehe das Bild zum Drehen</span>
                </div>
                <Viewer360 images={imgUrls} autoPlay={true} />
              </div>
            ) : img ? (
              <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', aspectRatio: '16/10' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={vehicle.brand as string} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : null}

            <h1 style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.4px', margin: '0 0 6px' }}>{vehicle.brand as string}</h1>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#3b82f6', marginBottom: '24px' }}>{price}</div>

            {specs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
                {specs.map(({ icon, label, value }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#3a5a78', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>{icon} {label}</div>
                    <div style={{ fontSize: '15px', fontWeight: '700' }}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            {(vehicle.equipment as string[])?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#3a5a78', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Ausstattung</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(vehicle.equipment as string[]).map((item, i) => (
                    <span key={i} style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', color: '#93c5fd', padding: '5px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>✓ {item}</span>
                  ))}
                </div>
              </div>
            )}

            {vehicle.description && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#3a5a78', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Beschreibung</div>
                <p style={{ fontSize: '15px', color: '#a8c4dc', lineHeight: 1.8, margin: 0 }}>{vehicle.description as string}</p>
              </div>
            )}
          </div>

          {/* Contact Form */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px', position: 'sticky', top: '24px' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px' }}>Anfrage gesendet!</h3>
                <p style={{ fontSize: '14px', color: '#7a9cbc', margin: 0 }}>Der Händler meldet sich so schnell wie möglich bei dir.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 20px' }}>Interesse? Jetzt anfragen</h3>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { key: 'name',    label: 'Dein Name',  type: 'text',  required: true  },
                    { key: 'email',   label: 'E-Mail',     type: 'email', required: true  },
                    { key: 'phone',   label: 'Telefon',    type: 'tel',   required: false },
                  ].map(({ key, label, type, required }) => (
                    <div key={key}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#3a5a78', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '5px' }}>{label}{required ? ' *' : ''}</label>
                      <input
                        type={type} required={required}
                        value={form[key as keyof typeof form]}
                        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#0c1829', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', padding: '10px 14px', color: '#f0f8ff', fontSize: '15px', fontFamily: F, outline: 'none' }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#3a5a78', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '5px' }}>Nachricht</label>
                    <textarea
                      rows={4} placeholder="Ich interessiere mich für dieses Fahrzeug..."
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', background: '#0c1829', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', padding: '10px 14px', color: '#f0f8ff', fontSize: '15px', fontFamily: F, outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                  <button type="submit" disabled={sending}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', borderRadius: '10px', color: '#fff', padding: '13px', cursor: sending ? 'wait' : 'pointer', fontSize: '15px', fontWeight: '700', fontFamily: F }}>
                    {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                    {sending ? 'Wird gesendet...' : 'Anfrage senden'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
