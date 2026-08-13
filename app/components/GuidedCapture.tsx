'use client';

/**
 * Geführte Fahrzeugaufnahme.
 *
 * Führt den Fotografen durch eine feste Reihenfolge von Winkeln und blendet
 * pro Schritt eine Silhouette ein, an der er das Fahrzeug ausrichtet.
 *
 * Warum das wichtig ist:
 *  - Händler ohne Fotografie-Kenntnisse bekommen gleichmässige Bilder
 *  - Gleichmässige Eingangsbilder heisst weniger Fehlschläge beim Freistellen
 *    (und damit direkt weniger API-Kosten)
 *  - Die Aussenwinkel liegen in Rotationsreihenfolge vor, dadurch funktioniert
 *    der 360°-Viewer automatisch
 *
 * Läuft komplett im Browser. Kein Bild verlässt das Gerät, bis der Nutzer
 * fertig ist — es entstehen keine laufenden Kosten.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, RotateCcw, Check, SkipForward, AlertTriangle, Loader2 } from 'lucide-react';

const F = '"Inter", -apple-system, sans-serif';

type Silhouette = 'front' | 'front34' | 'side' | 'rear34' | 'rear' | 'interior' | 'detail';

interface Shot {
  id: string;
  label: string;
  hint: string;
  silhouette: Silhouette;
  /** Silhouette horizontal spiegeln (rechte Fahrzeugseite) */
  mirrored?: boolean;
  /** Zählt zur 360°-Rotation */
  rotation?: boolean;
}

/**
 * Reihenfolge ist bewusst gewählt:
 * 1. Der erste Schuss ist der klassische Titelbild-Winkel.
 * 2. Die ersten acht laufen einmal ums Fahrzeug — das ergibt die 360°-Serie.
 * 3. Innenraum-Details danach, damit bei kleinem Foto-Limit die wichtigen
 *    Aussenaufnahmen zuerst entstehen.
 */
export const SHOTS: Shot[] = [
  { id: 'front34_l', label: 'Front 3/4 links',  hint: 'Der Klassiker fürs Titelbild — schräg von vorne links.', silhouette: 'front34', rotation: true },
  { id: 'side_l',    label: 'Seite links',      hint: 'Fahrzeug füllt die Breite, Räder komplett im Bild.',     silhouette: 'side',    rotation: true },
  { id: 'rear34_l',  label: 'Heck 3/4 links',   hint: 'Schräg von hinten links.',                               silhouette: 'rear34',  rotation: true },
  { id: 'rear',      label: 'Heck',             hint: 'Gerade von hinten, mittig ausrichten.',                  silhouette: 'rear',    rotation: true },
  { id: 'rear34_r',  label: 'Heck 3/4 rechts',  hint: 'Schräg von hinten rechts.',                              silhouette: 'rear34',  rotation: true, mirrored: true },
  { id: 'side_r',    label: 'Seite rechts',     hint: 'Fahrzeug füllt die Breite, Räder komplett im Bild.',     silhouette: 'side',    rotation: true, mirrored: true },
  { id: 'front34_r', label: 'Front 3/4 rechts', hint: 'Schräg von vorne rechts.',                               silhouette: 'front34', rotation: true, mirrored: true },
  { id: 'front',     label: 'Front',            hint: 'Gerade von vorne, mittig ausrichten.',                   silhouette: 'front',   rotation: true },
  { id: 'cockpit',   label: 'Cockpit',          hint: 'Vom Fahrersitz aus — Lenkrad und Mittelkonsole.',        silhouette: 'interior' },
  { id: 'odometer',  label: 'Tacho',            hint: 'Kilometerstand muss lesbar sein.',                        silhouette: 'detail'   },
  { id: 'seats',     label: 'Rücksitze',        hint: 'Tür auf, Rückbank komplett im Bild.',                    silhouette: 'interior' },
  { id: 'engine',    label: 'Motorraum',        hint: 'Haube auf, von oben fotografieren.',                     silhouette: 'detail'   },
];

/** Silhouetten als grobe Ausrichtungshilfe — kein exaktes Abpaus-Template. */
function SilhouettePath({ kind }: { kind: Silhouette }) {
  const common = { fill: 'none', stroke: 'rgba(255,255,255,0.85)', strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (kind) {
    case 'side':
      return (
        <g {...common}>
          <path d="M12 62 L20 44 Q26 34 40 32 L64 32 Q78 33 88 44 L108 48 Q116 50 116 58 L116 66 L104 66 M40 66 L74 66 M12 62 L12 66 L26 66" />
          <circle cx="33" cy="66" r="9" /><circle cx="93" cy="66" r="9" />
        </g>
      );
    case 'front34':
      return (
        <g {...common}>
          <path d="M18 64 L24 46 Q30 36 46 34 L74 34 Q88 35 96 44 L112 50 Q120 53 120 62 L120 68 L108 68 M46 68 L82 68 M18 64 L18 68 L30 68" />
          <circle cx="38" cy="68" r="8.5" /><circle cx="96" cy="68" r="7" />
          <path d="M24 46 Q40 42 62 42 Q80 42 96 44" />
        </g>
      );
    case 'rear34':
      return (
        <g {...common}>
          <path d="M20 62 L26 44 Q34 34 50 33 L78 33 Q92 35 100 46 L114 52 Q120 55 120 63 L120 68 L108 68 M48 68 L84 68 M20 62 L20 68 L32 68" />
          <circle cx="40" cy="68" r="8.5" /><circle cx="96" cy="68" r="7" />
          <path d="M26 44 L52 44 L52 33" />
        </g>
      );
    case 'front':
      return (
        <g {...common}>
          <path d="M28 68 L32 48 Q36 38 48 36 L82 36 Q94 38 98 48 L102 68 M32 50 L98 50 M38 60 L92 60" />
          <circle cx="42" cy="68" r="7" /><circle cx="88" cy="68" r="7" />
        </g>
      );
    case 'rear':
      return (
        <g {...common}>
          <path d="M28 68 L31 48 Q34 37 47 36 L83 36 Q96 37 99 48 L102 68 M31 50 L99 50 M36 58 L48 58 M82 58 L94 58" />
          <circle cx="42" cy="68" r="7" /><circle cx="88" cy="68" r="7" />
        </g>
      );
    case 'interior':
      return (
        <g {...common}>
          <rect x="22" y="26" width="86" height="52" rx="7" />
          <path d="M22 46 L108 46 M46 26 L46 78" strokeDasharray="5 6" />
        </g>
      );
    default:
      return (
        <g {...common}>
          <rect x="34" y="30" width="62" height="44" rx="6" strokeDasharray="7 6" />
        </g>
      );
  }
}

interface Props {
  /** Wie viele Fotos noch erlaubt sind (Plan-Limit) */
  maxShots?: number;
  onDone: (files: File[]) => void;
  onClose: () => void;
}

export default function GuidedCapture({ maxShots = 12, onDone, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const shots = SHOTS.slice(0, Math.max(1, maxShots));

  const [index,    setIndex]    = useState(0);
  const [captured, setCaptured] = useState<Record<string, { file: File; url: string }>>({});
  const [ready,    setReady]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [flash,    setFlash]    = useState(false);
  /**
   * Sperrt den Auslöser, solange eine Aufnahme noch verarbeitet wird.
   * Ohne das greifen zwei schnelle Taps auf denselben Winkel zu: die zweite
   * Aufnahme überschreibt die erste, der Index springt aber zweimal weiter —
   * ein Winkel fiele still aus.
   *
   * Die Sperre MUSS eine Ref sein: mehrere Taps im selben Frame sehen sonst
   * alle denselben State-Wert, weil React erst nach dem Frame neu rendert.
   * Das State-Flag daneben dient nur der Optik.
   */
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const shot = shots[index];
  const doneCount = Object.keys(captured).length;

  /* ── Kamera starten ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width:  { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (err) {
        const name = (err as DOMException)?.name;
        setError(
          name === 'NotAllowedError'
            ? 'Kamera-Zugriff wurde abgelehnt. Erlaube ihn in den Browser-Einstellungen und lade die Seite neu.'
            : name === 'NotFoundError'
            ? 'Keine Kamera gefunden.'
            : 'Kamera konnte nicht gestartet werden. Die geführte Aufnahme braucht HTTPS.'
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  /* Objekt-URLs aufräumen, damit der Speicher nicht vollläuft */
  useEffect(() => () => {
    Object.values(captured).forEach(c => URL.revokeObjectURL(c.url));
    // Bewusst nur beim Unmount — captured aendert sich waehrend der Session staendig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !shot || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    setFlash(true);
    setTimeout(() => setFlash(false), 140);

    canvas.toBlob(blob => {
      if (!blob) { busyRef.current = false; setBusy(false); return; }
      const file = new File([blob], `${shot.id}.jpg`, { type: 'image/jpeg' });
      setCaptured(prev => {
        // Beim Wiederholen die alte URL freigeben
        if (prev[shot.id]) URL.revokeObjectURL(prev[shot.id].url);
        return { ...prev, [shot.id]: { file, url: URL.createObjectURL(file) } };
      });
      setIndex(i => Math.min(i + 1, shots.length - 1));
      busyRef.current = false;
      setBusy(false);
    }, 'image/jpeg', 0.92);
  }, [shot, shots.length]);

  const finish = () => {
    // Reihenfolge der SHOTS beibehalten — davon haengt die 360°-Serie ab
    const files = shots.map(s => captured[s.id]?.file).filter(Boolean) as File[];
    streamRef.current?.getTracks().forEach(t => t.stop());
    onDone(files);
  };

  const close = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    onClose();
  };

  const isLast = index === shots.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: '#000',
      display: 'flex', flexDirection: 'column', fontFamily: F,
    }}>

      {/* ── Kopfzeile ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        background: 'rgba(0,0,0,0.85)', color: '#fff', flexShrink: 0,
      }}>
        <button onClick={close} aria-label="Schliessen" style={{
          background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '8px',
          color: '#fff', padding: '8px', cursor: 'pointer', display: 'flex',
        }}>
          <X size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.2px' }}>
            {shot?.label}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
            Schritt {index + 1} von {shots.length} · {doneCount} aufgenommen
          </div>
        </div>
        {doneCount > 0 && (
          <button onClick={finish} style={{
            background: '#10b981', border: 'none', borderRadius: '9px', color: '#fff',
            padding: '9px 14px', fontSize: '13px', fontWeight: '800', cursor: 'pointer',
            fontFamily: F, display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Check size={15} /> Fertig ({doneCount})
          </button>
        )}
      </div>

      {/* Fortschritt */}
      <div style={{ display: 'flex', gap: '3px', padding: '0 16px 10px', background: 'rgba(0,0,0,0.85)', flexShrink: 0 }}>
        {shots.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setIndex(i)}
            aria-label={s.label}
            style={{
              flex: 1, height: '4px', borderRadius: '2px', border: 'none', padding: 0, cursor: 'pointer',
              background: captured[s.id] ? '#10b981' : i === index ? '#6366f1' : 'rgba(255,255,255,0.22)',
            }}
          />
        ))}
      </div>

      {/* ── Kamerabild ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Silhouette */}
        {ready && shot && (
          <svg
            viewBox="0 0 130 90"
            preserveAspectRatio="xMidYMid meet"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              pointerEvents: 'none', padding: '8%', boxSizing: 'border-box',
              transform: shot.mirrored ? 'scaleX(-1)' : undefined,
              filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
              opacity: 0.9,
            }}
          >
            <SilhouettePath kind={shot.silhouette} />
          </svg>
        )}

        {/* Auslöse-Blitz */}
        {flash && <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0.75 }} />}

        {/* Ladezustand */}
        {!ready && !error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#fff',
          }}>
            <Loader2 size={28} style={{ animation: 'gc-spin 1s linear infinite' }} />
            <span style={{ fontSize: '14px' }}>Kamera wird gestartet…</span>
          </div>
        )}

        {/* Fehler */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '32px',
            textAlign: 'center', color: '#fff',
          }}>
            <AlertTriangle size={32} color="#f59e0b" />
            <p style={{ fontSize: '14.5px', lineHeight: 1.7, margin: 0, color: 'rgba(255,255,255,0.9)', maxWidth: '340px' }}>
              {error}
            </p>
            <button onClick={close} style={{
              background: 'rgba(255,255,255,0.14)', border: 'none', borderRadius: '10px',
              color: '#fff', padding: '11px 22px', fontSize: '14px', fontWeight: '700',
              cursor: 'pointer', fontFamily: F,
            }}>
              Stattdessen Dateien hochladen
            </button>
          </div>
        )}

        {/* Vorschau der aktuellen Aufnahme */}
        {shot && captured[shot.id] && (
          <div style={{
            position: 'absolute', left: '14px', bottom: '14px',
            width: '76px', height: '56px', borderRadius: '8px', overflow: 'hidden',
            border: '2px solid #10b981', boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={captured[shot.id].url} alt={shot.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>

      {/* ── Hinweis + Bedienung ── */}
      <div style={{ background: 'rgba(0,0,0,0.9)', padding: '12px 16px 22px', flexShrink: 0 }}>
        <p style={{
          margin: '0 0 14px', textAlign: 'center', fontSize: '13px',
          color: 'rgba(255,255,255,0.7)', lineHeight: 1.5,
        }}>
          {shot?.hint}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '26px' }}>
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="Zurück"
            style={{
              background: 'none', border: 'none', color: index === 0 ? 'rgba(255,255,255,0.25)' : '#fff',
              cursor: index === 0 ? 'default' : 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px', fontSize: '11px', fontFamily: F, padding: 0,
            }}
          >
            <RotateCcw size={20} />
            Wiederholen
          </button>

          <button
            onClick={capture}
            disabled={!ready || busy}
            aria-label="Auslösen"
            style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: ready && !busy ? '#fff' : 'rgba(255,255,255,0.3)',
              border: '4px solid rgba(255,255,255,0.35)',
              cursor: ready ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <Camera size={26} color="#0f172a" />
          </button>

          <button
            onClick={() => isLast ? finish() : setIndex(i => i + 1)}
            aria-label={isLast ? 'Fertig' : 'Überspringen'}
            style={{
              background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              fontSize: '11px', fontFamily: F, padding: 0,
            }}
          >
            <SkipForward size={20} />
            {isLast ? 'Fertig' : 'Überspringen'}
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <style>{`@keyframes gc-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
