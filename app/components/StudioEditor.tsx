'use client';

/**
 * Editor für einen eigenen Studio-Hintergrund.
 *
 * Die vier Farben entsprechen exakt denen, die /api/pixelcut beim Rendern
 * verwendet — die Vorschau hier ist deshalb keine Annäherung, sondern zeigt
 * denselben Aufbau: Wandverlauf oben, Bodenverlauf unten, Lichtkegel dazwischen.
 */

import React, { useState } from 'react';
import { Paintbrush, RotateCcw, Check, Loader2 } from 'lucide-react';

const F = '"Inter", -apple-system, sans-serif';

export interface StudioPreset {
  /** Wand unten — die Grundfarbe des Raums */
  backdrop: string;
  /** Boden vorne */
  floor: string;
  /** Lichtkegel hinter dem Fahrzeug */
  glow: string;
  /** Wand oben — meist dunkler, erzeugt die Studio-Tiefe */
  vignette: string;
}

export const DEFAULT_PRESET: StudioPreset = {
  backdrop: '#d0d0d0',
  floor:    '#e8e8e8',
  glow:     '#ffffff',
  vignette: '#2a2a2a',
};

/** Startpunkte, damit niemand vor vier weissen Feldern sitzt */
const VORLAGEN: { name: string; preset: StudioPreset }[] = [
  { name: 'Weiss',   preset: { backdrop: '#d0d0d0', floor: '#e8e8e8', glow: '#ffffff', vignette: '#2a2a2a' } },
  { name: 'Grau',    preset: { backdrop: '#707070', floor: '#909090', glow: '#c0c0c0', vignette: '#1a1a1a' } },
  { name: 'Schwarz', preset: { backdrop: '#0e0e0e', floor: '#1c1c1c', glow: '#3a3a3a', vignette: '#000000' } },
  { name: 'Navy',    preset: { backdrop: '#060e18', floor: '#0d1e35', glow: '#1a4080', vignette: '#000014' } },
  { name: 'Beige',   preset: { backdrop: '#b8aa94', floor: '#d4c9b4', glow: '#eee6d6', vignette: '#140a00' } },
  { name: 'Sunset',  preset: { backdrop: '#c0503a', floor: '#d47050', glow: '#ff9966', vignette: '#3c0000' } },
];

const FELDER: { key: keyof StudioPreset; label: string; hilfe: string }[] = [
  { key: 'vignette', label: 'Wand oben',   hilfe: 'Dunkler Rand — erzeugt die Studio-Tiefe' },
  { key: 'backdrop', label: 'Wand unten',  hilfe: 'Grundfarbe des Raums' },
  { key: 'floor',    label: 'Boden',       hilfe: 'Fläche, auf der das Fahrzeug steht' },
  { key: 'glow',     label: 'Lichtkegel',  hilfe: 'Aufhellung hinter dem Fahrzeug' },
];

/** Vorschau — baut denselben Aufbau nach, den der Server rendert. */
export function StudioPreview({ preset, height = 190 }: { preset: StudioPreset; height?: number }) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: `${height}px`,
      borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0',
    }}>
      {/* Wand: oben vignette → unten backdrop, bis zur Bodenlinie bei 64 % */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '64%',
        background: `linear-gradient(180deg, ${preset.vignette} 0%, ${preset.backdrop} 100%)`,
      }} />
      {/* Boden: oben floor → unten backdrop */}
      <div style={{
        position: 'absolute', top: '64%', left: 0, right: 0, bottom: 0,
        background: `linear-gradient(180deg, ${preset.floor} 0%, ${preset.backdrop} 100%)`,
      }} />
      {/* Lichtkegel hinter der Fahrzeugposition */}
      <div style={{
        position: 'absolute', left: '50%', top: '75%', transform: 'translate(-50%, -50%)',
        width: '96%', height: '90%', pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, ${preset.glow} 0%, transparent 62%)`,
        opacity: 0.55,
      }} />
      {/* Platzhalter-Fahrzeug, damit der Kontrast beurteilbar ist */}
      <svg viewBox="0 0 130 60" style={{
        position: 'absolute', left: '50%', top: '62%', transform: 'translate(-50%, -50%)',
        width: '62%', pointerEvents: 'none', opacity: 0.5,
      }}>
        <g fill="rgba(0,0,0,0.55)">
          <path d="M12 40 L20 24 Q26 16 40 15 L64 15 Q78 16 88 25 L108 29 Q116 31 116 38 L116 44 L12 44 Z" />
          <circle cx="33" cy="45" r="8" /><circle cx="93" cy="45" r="8" />
        </g>
      </svg>
    </div>
  );
}

interface Props {
  initial?: StudioPreset | null;
  saving?: boolean;
  onSave: (preset: StudioPreset) => void;
}

export default function StudioEditor({ initial, saving = false, onSave }: Props) {
  const [preset, setPreset] = useState<StudioPreset>(initial ?? DEFAULT_PRESET);

  const set = (key: keyof StudioPreset, value: string) =>
    setPreset(p => ({ ...p, [key]: value }));

  const geaendert = JSON.stringify(preset) !== JSON.stringify(initial ?? DEFAULT_PRESET);

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px',
      padding: '20px', fontFamily: F, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Paintbrush size={16} style={{ color: '#6366f1' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
            Eigenes Studio gestalten
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748b' }}>
            Vier Farben — die Vorschau zeigt genau, was gerendert wird.
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <StudioPreview preset={preset} />
      </div>

      {/* Vorlagen */}
      <div style={{
        fontSize: '11px', fontWeight: '700', color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px',
      }}>
        Vorlage als Startpunkt
      </div>
      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {VORLAGEN.map(v => (
          <button
            key={v.name}
            onClick={() => setPreset(v.preset)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '6px 11px', borderRadius: '8px', cursor: 'pointer',
              border: '1px solid #e2e8f0', background: '#fff',
              fontSize: '12.5px', fontWeight: '600', color: '#475569', fontFamily: F,
            }}
          >
            <span style={{
              width: '14px', height: '14px', borderRadius: '4px', flexShrink: 0,
              background: `linear-gradient(135deg, ${v.preset.vignette}, ${v.preset.floor})`,
              border: '1px solid rgba(0,0,0,0.12)',
            }} />
            {v.name}
          </button>
        ))}
      </div>

      {/* Farbwähler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '18px' }}>
        {FELDER.map(({ key, label, hilfe }) => (
          <div key={key} style={{
            border: '1px solid #e2e8f0', borderRadius: '10px', padding: '11px 12px',
            display: 'flex', alignItems: 'center', gap: '11px',
          }}>
            <input
              type="color"
              aria-label={label}
              value={preset[key]}
              onChange={e => set(key, e.target.value)}
              style={{
                width: '40px', height: '40px', padding: 0, flexShrink: 0,
                border: '1px solid #e2e8f0', borderRadius: '8px',
                background: 'none', cursor: 'pointer',
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{label}</div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.35 }}>{hilfe}</div>
              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                {preset[key]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onSave(preset)}
          disabled={saving || !geaendert}
          style={{
            flex: 1, minWidth: '180px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px', borderRadius: '10px', border: 'none',
            background: saving || !geaendert ? '#cbd5e1' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color: '#fff', fontSize: '14px', fontWeight: '800', fontFamily: F,
            cursor: saving || !geaendert ? 'default' : 'pointer',
          }}
        >
          {saving
            ? <><Loader2 size={15} style={{ animation: 'se-spin 0.8s linear infinite' }} /> Wird gespeichert…</>
            : <><Check size={15} /> Als eigenes Studio speichern</>}
        </button>
        <button
          onClick={() => setPreset(initial ?? DEFAULT_PRESET)}
          disabled={!geaendert}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '12px 16px', borderRadius: '10px',
            border: '1px solid #e2e8f0', background: '#fff',
            color: geaendert ? '#475569' : '#cbd5e1',
            fontSize: '13px', fontWeight: '700', fontFamily: F,
            cursor: geaendert ? 'pointer' : 'default',
          }}
        >
          <RotateCcw size={14} /> Zurücksetzen
        </button>
      </div>

      <style>{`@keyframes se-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
