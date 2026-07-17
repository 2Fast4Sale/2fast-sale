'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Lock, Upload, Trash2, Crown, Zap, Sparkles, Info } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

interface Background {
  id: string;
  name: string;
  category: string;
  gradient?: { from: string; to: string; floor?: string };
  previewUrl?: string;
  tier: 'free' | 'pro' | 'business';
  popular?: boolean;
  new?: boolean;
}

const BACKGROUNDS: Background[] = [
  // ── FREE ──────────────────────────────────────────────────────────────────
  { id: 'studio_infinity', name: 'Infinity Studio', category: 'Studio', previewUrl: '/backgrounds/studio_infinity.jpg', tier: 'free', popular: true, new: true },
  // gradient.from = Wand (oben), gradient.to = Boden (unten), gradient.floor = Bodenfarbe
  { id: 'studio_white', name: 'White Studio',  category: 'Studio',  gradient: { from: '#b0b0b0', to: '#e8e8e8', floor: '#f4f4f4' }, tier: 'free' },
  { id: 'studio_grey',  name: 'Grey Studio',   category: 'Studio',  gradient: { from: '#606060', to: '#909090', floor: '#b0b0b0' }, tier: 'free' },
  { id: 'studio_dark',  name: 'Black Studio',  category: 'Studio',  gradient: { from: '#080808', to: '#1c1c1c', floor: '#2a2a2a' }, tier: 'free' },

  // ── PRO ───────────────────────────────────────────────────────────────────
  { id: 'studio_navy',   name: 'Navy Studio',   category: 'Studio',  gradient: { from: '#040c16', to: '#0d1e35', floor: '#1a3a5c' }, tier: 'pro', new: true },
  { id: 'studio_beige',  name: 'Beige Studio',  category: 'Studio',  gradient: { from: '#a09080', to: '#d0c4b0', floor: '#e0d8c8' }, tier: 'pro' },
  { id: 'studio_carbon', name: 'Carbon',        category: 'Studio',  gradient: { from: '#080808', to: '#1a1a1a', floor: '#282828' }, tier: 'pro' },
  { id: 'studio_ice',    name: 'Ice Blue',      category: 'Studio',  gradient: { from: '#88b8d8', to: '#cce4f4', floor: '#e8f4ff' }, tier: 'pro' },
  { id: 'studio_sunset', name: 'Sunset',        category: 'Studio',  gradient: { from: '#a03020', to: '#cc6040', floor: '#f08060' }, tier: 'pro' },

  // Showroom-Fotos (Unsplash — stabile URLs)
  {
    id: 'showroom_modern', name: 'Modern Showroom', category: 'Showroom',
    previewUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80',
    tier: 'pro', popular: true,
  },
  {
    id: 'showroom_dark', name: 'Dark Showroom', category: 'Showroom',
    previewUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
    tier: 'pro',
  },
  {
    id: 'showroom_luxury', name: 'Luxury Hall', category: 'Showroom',
    previewUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&q=80',
    tier: 'pro',
  },

  // ── BUSINESS ──────────────────────────────────────────────────────────────
  {
    id: 'outdoor_road', name: 'Open Road', category: 'Outdoor',
    previewUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80',
    tier: 'business', popular: true,
  },
  {
    id: 'outdoor_mountain', name: 'Mountain Pass', category: 'Outdoor',
    previewUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
    tier: 'business',
  },
  {
    id: 'outdoor_city', name: 'City Night', category: 'Outdoor',
    previewUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=80',
    tier: 'business', new: true,
  },
  {
    id: 'outdoor_forest', name: 'Forest Road', category: 'Outdoor',
    previewUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80',
    tier: 'business',
  },
  {
    id: 'outdoor_desert', name: 'Desert Dunes', category: 'Outdoor',
    previewUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&q=80',
    tier: 'business',
  },
  {
    id: 'outdoor_beach', name: 'Coastal Drive', category: 'Outdoor',
    previewUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&q=80',
    tier: 'business',
  },
];

const tierConfig = {
  free:     { label: 'Free',     color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: <Sparkles size={11} /> },
  pro:      { label: 'Pro',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <Zap size={11} />      },
  business: { label: 'Business', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <Crown size={11} />    },
};

export default function BackgroundsPage() {
  const [selected, setSelected]           = useState('studio_white');
  const [saved, setSaved]                 = useState(false);
  const [plan, setPlan]                   = useState<string>('free');
  const [customBgUrl, setCustomBgUrl]     = useState<string | null>(null);
  const [uploading, setUploading]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(localStorage.getItem('dealer_background') || 'studio_white');
    setCustomBgUrl(localStorage.getItem('dealer_custom_background_url') || null);

    // Plan immer frisch aus Supabase holen
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();
      const p = (data?.plan || 'free') as 'free' | 'pro' | 'business';
      setPlan(p);
      localStorage.setItem('dealer_plan', p);
    });
  }, []);

  const canUse = (tier: Background['tier']) => {
    // business / enterprise → alles freigeschaltet
    if (plan === 'business' || plan === 'enterprise') return true;
    // premium / basic / pro → free + pro Hintergründe
    if (plan === 'premium' || plan === 'basic' || plan === 'pro') return tier !== 'business';
    // free / starter → nur free
    return tier === 'free';
  };

  const select = (id: string) => {
    const bg = BACKGROUNDS.find(b => b.id === id);
    if (!bg || !canUse(bg.tier)) return;
    setSelected(id);
    localStorage.setItem('dealer_background', id);
    localStorage.removeItem('dealer_custom_background_url');
    setCustomBgUrl(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const uploadCustomBackground = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      const ext = file.name.split('.').pop();
      const path = `${user.id}/background.${ext}`;
      const { error } = await supabase.storage.from('vehicle-images').upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path);
      const url = data.publicUrl;

      setCustomBgUrl(url);
      localStorage.setItem('dealer_custom_background_url', url);
      localStorage.setItem('dealer_background', 'custom');
      setSelected('custom');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert('Upload fehlgeschlagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeCustom = () => {
    setCustomBgUrl(null);
    localStorage.removeItem('dealer_custom_background_url');
    localStorage.setItem('dealer_background', 'studio_white');
    setSelected('studio_white');
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1100px', margin: '0 auto', color: '#0f172a', fontFamily: '"Inter", -apple-system, sans-serif', minHeight: '100vh', background: '#f0f2f5' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px 0', letterSpacing: '-0.5px', color: '#0f172a' }}>Studio-Hintergründe</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Wähle den Hintergrund für deine Fahrzeugfotos.</p>
        </div>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700' }}>
            <CheckCircle2 size={14} /> Gespeichert!
          </div>
        )}
      </div>

      {/* Eigener Hintergrund hochladen — nur Pro+ */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '36px', height: '36px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={16} style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Eigener Showroom-Hintergrund</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Lade ein Foto deines Showrooms hoch — wird automatisch für alle Fahrzeuge verwendet</div>
          </div>
          {plan === 'free' && (
            <a href="/dashboard/pricing" style={{ marginLeft: 'auto', background: '#7c3aed', color: '#fff', padding: '7px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap' }}>Ab Pro</a>
          )}
        </div>

        {plan !== 'free' ? (
          customBgUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '140px', height: '90px', borderRadius: '10px', overflow: 'hidden', border: selected === 'custom' ? '2px solid #8b5cf6' : '2px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                <img src={customBgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Custom" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#e8f1fa', marginBottom: '4px' }}>Eigener Hintergrund aktiv</div>
                <div style={{ fontSize: '14px', color: '#a8c4dc', marginBottom: '12px' }}>Wird für alle neuen Fahrzeugfotos verwendet</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setSelected('custom'); localStorage.setItem('dealer_background', 'custom'); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
                    style={{ background: selected === 'custom' ? '#8b5cf6' : 'rgba(139,92,246,0.15)', color: selected === 'custom' ? '#fff' : '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)', padding: '7px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                    {selected === 'custom' ? '✓ Aktiv' : 'Verwenden'}
                  </button>
                  <button onClick={() => fileRef.current?.click()} style={{ background: 'transparent', color: '#a8c4dc', border: '1px solid rgba(255,255,255,0.1)', padding: '7px 14px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    Ersetzen
                  </button>
                  <button onClick={removeCustom} style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '7px 12px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ width: '100%', border: '2px dashed rgba(139,92,246,0.3)', borderRadius: '12px', padding: '32px', background: 'rgba(139,92,246,0.04)', cursor: 'pointer', color: '#8b5cf6', fontSize: '14px', fontWeight: '600', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Upload size={24} />
              {uploading ? 'Wird hochgeladen…' : 'Showroom-Foto hochladen'}
              <span style={{ fontSize: '14px', color: '#a8c4dc', fontWeight: '400' }}>JPG oder PNG, max. 10 MB</span>
            </button>
          )
        ) : (
          <div style={{ border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#7aaac8', fontSize: '14px' }}>
            Ab Pro verfügbar
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadCustomBackground(f); e.target.value = ''; }} />
      </div>

      {/* Hintergründe Grid */}
      <div style={{ marginBottom: '10px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Studio-Verläufe & Showrooms</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {BACKGROUNDS.map(bg => {
          const unlocked  = canUse(bg.tier);
          const isSelected = selected === bg.id;
          const t = tierConfig[bg.tier];

          return (
            <div key={bg.id} onClick={() => unlocked && select(bg.id)}
              style={{ backgroundColor: '#ffffff', border: `2px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`, borderRadius: '14px', overflow: 'hidden', cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : 0.6, boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.15)' : '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}>

              {/* Preview */}
              <div style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                {bg.gradient && (
                  <>
                    {/* Wand (oben 62%) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '62%', background: `linear-gradient(180deg, ${bg.gradient.from} 0%, ${bg.gradient.to} 100%)` }} />
                    {/* Boden (unten 38%) */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: `linear-gradient(180deg, ${bg.gradient.floor ?? bg.gradient.to} 0%, ${bg.gradient.to} 100%)` }} />
                    {/* Infinity-Übergang */}
                    <div style={{ position: 'absolute', left: '50%', top: '54%', transform: 'translate(-50%, -50%)', width: '120%', height: '40px', background: bg.gradient.floor ?? bg.gradient.to, borderRadius: '50%', opacity: 0.6 }} />
                    {/* Zentral-Glow */}
                    <div style={{ position: 'absolute', left: '50%', top: '55%', transform: 'translate(-50%, -50%)', width: '60%', height: '50%', background: `radial-gradient(ellipse, rgba(255,255,255,0.18) 0%, transparent 70%)` }} />
                  </>
                )}
                {bg.previewUrl && (
                  <img src={bg.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: unlocked ? 'none' : 'grayscale(60%) brightness(0.7)', position: 'absolute', inset: 0 }} alt={bg.name} />
                )}

                {!unlocked && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,14,26,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Lock size={18} style={{ color: t.color }} />
                    <span style={{ fontSize: '14px', fontWeight: '700', color: t.color }}>{t.label} erforderlich</span>
                  </div>
                )}

                {isSelected && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', width: '24px', height: '24px', background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={13} color="#fff" />
                  </div>
                )}

                {bg.popular && <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.5)', color: '#fbbf24', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px' }}>⭐ Beliebt</span>}
                {bg.new && <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.5)', color: '#34d399', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px' }}>✦ Neu</span>}
              </div>

              {/* Info */}
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: isSelected ? '#6366f1' : '#0f172a' }}>{bg.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '1px' }}>{bg.category}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: t.bg, color: t.color, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                  {t.icon} {t.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
        <Info size={15} style={{ color: '#3b82f6', marginTop: '1px', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
          Der Hintergrund wird automatisch für alle neuen Inserat-Fotos verwendet. PhotoRoom KI entfernt den Original-Hintergrund und fügt einen professionellen Schatten hinzu.
        </p>
      </div>
    </div>
  );
}






