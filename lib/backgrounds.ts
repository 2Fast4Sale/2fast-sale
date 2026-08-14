/**
 * Die Hintergrund-Bibliothek.
 *
 * Ein Hintergrund ist entweder eine Bilddatei unter public/backgrounds/ oder
 * — der Regelfall — eine Beschreibung, aus der PhotoRoom ihn erzeugt.
 *
 * Warum Beschreibung statt Datei:
 * Die PhotoRoom-API kann keinen Hintergrund allein erzeugen, sie braucht immer
 * ein Motiv. Es gäbe also gar keinen Weg, generierte Hintergründe als Datei
 * abzulegen. Stattdessen gibt es `background.seed`: gleicher Seed plus
 * gleiche Beschreibung ergibt denselben Hintergrund. Damit sehen alle Fotos
 * eines Fahrzeugs gleich aus, obwohl jeder einzeln erzeugt wird.
 *
 * Zusammengesetzt wird hier nichts. Diese Liste sagt PhotoRoom nur, was für
 * ein Raum entstehen soll — Freistellen, Schatten und Platzieren macht
 * PhotoRoom.
 *
 * ── Einen Hintergrund hinzufügen ──────────────────────────────────────────
 * Eine Zeile mit prompt und seed ergänzen. Der Seed ist eine beliebige feste
 * Zahl; ändert man sie, sieht der Hintergrund anders aus.
 *
 * Die Beschreibungen sind bewusst auf Licht und Tiefe formuliert. Eine leere
 * Wand ohne Lichtverlauf lässt jedes freigestellte Fahrzeug aufgeklebt wirken
 * — genau das ist der Unterschied zwischen "ausgeschnitten" und "fotografiert".
 */

export type BackgroundTier = 'free' | 'pro' | 'business';

export interface BackgroundEntry {
  /** Wird in localStorage und in der API verwendet — nicht nachträglich ändern */
  id: string;
  label: string;
  tier: BackgroundTier;
  category: string;
  /** Beschreibung für PhotoRoom. Entweder das oder `file`. */
  prompt?: string;
  /** Feste Zahl, damit alle Fotos eines Fahrzeugs gleich aussehen. */
  seed?: number;
  /** Alternativ eine fertige Datei unter public/backgrounds/ */
  file?: string;
}

export const BACKGROUNDS: BackgroundEntry[] = [
  // ── Studio ──────────────────────────────────────────────────────────────
  {
    id: 'studio_white', label: 'Studio Weiß', tier: 'free', category: 'Studio',
    seed: 10_101,
    prompt: 'professional automotive photography studio, seamless white cyclorama wall, '
          + 'large softbox lighting from above, smooth gradient falloff towards the corners, '
          + 'light grey polished concrete floor with a subtle reflection, empty room, no vehicles',
  },
  {
    id: 'studio_dark', label: 'Studio Dunkel', tier: 'free', category: 'Studio',
    seed: 20_202,
    prompt: 'dark automotive photography studio, black seamless backdrop, dramatic rim lighting '
          + 'from behind, glossy dark floor with soft reflection, pool of light in the centre, '
          + 'deep shadows at the edges, empty room, no vehicles',
  },
  {
    id: 'studio_grey', label: 'Studio Grau', tier: 'free', category: 'Studio',
    seed: 30_303,
    prompt: 'minimalist photography studio, seamless mid grey backdrop, even diffused overhead '
          + 'lighting, gentle vignette, smooth matte floor, empty room, no vehicles',
  },

  // ── Showroom ────────────────────────────────────────────────────────────
  {
    id: 'showroom_glas', label: 'Showroom Glasfront', tier: 'pro', category: 'Showroom',
    seed: 40_404,
    prompt: 'modern car showroom interior, floor to ceiling glass front, soft natural daylight, '
          + 'polished light grey concrete floor with gentle reflections, minimal architecture, '
          + 'empty showroom, no vehicles',
  },
  {
    id: 'showroom_loft', label: 'Industrieloft', tier: 'pro', category: 'Showroom',
    seed: 50_505,
    prompt: 'industrial loft showroom, exposed red brick wall, black steel beams, warm pendant '
          + 'lights, dark polished concrete floor with reflections, empty space, no vehicles',
  },
  {
    id: 'showroom_luxus', label: 'Luxus-Showroom', tier: 'pro', category: 'Showroom',
    seed: 60_606,
    prompt: 'luxury car showroom, warm walnut wall panelling, indirect cove lighting, '
          + 'polished marble floor with soft reflections, elegant and restrained, '
          + 'empty showroom, no vehicles',
  },

  // ── Outdoor ─────────────────────────────────────────────────────────────
  {
    id: 'outdoor_garage', label: 'Tiefgarage', tier: 'business', category: 'Outdoor',
    seed: 70_707,
    prompt: 'underground parking garage, raw concrete pillars and ceiling, cool neon strip '
          + 'lighting, wet asphalt floor with reflections, moody atmosphere, empty, no vehicles',
  },
  {
    id: 'outdoor_pass', label: 'Bergpass', tier: 'business', category: 'Outdoor',
    seed: 80_808,
    prompt: 'empty mountain pass road at golden hour, smooth asphalt, dramatic sky, distant '
          + 'peaks in soft haze, warm low sun, no vehicles',
  },
  {
    id: 'outdoor_stadt', label: 'Stadt bei Nacht', tier: 'business', category: 'Outdoor',
    seed: 90_909,
    prompt: 'empty city street at blue hour, wet asphalt with reflections, bokeh city lights '
          + 'in the background, cool cinematic tone, no vehicles',
  },
  {
    id: 'outdoor_hafen', label: 'Hafenkulisse', tier: 'business', category: 'Outdoor',
    seed: 11_111,
    prompt: 'industrial harbour at dusk, stacked shipping containers in the background, '
          + 'wide concrete quay, cool light with warm accents, empty, no vehicles',
  },
];

/** Standardhintergrund, wenn nichts gewählt wurde. */
export const DEFAULT_BACKGROUND_ID = BACKGROUNDS[0]?.id ?? 'studio_white';

export function findBackground(id: string | null | undefined): BackgroundEntry | null {
  if (!id) return null;
  return BACKGROUNDS.find(b => b.id === id) ?? null;
}

/** Darf dieser Plan den Hintergrund nutzen? */
export function canUseBackground(plan: string, tier: BackgroundTier): boolean {
  if (tier === 'free') return true;
  if (plan === 'business' || plan === 'enterprise') return true;
  if (tier === 'pro') return plan !== 'free';
  return false;
}

/** Kennung für den selbst hochgeladenen Showroom des Händlers. */
export const OWN_SHOWROOM_ID = 'custom';
