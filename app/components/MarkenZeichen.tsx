'use client';

/**
 * Markenzeichen für die Fahrzeugauswahl.
 *
 * Bewusst selbst gezeichnete, vereinfachte Formen statt heruntergeladener
 * Logodateien. Zwei Gründe:
 *
 *  - Es kommen keine fremden Dateien ins Projekt. Die Startseite hatte bis
 *    vor kurzem Bilder von fremden Servern geladen; das soll sich nicht
 *    wiederholen.
 *  - Herstellerlogos sind Markenzeichen. Sie zur Kennzeichnung des
 *    tatsächlichen Fabrikats zu verwenden ist üblich, eine originalgetreue
 *    Reproduktion der Datei ist etwas anderes.
 *
 * Marken mit komplexem Logo bekommen ein sauberes Namenskürzel — das wirkt
 * ruhiger als eine schlechte Nachzeichnung.
 */

import React from 'react';

interface Props {
  marke: string;
  /** Kantenlänge in Pixeln */
  groesse?: number;
  /** Einfarbig zeichnen, z.B. weiss auf farbigem Grund */
  farbe?: string;
}

/** Für welche Marken es eine gezeichnete Form gibt. */
const GEZEICHNET = new Set([
  'bmw', 'mercedes', 'mercedes-benz', 'audi', 'volkswagen', 'vw',
  'opel', 'toyota', 'renault', 'citroën', 'citroen', 'mitsubishi', 'hyundai',
]);

export function hatZeichen(marke: string): boolean {
  return GEZEICHNET.has(marke.trim().toLowerCase());
}

export default function MarkenZeichen({ marke, groesse = 26, farbe }: Props) {
  const s = groesse;
  const k = marke.trim().toLowerCase();
  const c = farbe || 'currentColor';
  const gemeinsam = { width: s, height: s, viewBox: '0 0 48 48', fill: 'none' as const };

  switch (k) {
    case 'bmw':
      return (
        <svg {...gemeinsam} aria-label="BMW">
          <circle cx="24" cy="24" r="20" stroke={c} strokeWidth="3" />
          <path d="M24 4 A20 20 0 0 1 44 24 L24 24 Z" fill={c} opacity="0.9" />
          <path d="M24 44 A20 20 0 0 1 4 24 L24 24 Z" fill={c} opacity="0.9" />
          <circle cx="24" cy="24" r="20" stroke={c} strokeWidth="3" />
        </svg>
      );

    case 'mercedes':
    case 'mercedes-benz':
      return (
        <svg {...gemeinsam} aria-label="Mercedes-Benz">
          <circle cx="24" cy="24" r="20" stroke={c} strokeWidth="3" />
          <path d="M24 24 L24 4 M24 24 L7 34 M24 24 L41 34"
                stroke={c} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'audi':
      return (
        <svg {...gemeinsam} aria-label="Audi">
          {[10, 19, 28, 37].map(cx => (
            <circle key={cx} cx={cx} cy="24" r="8" stroke={c} strokeWidth="2.6" />
          ))}
        </svg>
      );

    case 'volkswagen':
    case 'vw':
      return (
        <svg {...gemeinsam} aria-label="Volkswagen">
          <circle cx="24" cy="24" r="20" stroke={c} strokeWidth="3" />
          <path d="M13 15 L19 30 L24 20 L29 30 L35 15"
                stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 30 L24 40 L29 30"
                stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'opel':
      return (
        <svg {...gemeinsam} aria-label="Opel">
          <circle cx="24" cy="24" r="20" stroke={c} strokeWidth="3" />
          <path d="M12 26 L28 26 L20 22 L36 22" stroke={c} strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      );

    case 'toyota':
      return (
        <svg {...gemeinsam} aria-label="Toyota">
          <ellipse cx="24" cy="24" rx="20" ry="13" stroke={c} strokeWidth="2.6" />
          <ellipse cx="24" cy="18" rx="7"  ry="10" stroke={c} strokeWidth="2.6" />
          <ellipse cx="24" cy="28" rx="13" ry="6"  stroke={c} strokeWidth="2.6" />
        </svg>
      );

    case 'renault':
      return (
        <svg {...gemeinsam} aria-label="Renault">
          <path d="M24 5 L37 24 L24 43 L11 24 Z" stroke={c} strokeWidth="2.8" strokeLinejoin="round" />
          <path d="M24 13 L32 24 L24 35 L16 24 Z" stroke={c} strokeWidth="2.8" strokeLinejoin="round" />
        </svg>
      );

    case 'citroën':
    case 'citroen':
      return (
        <svg {...gemeinsam} aria-label="Citroën">
          <path d="M12 22 L24 12 L36 22" stroke={c} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 34 L24 24 L36 34" stroke={c} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'mitsubishi':
      return (
        <svg {...gemeinsam} aria-label="Mitsubishi">
          <path d="M24 8  L31 21 L17 21 Z" fill={c} />
          <path d="M13 27 L20 40 L6  40 Z" fill={c} />
          <path d="M35 27 L42 40 L28 40 Z" fill={c} />
        </svg>
      );

    case 'hyundai':
      return (
        <svg {...gemeinsam} aria-label="Hyundai">
          <ellipse cx="24" cy="24" rx="20" ry="13" stroke={c} strokeWidth="2.6" />
          <path d="M17 17 Q17 24 24 24 Q31 24 31 31"
                stroke={c} strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
      );

    default:
      return null;
  }
}
