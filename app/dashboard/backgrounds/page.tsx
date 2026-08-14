'use client';

/**
 * Hintergrund-Auswahl.
 *
 * Zeigt die Bibliothek aus lib/backgrounds sowie den selbst hochgeladenen
 * Showroom des Händlers. Die Vorschau ist die echte Datei — was hier zu sehen
 * ist, geht später genauso an PhotoRoom.
 */

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Lock, Upload, Trash2, Crown, Zap, Sparkles, Info } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import {
  BACKGROUNDS, DEFAULT_BACKGROUND_ID, OWN_SHOWROOM_ID,
  canUseBackground, type BackgroundTier,
} from '../../../lib/backgrounds';

const F = '"Inter", -apple-system, sans-serif';

const tierConfig: Record<BackgroundTier, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  free:     { label: 'Free',     color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: <Sparkles size={11} /> },
  pro:      { label: 'Pro',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <Zap size={11} />      },
  business: { label: 'Business', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <Crown size={11} />    },
};

export default function BackgroundsPage() {
  const [selected, setSelected]       = useState(DEFAULT_BACKGROUND_ID);
  const [saved, setSaved]             = useState(false);
  const [plan, setPlan]               = useState('free');
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(localStorage.getItem('dealer_background') || DEFAULT_BACKGROUND_ID);
    setCustomBgUrl(localStorage.getItem('dealer_custom_background_url') || null);

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
      const p = data?.plan || 'free';
      setPlan(p);
      localStorage.setItem('dealer_plan', p);
    });
  }, []);

  const bestaetigen = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const select = (id: string, tier: BackgroundTier) => {
    if (!canUseBackground(plan, tier)) return;
    setSelected(id);
    localStorage.setItem('dealer_background', id);
    localStorage.removeItem('dealer_custom_background_url');
    bestaetigen();
  };

  const eigenenWaehlen = () => {
    if (!customBgUrl) return;
    setSelected(OWN_SHOWROOM_ID);
    localStorage.setItem('dealer_background', OWN_SHOWROOM_ID);
    localStorage.setItem('dealer_custom_background_url', customBgUrl);
    bestaetigen();
  };

  const uploadCustomBackground = async (file: File) => {
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      const ext  = file.name.split('.').pop();
      const path = `${user.id}/background.${ext}`;
      const { error } = await supabase.storage.from('vehicle-images').upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path);
      // Zeitstempel gegen Caching — sonst zeigt der Browser nach dem Ersetzen
      // weiter das alte Bild.
      const url = `${data.publicUrl}?v=${Date.now()}`;

      setCustomBgUrl(url);
      localStorage.setItem('dealer_custom_background_url', url);
      localStorage.setItem('dealer_background', OWN_SHOWROOM_ID);
      setSelected(OWN_SHOWROOM_ID);
      bestaetigen();
    } catch (err) {
      alert('Upload fehlgeschlagen: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    } finally {
      setUploading(false);
    }
  };

  const removeCustom = () => {
    setCustomBgUrl(null);
    localStorage.removeItem('dealer_custom_background_url');
    localStorage.setItem('dealer_background', DEFAULT_BACKGROUND_ID);
    setSelected(DEFAULT_BACKGROUND_ID);
  };

  const darfEigenen = plan !== 'free';

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1100px', margin: '0 auto', color: '#0f172a', fontFamily: F, minHeight: '100vh', background: '#f0f2f5' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Studio-Hintergründe</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Wähle den Hintergrund für deine Fahrzeugfotos.
          </p>
        </div>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700' }}>
            <CheckCircle2 size={14} /> Gespeichert
          </div>
        )}
      </div>

      {/* ── Eigener Showroom ── */}
      <div style={{ background: '#fff', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: darfEigenen ? '16px' : 0 }}>
          <div style={{ width: '36px', height: '36px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Upload size={16} style={{ color: '#8b5cf6' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>Eigener Showroom</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Foto deines Showrooms hochladen — wird für alle Fahrzeuge verwendet
            </div>
          </div>
          {!darfEigenen && (
            <a href="/dashboard/pricing" style={{ background: '#7c3aed', color: '#fff', padding: '8px 15px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap' }}>Ab Pro</a>
          )}
        </div>

        {darfEigenen && (
          customBgUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ width: '150px', height: '95px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: `2px solid ${selected === OWN_SHOWROOM_ID ? '#8b5cf6' : '#e2e8f0'}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={customBgUrl} alt="Eigener Showroom" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                  {selected === OWN_SHOWROOM_ID ? 'Wird für alle Fahrzeugfotos verwendet.' : 'Hochgeladen, aber nicht aktiv.'}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={eigenenWaehlen}
                    style={{ background: selected === OWN_SHOWROOM_ID ? '#8b5cf6' : 'rgba(139,92,246,0.12)', color: selected === OWN_SHOWROOM_ID ? '#fff' : '#7c3aed', border: '1px solid rgba(139,92,246,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: F }}>
                    {selected === OWN_SHOWROOM_ID ? '✓ Aktiv' : 'Verwenden'}
                  </button>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ background: '#fff', color: '#475569', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: F }}>
                    Ersetzen
                  </button>
                  <button onClick={removeCustom}
                    style={{ background: '#fff', color: '#ef4444', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ width: '100%', border: '2px dashed rgba(139,92,246,0.3)', borderRadius: '12px', padding: '28px', background: 'rgba(139,92,246,0.04)', cursor: 'pointer', color: '#7c3aed', fontSize: '14px', fontWeight: '600', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontFamily: F }}>
              <Upload size={22} />
              {uploading ? 'Wird hochgeladen…' : 'Showroom-Foto hochladen'}
              <span style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: '400' }}>
                JPG oder PNG, mindestens 2000 px breit
              </span>
            </button>
          )
        )}

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadCustomBackground(f); e.target.value = ''; }} />
      </div>

      {/* ── Bibliothek ── */}
      <div style={{ marginBottom: '10px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        Hintergründe
      </div>

      {BACKGROUNDS.length === 0 ? (
        <div style={{ background: '#fff', border: '1px dashed #e2e8f0', borderRadius: '14px', padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
          Noch keine Hintergründe hinterlegt.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {BACKGROUNDS.map(bg => {
            const frei     = canUseBackground(plan, bg.tier);
            const istAktiv = selected === bg.id;
            const t        = tierConfig[bg.tier];
            return (
              <div key={bg.id} onClick={() => select(bg.id, bg.tier)}
                style={{
                  background: '#fff', borderRadius: '14px', overflow: 'hidden',
                  border: `2px solid ${istAktiv ? '#6366f1' : '#e2e8f0'}`,
                  cursor: frei ? 'pointer' : 'not-allowed', opacity: frei ? 1 : 0.6,
                  boxShadow: istAktiv ? '0 0 0 3px rgba(99,102,241,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s',
                }}>
                <div style={{ height: '140px', position: 'relative', background: '#f1f5f9' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/backgrounds/${bg.file}`} alt={bg.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: frei ? 'none' : 'grayscale(60%) brightness(0.75)' }} />
                  {!frei && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Lock size={18} style={{ color: t.color }} />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: t.color }}>{t.label} erforderlich</span>
                    </div>
                  )}
                  {istAktiv && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', width: '24px', height: '24px', background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={13} color="#fff" />
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: istAktiv ? '#6366f1' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bg.label}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{bg.category}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: t.bg, color: t.color, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                    {t.icon} {t.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
        <Info size={15} style={{ color: '#3b82f6', marginTop: '1px', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
          Der gewählte Hintergrund wird für alle neuen Fahrzeugfotos verwendet.
          PhotoRoom stellt das Fahrzeug frei, setzt einen Schatten und platziert es darauf.
        </p>
      </div>
    </div>
  );
}
