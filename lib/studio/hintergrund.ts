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

  /* ── Raum statt Flaeche ──────────────────────────────────────────
   *
   * Alles ab hier kam dazu, nachdem ein von Gemini erzeugter Showroom
   * neben dem gerechneten Hintergrund lag. Der Unterschied lag nicht
   * an der Farbe — er lag daran, dass der eine ein RAUM war und der
   * andere eine Wand: Decke mit Strahlern, eine Ecke, abfallendes
   * Licht zu den Raendern, ein Boden, der die Lampen spiegelt.
   *
   * Das ist Geometrie, kein Modell. Also laesst es sich rechnen.
   */

  /** Hoehe der Decke als Anteil des Bildes. 0 laesst sie weg. */
  decke: number;
  /** Anzahl der Deckenstrahler. 0 laesst sie weg. */
  strahler: number;
  /** Helligkeit der Strahler, 0 bis 1. */
  strahlerStaerke: number;
  /**
   * Lage der Raumecke, 0 bis 1, oder null fuer eine gerade Wand.
   * Eine sichtbare Ecke macht aus einer Flaeche einen Raum.
   */
  ecke: number | null;
  /** Abdunkelung zu den Bildraendern, 0 bis 1. */
  randabfall: number;
  /** Wie stark der Boden die Deckenlichter spiegelt, 0 bis 1. */
  bodenglanz: number;
}

export const STUDIO_VORLAGEN: Record<string, { name: string } & StudioHintergrund> = {
  studio_dunkel: {
    name: 'Studio dunkel',
    wandOben: '#2b3038', wandUnten: '#14181d',
    bodenOben: '#191d23', bodenUnten: '#07090c',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.34, lichtGroesse: 0.62, lichtStaerke: 0.22,
    decke: 0.13, strahler: 4, strahlerStaerke: 0.55, ecke: 0.30,
    randabfall: 0.42, bodenglanz: 0.30,
  },
  studio_hell: {
    name: 'Studio hell',
    wandOben: '#f4f5f7', wandUnten: '#dcdfe4',
    bodenOben: '#d3d7dd', bodenUnten: '#b3b8c0',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.30, lichtGroesse: 0.66, lichtStaerke: 0.30,
    decke: 0.14, strahler: 5, strahlerStaerke: 0.85, ecke: 0.28,
    randabfall: 0.26, bodenglanz: 0.22,
  },
  studio_grau: {
    name: 'Studio grau',
    wandOben: '#8c9199', wandUnten: '#666c75',
    bodenOben: '#5c626b', bodenUnten: '#3a3f47',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.32, lichtGroesse: 0.64, lichtStaerke: 0.26,
    decke: 0.12, strahler: 4, strahlerStaerke: 0.70, ecke: 0.32,
    randabfall: 0.30, bodenglanz: 0.20,
  },
  studio_warm: {
    name: 'Studio warm',
    wandOben: '#3a332c', wandUnten: '#1e1a16',
    bodenOben: '#241f1a', bodenUnten: '#0d0b09',
    horizont: 0.74, lichtX: 0.46, lichtY: 0.33, lichtGroesse: 0.60, lichtStaerke: 0.24,
    decke: 0.13, strahler: 3, strahlerStaerke: 0.60, ecke: 0.34,
    randabfall: 0.40, bodenglanz: 0.26,
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

  /* ── Decke ──────────────────────────────────────────────────────
   * Perspektivisch: Die Deckenkante laeuft nach hinten zusammen. Eine
   * waagerechte Kante saehe aus wie ein aufgeklebter Streifen; erst
   * die Schraege macht daraus einen Raum, in den man hineinsieht.
   */
  const deckeH = Math.round(hoehe * Math.max(0, Math.min(0.3, v.decke)));
  const deckeTiefe = Math.round(deckeH * 0.55);

  /* ── Deckenstrahler ─────────────────────────────────────────────
   * Zwei Teile je Lampe: die Leuchte selbst und der Lichtkegel, der
   * auf die Wand faellt. Ohne den Kegel klebt die Lampe an der Decke,
   * ohne Wirkung im Raum.
   */
  let strahlerSvg = '';
  let bodenreflexe = '';
  const n = Math.max(0, Math.round(v.strahler));
  for (let i = 0; i < n; i++) {
    const x = Math.round((breite * (i + 1)) / (n + 1));
    const y = Math.round(deckeH * 0.45);
    const rx = Math.round(breite * 0.022);
    const ry = Math.max(3, Math.round(rx * 0.34));
    strahlerSvg += `
    <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#ffffff" opacity="${(v.strahlerStaerke).toFixed(3)}"/>
    <ellipse cx="${x}" cy="${y}" rx="${rx * 3.4}" ry="${ry * 4.2}" fill="url(#kegel)"/>`;

    /*
     * Spiegelung auf dem Boden. Sie steht nicht senkrecht unter der
     * Lampe, sondern weiter vorn — der Boden ist eine Flaeche, die
     * zum Betrachter laeuft, und das Spiegelbild wandert mit.
     */
    if (v.bodenglanz > 0) {
      const sx = Math.round(breite / 2 + (x - breite / 2) * 1.35);
      /*
       * Schmal und lang, nicht rund.
       *
       * Der erste Versuch setzte breite Ellipsen auf den Boden — im
       * Test sahen die aus wie leuchtende Flecken, nicht wie
       * Spiegelungen. Eine Lampenspiegelung auf glattem Boden ist ein
       * schmaler Streifen, der zum Betrachter hin laenger und
       * schwaecher wird. Deshalb beginnt sie direkt an der Kehle und
       * reicht bis fast zur Bildkante.
       */
      bodenreflexe += `
    <ellipse cx="${sx}" cy="${hY}" rx="${Math.round(breite * 0.020)}" ry="${Math.round((hoehe - hY) * 0.78)}"
             fill="url(#glanz)" opacity="${(v.bodenglanz).toFixed(3)}"/>`;
    }
  }

  /* ── Raumecke ───────────────────────────────────────────────────
   * Eine senkrechte Kante mit einem Helligkeitssprung. Zwei
   * unterschiedlich helle Wandflaechen lesen sich sofort als Ecke —
   * das ist der billigste Trick fuer Raumtiefe, den es gibt.
   */
  const eckeSvg = v.ecke === null ? '' : (() => {
    const ex = Math.round(breite * Math.max(0.05, Math.min(0.95, v.ecke)));
    return `
  <rect width="${ex}" height="${hY}" fill="#000000" opacity="0.10"/>
  <rect x="${ex - 1}" width="2" height="${hY}" fill="#ffffff" opacity="0.05"/>`;
  })();

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
      <stop offset="0%"   stop-color="${v.wandUnten}"/>
      <stop offset="100%" stop-color="${v.bodenOben}"/>
    </linearGradient>
    <linearGradient id="deckenflaeche" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${v.wandOben}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.30"/>
    </linearGradient>
    <radialGradient id="kegel">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="${(v.strahlerStaerke * 0.30).toFixed(3)}"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glanz">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.60"/>
      <stop offset="35%"  stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="licht"
        cx="${(v.lichtX * 100).toFixed(1)}%" cy="${(v.lichtY * 100).toFixed(1)}%"
        r="${(v.lichtGroesse * 100).toFixed(1)}%">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="${v.lichtStaerke.toFixed(3)}"/>
      <stop offset="60%"  stop-color="#ffffff" stop-opacity="${(v.lichtStaerke * 0.35).toFixed(3)}"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="rand" cx="50%" cy="46%" r="76%">
      <stop offset="55%"  stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${v.randabfall.toFixed(3)}"/>
    </radialGradient>
  </defs>

  <rect width="${breite}" height="${hY}" fill="url(#wand)"/>
  <rect y="${hY}" width="${breite}" height="${hoehe - hY}" fill="url(#boden)"/>
  <rect y="${hY - uebergang}" width="${breite}" height="${uebergang * 2}" fill="url(#kehle)"/>
${eckeSvg}
${bodenreflexe}
  <rect width="${breite}" height="${hoehe}" fill="url(#licht)"/>
${deckeH > 0 ? `
  <path d="M0,0 L${breite},0 L${breite - deckeTiefe},${deckeH} L${deckeTiefe},${deckeH} Z"
        fill="url(#deckenflaeche)"/>
  <path d="M${deckeTiefe},${deckeH} L${breite - deckeTiefe},${deckeH}"
        stroke="#000000" stroke-opacity="0.14" stroke-width="2" fill="none"/>` : ''}
${strahlerSvg}
  <rect width="${breite}" height="${hoehe}" fill="url(#rand)"/>
</svg>`;

  return sharp(Buffer.from(svg))
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();
}
