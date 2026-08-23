'use client';

/**
 * Vorher-Nachher-Schieber.
 *
 * Der Händler lädt ein Handyfoto vom Hof hoch und bekommt ein Studiobild
 * zurück — bisher sah er aber nur das Ergebnis. Der Unterschied, für den
 * er bezahlt, war nirgends zu sehen.
 *
 * Genau der ist das Verkaufsargument: sein eigenes Foto links, das
 * Ergebnis rechts, und er zieht selbst die Kante hin und her. Nichts
 * überzeugt so gut wie das eigene Bild im direkten Vergleich.
 *
 * Der Schieber liegt über beiden Bildern. Rechts wird das bearbeitete
 * Bild angezeigt, links kommt das Original durch — umgesetzt über einen
 * Beschnitt, nicht über Durchsichtigkeit: Überblendung würde die Kanten
 * der Freistellung verwaschen, und gerade die soll man beurteilen können.
 */

import { useRef, useState, useCallback } from 'react';

interface Props {
  vorher: string;
  nachher: string;
  /** Seitenverhältnis, z.B. '4/3'. */
  verhaeltnis?: string;
  /** Beschriftungen ein- oder ausblenden. */
  mitBeschriftung?: boolean;
}

export default function VorherNachher({
  vorher, nachher, verhaeltnis = '4/3', mitBeschriftung = true,
}: Props) {
  const rahmenRef = useRef<HTMLDivElement>(null);
  const [anteil, setAnteil] = useState(50);
  const [zieht, setZieht] = useState(false);

  /**
   * Position aus einem Zeiger- oder Berührungsereignis.
   *
   * Bewusst über die Rahmenbreite gerechnet und nicht über den
   * Mausversatz: Auf dem Handy kommen Berührungen an beliebiger Stelle
   * an, und der Schieber soll dorthin springen, wo der Finger ist.
   */
  const ausEreignis = useCallback((x: number) => {
    const r = rahmenRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setAnteil(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  }, []);

  return (
    <div
      ref={rahmenRef}
      onPointerDown={e => { setZieht(true); e.currentTarget.setPointerCapture(e.pointerId); ausEreignis(e.clientX); }}
      onPointerMove={e => zieht && ausEreignis(e.clientX)}
      onPointerUp={e => { setZieht(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
      onPointerCancel={() => setZieht(false)}
      /*
       * Klicks nicht nach oben durchreichen.
       *
       * Die Kachel in Schritt 2 öffnet bei Klick die Grossansicht. Ohne
       * diese Sperre würde jedes Ziehen am Schieber am Ende auch das
       * Lichtfenster aufreissen — man könnte den Vergleich gar nicht
       * benutzen.
       */
      onClick={e => e.stopPropagation()}
      style={{
        position: 'relative', width: '100%', aspectRatio: verhaeltnis,
        overflow: 'hidden', borderRadius: 12, cursor: zieht ? 'grabbing' : 'ew-resize',
        touchAction: 'none', userSelect: 'none', background: '#0f1e30',
      }}
    >
      {/* Nachher liegt unten und füllt die ganze Fläche. */}
      <img src={nachher} alt="Mit Studio-Hintergrund"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Vorher liegt darüber und wird rechts abgeschnitten. */}
      <img src={vorher} alt="Originalfoto"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          clipPath: `inset(0 ${100 - anteil}% 0 0)`,
        }} />

      {/* Die Kante */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${anteil}%`,
        width: 2, marginLeft: -1, background: '#ffffff',
        boxShadow: '0 0 10px rgba(0,0,0,0.55)', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 30, height: 30, borderRadius: 15, background: '#ffffff',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          {/* Zwei Pfeilspitzen — sagt ohne Worte, dass man ziehen kann. */}
          <span style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '5px solid #334155' }} />
          <span style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '5px solid #334155' }} />
        </div>
      </div>

      {mitBeschriftung && (
        <>
          <span style={{
            position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(15,23,42,0.72)', color: '#e2e8f0',
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
            pointerEvents: 'none', opacity: anteil > 14 ? 1 : 0, transition: 'opacity .15s',
          }}>DEIN FOTO</span>
          <span style={{
            position: 'absolute', top: 8, right: 8, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(79,70,229,0.85)', color: '#ffffff',
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
            pointerEvents: 'none', opacity: anteil < 86 ? 1 : 0, transition: 'opacity .15s',
          }}>STUDIO</span>
        </>
      )}
    </div>
  );
}
