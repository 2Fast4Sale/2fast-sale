import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Welcher Stand läuft gerade auf dem Server?
 *
 * Grund für diese Route: Heute ist dreimal die Frage „ist meine Änderung
 * schon live?" aufgekommen, und es gab keinen Weg, sie zu beantworten.
 * Erst habe ich versucht, es am CSS-Hash zu erkennen — der ändert sich
 * aber nur, wenn sich CSS ändert, nicht bei einer Änderung in
 * TypeScript. Danach war unklar, ob eine neue Meldung fehlt, weil das
 * Deployment nicht durch ist, oder weil der Browser die alte Fassung
 * aus dem Zwischenspeicher nimmt. Zwei verschiedene Probleme, und beide
 * sahen gleich aus.
 *
 * Zurück kommt nur, was Vercel ohnehin in jede Funktion legt: die
 * gekürzte Commit-Nummer, der Zweig und die Umgebung. Keine Geheimnisse,
 * keine Umgebungswerte, keine Nutzerdaten — und absichtlich ohne
 * Anmeldung, denn gebraucht wird die Auskunft genau dann, wenn etwas
 * nicht funktioniert.
 */
export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || '';
  return NextResponse.json(
    {
      stand: sha ? sha.slice(0, 7) : 'unbekannt',
      zweig: process.env.VERCEL_GIT_COMMIT_REF || 'unbekannt',
      umgebung: process.env.VERCEL_ENV || 'lokal',
      /* Nachricht des Commits — damit man ohne Nachschlagen weiss, was drin ist. */
      titel: (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').split('\n')[0].slice(0, 120),
      jetzt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
