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
  'volvo', 'nissan', 'skoda', 'škoda', 'ford', 'seat', 'fiat', 'dacia', 'mazda',
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

    /*
     * Ab hier die Marken, die im deutschen Bestand häufig vorkommen.
     *
     * Ausgewählt wurde nach Zeichenbarkeit, nicht nur nach Häufigkeit:
     * Aufgenommen ist, was sich als geometrische Andeutung erkennen
     * lässt. Ein Löwe im Wappen oder ein Schriftzug lässt sich nicht
     * vereinfachen, ohne entweder unkenntlich oder zur Kopie zu werden
     * — dort steht weiterhin nur der Name, und das ist ehrlicher als
     * eine schlechte Nachzeichnung.
     */

    case 'volvo':
      /* Eisen-Symbol: Kreis mit Pfeil nach schräg oben. */
      return (
        <svg {...gemeinsam} aria-label="Volvo">
          <circle cx="21" cy="27" r="15" stroke={c} strokeWidth="3" />
          <path d="M32 16 L43 5 M35 5 L43 5 L43 13"
                stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );

    case 'nissan':
      /* Kreis mit waagerechtem Band über die volle Breite. */
      return (
        <svg {...gemeinsam} aria-label="Nissan">
          <circle cx="24" cy="24" r="19" stroke={c} strokeWidth="2.6" />
          <path d="M2 18 L46 18 M2 30 L46 30" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );

    case 'skoda':
    case 'škoda':
      /* Geflügelter Pfeil, stark vereinfacht. */
      return (
        <svg {...gemeinsam} aria-label="Škoda">
          <circle cx="24" cy="24" r="19" stroke={c} strokeWidth="2.6" />
          <path d="M13 30 L30 30 L36 18 L24 22 L18 14 L16 24 Z"
                stroke={c} strokeWidth="2.4" strokeLinejoin="round" fill="none" />
        </svg>
      );

    case 'ford':
      /* Liegendes Oval mit Anfangsbuchstaben. */
      return (
        <svg {...gemeinsam} aria-label="Ford">
          <ellipse cx="24" cy="24" rx="21" ry="12.5" stroke={c} strokeWidth="2.6" />
          <path d="M18 17 L18 31 M18 17 L29 17 M18 24 L26 24"
                stroke={c} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'seat':
      /* Stilisiertes S aus zwei Bögen. */
      return (
        <svg {...gemeinsam} aria-label="SEAT">
          <path d="M35 14 Q24 8 16 15 Q9 22 20 25 Q31 28 24 34 Q17 40 11 33"
                stroke={c} strokeWidth="3.4" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'fiat':
      /* Wappenschild, wie es die Marke seit je trägt. */
      return (
        <svg {...gemeinsam} aria-label="Fiat">
          <path d="M8 8 L40 8 L40 27 Q40 38 24 43 Q8 38 8 27 Z"
                stroke={c} strokeWidth="2.6" strokeLinejoin="round" fill="none" />
          <path d="M18 19 L18 31 M18 19 L29 19 M18 25 L26 25"
                stroke={c} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'dacia':
      /* Rechteckiges Emblem mit angedeutetem Bogen. */
      return (
        <svg {...gemeinsam} aria-label="Dacia">
          <rect x="5" y="13" width="38" height="22" rx="5" stroke={c} strokeWidth="2.6" />
          <path d="M15 29 Q24 15 33 29" stroke={c} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'mazda':
      /* Oval mit zwei aufsteigenden Flügeln. */
      return (
        <svg {...gemeinsam} aria-label="Mazda">
          <ellipse cx="24" cy="24" rx="20" ry="14" stroke={c} strokeWidth="2.6" />
          <path d="M12 27 Q24 13 24 24 Q24 13 36 27"
                stroke={c} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </svg>
      );

    default:
      return null;
  }
}
