/**
 * Merkt sich ein freigestelltes Fahrzeug im Browser.
 *
 * Der Grund ist wieder ein Kostengrund: Freistellen kostet Geld,
 * Ansehen nicht. Wer einmal ein Foto freigestellt hat, soll es auf
 * jeder Seite als Vorschau benutzen koennen — in der
 * Hintergrund-Auswahl, beim Einstellen des Studios, ueberall — ohne
 * dass dafuer noch einmal etwas abgerechnet wird.
 *
 * Vorher stand in der Hintergrund-Auswahl ein gezeichneter Umriss.
 * Der zeigte zwar Licht und Schatten, aber nicht, wie ein ECHTES
 * Fahrzeug in dem Raum steht — und genau das ist die Frage, die der
 * Haendler beantwortet haben will, bevor er waehlt.
 *
 * Liegt im localStorage und nicht in der Datenbank: Es ist eine
 * Bequemlichkeit, kein Datenbestand. Geht es verloren, stellt man
 * einmal neu frei.
 */

export const SPEICHER_SCHLUESSEL = 'studio_freigestellt_v1';

/** Breite, auf die vor dem Speichern verkleinert wird. */
const SPEICHER_BREITE = 900;

/**
 * Verkleinert ein freigestelltes PNG und legt es ab.
 *
 * Die Verkleinerung ist notwendig, nicht kosmetisch: Ein
 * freigestelltes Foto in voller Aufloesung kann als base64 mehrere
 * Megabyte haben, und der localStorage ist je nach Browser bei fuenf
 * bis zehn Megabyte am Ende. 900 Pixel reichen fuer jede Vorschau und
 * bleiben deutlich darunter.
 *
 * Schlaegt das Speichern fehl — voller Speicher, privates Fenster,
 * abgeschaltete Website-Daten —, ist das kein Fehler, den jemand
 * sehen muss. Dann gibt es eben keine Vorschau.
 */
export async function merken(freigestelltDataUrl: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const verkleinert = await verkleinern(freigestelltDataUrl, SPEICHER_BREITE);
    localStorage.setItem(SPEICHER_SCHLUESSEL, verkleinert);
    return true;
  } catch {
    try { localStorage.removeItem(SPEICHER_SCHLUESSEL); } catch { /* egal */ }
    return false;
  }
}

/** Holt das gemerkte Fahrzeug, oder null. */
export function holen(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const wert = localStorage.getItem(SPEICHER_SCHLUESSEL);
    return wert && wert.startsWith('data:image/png') ? wert : null;
  } catch {
    return null;
  }
}

export function vergessen(): void {
  try { localStorage.removeItem(SPEICHER_SCHLUESSEL); } catch { /* egal */ }
}

/**
 * Verkleinert ueber ein Canvas — und behaelt dabei den Alphakanal.
 *
 * Deshalb PNG und nicht JPEG: Ein JPEG kann keine Transparenz, und
 * ohne Transparenz waere das Fahrzeug wieder ein Rechteck mit
 * schwarzem Rand statt eines Freistellers.
 */
function verkleinern(dataUrl: string, zielBreite: number): Promise<string> {
  return new Promise((fertig, fehler) => {
    const bild = new Image();
    bild.onload = () => {
      const faktor = Math.min(1, zielBreite / (bild.width || zielBreite));
      const b = Math.max(1, Math.round(bild.width * faktor));
      const h = Math.max(1, Math.round(bild.height * faktor));

      const flaeche = document.createElement('canvas');
      flaeche.width = b;
      flaeche.height = h;
      const stift = flaeche.getContext('2d');
      if (!stift) return fehler(new Error('Kein Zeichenkontext'));
      stift.drawImage(bild, 0, 0, b, h);
      fertig(flaeche.toDataURL('image/png'));
    };
    bild.onerror = () => fehler(new Error('Bild nicht lesbar'));
    bild.src = dataUrl;
  });
}
