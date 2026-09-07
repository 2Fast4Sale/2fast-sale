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
 * Welche Eintraege der Bibliothek lassen sich rechnen?
 *
 * Nur die Studio-Hintergruende. Eine Ziegelwand, ein Bergpass oder ein
 * Hafen haben erkennbaren Inhalt — den kann keine Verlaufsformel
 * erfinden, dafuer braucht es weiterhin ein Modell.
 *
 * Der Unterschied ist nicht nur technisch, er steht in der Rechnung:
 * Ein gerechneter Hintergrund kostet nichts und sieht bei jedem Bild
 * gleich aus. Ein erzeugter kostet bei jedem Aufruf Geld und ist nur
 * ueber den Seed halbwegs stabil.
 */
export const GERECHNET: Record<string, keyof typeof STUDIO_VORLAGEN> = {
  studio_white: 'studio_hell',
  studio_dark:  'studio_dunkel',
  studio_grey:  'studio_grau',
};

export function istGerechnet(id: string): boolean {
  return id in GERECHNET;
}

/**
 * Umriss eines Kombis, nur zur Veranschaulichung.
 *
 * Die Hintergrund-Auswahl zeigte bisher leere Flaechen. Ein leerer Raum
 * sagt aber wenig darueber, wie ein Fahrzeug darin steht — Licht,
 * Horizont und Schatten wirken erst mit einem Objekt davor. Deshalb
 * dieser Umriss: bewusst schematisch, damit niemand ihn fuer ein
 * echtes Fahrzeugfoto haelt.
 */
export const FAHRZEUG_UMRISS = Buffer.from(
  `<svg width="1400" height="900" xmlns="http://www.w3.org/2000/svg">
     <g transform="translate(200,300)">
       <path d="M20,220 L60,120 Q80,80 140,72 L420,60 Q500,58 560,110 L700,180
                Q760,196 900,206 Q960,214 962,260 L960,300 L20,300 Z" fill="#222c38"/>
       <path d="M150,110 L400,96 L400,168 L120,172 Z" fill="#6f8ea6" opacity="0.7"/>
       <path d="M430,96 L560,120 L660,176 L430,168 Z" fill="#6f8ea6" opacity="0.7"/>
       <circle cx="220" cy="300" r="70" fill="#141b23"/>
       <circle cx="770" cy="300" r="70" fill="#141b23"/>
     </g></svg>`,
);

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
