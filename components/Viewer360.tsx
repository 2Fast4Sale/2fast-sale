'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Play, Pause, Maximize2 } from 'lucide-react';

const F = '"DM Sans", -apple-system, sans-serif';

interface Viewer360Props {
  images: string[];       // URLs in Reihenfolge (z.B. alle 15° einmal rum)
  autoPlay?: boolean;
}

export function Viewer360({ images, autoPlay = false }: Viewer360Props) {
  const [index,     setIndex]     = useState(0);
  const [dragging,  setDragging]  = useState(false);
  const [playing,   setPlaying]   = useState(autoPlay);
  const [fullscreen, setFullscreen] = useState(false);
  const startX    = useRef(0);
  const lastIndex = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = images.length;

  // Auto-Rotate
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setIndex(i => (i + 1) % total);
      }, 80);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, total]);

  // Maus-Drag
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setPlaying(false);
    startX.current = e.clientX;
    lastIndex.current = index;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const diff = e.clientX - startX.current;
    const step = Math.floor(diff / 8); // 8px pro Frame
    const newIndex = ((lastIndex.current - step) % total + total) % total;
    setIndex(newIndex);
  };
  const onMouseUp = () => setDragging(false);

  // Touch-Drag
  const onTouchStart = (e: React.TouchEvent) => {
    setPlaying(false);
    startX.current = e.touches[0].clientX;
    lastIndex.current = index;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current;
    const step = Math.floor(diff / 6);
    const newIndex = ((lastIndex.current - step) % total + total) % total;
    setIndex(newIndex);
  };

  const reset = () => { setIndex(0); setPlaying(false); };

  const wrapStyle: React.CSSProperties = fullscreen
    ? { position: 'fixed', inset: 0, zIndex: 99999, background: '#000', display: 'flex', flexDirection: 'column' }
    : { position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#0a1628', userSelect: 'none' };

  return (
    <div style={wrapStyle} ref={containerRef}>
      {/* Bild */}
      <div
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => {}}
        style={{
          flex: 1,
          cursor: dragging ? 'grabbing' : 'grab',
          position: 'relative',
          aspectRatio: fullscreen ? undefined : '16/9',
          overflow: 'hidden',
        }}
      >
        {/* Alle Bilder preloaden, nur aktives sichtbar */}
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={`360° Frame ${i + 1}`}
            draggable={false}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: i === index ? 1 : 0,
              transition: 'none',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* 360°-Badge */}
        <div style={{
          position: 'absolute', top: '12px', left: '12px',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', padding: '5px 12px', borderRadius: '8px',
          fontSize: '12px', fontWeight: '800', fontFamily: F,
          display: 'flex', alignItems: 'center', gap: '5px',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '14px' }}>360°</span>
          <span style={{ color: '#7a9cbc', fontWeight: '400' }}>| Ziehen zum Drehen</span>
        </div>

        {/* Frame-Indikator unten */}
        <div style={{
          position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '3px', pointerEvents: 'none',
        }}>
          {images.map((_, i) => (
            <div key={i} style={{
              width: i === index ? '16px' : '4px',
              height: '4px',
              borderRadius: '2px',
              background: i === index ? '#3b82f6' : 'rgba(255,255,255,0.25)',
              transition: 'all 0.15s',
            }} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.4)',
        borderTop: fullscreen ? 'none' : '1px solid rgba(255,255,255,0.06)',
        fontFamily: F,
      }}>
        <button
          onClick={() => setPlaying(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: playing ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)', border: `1px solid ${playing ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '7px', color: playing ? '#60a5fa' : '#a8c4dc', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
          {playing ? 'Stop' : 'Auto-Drehen'}
        </button>

        <button
          onClick={reset}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#7a9cbc', padding: '6px 10px', cursor: 'pointer', fontSize: '13px' }}
          title="Zurücksetzen"
        >
          <RotateCcw size={13} />
        </button>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: '12px', color: '#3a5a78', fontWeight: '600' }}>
          {index + 1} / {total}
        </span>

        <button
          onClick={() => setFullscreen(f => !f)}
          style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#7a9cbc', padding: '6px 10px', cursor: 'pointer' }}
          title={fullscreen ? 'Verkleinern' : 'Vollbild'}
        >
          <Maximize2 size={13} />
        </button>
      </div>
    </div>
  );
}
