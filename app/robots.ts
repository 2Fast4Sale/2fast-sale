import type { MetadataRoute } from 'next';

/**
 * robots.txt fuer die Testphase.
 *
 * Bisher gab es gar keine Datei — die Adresse lieferte die
 * 404-Seite zurueck. Fuer Suchmaschinen bedeutet das nicht "nicht
 * indexieren", sondern "keine Einschraenkung": Sie durften alles
 * aufnehmen.
 *
 * Zwei Wege, dasselbe zu sagen, und beide sind noetig:
 *
 *   robots.txt        haelt anstaendige Sucher schon vor dem Abruf ab
 *   meta robots       steht in jeder Seite (app/layout.tsx)
 *
 * Die Datei allein genuegt nicht: Eine Seite, die von anderswo
 * verlinkt ist, kann trotzdem in den Ergebnissen landen — dann steht
 * dort nur die Adresse ohne Text. Erst die Angabe in der Seite selbst
 * verhindert das zuverlaessig.
 *
 * ZUM AUFHEBEN VOR DEM START: diese Datei loeschen und den
 * robots-Block in app/layout.tsx entfernen.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
