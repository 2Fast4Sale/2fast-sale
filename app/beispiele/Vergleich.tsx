'use client';

/**
 * Der Schieberegler zwischen Vorher und Nachher.
 *
 * Bewusst mit Zeigergesten (Pointer Events) statt getrennt für Maus und
 * Touch: Das Ding wird auf einem Handy mit dem Daumen bedient, während
 * jemand daneben steht und zuschaut. Ein Regler, der beim ersten Wischen
 * nicht reagiert, kostet die Vorführung.
 *
 * `touchAction: none` ist nötig, sonst scrollt die Seite mit, statt den
 * Regler zu ziehen.
 */

import { useRef, useState } from 'react';

export default function Vergleich({
  vorher, nachher, titel,
}: { vorher: string; nachher: string; titel: string }) {
  const [anteil, setAnteil] = useState(50);
  const rahmen = useRef<HTMLDivElement>(null);
  const zieht = useRef(false);

  const setzen = (x: number) => {
    const k = rahmen.current?.getBoundingClientRect();
    if (!k || k.width === 0) return;
    setAnteil(Math.max(0, Math.min(100, ((x - k.left) / k.width) * 100)));
  };

  return (
    <div
      ref={rahmen}
      onPointerDown={e => { zieht.current = true; e.currentTarget.setPointerCapture(e.pointerId); setzen(e.clientX); }}
      onPointerMove={e => { if (zieht.current) setzen(e.clientX); }}
      onPointerUp={() => { zieht.current = false; }}
      onPointerCancel={() => { zieht.current = false; }}
      style={{
        position: 'relative', width: '100%', aspectRatio: '3 / 2',
        borderRadius: 12, overflow: 'hidden', background: '#141416',
        border: '1px solid #27272a', touchAction: 'none', cursor: 'ew-resize',
        userSelect: 'none',
      }}
    >
      {/* Nachher liegt unten und ist immer vollständig da. */}
      <img src={nachher} alt={`${titel} — Studiobild`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Vorher wird von links beschnitten. */}
      <img src={vorher} alt={`${titel} — Originalfoto`}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          clipPath: `inset(0 ${100 - anteil}% 0 0)`,
        }} />

      {/* Die Kante. */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${anteil}%`,
        width: 2, background: '#fafafa', transform: 'translateX(-1px)',
        boxShadow: '0 0 8px rgba(0,0,0,.55)',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: `${anteil}%`,
        transform: 'translate(-50%, -50%)',
        width: 34, height: 34, borderRadius: '50%',
        background: '#fafafa', boxShadow: '0 1px 8px rgba(0,0,0,.5)',
        display: 'grid', placeItems: 'center',
        fontSize: 13, color: '#18181b', fontWeight: 700, letterSpacing: '-0.05em',
      }}>
        ↔
      </div>

      {/* Beschriftung, damit auch ohne Erklärung klar ist, was man sieht. */}
      {(['vorher', 'nachher'] as const).map(seite => (
        <span key={seite} style={{
          position: 'absolute', top: 10,
          [seite === 'vorher' ? 'left' : 'right']: 10,
          padding: '3px 8px', borderRadius: 6,
          background: 'rgba(9,9,11,.72)', color: '#e4e4e7',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
          textTransform: 'uppercase', pointerEvents: 'none',
        }}>
          {seite === 'vorher' ? 'Hof' : 'Inserat'}
        </span>
      ))}
    </div>
  );
}
