/**
 * Entwurfs-Nummer eines in Arbeit befindlichen Inserats.
 *
 * Die KI-Aufrufe passieren in den Schritten 1 bis 3, das Fahrzeug
 * entsteht aber erst beim Speichern in Schritt 4. Zum Zeitpunkt des
 * Scans gibt es also keine vehicle_id, die man den Kosten mitgeben
 * könnte — deshalb war api_costs.vehicle_id bei jedem Eintrag leer und
 * die Kostenerfassung pro Inserat lieferte nichts.
 *
 * Diese Nummer überbrückt die Lücke: Sie entsteht beim Start des
 * Formulars, wird bei jedem Aufruf mitgeschickt, und beim Speichern
 * werden alle Posten mit ihr dem entstandenen Fahrzeug zugeordnet.
 *
 * Sie liegt im sessionStorage und nicht im localStorage: Ein Entwurf
 * gehört in den Tab, in dem er bearbeitet wird. Zwei parallel geöffnete
 * Inserate würden sich sonst dieselbe Nummer teilen und ihre Kosten
 * gegenseitig zugeschrieben bekommen.
 */

const SCHLUESSEL = 'listing_draft_id';

/**
 * Nummer des laufenden Entwurfs. Erzeugt eine neue, falls noch keine da
 * ist — der Aufrufer muss sich also nicht darum kümmern, ob das Formular
 * gerade frisch gestartet wurde.
 */
export function entwurfId(): string {
  if (typeof window === 'undefined') return '';

  const vorhanden = sessionStorage.getItem(SCHLUESSEL);
  if (vorhanden) return vorhanden;

  const neu = neueId();
  sessionStorage.setItem(SCHLUESSEL, neu);
  return neu;
}

/**
 * Beginnt einen neuen Entwurf und gibt dessen Nummer zurück.
 *
 * Wird beim Betreten von Schritt 1 aufgerufen. Ohne das würden die
 * Kosten des zweiten Inserats dem ersten zugeschlagen, solange der Tab
 * offen bleibt.
 */
export function entwurfNeu(): string {
  if (typeof window === 'undefined') return '';
  const neu = neueId();
  sessionStorage.setItem(SCHLUESSEL, neu);
  return neu;
}

/** Nach dem Speichern aufräumen, damit das nächste Inserat frisch beginnt. */
export function entwurfBeenden(): void {
  if (typeof window !== 'undefined') sessionStorage.removeItem(SCHLUESSEL);
}

/**
 * UUID v4.
 *
 * crypto.randomUUID gibt es erst ab neueren Browsern und nur in
 * sicheren Kontexten — auf einer per IP aufgerufenen Testinstanz fehlt
 * es. Der Rückfallweg nutzt getRandomValues, das überall verfügbar ist.
 */
function neueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;  // Version 4
  b[8] = (b[8] & 0x3f) | 0x80;  // Variante 10
  const hex = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
