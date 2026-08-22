'use client';

/**
 * Vorschau auf Schritt 1 ohne Anmeldung.
 *
 * Die Formularseiten liegen unter /dashboard und werden zur Anmeldung
 * umgeleitet. Beim Umbauen der Oberflaeche heisst das: Man sieht das
 * Ergebnis nicht. Diese Seite rendert dieselbe Komponente ausserhalb des
 * geschuetzten Bereichs.
 *
 * In der Produktion nicht erreichbar. Sie speichert nichts — Schritt 1
 * haelt seine Daten im Zustand und schreibt erst beim Weitergehen.
 */

import Formular from '../../dashboard/listing/step1/Formular';

export default function Vorschau() {
  if (process.env.NODE_ENV === 'production') {
    return <p style={{ padding: 40, fontFamily: 'sans-serif' }}>Nicht verfügbar.</p>;
  }
  return <Formular />;
}
