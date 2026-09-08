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
import { bodenMuster, type MusterId } from './bodenmuster';

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

  /** Korn der Wand, 0 bis 1. Ohne Korn wirkt sie wie Vektorgrafik. */
  wandKorn: number;
  /** Korn des Bodens, 0 bis 1. */
  bodenKorn: number;
  /** Groesse des Bodenkorns in Pixeln. Gross = grober Beton. */
  bodenKoernung: number;
  /** Sichtbarkeit der Bodenfugen, 0 bis 1. 0 laesst sie weg. */
  bodenFugen: number;
  /** Aufgezeichnetes Muster, in Perspektive. */
  muster: MusterId;
  /** Deckkraft des Musters, 0 bis 1. */
  musterStaerke: number;
}

export const STUDIO_VORLAGEN: Record<string, { name: string } & StudioHintergrund> = {
  studio_dunkel: {
    name: 'Studio dunkel',
    wandOben: '#2b3038', wandUnten: '#14181d',
    bodenOben: '#191d23', bodenUnten: '#07090c',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.34, lichtGroesse: 0.62, lichtStaerke: 0.22,
    decke: 0.13, strahler: 4, strahlerStaerke: 0.55, ecke: 0.30,
    randabfall: 0.42, bodenglanz: 0.30,
    wandKorn: 0.055, bodenKorn: 0.06, bodenKoernung: 4, bodenFugen: 0, muster: 'keine', musterStaerke: 0,
  },
  studio_hell: {
    name: 'Studio hell',
    wandOben: '#f4f5f7', wandUnten: '#dcdfe4',
    bodenOben: '#d3d7dd', bodenUnten: '#b3b8c0',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.30, lichtGroesse: 0.66, lichtStaerke: 0.30,
    decke: 0.14, strahler: 5, strahlerStaerke: 0.85, ecke: 0.28,
    randabfall: 0.26, bodenglanz: 0.22,
    wandKorn: 0.06, bodenKorn: 0.05, bodenKoernung: 3, bodenFugen: 0, muster: 'keine', musterStaerke: 0,
  },
  studio_grau: {
    name: 'Studio grau',
    wandOben: '#8c9199', wandUnten: '#666c75',
    bodenOben: '#5c626b', bodenUnten: '#3a3f47',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.32, lichtGroesse: 0.64, lichtStaerke: 0.26,
    decke: 0.12, strahler: 4, strahlerStaerke: 0.70, ecke: 0.32,
    randabfall: 0.30, bodenglanz: 0.20,
    wandKorn: 0.055, bodenKorn: 0.10, bodenKoernung: 4, bodenFugen: 0, muster: 'keine', musterStaerke: 0,
  },
  studio_warm: {
    name: 'Studio warm',
    wandOben: '#3a332c', wandUnten: '#1e1a16',
    bodenOben: '#241f1a', bodenUnten: '#0d0b09',
    horizont: 0.74, lichtX: 0.46, lichtY: 0.33, lichtGroesse: 0.60, lichtStaerke: 0.24,
    decke: 0.13, strahler: 3, strahlerStaerke: 0.60, ecke: 0.34,
    randabfall: 0.40, bodenglanz: 0.26,
    wandKorn: 0.10, bodenKorn: 0.13, bodenKoernung: 5, bodenFugen: 0, muster: 'keine', musterStaerke: 0,
  },
};

/* ═══════════════════════════════════════════════════════════════════
 * Wand und Boden getrennt
 *
 * Abgeschaut beim Gecko-Konfigurator von Octopus: Dort sind Hintergrund
 * und Strasse zwei getrennte Kataloge, und der Haendler kombiniert sie
 * frei. Der Setup-Code "BD0089R1015" ist nichts anderes als Wand 0089
 * plus Boden 1015.
 *
 * Das ist aus zwei Gruenden besser als ein Katalog fertiger Raeume:
 *
 * Erstens die Menge. Zwoelf Waende und zwoelf Boeden ergeben 144
 * Raeume aus vierundzwanzig Bausteinen — als fertige Raeume muesste
 * man 144 Eintraege pflegen.
 *
 * Zweitens die Bedienung. Ein Haendler weiss, dass er eine helle Wand
 * will und einen dunklen Boden. Er weiss nicht, ob er "Studio grau"
 * will. Waehlen ist leichter als Einstellen.
 * ═══════════════════════════════════════════════════════════════════ */

/** Der Teil eines Raums oberhalb des Horizonts. */
export type Wand = Pick<StudioHintergrund,
  'wandOben' | 'wandUnten' | 'decke' | 'strahler' | 'strahlerStaerke' |
  'ecke' | 'lichtX' | 'lichtY' | 'lichtGroesse' | 'lichtStaerke' | 'randabfall' | 'wandKorn'
> & { name: string };

/** Der Teil unterhalb des Horizonts. */
export type Boden = Pick<StudioHintergrund,
  'bodenOben' | 'bodenUnten' | 'horizont' | 'bodenglanz' |
  'bodenKorn' | 'bodenKoernung' | 'bodenFugen' | 'muster' | 'musterStaerke'
> & { name: string };

export const WAENDE: Record<string, Wand> = {
  W01: { name: 'Weiß, nahtlos',    wandOben: '#f7f8fa', wandUnten: '#e2e5ea',
         decke: 0,    strahler: 0, strahlerStaerke: 0,    ecke: null,
         lichtX: 0.5, lichtY: 0.30, lichtGroesse: 0.70, lichtStaerke: 0.26, randabfall: 0.18, wandKorn: 0.05 },
  W02: { name: 'Weiß mit Decke',   wandOben: '#f4f5f7', wandUnten: '#dcdfe4',
         decke: 0.14, strahler: 5, strahlerStaerke: 0.85, ecke: 0.28,
         lichtX: 0.5, lichtY: 0.30, lichtGroesse: 0.66, lichtStaerke: 0.30, randabfall: 0.26, wandKorn: 0.06 },
  W03: { name: 'Hellgrau',         wandOben: '#c9ced6', wandUnten: '#aab0ba',
         decke: 0.12, strahler: 4, strahlerStaerke: 0.70, ecke: 0.32,
         lichtX: 0.5, lichtY: 0.32, lichtGroesse: 0.64, lichtStaerke: 0.24, randabfall: 0.24, wandKorn: 0.05 },
  W04: { name: 'Mittelgrau',       wandOben: '#8c9199', wandUnten: '#666c75',
         decke: 0.12, strahler: 4, strahlerStaerke: 0.62, ecke: 0.32,
         lichtX: 0.5, lichtY: 0.32, lichtGroesse: 0.64, lichtStaerke: 0.26, randabfall: 0.30, wandKorn: 0.055 },
  W05: { name: 'Anthrazit',        wandOben: '#3c424b', wandUnten: '#252a31',
         decke: 0.13, strahler: 4, strahlerStaerke: 0.60, ecke: 0.30,
         lichtX: 0.5, lichtY: 0.33, lichtGroesse: 0.62, lichtStaerke: 0.24, randabfall: 0.38, wandKorn: 0.06 },
  W06: { name: 'Schwarz',          wandOben: '#22262c', wandUnten: '#0d1013',
         decke: 0.13, strahler: 4, strahlerStaerke: 0.55, ecke: 0.30,
         lichtX: 0.5, lichtY: 0.34, lichtGroesse: 0.60, lichtStaerke: 0.22, randabfall: 0.46, wandKorn: 0.055 },
  W07: { name: 'Warm, Nussbaum',   wandOben: '#4a3f34', wandUnten: '#2a231c',
         decke: 0.13, strahler: 3, strahlerStaerke: 0.60, ecke: 0.34,
         lichtX: 0.46, lichtY: 0.33, lichtGroesse: 0.60, lichtStaerke: 0.24, randabfall: 0.40, wandKorn: 0.05 },
  W08: { name: 'Blaugrau, kühl',   wandOben: '#3f4a5a', wandUnten: '#232b36',
         decke: 0.12, strahler: 5, strahlerStaerke: 0.66, ecke: 0.26,
         lichtX: 0.52, lichtY: 0.31, lichtGroesse: 0.66, lichtStaerke: 0.26, randabfall: 0.34, wandKorn: 0.055 },
  W09: { name: 'Beton, roh',       wandOben: '#9a9791', wandUnten: '#76736d',
         decke: 0.11, strahler: 4, strahlerStaerke: 0.58, ecke: 0.36,
         lichtX: 0.48, lichtY: 0.33, lichtGroesse: 0.62, lichtStaerke: 0.22, randabfall: 0.32, wandKorn: 0.05 },
  W10: { name: 'Sandbeige',        wandOben: '#ddd2c0', wandUnten: '#bfb4a1',
         decke: 0.12, strahler: 4, strahlerStaerke: 0.72, ecke: 0.30,
         lichtX: 0.5, lichtY: 0.31, lichtGroesse: 0.66, lichtStaerke: 0.26, randabfall: 0.24, wandKorn: 0.055 },
  W11: { name: 'Petrol, dunkel',   wandOben: '#22414a', wandUnten: '#12252b',
         decke: 0.13, strahler: 4, strahlerStaerke: 0.62, ecke: 0.28,
         lichtX: 0.5, lichtY: 0.33, lichtGroesse: 0.62, lichtStaerke: 0.24, randabfall: 0.40, wandKorn: 0.055 },
  W12: { name: 'Weiß, hohe Decke', wandOben: '#fbfcfd', wandUnten: '#e8ebef',
         decke: 0.22, strahler: 6, strahlerStaerke: 0.90, ecke: 0.24,
         lichtX: 0.5, lichtY: 0.36, lichtGroesse: 0.72, lichtStaerke: 0.28, randabfall: 0.20, wandKorn: 0.05 },
};

export const BOEDEN: Record<string, Boden> = {
  B01: { name: 'Hell, matt',        bodenOben: '#dcdfe4', bodenUnten: '#c2c6cd', horizont: 0.74,
         bodenglanz: 0.06, bodenKorn: 0.09, bodenKoernung: 3, bodenFugen: 0, muster: 'keine', musterStaerke: 0 },
  B02: { name: 'Hell, glänzend',    bodenOben: '#d3d7dd', bodenUnten: '#b3b8c0', horizont: 0.74,
         bodenglanz: 0.26, bodenKorn: 0.05, bodenKoernung: 3, bodenFugen: 0, muster: 'keine', musterStaerke: 0 },
  B03: { name: 'Grau, matt',        bodenOben: '#8d929a', bodenUnten: '#6d727a', horizont: 0.74,
         bodenglanz: 0.08, bodenKorn: 0.11, bodenKoernung: 4, bodenFugen: 0, muster: 'keine', musterStaerke: 0 },
  B04: { name: 'Grau, poliert',     bodenOben: '#7f858e', bodenUnten: '#565c65', horizont: 0.74,
         bodenglanz: 0.30, bodenKorn: 0.06, bodenKoernung: 3, bodenFugen: 0, muster: 'keine', musterStaerke: 0 },
  B05: { name: 'Beton, dunkel',     bodenOben: '#4a4f56', bodenUnten: '#2c3036', horizont: 0.74,
         bodenglanz: 0.12, bodenKorn: 0.12, bodenKoernung: 6, bodenFugen: 0, muster: 'keine', musterStaerke: 0 },
  B06: { name: 'Asphalt',           bodenOben: '#33383e', bodenUnten: '#1c2024', horizont: 0.76,
         bodenglanz: 0.10, bodenKorn: 0.11, bodenKoernung: 4, bodenFugen: 0, muster: 'keine', musterStaerke: 0 },
  B07: { name: 'Schwarz, Spiegel',  bodenOben: '#191d23', bodenUnten: '#07090c', horizont: 0.74,
         bodenglanz: 0.34, bodenKorn: 0.04, bodenKoernung: 3, bodenFugen: 0, muster: 'keine', musterStaerke: 0 },
  B08: { name: 'Warm, Estrich',     bodenOben: '#3a322a', bodenUnten: '#1d1813', horizont: 0.74,
         bodenglanz: 0.16, bodenKorn: 0.14, bodenKoernung: 5, bodenFugen: 0, muster: 'keine', musterStaerke: 0 },
  B09: { name: 'Großfliesen hell',  bodenOben: '#d8dce1', bodenUnten: '#b7bcc4', horizont: 0.74,
         bodenglanz: 0.20, bodenKorn: 0.05, bodenKoernung: 3, bodenFugen: 0.30, muster: 'keine', musterStaerke: 0 },
  B10: { name: 'Großfliesen grau',  bodenOben: '#7b818a', bodenUnten: '#565b63', horizont: 0.74,
         bodenglanz: 0.18, bodenKorn: 0.07, bodenKoernung: 3, bodenFugen: 0.34, muster: 'keine', musterStaerke: 0 },
  B11: { name: 'Industrieplatten',  bodenOben: '#454b52', bodenUnten: '#272b31', horizont: 0.75,
         bodenglanz: 0.14, bodenKorn: 0.11, bodenKoernung: 5, bodenFugen: 0.40, muster: 'keine', musterStaerke: 0 },
  B12: { name: 'Beton, hell rau',   bodenOben: '#b6b3ac', bodenUnten: '#918d85', horizont: 0.74,
         bodenglanz: 0.07, bodenKorn: 0.14, bodenKoernung: 7, bodenFugen: 0.16, muster: 'keine', musterStaerke: 0 },
  B13: { name: 'Beton, poliert',    bodenOben: '#c9c6c1', bodenUnten: '#a8a5a0', horizont: 0.74,
         bodenglanz: 0.30, bodenKorn: 0.10, bodenKoernung: 5, bodenFugen: 0,
         muster: 'keine', musterStaerke: 0 },
  B14: { name: 'Terrazzo, hell',    bodenOben: '#dedbd4', bodenUnten: '#c0bcb3', horizont: 0.74,
         bodenglanz: 0.22, bodenKorn: 0.05, bodenKoernung: 3, bodenFugen: 0,
         muster: 'terrazzo', musterStaerke: 0.85 },
  B15: { name: 'Marmor, weiß',      bodenOben: '#eceae6', bodenUnten: '#d5d2cd', horizont: 0.74,
         bodenglanz: 0.30, bodenKorn: 0.03, bodenKoernung: 3, bodenFugen: 0.10,
         muster: 'marmor', musterStaerke: 0.9 },
  B16: { name: 'Dielen, dunkel',    bodenOben: '#4a382a', bodenUnten: '#2a1e14', horizont: 0.74,
         bodenglanz: 0.12, bodenKorn: 0.08, bodenKoernung: 4, bodenFugen: 0,
         muster: 'diele_dunkel', musterStaerke: 0.95 },
  B17: { name: 'Geriffelt, dunkel', bodenOben: '#33363b', bodenUnten: '#191b1e', horizont: 0.74,
         bodenglanz: 0.14, bodenKorn: 0.05, bodenKoernung: 3, bodenFugen: 0,
         muster: 'geriffelt', musterStaerke: 0.85 },
  B18: { name: 'Textil, grau',      bodenOben: '#8b8b88', bodenUnten: '#6a6a67', horizont: 0.74,
         bodenglanz: 0.02, bodenKorn: 0.12, bodenKoernung: 2, bodenFugen: 0,
         muster: 'textil', musterStaerke: 0.9 },
  B19: { name: 'Muster, geometrisch', bodenOben: '#b9bcc1', bodenUnten: '#94989e', horizont: 0.74,
         bodenglanz: 0.14, bodenKorn: 0.05, bodenKoernung: 3, bodenFugen: 0,
         muster: 'geometrisch', musterStaerke: 0.75 },
  B20: { name: 'Travertin',         bodenOben: '#cfc6b7', bodenUnten: '#ab9f8d', horizont: 0.74,
         bodenglanz: 0.10, bodenKorn: 0.10, bodenKoernung: 4, bodenFugen: 0,
         muster: 'travertin', musterStaerke: 0.85 },
  B21: { name: 'Flussstein',        bodenOben: '#a9a396', bodenUnten: '#837d71', horizont: 0.74,
         bodenglanz: 0.06, bodenKorn: 0.14, bodenKoernung: 5, bodenFugen: 0,
         muster: 'flussstein', musterStaerke: 0.9 },
  B22: { name: 'Dielen, grau',      bodenOben: '#9a968f', bodenUnten: '#75716b', horizont: 0.74,
         bodenglanz: 0.10, bodenKorn: 0.10, bodenKoernung: 4, bodenFugen: 0,
         muster: 'diele_grau', musterStaerke: 0.9 },
};

/**
 * Setzt aus einer Wand und einem Boden einen Raum zusammen.
 *
 * Unbekannte Kennungen fallen auf die erste Wand und den ersten Boden
 * zurueck, statt einen Fehler zu werfen: Ein gespeicherter Code aus
 * einer aelteren Fassung soll ein Bild liefern, kein Problem.
 */
export function raumAusCode(code: string): StudioHintergrund & { code: string } {
  const treffer = code.match(/^(W\d{2})(B\d{2})$/i);
  const wandId  = treffer ? treffer[1].toUpperCase() : 'W02';
  const bodenId = treffer ? treffer[2].toUpperCase() : 'B02';
  const w = WAENDE[wandId] ?? WAENDE.W02;
  const b = BOEDEN[bodenId] ?? BOEDEN.B02;

  const { name: _w, ...wand }  = w;
  const { name: _b, ...boden } = b;
  return { ...wand, ...boden, code: `${wandId}${bodenId}` };
}

/** Standardraum, wenn der Haendler noch nichts gewaehlt hat. */
export const STANDARD_CODE = 'W02B02';

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
 * Erzeugt eine Rauschebene — das Mittel gegen den Zeichentrick-Eindruck.
 *
 * Ein reiner Farbverlauf ist mathematisch glatt, und genau daran
 * erkennt das Auge sofort, dass es keine Oberflaeche ist. Jede echte
 * Wand hat Korn, jeder Beton hat Flecken, jeder Lack hat Staub.
 *
 * Das Rauschen wird klein erzeugt und hochskaliert. Das ist nicht nur
 * schneller — es macht das Korn groeber und damit glaubwuerdiger. Ein
 * Rauschen auf Pixelebene sieht aus wie ein verrauschtes Foto, ein
 * grobes wie eine Oberflaeche.
 *
 * Die Werte liegen um 128 herum, weil die Ebene mit "overlay"
 * aufgelegt wird: 128 laesst den Untergrund unveraendert, darueber
 * hellt auf, darunter dunkelt ab. `staerke` bestimmt, wie weit die
 * Werte von 128 abweichen duerfen.
 */
async function rauschen(
  breite: number,
  hoehe: number,
  koernung: number,
  staerke: number,
): Promise<Buffer> {
  const kleinB = Math.max(2, Math.round(breite / koernung));
  const kleinH = Math.max(2, Math.round(hoehe / koernung));
  const roh = Buffer.allocUnsafe(kleinB * kleinH);
  const spanne = Math.max(0, Math.min(1, staerke)) * 128;
  for (let i = 0; i < roh.length; i++) {
    roh[i] = 128 + Math.round((Math.random() * 2 - 1) * spanne);
  }
  return sharp(roh, { raw: { width: kleinB, height: kleinH, channels: 1 } })
    .resize(breite, hoehe, { fit: 'fill', kernel: 'cubic' })
    .png()
    .toBuffer();
}

/**
 * Fugen im Boden, perspektivisch zum Fluchtpunkt.
 *
 * Der wirksamste einzelne Zusatz. Ein Farbverlauf ist eine Flaeche;
 * sobald Linien darauf zu einem Punkt zusammenlaufen, ist es ein
 * Boden, auf dem etwas stehen kann. Das Auge liest die Tiefe aus den
 * Linien, nicht aus der Farbe.
 *
 * Der Fluchtpunkt liegt auf dem Horizont in der Bildmitte, die Fugen
 * faechern von dort nach unten auf. Zusaetzlich ein paar Querfugen,
 * deren Abstand nach unten hin waechst — auch das ist Perspektive.
 */
function fugen(breite: number, hoehe: number, hY: number, staerke: number): string {
  if (staerke <= 0) return '';
  const fx = breite / 2;
  let d = '';

  // Laengsfugen: vom Fluchtpunkt nach unten aufgefaechert.
  for (let i = -6; i <= 6; i++) {
    if (i === 0) continue;
    const unten = fx + i * (breite * 0.19);
    d += `<line x1="${fx.toFixed(0)}" y1="${hY}" x2="${unten.toFixed(0)}" y2="${hoehe}"
            stroke="#000" stroke-opacity="${(staerke * 0.5).toFixed(3)}" stroke-width="1.5"/>`;
  }

  // Querfugen: Abstand waechst nach unten, wie in der Perspektive.
  const tiefe = hoehe - hY;
  for (let k = 1; k <= 5; k++) {
    const y = hY + tiefe * Math.pow(k / 5, 1.9);
    d += `<line x1="0" y1="${y.toFixed(0)}" x2="${breite}" y2="${y.toFixed(0)}"
            stroke="#000" stroke-opacity="${(staerke * 0.32).toFixed(3)}" stroke-width="1.5"/>`;
  }
  return d;
}

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
${fugen(breite, hoehe, hY, v.bodenFugen)}
${bodenMuster(v.muster, breite, hoehe, hY, v.musterStaerke)}
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

  /*
   * Korn zuletzt, in zwei Ebenen: eine feine ueber das ganze Bild fuer
   * die Wand, eine groebere nur auf dem Boden.
   *
   * Zwei getrennte Ebenen, weil Wand und Boden verschiedene
   * Oberflaechen sind. Eine glatte Wand und ein rauer Betonboden
   * teilen sich kein Korn — dieselbe Koernung ueber beides zu legen
   * sieht aus wie ein Filter, nicht wie Material.
   *
   * "overlay" laesst mittleres Grau unveraendert und verschiebt den
   * Rest; deshalb liegen die Rauschwerte um 128.
   */
  const ebenen: sharp.OverlayOptions[] = [];

  if (v.wandKorn > 0) {
    ebenen.push({
      // Koernung 3 statt 2: feineres Korn liest sich als Bildrauschen,
      // groeberes als Oberflaeche.
      input: await rauschen(breite, hoehe, 3, v.wandKorn),
      blend: 'overlay',
    });
  }

  if (v.bodenKorn > 0 && hoehe - hY > 4) {
    /*
     * Das Bodenkorn lag zuerst als eigenes Bild ab dem Horizont auf.
     * Dabei entstand genau dort eine sichtbare waagerechte Kante — das
     * Korn setzte auf einen Schlag ein. Im Test bei "Beton, roh"
     * deutlich als Strich quer durchs Bild zu sehen.
     *
     * Jetzt geht die Ebene ueber das ganze Bild und wird oberhalb des
     * Horizonts auf neutrales Grau gezogen. Neutral heisst bei
     * "overlay": keine Wirkung. Der Uebergang ist damit weich, ohne
     * dass das Korn ueber die Wand laeuft.
     */
    const roh = await rauschen(breite, hoehe, Math.max(1, v.bodenKoernung), v.bodenKorn);
    const ausblenden = Buffer.from(
      `<svg width="${breite}" height="${hoehe}">
         <defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="#808080" stop-opacity="1"/>
           <stop offset="${((hY / hoehe) * 100).toFixed(1)}%" stop-color="#808080" stop-opacity="1"/>
           <stop offset="${(((hY + (hoehe - hY) * 0.12) / hoehe) * 100).toFixed(1)}%" stop-color="#808080" stop-opacity="0"/>
         </linearGradient></defs>
         <rect width="${breite}" height="${hoehe}" fill="url(#a)"/>
       </svg>`,
    );
    ebenen.push({
      input: await sharp(roh)
        .composite([{ input: await sharp(ausblenden).png().toBuffer() }])
        .png().toBuffer(),
      blend: 'overlay',
    });
  }

  const gezeichnet = sharp(Buffer.from(svg));
  const fertig = ebenen.length ? gezeichnet.composite(ebenen) : gezeichnet;

  return fertig.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
}
