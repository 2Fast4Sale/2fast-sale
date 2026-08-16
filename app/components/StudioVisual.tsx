'use client';

/**
 * Vorher/Nachher-Darstellung für die Startseite.
 *
 * Bewusst als Zeichnung und nicht als Foto: Die vorherige Fassung lud zwei
 * fremde Fahrzeugbilder von fremden Servern, eines davon vom Bild-CDN von
 * mobile.de. Eine erkennbare Illustration behauptet nichts, was nicht stimmt,
 * und zeigt trotzdem sofort, worum es geht.
 *
 * Sobald eigene Vorher/Nachher-Fotos vorliegen, kann das hier ersetzt werden —
 * ein echtes Fahrzeug wirkt stärker als jede Zeichnung.
 */

import React from 'react';

/** Fahrzeugsilhouette, halbwegs proportional zu einem Kompaktwagen. */
function Fahrzeug({ farbe, schatten }: { farbe: string; schatten: string }) {
  return (
    <g>
      <ellipse cx="150" cy="126" rx="88" ry="9" fill={schatten} />
      <path
        d="M42 116 L54 84 Q62 66 88 63 L172 63 Q200 65 218 84 L252 92 Q266 96 266 110 L266 118 Q266 122 261 122 L246 122 M108 122 L196 122 M42 116 L42 120 Q42 122 46 122 L58 122"
        fill={farbe} stroke={farbe} strokeWidth="2" strokeLinejoin="round"
      />
      <path d="M66 82 Q74 70 92 68 L142 68 L142 84 Z" fill="rgba(255,255,255,0.34)" />
      <path d="M152 68 L168 68 Q188 70 202 84 L152 84 Z" fill="rgba(255,255,255,0.34)" />
      <circle cx="82"  cy="122" r="15" fill="#1e293b" />
      <circle cx="82"  cy="122" r="6.5" fill="#94a3b8" />
      <circle cx="222" cy="122" r="15" fill="#1e293b" />
      <circle cx="222" cy="122" r="6.5" fill="#94a3b8" />
    </g>
  );
}

export default function StudioVisual() {
  return (
    <div className="visual-wrap">
      {/* ── Vorher: Parkplatz ── */}
      <figure className="visual-card">
        <svg viewBox="0 0 300 160" className="visual-svg" role="img"
             aria-label="Fahrzeugfoto auf einem Parkplatz, unruhiger Hintergrund">
          <rect width="300" height="160" fill="#cfd6dd" />
          {/* Himmel und Gebäude im Hintergrund — bewusst unruhig */}
          <rect y="0" width="300" height="66" fill="#b9c4cf" />
          <rect x="12"  y="22" width="46" height="44" fill="#a6b3c0" />
          <rect x="66"  y="34" width="34" height="32" fill="#9fadbb" />
          <rect x="196" y="18" width="52" height="48" fill="#a6b3c0" />
          <rect x="256" y="30" width="32" height="36" fill="#9fadbb" />
          {/* Fenster */}
          {[20, 34, 48].map(x => [30, 44].map(y => (
            <rect key={`${x}-${y}`} x={x} y={y} width="7" height="8" fill="#8d9dad" />
          )))}
          {/* Asphalt mit Markierung */}
          <rect y="108" width="300" height="52" fill="#8c959e" />
          <rect y="106" width="300" height="3" fill="#7d8790" />
          <rect x="20" y="132" width="52" height="3" fill="#e2e8f0" opacity="0.55" />
          <rect x="228" y="132" width="52" height="3" fill="#e2e8f0" opacity="0.55" />
          <g transform="translate(0,-6) scale(1)">
            <Fahrzeug farbe="#7f8b97" schatten="rgba(0,0,0,0.24)" />
          </g>
        </svg>
        <figcaption className="visual-caption">
          <span className="visual-tag visual-tag-vorher">Vorher</span>
          Handyfoto auf dem Hof
        </figcaption>
      </figure>

      {/* ── Pfeil ── */}
      <div className="visual-arrow" aria-hidden="true">
        <span className="visual-arrow-line" />
        <span className="visual-arrow-badge">Studio</span>
        <span className="visual-arrow-line" />
      </div>

      {/* ── Nachher: Studio ── */}
      <figure className="visual-card visual-card-studio">
        <svg viewBox="0 0 300 160" className="visual-svg" role="img"
             aria-label="Dasselbe Fahrzeug freigestellt vor einem Studio-Hintergrund">
          <defs>
            <linearGradient id="wand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#e4e8ee" />
              <stop offset="100%" stopColor="#f6f8fa" />
            </linearGradient>
            <linearGradient id="boden" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#dfe4ea" />
              <stop offset="100%" stopColor="#cdd4dc" />
            </linearGradient>
            <radialGradient id="licht" cx="50%" cy="72%" r="52%">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="300" height="112" fill="url(#wand)" />
          <rect y="106" width="300" height="54" fill="url(#boden)" />
          <ellipse cx="150" cy="108" rx="210" ry="16" fill="#e9edf2" opacity="0.9" />
          <rect width="300" height="160" fill="url(#licht)" />
          <g transform="translate(0,-6)">
            <Fahrzeug farbe="#6366f1" schatten="rgba(15,23,42,0.30)" />
          </g>
        </svg>
        <figcaption className="visual-caption">
          <span className="visual-tag visual-tag-nachher">Nachher</span>
          Freigestellt, mit Schatten im Studio
        </figcaption>
      </figure>
    </div>
  );
}
