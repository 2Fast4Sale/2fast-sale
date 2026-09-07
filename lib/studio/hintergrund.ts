/**
 * Erzeugt Studio-Hintergruende — ohne KI, ohne Kosten.
 *
 * Die Hintergrundbibliothek in backgrounds.ts besteht aus Prompts:
 * PhotoRoom erzeugt daraus bei JEDEM Aufruf ein neues Bild. Das ist
 * fuer eine Halle mit Glasfront oder einen Hafen bei Daemmerung auch
 * noetig.
 *
 * Fuer die drei Studio-Hintergruende ist es Verschwendung. Eine
 * nahtlose Studiowand ist nichts als ein Farbverlauf mit einem
 * Lichtfleck darauf — das laesst sich rechnen. Es kostet nichts, ist
 * in jeder Groesse scharf, und vor allem: Es sieht bei jedem Fahrzeug
 * GLEICH aus. Ein Haendler mit zwoelf Bildern desselben Autos bekommt
 * denselben Raum, nicht zwoelf leicht verschiedene.
 *
 * Was hier NICHT geht: alles mit erkennbarem Inhalt. Ziegelwand,
 * Bergstrasse, Parkhaus — dafuer braucht es weiterhin ein Bild.
 */

import sharp from 'sharp';

export interface StudioHintergrund {
  /** Wandfarbe oben, als Hex. */
  wandOben: string;
  /** Wandfarbe am Horizont. */
  wandUnten: string;
  /** Bodenfarbe direkt am Horizont. */
  bodenOben: string;
  /** Bodenfarbe an der Unterkante. */
  bodenUnten: string;
  /** Wo Wand und Boden sich treffen, als Anteil der Hoehe. */
  horizont: number;
  /** Waagerechte Lage des Lichtflecks, 0 bis 1. */
  lichtX: number;
  /** Senkrechte Lage des Lichtflecks, 0 bis 1. */
  lichtY: number;
  /** Groesse des Lichtflecks, als Anteil der Bildbreite. */
  lichtGroesse: number;
  /** Staerke des Lichtflecks, 0 bis 1. */
  lichtStaerke: number;
}

export const STUDIO_VORLAGEN: Record<string, { name: string } & StudioHintergrund> = {
  studio_dunkel: {
    name: 'Studio dunkel',
    wandOben: '#2b3038', wandUnten: '#14181d',
    bodenOben: '#191d23', bodenUnten: '#07090c',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.34, lichtGroesse: 0.62, lichtStaerke: 0.22,
  },
  studio_hell: {
    name: 'Studio hell',
    wandOben: '#f4f5f7', wandUnten: '#dcdfe4',
    bodenOben: '#d3d7dd', bodenUnten: '#b3b8c0',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.30, lichtGroesse: 0.66, lichtStaerke: 0.30,
  },
  studio_grau: {
    name: 'Studio grau',
    wandOben: '#8c9199', wandUnten: '#666c75',
    bodenOben: '#5c626b', bodenUnten: '#3a3f47',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.32, lichtGroesse: 0.64, lichtStaerke: 0.26,
  },
  studio_warm: {
    name: 'Studio warm',
    wandOben: '#3a332c', wandUnten: '#1e1a16',
    bodenOben: '#241f1a', bodenUnten: '#0d0b09',
    horizont: 0.74, lichtX: 0.46, lichtY: 0.33, lichtGroesse: 0.60, lichtStaerke: 0.24,
  },
};

/**
 * Zeichnet den Hintergrund.
 *
 * Der Uebergang zwischen Wand und Boden ist bewusst weich (eine
 * schmale Zone statt einer Linie). Eine harte Kante sieht aus wie zwei
 * aneinandergelegte Flaechen; eine nahtlose Hohlkehle im Fotostudio
 * hat genau diesen weichen Uebergang, und daran erkennt das Auge den
 * Raum.
 */
export async function studioHintergrund(
  v: StudioHintergrund,
  breite = 2000,
  hoehe = 1333,
): Promise<Buffer> {
  const hY = Math.round(hoehe * Math.max(0.3, Math.min(0.95, v.horizont)));
  const uebergang = Math.round(hoehe * 0.06);

  const svg = `<svg width="${breite}" height="${hoehe}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${v.wandOben}"/>
      <stop offset="100%" stop-color="${v.wandUnten}"/>
    </linearGradient>
    <linearGradient id="boden" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${v.bodenOben}"/>
      <stop offset="100%" stop-color="${v.bodenUnten}"/>
    </linearGradient>
    <linearGradient id="kehle" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${v.wandUnten}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${v.bodenOben}" stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="licht"
        cx="${(v.lichtX * 100).toFixed(1)}%" cy="${(v.lichtY * 100).toFixed(1)}%"
        r="${(v.lichtGroesse * 100).toFixed(1)}%">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="${v.lichtStaerke.toFixed(3)}"/>
      <stop offset="60%"  stop-color="#ffffff" stop-opacity="${(v.lichtStaerke * 0.35).toFixed(3)}"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${breite}" height="${hY}" fill="url(#wand)"/>
  <rect y="${hY}" width="${breite}" height="${hoehe - hY}" fill="url(#boden)"/>
  <rect y="${hY - uebergang}" width="${breite}" height="${uebergang * 2}" fill="url(#kehle)"/>
  <rect width="${breite}" height="${hoehe}" fill="url(#licht)"/>
</svg>`;

  return sharp(Buffer.from(svg))
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();
}
