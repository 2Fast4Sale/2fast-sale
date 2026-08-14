/**
 * Die Hintergrund-Bibliothek.
 *
 * Das hier ist die einzige Stelle, an der Hintergründe definiert werden.
 * Jeder Eintrag ist eine echte Bilddatei unter public/backgrounds/.
 *
 * Zusammengesetzt wird nichts davon hier — die Datei geht als
 * background.imageFile an PhotoRoom, und PhotoRoom stellt das Fahrzeug frei,
 * setzt den Schatten und platziert es. Diese Liste sagt nur, welche Datei
 * mitgeschickt wird.
 *
 * ── Einen Hintergrund hinzufügen ──────────────────────────────────────────
 * 1. Bild nach public/backgrounds/ legen, mindestens 2000 px breit
 *    (die Ausgabe ist 2000×1333; kleinere Bilder werden hochskaliert)
 * 2. Hier eine Zeile ergänzen
 * Mehr ist nicht nötig.
 */

export type BackgroundTier = 'free' | 'pro' | 'business';

export interface BackgroundEntry {
  /** Wird in localStorage und in der API verwendet — nicht nachträglich ändern */
  id: string;
  /** Anzeigename im Dashboard */
  label: string;
  /** Dateiname unter public/backgrounds/ */
  file: string;
  /** Ab welchem Plan nutzbar */
  tier: BackgroundTier;
  /** Gruppierung im Dashboard */
  category: string;
}

export const BACKGROUNDS: BackgroundEntry[] = [
  {
    id: 'studio_infinity',
    label: 'Infinity Studio',
    file: 'studio_infinity.jpg',
    tier: 'free',
    category: 'Studio',
  },

  // ── Hier kommen deine PhotoRoom-Hintergründe rein ──
  // Beispiel:
  // { id: 'showroom_glas', label: 'Showroom Glasfront', file: 'showroom_glas.jpg', tier: 'pro',      category: 'Showroom' },
  // { id: 'loft_ziegel',   label: 'Industrieloft',      file: 'loft_ziegel.jpg',   tier: 'pro',      category: 'Showroom' },
  // { id: 'tiefgarage',    label: 'Tiefgarage',         file: 'tiefgarage.jpg',    tier: 'business', category: 'Outdoor'  },
];

/** Standardhintergrund, wenn nichts gewählt wurde. */
export const DEFAULT_BACKGROUND_ID = BACKGROUNDS[0]?.id ?? 'studio_infinity';

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
