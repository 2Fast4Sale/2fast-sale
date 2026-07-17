'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2, User, Phone, Sparkles, ImageIcon, Layers,
  Save, CheckCircle2, Loader2, ArrowLeft, MapPin, Globe, Mail, Type
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase/client';

const F = '"Inter", -apple-system, sans-serif';

const BG_OPTIONS = [
  { id: 'studio_white',   label: 'Studio Weiß',     color: '#f8fafc', textColor: '#1e293b', tier: 'free'     },
  { id: 'studio_grey',    label: 'Studio Grau',     color: '#64748b', textColor: '#fff',    tier: 'free'     },
  { id: 'studio_dark',    label: 'Studio Dunkel',   color: '#1e293b', textColor: '#fff',    tier: 'free'     },
  { id: 'studio_navy',    label: 'Midnight Navy',   color: '#0f172a', textColor: '#60a5fa', tier: 'pro'      },
  { id: 'studio_beige',   label: 'Warm Beige',      color: '#d4c5a9', textColor: '#1e293b', tier: 'pro'      },
  { id: 'studio_carbon',  label: 'Carbon Black',    color: '#111827', textColor: '#9ca3af', tier: 'pro'      },
  { id: 'studio_ice',     label: 'Ice Blue',        color: '#e0f2fe', textColor: '#0369a1', tier: 'pro'      },
  { id: 'outdoor_road',   label: 'Landstraße',      color: '#374151', textColor: '#d1d5db', tier: 'business' },
  { id: 'outdoor_city',   label: 'Skyline',         color: '#1f2937', textColor: '#93c5fd', tier: 'business' },
];

export default function DealerSettingsPage() {
  const [profile, setProfile] = useState({
    company: '', full_name: '', phone: '', email: '',
    website: '', address: '',
  });
  const [aiStyle, setAiStyle]       = useState('');
  const [aiTitle, setAiTitle]       = useState('');
  const [defaultBg, setDefaultBg]   = useState('studio_white');
  const [watermark, setWatermark]   = useState(false);
  const [plan, setPlan]             = useState('free');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles')
        .select('*').eq('id', user.id).single();
      if (data) {
        setProfile({
          company:   data.company    || '',
          full_name: data.full_name  || '',
          phone:     data.phone      || '',
          email:     user.email      || '',
          website:   data.website    || '',
          address:   data.address    || '',
        });
        setAiStyle(data.ai_style_template || '');
        setAiTitle(data.ai_title_template || '');
        setDefaultBg(data.default_background || 'studio_white');
        setPlan(data.plan || 'free');
      }
      setWatermark(localStorage.getItem('dealer_watermark') === 'true');
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({
      id:                 user.id,
      full_name:          profile.full_name,
      company:            profile.company,
      phone:              profile.phone,
      website:            profile.website,
      address:            profile.address,
      ai_style_template:  aiStyle,
      ai_title_template:  aiTitle,
      default_background: defaultBg,
    });
    localStorage.setItem('dealer_company',    profile.company);
    localStorage.setItem('dealer_watermark',  watermark ? 'true' : 'false');
    localStorage.setItem('dealer_default_bg', defaultBg);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px', padding: '11px 14px',
    color: '#0f172a', fontSize: '14px', outline: 'none', fontFamily: F,
  };

  const section = (icon: React.ReactNode, title: string, sub?: string, accent?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <div style={{ width: '38px', height: '38px', background: accent || 'rgba(99,102,241,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{title}</div>
        {sub && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: '#64748b', fontFamily: F, background: '#f0f2f5' }}>
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Wird geladen…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: '28px 32px', maxWidth: '720px', margin: '0 auto', color: '#0f172a', fontFamily: F, minHeight: '100vh', background: '#f0f2f5' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Link href="/dashboard/settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b', textDecoration: 'none', flexShrink: 0 }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Händler-Profil</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Firmendaten, KI-Stil und Standard-Einstellungen</p>
        </div>
      </div>

      {/* ── Firmendaten ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '32px', marginBottom: '20px' }}>
        {section(<Building2 size={20} color="#6366f1" />, 'Firmendaten', 'Werden auf deinen Inseraten und beim Kontakt angezeigt')}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: '7px' }}>
              <Building2 size={11} style={{ display: 'inline', marginRight: '5px' }} /> Autohaus / Firmenname *
            </label>
            <input style={inp} placeholder="z. B. Autohaus Müller GmbH"
              value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
              onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: '7px' }}>
                <User size={11} style={{ display: 'inline', marginRight: '5px' }} /> Ansprechpartner
              </label>
              <input style={inp} placeholder="Max Müller"
                value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: '7px' }}>
                <Phone size={11} style={{ display: 'inline', marginRight: '5px' }} /> Telefon
              </label>
              <input style={inp} placeholder="+49 176 ..."
                value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: '7px' }}>
                <Mail size={11} style={{ display: 'inline', marginRight: '5px' }} /> E-Mail (Kontakt)
              </label>
              <input style={{ ...inp, opacity: 0.5, cursor: 'not-allowed' }} value={profile.email} disabled />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: '7px' }}>
                <Globe size={11} style={{ display: 'inline', marginRight: '5px' }} /> Website
              </label>
              <input style={inp} placeholder="https://autohaus-mueller.de"
                value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: '7px' }}>
              <MapPin size={11} style={{ display: 'inline', marginRight: '5px' }} /> Adresse
            </label>
            <input style={inp} placeholder="Musterstraße 1, 12345 Berlin"
              value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
              onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>
        </div>
      </div>

      {/* ── Titel-Format ── */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '14px', padding: '32px', marginBottom: '20px' }}>
        {section(
          <Type size={20} color="#eab308" />,
          'Titel-Format',
          'So soll der Inserat-Titel aussehen — die KI passt sich an deinen Stil an',
          'rgba(234,179,8,0.12)'
        )}

        <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.12)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px', fontSize: '14px', color: '#64748b', lineHeight: 1.7 }}>
          💡 Schreib einen Beispiel-Titel für ein konkretes Fahrzeug — genau so wie du ihn auf mobile.de haben möchtest. Die KI übernimmt Struktur, Sonderzeichen und Schreibweise.
        </div>

        <input
          value={aiTitle}
          onChange={e => setAiTitle(e.target.value)}
          placeholder="z. B. mercedes 63 amg facelift*coupe*4Matic"
          style={{
            ...inp,
            border: '1px solid rgba(234,179,8,0.2)',
            borderRadius: '12px',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(234,179,8,0.5)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(234,179,8,0.2)')}
        />

        {aiTitle && (
          <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.1)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vorschau</div>
            <div style={{ fontSize: '16px', color: '#fde68a', fontWeight: '600' }}>{aiTitle}</div>
          </div>
        )}
      </div>

      {/* ── KI-Schreibstil ── */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', padding: '32px', marginBottom: '20px' }}>
        {section(
          <Sparkles size={20} color="#8b5cf6" />,
          'KI-Schreibstil',
          'Die KI übernimmt deinen Ton für alle Inserat-Beschreibungen',
          'rgba(139,92,246,0.12)'
        )}

        <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px', fontSize: '14px', color: '#64748b', lineHeight: 1.7 }}>
          💡 Schreib einfach einen kurzen Beispieltext — wie du normalerweise ein Auto beschreiben würdest. Sachlich, emotional, kurz, ausführlich — dein Stil.
        </div>

        <textarea
          rows={6}
          value={aiStyle}
          onChange={e => setAiStyle(e.target.value)}
          placeholder={`Beispiel:\n"Wir beim Autohaus Müller legen Wert auf ehrliche, direkte Beschreibungen ohne Marketingfloskeln. Wir erwähnen immer den Wartungsstand, ob das Fahrzeug scheckheftgepflegt ist, und etwaige Mängel."`}
          style={{
            ...inp, resize: 'vertical', lineHeight: 1.7,
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '12px',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.5)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(139,92,246,0.2)')}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '14px', color: '#3a5a78' }}>
          <span>{aiStyle.length} Zeichen</span>
          {aiStyle.length > 500 && <span style={{ color: '#f59e0b' }}>⚠️ 100–300 Zeichen empfohlen</span>}
        </div>
      </div>

      {/* ── Standard-Hintergrund ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '32px', marginBottom: '20px' }}>
        {section(<Layers size={20} color="#06b6d4" />, 'Standard-Hintergrund', 'Wird beim Foto-Upload automatisch vorausgewählt', 'rgba(6,182,212,0.12)')}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
          {BG_OPTIONS.map((b) => {
            const locked = b.tier === 'pro' && plan === 'free' || b.tier === 'business' && !['business', 'enterprise'].includes(plan);
            const selected = defaultBg === b.id;
            return (
              <button
                key={b.id}
                onClick={() => !locked && setDefaultBg(b.id)}
                style={{
                  background: b.color,
                  border: `2px solid ${selected ? '#2563eb' : 'transparent'}`,
                  borderRadius: '12px', padding: '14px 12px',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.4 : 1,
                  textAlign: 'left', position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                {selected && (
                  <div style={{ position: 'absolute', top: '7px', right: '7px', width: '18px', height: '18px', background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </div>
                )}
                {locked && (
                  <div style={{ position: 'absolute', top: '7px', right: '7px', fontSize: '9px', fontWeight: '700', background: b.tier === 'business' ? '#92400e' : 'rgba(139,92,246,0.85)', color: '#0f172a', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                    {b.tier.toUpperCase()}
                  </div>
                )}
                <div style={{ fontSize: '12px', fontWeight: '700', color: b.textColor }}>{b.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Wasserzeichen ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '32px', marginBottom: '28px' }}>
        {section(<ImageIcon size={20} color="#8b5cf6" />, 'Firmenname auf Fotos', 'Dezenter Schriftzug auf verarbeiteten Fahrzeugfotos (ab Premium)', 'rgba(139,92,246,0.1)')}

        {['premium', 'business', 'enterprise'].includes(plan) ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#e8f1fa' }}>Firmenname als Wasserzeichen</div>
              <div style={{ fontSize: '14px', color: '#64748b', marginTop: '3px' }}>
                Zeigt „<span style={{ color: '#8b5cf6' }}>{profile.company || 'Dein Autohaus'}</span>" unten links auf jedem Foto
              </div>
            </div>
            <button
              onClick={() => setWatermark(w => !w)}
              style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', background: watermark ? '#8b5cf6' : '#1e293b', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', transition: 'left 0.2s', left: watermark ? '25px' : '3px' }} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '12px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', flex: 1 }}>
              Ab <strong style={{ color: '#8b5cf6' }}>Premium</strong> verfügbar.
            </div>
            <Link href="/dashboard/pricing" style={{ background: '#7c3aed', color: '#0f172a', padding: '7px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Upgraden
            </Link>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={save}
        disabled={saving}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: saved ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
          border: saved ? '1px solid rgba(16,185,129,0.3)' : 'none',
          borderRadius: '14px', color: saved ? '#34d399' : '#fff',
          padding: '15px', fontSize: '14px', fontWeight: '700',
          cursor: saving ? 'not-allowed' : 'pointer', fontFamily: F,
          boxShadow: saved ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
          transition: 'all 0.2s',
        }}
      >
        {saving ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Wird gespeichert…</>
          : saved ? <><CheckCircle2 size={17} /> Alles gespeichert!</>
          : <><Save size={17} /> Händler-Profil speichern</>}
      </button>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}




