'use client';

/**
 * Schritt 1 der Inseratserstellung.
 *
 * Die Seite ist bewusst leer bis auf das Einbinden: Das Formular liegt in
 * Formular.tsx, damit es auch ausserhalb des geschuetzten Bereichs
 * gerendert werden kann. Solange es in page.tsx stand, liess sich das
 * Ergebnis einer Aenderung nur nach Anmeldung ansehen — und eine
 * Oberflaeche, die man beim Bauen nicht sieht, wird schlecht.
 */

import Formular from './Formular';

export default function Step1() {
  return <Formular />;
}
