import type { Metadata } from 'next';

/*
 * Eigener Titel für die Kündigungsseite.
 *
 * Die Seite selbst ist eine Client-Komponente ('use client') und kann
 * deshalb kein `metadata` ausliefern -- Next wertet den Export nur in
 * Server-Komponenten aus. Ein schmales Layout drumherum ist der Weg,
 * den Titel trotzdem zu setzen.
 */
export const metadata: Metadata = {
  title: 'Verträge hier kündigen — 2Fast4Sale',
  description:
    'Kündige deinen Vertrag bei 2Fast4Sale ohne Anmeldung. Du erhältst die Bestätigung sofort per E-Mail.',
  /*
   * Nicht in den Suchindex. Wer kündigen will, kommt über den Footer --
   * die Seite in den Ergebnissen zu haben, brächte niemandem etwas und
   * würde die Marke mit dem Wort "kündigen" verknüpfen.
   *
   * Das ist keine Erschwernis im Sinne des Gesetzes: Paragraf 312k
   * verlangt, dass der Weg auf der Seite unmittelbar und leicht
   * erreichbar ist, und das ist er über den Footer jeder Seite.
   */
  robots: { index: false, follow: true },
};

export default function KuendigungLayout({ children }: { children: React.ReactNode }) {
  return children;
}
