'use client';

/**
 * Schritt 1 der Inseratserstellung.
 *
 * Rendert den Showroom. Die aeltere Datenblatt-Fassung liegt noch in
 * Formular.tsx und ist ueber /vorschau/step1 zum Vergleich erreichbar,
 * steht aber nicht mehr im Weg des Haendlers.
 *
 * Die Seite bindet nur ein: Unter /dashboard leitet die Sitzungspruefung
 * zur Anmeldung um, dadurch liess sich das Ergebnis einer Aenderung ohne
 * Login nicht ansehen. Eine Oberflaeche, die man beim Bauen nicht sieht,
 * wird schlecht.
 */

import Showroom from './Showroom';

export default function Step1() {
  return <Showroom />;
}
