/**
 * Woher kommt jedes Feld eines Inserats — und welche kann NIEMAND
 * automatisch ausfüllen?
 *
 * ── Warum es diese Tabelle gibt ────────────────────────────────────
 *
 * Das Ziel "die KI füllt alles selbst richtig aus, der Händler muss
 * nichts machen" ist in dieser Form nicht erreichbar, und das ist keine
 * Frage besserer Technik.
 *
 * Der **Kilometerstand** steht auf keinem Dokument der Welt. Er steht
 * im Tacho. Der **Preis** ist eine Geschäftsentscheidung des Händlers.
 * Die **Umsatzsteuerart** (Regelbesteuerung oder § 25a) hängt daran,
 * wie der Händler das Fahrzeug eingekauft hat — das weiß nur seine
 * Buchhaltung. Das **Getriebe** steht nicht in der
 * Zulassungsbescheinigung Teil I.
 *
 * Wer "null Felder für den Händler" zum Maßstab macht, wird nie fertig,
 * weil der Maßstab unerreichbar ist. Der richtige Maßstab ist: **so
 * wenige wie physisch möglich, und keines davon überraschend.**
 *
 * Diese Tabelle sagt genau, wie viele das sind. Sie ist die Antwort auf
 * "wann ist es fertig" — und geprüft wird sie von
 * scripts/felder-probe.ts, ohne einen einzigen Modellaufruf.
 */

export type Herkunft =
  /** Steht in der Zulassungsbescheinigung Teil I und wird gelesen. */
  | 'schein'
  /** Aus den Unterlagen oder von Fotos, mit Beleg. */
  | 'erkennung'
  /** Rechnet die Anwendung aus etwas anderem aus. */
  | 'abgeleitet'
  /** Nur der Händler weiß es. Steht in keinem Dokument. */
  | 'nur_haendler';

export type Feld = {
  schluessel: string;
  name: string;
  /** Ohne dieses Feld nimmt mobile.de das Inserat nicht an. */
  pflicht: boolean;
  herkunft: Herkunft;
  /** Bei 'nur_haendler': warum es nicht anders geht. */
  warum?: string;
};

export const FELDER: Feld[] = [
  /* ── Was der Schein liefert ──────────────────────────────────── */
  { schluessel: 'brand',             name: 'Marke',              pflicht: true,  herkunft: 'schein' },
  { schluessel: 'model',             name: 'Modell',             pflicht: false, herkunft: 'schein' },
  { schluessel: 'vin',               name: 'FIN',                pflicht: false, herkunft: 'schein' },
  { schluessel: 'firstRegistration', name: 'Erstzulassung',      pflicht: false, herkunft: 'schein' },
  { schluessel: 'fuelType',          name: 'Kraftstoff',         pflicht: false, herkunft: 'schein' },
  { schluessel: 'leistungPs',        name: 'Leistung',           pflicht: false, herkunft: 'abgeleitet' },
  { schluessel: 'displacementCcm',   name: 'Hubraum',            pflicht: false, herkunft: 'schein' },
  { schluessel: 'color',             name: 'Farbe',              pflicht: false, herkunft: 'schein' },
  { schluessel: 'seats',             name: 'Sitzplätze',         pflicht: false, herkunft: 'schein' },
  { schluessel: 'doors',             name: 'Türen',              pflicht: false, herkunft: 'schein' },
  { schluessel: 'emissionClass',     name: 'Schadstoffklasse',   pflicht: false, herkunft: 'schein' },
  { schluessel: 'driveType',         name: 'Antriebsart',        pflicht: false, herkunft: 'schein' },
  { schluessel: 'leermasseKg',       name: 'Leermasse',          pflicht: false, herkunft: 'schein' },
  { schluessel: 'bodyType',          name: 'Fahrzeugkategorie',  pflicht: true,  herkunft: 'abgeleitet' },
  { schluessel: 'metallic',          name: 'Metallic',           pflicht: false, herkunft: 'schein' },

  /* ── Erkennung: Unterlagen, Nahaufnahmen, Fotos ──────────────── */
  { schluessel: 'equipment',         name: 'Ausstattung',        pflicht: false, herkunft: 'erkennung' },
  { schluessel: 'interiorType',      name: 'Polsterung',         pflicht: false, herkunft: 'erkennung' },
  { schluessel: 'interiorColor',     name: 'Innenfarbe',         pflicht: false, herkunft: 'erkennung' },

  /* ── Rechnet die Anwendung ───────────────────────────────────── */
  { schluessel: 'envkv',             name: 'EnVKV-Angaben',      pflicht: false, herkunft: 'abgeleitet' },

  /* ── Und das bleibt übrig. Immer. ────────────────────────────── */
  {
    schluessel: 'km', name: 'Kilometerstand', pflicht: true, herkunft: 'nur_haendler',
    warum: 'Steht im Tacho, in keinem Dokument. Auch die HU-Bescheinigung nennt nur den Stand am Prüftag.',
  },
  {
    schluessel: 'price', name: 'Preis', pflicht: true, herkunft: 'nur_haendler',
    warum: 'Geschäftsentscheidung. Ein Vorschlag wäre eine Schätzung — und für die haftet am Ende der Händler.',
  },
  {
    schluessel: 'gearbox', name: 'Getriebe', pflicht: true, herkunft: 'schein',
    /*
     * Seit lib/getriebeAusText.ts aus der Handelsbezeichnung (Feld D.3)
     * gelesen: 'DSG', 'S tronic', 'Steptronic', '9G-TRONIC' stehen dort
     * sehr oft mit drin. Nur Automatik wird erkannt, nie Handschaltung —
     * fuer die gibt es kein Kuerzel, und das Fehlen eines Kuerzels zu
     * deuten waere geraten. Bleibt es leer, setzt es der Haendler.
     */
  },
  {
    schluessel: 'vatType', name: 'Umsatzsteuer', pflicht: true, herkunft: 'nur_haendler',
    warum: 'Regelbesteuerung oder § 25a hängt daran, wie der Händler eingekauft hat. Das weiß nur seine Buchhaltung.',
  },
  {
    schluessel: 'huUntil', name: 'HU bis', pflicht: false, herkunft: 'nur_haendler',
    warum: 'Steht auf der HU-Bescheinigung oder der Plakette, nicht im Schein. Mit Foto der Bescheinigung erkennbar.',
  },
  {
    schluessel: 'previousOwners', name: 'Vorbesitzer', pflicht: false, herkunft: 'nur_haendler',
    warum: 'Steht nur in der Zulassungsbescheinigung Teil II (Fahrzeugbrief), nicht in Teil I.',
  },
  {
    schluessel: 'damaged', name: 'Unfallfrei', pflicht: false, herkunft: 'nur_haendler',
    warum: 'Zusicherung mit der höchsten Haftung von allen. Darf nie eine Software setzen.',
  },
  {
    schluessel: 'warranty', name: 'Garantie', pflicht: false, herkunft: 'nur_haendler',
    warum: 'Was der Händler zusagt, entscheidet er.',
  },
];

/** Wie viele Felder muss der Händler mindestens selbst angeben? */
export function handarbeit(): Feld[] {
  return FELDER.filter(f => f.herkunft === 'nur_haendler');
}

/** Davon die, ohne die mobile.de gar nichts annimmt. */
export function handarbeitPflicht(): Feld[] {
  return handarbeit().filter(f => f.pflicht);
}
