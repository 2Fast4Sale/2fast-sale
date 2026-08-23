/**
 * Aussehen der Inseratsstrecke — für alle vier Schritte.
 *
 * Vorher hatte jeder Schritt seine eigenen Farben im Kopf der Datei
 * stehen: Schritt 1 dunkel, Schritt 2 dunkelblau, Schritt 4 mit einem
 * Farbverlauf. Wer die Strecke durchläuft, hat dreimal das Gefühl, die
 * Anwendung gewechselt zu haben.
 *
 * Die Werte sind gemessen, nicht geschätzt. Zwei davon haben eine
 * Geschichte:
 *
 * `linie` kam ursprünglich auf 1,38:1 gegen den Grund. Für eine
 * Begrenzung verlangt WCAG 1.4.11 mindestens 3:1 — Feldunterstriche und
 * Trennlinien waren praktisch unsichtbar, und weil auf einem Datenblatt
 * die Linien die Struktur SIND, verschwamm die ganze Seite. Das wurde
 * zunächst für ein Problem der dunklen Farbe gehalten und mit einer
 * Umstellung auf hell beantwortet — die falsche Ursache.
 *
 * `linieLeise` ist der Gegenpol: Grosse Flächenränder dürfen nicht so
 * kräftig sein, sonst wirkt jede Gruppe wie ein Kasten statt wie ein
 * Blatt.
 */

export const G = {
  schrift: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  ziffern: 'ui-monospace, "SF Mono", Menlo, monospace',

  /** Tiefes Anthrazit, kein reines Schwarz — das wirkt auf Bildschirmen hart. */
  grund:   '#0a0c11',
  flaeche: '#12151d',
  erhoben: '#1b2029',

  /** 3,58:1 gegen den Grund — als Begrenzung sichtbar. */
  linie:   '#5c6a82',
  /** Für grosse Flächenränder, wo ein kräftiger Rand einrahmen würde. */
  linieLeise: '#2a3140',

  text:     '#f8fafc',
  gedämpft: '#c2cad8',
  /** 6,79:1 gegen den Grund. */
  leise:    '#8d99ad',
  /** Blasser Platzhalter — sichtbar, aber zurückgenommen. */
  blass:    '#7c8598',

  akzent:  '#7c8aff',
  gut:     '#4ade80',
  luecke:  '#fbbf24',
  fehler:  '#fb7185',

  /** Schleier für ausgewählte Schaltflächen auf dunklem Grund. */
  akzentSchleier: 'rgba(124,138,255,0.13)',
  luekeSchleier:  'rgba(251,191,36,0.09)',
} as const;

/**
 * Die vier Schritte, für die Fortschrittsanzeige im Kopf.
 *
 * An einer Stelle, damit nicht jeder Schritt seine eigene Vorstellung
 * davon hat, wie viele es sind und wie sie heissen.
 */
export const SCHRITTE = [
  { nummer: 1, name: 'Fahrzeug', pfad: '/dashboard/listing/step1' },
  { nummer: 2, name: 'Fotos',    pfad: '/dashboard/listing/step2' },
  { nummer: 3, name: 'Text',     pfad: '/dashboard/listing/step3' },
  { nummer: 4, name: 'Fertig',   pfad: '/dashboard/listing/step4' },
] as const;
