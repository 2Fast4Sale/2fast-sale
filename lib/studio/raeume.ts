/**
 * Verzeichnis der gerenderten Studioraeume.
 *
 * Die Bilder liegen unter public/backgrounds/raum und entstehen aus
 * tools/raum_render.py. Neben jedem Bild liegt eine .json mit den
 * Kameradaten — und die sind der Grund, warum es diese Datei gibt.
 *
 * Der Kompositor rechnet den Bodenschatten in Metern auf der
 * Bodenebene. Dafuer braucht er Horizontlage, Kamerahoehe und
 * Brennweite des Raums, in dem das Fahrzeug steht. Ohne diese Werte
 * faellt er auf Standardwerte zurueck, die zu einem beliebigen Raum
 * nicht passen — und dann liegt der Schatten falsch, ohne dass
 * irgendwo ein Fehler auftaucht.
 *
 * Gelesen wird nur beim ersten Zugriff; danach steht das Verzeichnis
 * im Speicher. Die Dateien aendern sich zur Laufzeit nicht.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface Raum {
  /** Dateiname ohne Endung, zugleich die Kennung. */
  name: string;
  /** Anzeigename fuer die Auswahl. */
  titel: string;
  /** Oeffentlicher Pfad des Bildes. */
  pfad: string;
  /** Lage des Horizonts als Anteil der Bildhoehe. */
  horizont: number;
  /** Kante zwischen Boden und Wand als Anteil der Bildhoehe, falls bekannt. */
  wandlinie?: number;
  kameraHoehe: number;
  /** Brennweite in Millimetern, Kleinbild. */
  brennweite: number;
  /** Wie stark sich ein Fahrzeug in diesem Boden spiegelt, 0 bis 1. */
  bodenglanz: number;
  breite: number;
  hoehe: number;
}

const ORDNER = join(process.cwd(), 'public', 'backgrounds', 'raum');

/**
 * Anzeigenamen fuer die Auswahlseite. Was hier fehlt, bekommt einen
 * Namen aus dem Dateinamen — ein neu gerenderter Raum erscheint also
 * sofort, nur eben mit einem schlichteren Titel.
 */
const TITEL: Record<string, string> = {
  weiss_klar:    'Weiß, schlicht',
  weiss_kreis:   'Weiß mit Bodenkreis',
  weiss_gruen:   'Weiß mit Pflanzen',
  showroom_hell: 'Showroom hell',
  grau_sockel:   'Grau mit Sockelzone',
  grau_asphalt:  'Grau auf Asphalt',
  anthrazit:     'Anthrazit',
  werkstatt:     'Sichtbeton mit Pflanzen',
  galerie_dunkel: 'Galerie, dunkler Boden',
  galerie_hell:   'Galerie, heller Boden',
  galerie_warm:   'Galerie, warm',
  fenster_waben:  'Fensterfront mit Waben',
  fenster_hell:   'Fensterfront, heller Boden',
  fenster_dunkel: 'Fensterfront, dunkler Boden',
  waben_dunkel:   'Waben-Licht, dunkler Boden',
  waben_hell:     'Waben-Wand, hell',
  led_dunkel:     'LED-Decke, dunkler Boden',
  led_fenster:    'LED-Decke mit Fensterfront',
  galerie_waben:  'Galerie mit Waben-Wand',
};

/** Aus "weiss_beton" wird "Weiss Beton". */
function titelAus(name: string): string {
  if (TITEL[name]) return TITEL[name];
  return name.split('_')
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' ');
}

let zwischenspeicher: Raum[] | null = null;

export function raeume(): Raum[] {
  if (zwischenspeicher) return zwischenspeicher;

  const gefunden: Raum[] = [];
  try {
    for (const datei of readdirSync(ORDNER).sort()) {
      if (!/\.jpe?g$/i.test(datei)) continue;
      const name = datei.replace(/\.jpe?g$/i, '');
      const daten = join(ORDNER, `${name}.json`);

      /*
       * Ohne Nebendatei kein Raum. Das schliesst die Arbeitsdateien im
       * selben Ordner aus — das Ausgangsfoto und die Freistellung —,
       * und es schliesst gekaufte oder gefundene Bilder aus, bei denen
       * die Kamera unbekannt ist. Genau die waeren das Problem: Sie
       * saehen brauchbar aus und haetten einen falsch liegenden
       * Schatten.
       */
      if (!existsSync(daten)) continue;

      const m = JSON.parse(readFileSync(daten, 'utf-8'));
      gefunden.push({
        name,
        titel: titelAus(name),
        pfad: `/backgrounds/raum/${datei}`,
        horizont:    typeof m.horizont    === 'number' ? m.horizont    : 0.45,
        wandlinie:   typeof m.wandlinie   === 'number' ? m.wandlinie   : undefined,
        kameraHoehe: typeof m.kameraHoehe === 'number' ? m.kameraHoehe : 1.55,
        brennweite:  typeof m.brennweite  === 'number' ? m.brennweite  : 55,
        bodenglanz:  typeof m.bodenglanz  === 'number' ? m.bodenglanz  : 0.08,
        breite:      typeof m.breite      === 'number' ? m.breite      : 1920,
        hoehe:       typeof m.hoehe       === 'number' ? m.hoehe       : 1280,
      });
    }
  } catch (err) {
    console.error('[raeume] Verzeichnis nicht lesbar:', err);
  }

  zwischenspeicher = gefunden;
  return gefunden;
}

/** Der Raum zu einer Kennung, oder der Standardraum. */
export function raum(name?: string | null): Raum | null {
  const alle = raeume();
  if (alle.length === 0) return null;
  return alle.find((r) => r.name === name) ?? alle.find((r) => r.name === STANDARD_RAUM) ?? alle[0];
}

/** Bilddaten des Raums von der Platte. */
export function raumBild(r: Raum): Buffer {
  return readFileSync(join(ORDNER, `${r.name}.jpg`));
}

export const STANDARD_RAUM = 'weiss_klar';
